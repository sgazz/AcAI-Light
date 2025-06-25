import os
import sys
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from ollama import Client
from sqlalchemy.orm import Session
from typing import List
import uuid
import tempfile
from PIL import Image, ImageDraw, ImageFont
import io
from fastapi.responses import Response

# Učitaj environment varijable
load_dotenv()

# Inicijalizuj Ollama klijenta
client = Client(host='http://localhost:11434')

app = FastAPI()

# Dodaj CORS middleware za frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import models i prompts nakon što je app kreiran
from .models import get_db, ChatMessage, Document
from .prompts import SYSTEM_PROMPT, CONTEXT_PROMPT
from .rag_service import RAGService
from .ocr_service import OCRService

# Inicijalizuj RAG servis
rag_service = RAGService()
ocr_service = OCRService()  # Dodaj OCR service

def get_conversation_context(session_id: str, db: Session, max_messages: int = 5) -> str:
    """Dohvati prethodne poruke za kontekst"""
    try:
        messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.timestamp.desc()).limit(max_messages).all()
        
        if not messages:
            return ""
        
        # Obrni redosled da bude hronološki
        messages.reverse()
        
        context = []
        for msg in messages:
            role = "korisnik" if msg.sender == "user" else "AI"
            context.append(f"{role}: {msg.content}")
        
        return "\n".join(context)
    except Exception as e:
        print(f"Greška pri dohvatanju konteksta: {e}")
        return ""

def create_enhanced_prompt(user_message: str, context: str = "") -> str:
    """Kreira poboljšani prompt sa sistem instrukcijama i kontekstom"""
    prompt_parts = [SYSTEM_PROMPT]
    
    if context:
        context_prompt = CONTEXT_PROMPT.format(context=context)
        prompt_parts.append(context_prompt)
    
    prompt_parts.append(f"\nKorisnik: {user_message}")
    prompt_parts.append("\nAI Study Assistant:")
    
    return "\n\n".join(prompt_parts)

@app.get("/")
def read_root():
    return {"message": "Backend radi!"}

@app.get("/test-model")
async def test_model():
    try:
        # Test poziv ka Ollama API-ju koristeći Mistral model (bez await)
        enhanced_prompt = create_enhanced_prompt("Zdravo! Kako si?")
        response = client.chat(model='mistral', 
            messages=[{
                'role': 'user',
                'content': enhanced_prompt
            }]
        )
        return {"status": "success", "response": response['message']['content']}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/chat")
async def chat_endpoint(message: dict, db: Session = Depends(get_db)):
    try:
        user_message = message.get("message", "")
        session_id = message.get("session_id", "default")
        
        if not user_message.strip():
            raise HTTPException(status_code=400, detail="Poruka ne može biti prazna")
        
        # Sačuvaj korisničku poruku u bazu
        user_db_message = ChatMessage(
            sender="user",
            content=user_message,
            session_id=session_id
        )
        db.add(user_db_message)
        db.commit()
        
        # Dohvati kontekst prethodnih poruka
        context = get_conversation_context(session_id, db)
        
        # Kreiraj poboljšani prompt
        enhanced_prompt = create_enhanced_prompt(user_message, context)
        
        # Pozovi Ollama API (bez await)
        response = client.chat(model='mistral', 
            messages=[{
                'role': 'user',
                'content': enhanced_prompt
            }]
        )
        
        ai_response = response['message']['content']
        
        # Sačuvaj AI odgovor u bazu
        ai_db_message = ChatMessage(
            sender="ai",
            content=ai_response,
            session_id=session_id
        )
        db.add(ai_db_message)
        db.commit()
        
        return {
            "status": "success",
            "response": ai_response,
            "session_id": session_id
        }
        
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

@app.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str, db: Session = Depends(get_db)):
    try:
        messages = db.query(ChatMessage).filter(
            ChatMessage.session_id == session_id
        ).order_by(ChatMessage.timestamp.asc()).all()
        
        return {
            "status": "success",
            "messages": [
                {
                    "id": msg.id,
                    "sender": msg.sender,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat()
                }
                for msg in messages
            ]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/chat/new-session")
async def create_new_session():
    session_id = str(uuid.uuid4())
    return {"session_id": session_id}

@app.get("/chat/sessions")
async def get_sessions(db: Session = Depends(get_db)):
    try:
        # Dohvati sve sesije sa brojem poruka i vremenom
        result = db.execute("""
            SELECT 
                session_id,
                COUNT(*) as message_count,
                MIN(timestamp) as first_message,
                MAX(timestamp) as last_message
            FROM chat_messages 
            GROUP BY session_id
            ORDER BY last_message DESC
        """).fetchall()
        
        sessions = [
            {
                "session_id": row[0],
                "message_count": row[1],
                "first_message": row[2],
                "last_message": row[3]
            }
            for row in result
        ]
        
        return {
            "status": "success",
            "sessions": sessions
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/chat/session/{session_id}")
async def delete_session(session_id: str, db: Session = Depends(get_db)):
    try:
        # Obriši sve poruke za datu sesiju
        db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
        db.commit()
        
        return {
            "status": "success",
            "message": f"Sesija {session_id} je obrisana"
        }
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

# RAG API Endpoints

@app.post("/documents/upload")
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload dokumenta za RAG sistem"""
    try:
        # Proveri tip fajla
        allowed_extensions = ['.pdf', '.docx', '.txt']
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        if file_extension not in allowed_extensions:
            raise HTTPException(
                status_code=400, 
                detail=f"Format {file_extension} nije podržan. Podržani formati: {', '.join(allowed_extensions)}"
            )
        
        # Pročitaj sadržaj fajla
        file_content = await file.read()
        
        # Upload dokumenta
        result = rag_service.upload_document(file_content, file.filename, db)
        
        if result['status'] == 'success':
            return result
        else:
            raise HTTPException(status_code=500, detail=result['message'])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat/rag")
async def rag_chat_endpoint(message: dict, db: Session = Depends(get_db)):
    try:
        user_message = message.get("message", "")
        session_id = message.get("session_id", "default")
        use_rerank = message.get("use_rerank", True)  # Dodaj opciju za re-ranking
        
        if not user_message.strip():
            raise HTTPException(status_code=400, detail="Poruka ne može biti prazna")
        
        # Sačuvaj korisničku poruku u bazu
        user_db_message = ChatMessage(
            sender="user",
            content=user_message,
            session_id=session_id
        )
        db.add(user_db_message)
        db.commit()
        
        # Dohvati kontekst prethodnih poruka
        context = get_conversation_context(session_id, db)
        
        # Generiši RAG odgovor sa re-ranking opcijom
        rag_response = rag_service.generate_rag_response(
            user_message, 
            context, 
            max_results=3,
            use_rerank=use_rerank
        )
        
        if rag_response['status'] == 'success':
            ai_response = rag_response['response']
            
            # Sačuvaj AI odgovor u bazu
            ai_db_message = ChatMessage(
                sender="ai",
                content=ai_response,
                session_id=session_id
            )
            db.add(ai_db_message)
            db.commit()
            
            return {
                "status": "success",
                "response": ai_response,
                "session_id": session_id,
                "sources": rag_response.get('sources', []),
                "used_rag": rag_response.get('used_rag', False),
                "reranking_applied": rag_response.get('reranking_applied', False),
                "reranker_info": rag_response.get('reranker_info')
            }
        else:
            return {"status": "error", "message": rag_response.get('message', 'Greška pri RAG generisanju')}
        
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

@app.get("/documents")
async def list_documents(db: Session = Depends(get_db)):
    """Lista svih dokumenata u RAG sistemu"""
    try:
        documents = rag_service.get_documents_from_db(db)
        return {
            "status": "success",
            "documents": documents
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/documents/{doc_id}")
async def get_document_info(doc_id: str, db: Session = Depends(get_db)):
    """Informacije o specifičnom dokumentu"""
    try:
        doc_info = rag_service.get_document_info(doc_id)
        if doc_info:
            return {
                "status": "success",
                "document": doc_info
            }
        else:
            raise HTTPException(status_code=404, detail="Dokument nije pronađen")
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/documents/{doc_id}/content")
async def get_document_content(doc_id: str, page: int = None):
    """Dohvata sadržaj dokumenta"""
    try:
        # Prvo proveri da li dokument postoji u bazi
        db = next(get_db())
        document = db.query(Document).filter(Document.id == doc_id).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Dokument nije pronađen")
        
        # Ako je slika, vrati je direktno
        if ocr_service.is_supported_format(document.filename):
            # Kreiraj test sliku za demo (u produkciji bi se čitala iz storage-a)
            # Kreiraj demo sliku
            img = Image.new('RGB', (400, 200), color='white')
            draw = ImageDraw.Draw(img)
            
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 20)
            except:
                font = ImageFont.load_default()
            
            draw.text((20, 20), f"Demo slika za {document.filename}", fill='black', font=font)
            draw.text((20, 50), "Ovo je test slika za OCR", fill='black', font=font)
            draw.text((20, 80), "AcAIA RAG System", fill='black', font=font)
            
            # Konvertuj u bytes
            img_byte_arr = io.BytesIO()
            img.save(img_byte_arr, format='PNG')
            img_byte_arr = img_byte_arr.getvalue()
            
            return Response(content=img_byte_arr, media_type="image/png")
        
        # Za ostale dokumente, koristi postojeću logiku
        document_data = rag_service.vector_store.get_document(doc_id)
        
        if not document_data:
            raise HTTPException(status_code=404, detail="Sadržaj dokumenta nije pronađen")
        
        if page is not None:
            if page < 0 or page >= len(document_data['pages']):
                raise HTTPException(status_code=400, detail="Nevažeći broj stranice")
            
            page_content = document_data['pages'][page]
            return {
                "status": "success",
                "page": page,
                "content": page_content['content'],
                "chunks": page_content['chunks']
            }
        else:
            # Vrati sve stranice
            all_content = []
            for i, page_data in enumerate(document_data['pages']):
                all_content.append({
                    "page": i,
                    "content": page_data['content'],
                    "chunks": page_data['chunks']
                })
            
            return {
                "status": "success",
                "total_pages": len(document_data['pages']),
                "pages": all_content
            }
            
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, db: Session = Depends(get_db)):
    """Briše dokument iz RAG sistema"""
    try:
        success = rag_service.delete_document_from_db(doc_id, db)
        if success:
            return {
                "status": "success",
                "message": f"Dokument {doc_id} je obrisan"
            }
        else:
            raise HTTPException(status_code=404, detail="Dokument nije pronađen")
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/rag/stats")
async def get_rag_stats():
    """Statistike RAG sistema"""
    try:
        stats = rag_service.get_stats()
        return {
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/rag/test")
async def test_rag_connection():
    """Test RAG povezanosti"""
    try:
        result = rag_service.test_connection()
        return result
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/search/rerank")
async def test_rerank_search(message: dict):
    """Test endpoint za re-ranking funkcionalnost"""
    try:
        query = message.get("query", "")
        use_rerank = message.get("use_rerank", True)
        use_metadata = message.get("use_metadata", True)
        top_k = message.get("top_k", 5)
        
        if not query.strip():
            raise HTTPException(status_code=400, detail="Upit ne može biti prazan")
        
        # Testiraj različite metode pretrage
        results = {}
        
        # 1. Obična pretraga bez re-ranking-a
        basic_results = rag_service.search_documents(query, top_k, use_rerank=False)
        results['basic_search'] = {
            'count': len(basic_results),
            'results': basic_results
        }
        
        # 2. Pretraga sa re-ranking-om
        if use_rerank:
            rerank_results = rag_service.search_documents_with_rerank(
                query, top_k, use_metadata
            )
            results['rerank_search'] = {
                'count': len(rerank_results),
                'results': rerank_results
            }
        
        # 3. Standardna pretraga sa re-ranking-om
        standard_rerank_results = rag_service.search_documents(query, top_k, use_rerank=True)
        results['standard_rerank'] = {
            'count': len(standard_rerank_results),
            'results': standard_rerank_results
        }
        
        return {
            "status": "success",
            "query": query,
            "reranker_info": rag_service.reranker.get_model_info(),
            "results": results
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/rerank/info")
async def get_reranker_info():
    """Dohvata informacije o re-ranker modelu"""
    try:
        info = rag_service.reranker.get_model_info()
        return {
            "status": "success",
            "reranker_info": info
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}


@app.post("/chat/rag-multistep")
async def multi_step_rag_chat_endpoint(message: dict, db: Session = Depends(get_db)):
    """Multi-step RAG chat endpoint"""
    try:
        user_message = message.get("message", "")
        session_id = message.get("session_id", "default")
        use_rerank = message.get("use_rerank", True)
        
        if not user_message.strip():
            raise HTTPException(status_code=400, detail="Poruka ne može biti prazna")
        
        # Sačuvaj korisničku poruku u bazu
        user_db_message = ChatMessage(
            sender="user",
            content=user_message,
            session_id=session_id
        )
        db.add(user_db_message)
        db.commit()
        
        # Dohvati kontekst prethodnih poruka
        context = get_conversation_context(session_id, db)
        
        # Generiši multi-step RAG odgovor
        rag_response = rag_service.generate_multi_step_rag_response(
            user_message, 
            context, 
            max_results=3,
            use_rerank=use_rerank
        )
        
        if rag_response["status"] == "success":
            ai_response = rag_response["response"]
            
            # Sačuvaj AI odgovor u bazu
            ai_db_message = ChatMessage(
                sender="ai",
                content=ai_response,
                session_id=session_id
            )
            db.add(ai_db_message)
            db.commit()
            
            return {
                "status": "success",
                "response": ai_response,
                "session_id": session_id,
                "sources": rag_response.get("sources", []),
                "used_rag": rag_response.get("used_rag", False),
                "reranking_applied": rag_response.get("reranking_applied", False),
                "reranker_info": rag_response.get("reranker_info"),
                "multi_step_info": rag_response.get("multi_step_info")
            }
        else:
            return {"status": "error", "message": rag_response.get("message", "Greška pri multi-step RAG generisanju")}
        
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

@app.post("/search/multistep")
async def test_multi_step_search(message: dict):
    """Test endpoint za multi-step retrieval funkcionalnost"""
    try:
        query = message.get("query", "")
        use_rerank = message.get("use_rerank", True)
        top_k = message.get("top_k", 5)
        
        if not query.strip():
            raise HTTPException(status_code=400, detail="Upit ne može biti prazan")
        
        # Multi-step retrieval
        multi_step_result = rag_service.multi_step_retrieval.multi_step_search(
            query, top_k, use_rerank
        )
        
        # Query analytics
        analytics = rag_service.get_query_analytics(query)
        
        return {
            "status": "success",
            "query": query,
            "multi_step_result": multi_step_result,
            "analytics": analytics
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/multistep/info")
async def get_multi_step_info():
    """Dohvata informacije o multi-step retrieval sistemu"""
    try:
        return {
            "status": "success",
            "multi_step_info": {
                "complex_indicators": rag_service.multi_step_retrieval.complex_query_indicators,
                "description": "Multi-step retrieval sistem za složene upite"
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# OCR Endpoints
@app.get("/ocr/info")
async def get_ocr_info():
    """Dohvata informacije o OCR servisu"""
    try:
        info = ocr_service.get_ocr_info()
        return {
            "status": "success",
            "ocr_info": info
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/ocr/extract")
async def extract_text_from_image(file: UploadFile = File(...)):
    """Ekstraktuje tekst iz slike koristeći OCR"""
    try:
        # Proveri da li je podržan format
        if not ocr_service.is_supported_format(file.filename):
            raise HTTPException(
                status_code=400, 
                detail=f"Format {file.filename} nije podržan. Podržani formati: {ocr_service.get_supported_formats()}"
            )
        
        # Učitaj fajl
        file_content = await file.read()
        
        # Ekstraktuj tekst
        result = ocr_service.extract_text_from_bytes(
            file_content, 
            file.filename,
            languages=['srp', 'eng']  # Podržani jezici
        )
        
        return {
            "status": "success",
            "filename": file.filename,
            "ocr_result": result
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/ocr/supported-formats")
async def get_supported_formats():
    """Dohvata listu podržanih formata slika"""
    try:
        return {
            "status": "success",
            "supported_formats": ocr_service.get_supported_formats(),
            "supported_languages": ocr_service.get_supported_languages()
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/ocr/statistics")
async def get_ocr_statistics():
    """Dohvata napredne OCR statistike"""
    try:
        stats = ocr_service.get_ocr_statistics()
        return {
            "status": "success",
            "ocr_statistics": stats
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/ocr/extract-advanced")
async def extract_text_advanced(
    file: UploadFile = File(...),
    min_confidence: float = 50.0,
    languages: str = "srp,eng",
    deskew: bool = False,
    resize: bool = False
):
    """Napredna OCR ekstrakcija sa opcijama"""
    try:
        # Proveri da li je podržan format
        if not ocr_service.is_supported_format(file.filename):
            raise HTTPException(
                status_code=400, 
                detail=f"Format {file.filename} nije podržan. Podržani formati: {ocr_service.get_supported_formats()}"
            )
        
        # Učitaj fajl
        file_content = await file.read()
        
        # Sačuvaj privremeno
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            temp_file.write(file_content)
            temp_file_path = temp_file.name
        
        try:
            # Postavi preprocessing opcije
            preprocessing_options = {
                'grayscale': True,
                'denoise': True,
                'adaptive_threshold': True,
                'morphology': True,
                'deskew': deskew,
                'resize': resize
            }
            
            # Parsiraj jezike
            language_list = [lang.strip() for lang in languages.split(',')]
            
            # Ekstraktuj tekst sa naprednim opcijama
            result = ocr_service.extract_text_with_preprocessing_options(
                temp_file_path,
                preprocessing_options,
                language_list
            )
            
            # Primeni confidence filter
            if result['status'] == 'success' and result['confidence'] < min_confidence:
                result['status'] = 'low_confidence'
                result['message'] = f'Confidence score ({result["confidence"]:.1f}%) je ispod minimuma ({min_confidence}%)'
            
            return {
                "status": "success",
                "filename": file.filename,
                "ocr_result": result,
                "options_applied": {
                    "min_confidence": min_confidence,
                    "languages": language_list,
                    "deskew": deskew,
                    "resize": resize
                }
            }
            
        finally:
            # Obriši privremeni fajl
            if os.path.exists(temp_file_path):
                os.unlink(temp_file_path)
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/ocr/batch-extract")
async def batch_extract_text(files: List[UploadFile] = File(...), languages: str = "srp,eng"):
    """Batch OCR ekstrakcija za više slika"""
    try:
        results = []
        language_list = [lang.strip() for lang in languages.split(',')]
        
        for file in files:
            try:
                # Proveri format
                if not ocr_service.is_supported_format(file.filename):
                    results.append({
                        "filename": file.filename,
                        "status": "error",
                        "message": f"Format nije podržan"
                    })
                    continue
                
                # Učitaj fajl
                file_content = await file.read()
                
                # Ekstraktuj tekst
                result = ocr_service.extract_text_from_bytes(
                    file_content, 
                    file.filename,
                    language_list
                )
                
                results.append({
                    "filename": file.filename,
                    "status": "success",
                    "ocr_result": result
                })
                
            except Exception as e:
                results.append({
                    "filename": file.filename,
                    "status": "error",
                    "message": str(e)
                })
        
        return {
            "status": "success",
            "total_files": len(files),
            "processed_files": len(results),
            "results": results
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}
