import os
import sys
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from ollama import Client
from sqlalchemy.orm import Session
from typing import List
import uuid
import tempfile
from PIL import Image, ImageDraw, ImageFont
import io
from fastapi.responses import Response
from datetime import datetime
import json
from fastapi import WebSocket
from fastapi import WebSocketDisconnect

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
from .multi_step_retrieval import MultiStepRetrieval
from .reranker import Reranker
from .config import Config
from .cache_manager import cache_manager
from .background_tasks import task_manager, add_background_task, get_task_status, cancel_task, get_all_tasks, get_task_stats, TaskPriority, TaskStatus
from .connection_pool import connection_pool, check_connection_health, get_connection_stats, ConnectionType
from .websocket import websocket_manager, WebSocketMessage, MessageType, get_websocket_manager
from .error_handler import (
    error_handler, handle_api_error, ErrorCategory, ErrorSeverity,
    AcAIAException, ValidationError, ExternalServiceError, RAGError, OCRError,
    ErrorHandlingMiddleware
)
from .query_rewriter import query_rewriter, QueryEnhancement

# Inicijalizuj RAG servis sa Supabase podrškom
rag_service = RAGService(use_supabase=True)
ocr_service = OCRService()  # Dodaj OCR service

# Dodaj error handling middleware
app.add_middleware(ErrorHandlingMiddleware)

# Globalni exception handler
@app.exception_handler(AcAIAException)
async def acaia_exception_handler(request: Request, exc: AcAIAException):
    """Handler za AcAIA custom greške"""
    return await handle_api_error(exc, request, exc.category, exc.severity, exc.error_code)

@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handler za HTTP greške"""
    return await handle_api_error(exc, request, ErrorCategory.GENERAL, ErrorSeverity.MEDIUM)

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Globalni exception handler za sve neuhvaćene greške"""
    return await handle_api_error(exc, request)

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
        
        return {"status": "success", "sessions": sessions}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/chat/session/{session_id}")
async def delete_session(session_id: str, db: Session = Depends(get_db)):
    try:
        # Obriši sve poruke za sesiju
        db.query(ChatMessage).filter(ChatMessage.session_id == session_id).delete()
        db.commit()
        return {"status": "success", "message": "Sesija obrisana"}
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

# Supabase Chat History Endpoints
@app.get("/supabase/chat/history/{session_id}")
async def get_supabase_chat_history(session_id: str, limit: int = 50):
    """Dohvata chat istoriju iz Supabase"""
    try:
        if not rag_service.use_supabase:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        history = rag_service.supabase_manager.get_chat_history(session_id, limit)
        
        return {
            "status": "success",
            "session_id": session_id,
            "messages": history,
            "count": len(history)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/supabase/chat/sessions")
async def get_supabase_sessions():
    """Dohvata sve chat sesije iz Supabase"""
    try:
        if not rag_service.use_supabase:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        # Dohvati sve chat poruke i grupiši po sesijama
        all_messages = rag_service.supabase_manager.client.table('chat_history').select('*').execute()
        
        # Grupiši po session_id
        sessions = {}
        for msg in all_messages.data:
            session_id = msg['session_id']
            if session_id not in sessions:
                sessions[session_id] = {
                    'session_id': session_id,
                    'message_count': 0,
                    'first_message': None,
                    'last_message': None
                }
            
            sessions[session_id]['message_count'] += 1
            
            if not sessions[session_id]['first_message'] or msg['created_at'] < sessions[session_id]['first_message']:
                sessions[session_id]['first_message'] = msg['created_at']
            
            if not sessions[session_id]['last_message'] or msg['created_at'] > sessions[session_id]['last_message']:
                sessions[session_id]['last_message'] = msg['created_at']
        
        sessions_list = list(sessions.values())
        sessions_list.sort(key=lambda x: x['last_message'], reverse=True)
        
        return {
            "status": "success",
            "sessions": sessions_list,
            "count": len(sessions_list)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/supabase/chat/session/{session_id}")
async def delete_supabase_session(session_id: str):
    """Briše chat sesiju iz Supabase"""
    try:
        if not rag_service.use_supabase:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        # Obriši sve poruke za sesiju
        rag_service.supabase_manager.client.table('chat_history').delete().eq('session_id', session_id).execute()
        
        return {"status": "success", "message": "Sesija obrisana iz Supabase"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Supabase Retrieval Sessions Endpoints
@app.get("/supabase/retrieval/sessions")
async def get_supabase_retrieval_sessions(session_id: str = None):
    """Dohvata retrieval sesije iz Supabase"""
    try:
        if not rag_service.use_supabase:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        sessions = rag_service.supabase_manager.get_retrieval_sessions(session_id)
        
        return {
            "status": "success",
            "sessions": sessions,
            "count": len(sessions)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/supabase/retrieval/session/{session_id}")
async def get_supabase_retrieval_session(session_id: str):
    """Dohvata specifičnu retrieval sesiju iz Supabase"""
    try:
        if not rag_service.use_supabase:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        sessions = rag_service.supabase_manager.get_retrieval_sessions(session_id)
        
        if not sessions:
            raise HTTPException(status_code=404, detail="Sesija nije pronađena")
        
        return {
            "status": "success",
            "session": sessions[0]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Supabase OCR Endpoints
@app.get("/supabase/ocr/images")
async def get_supabase_ocr_images():
    """Dohvata sve OCR obrađene slike iz Supabase"""
    try:
        if not rag_service.use_supabase:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        images = rag_service.supabase_manager.get_ocr_images()
        
        return {
            "status": "success",
            "images": images,
            "count": len(images)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/supabase/ocr/image/{image_id}")
async def get_supabase_ocr_image(image_id: str):
    """Dohvata specifičnu OCR sliku iz Supabase"""
    try:
        if not rag_service.use_supabase:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        # Dohvati sliku po ID-u
        result = rag_service.supabase_manager.client.table('ocr_images').select('*').eq('id', image_id).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="OCR slika nije pronađena")
        
        return {
            "status": "success",
            "image": result.data[0]
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Supabase Statistics Endpoints
@app.get("/supabase/stats")
async def get_supabase_stats():
    """Dohvata statistike iz Supabase"""
    try:
        if not rag_service.use_supabase:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        stats = rag_service.supabase_manager.get_database_stats()
        
        return {
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/supabase/health")
async def check_supabase_health():
    """Proverava zdravlje Supabase konekcije"""
    try:
        if not rag_service.use_supabase:
            return {
                "status": "disabled",
                "message": "Supabase nije omogućen"
            }
        
        # Test konekcije
        is_connected = rag_service.supabase_manager.test_connection()
        
        if is_connected:
            return {
                "status": "healthy",
                "message": "Supabase konekcija je u redu",
                "supabase_enabled": True
            }
        else:
            return {
                "status": "unhealthy",
                "message": "Supabase konekcija nije uspešna",
                "supabase_enabled": True
            }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e),
            "supabase_enabled": rag_service.use_supabase
        }

# Ažurirani RAG endpoint sa session_id podrškom
@app.post("/chat/rag")
async def rag_chat_endpoint(message: dict, db: Session = Depends(get_db)):
    try:
        user_message = message.get("message", "")
        session_id = message.get("session_id", str(uuid.uuid4()))
        use_rerank = message.get("use_rerank", True)
        max_results = message.get("max_results", 3)
        
        if not user_message.strip():
            raise HTTPException(status_code=400, detail="Poruka ne može biti prazna")
        
        # Dohvati kontekst prethodnih poruka
        context = get_conversation_context(session_id, db)
        
        # Generiši RAG odgovor sa session_id podrškom (sada async)
        rag_response = await rag_service.generate_rag_response(
            query=user_message,
            context=context,
            max_results=max_results,
            use_rerank=use_rerank,
            session_id=session_id
        )
        
        # Sačuvaj poruke u lokalnu bazu za kompatibilnost
        user_db_message = ChatMessage(
            sender="user",
            content=user_message,
            session_id=session_id
        )
        db.add(user_db_message)
        
        ai_db_message = ChatMessage(
            sender="ai",
            content=rag_response['response'],
            session_id=session_id
        )
        db.add(ai_db_message)
        db.commit()
        
        return {
            "status": "success",
            "response": rag_response['response'],
            "sources": rag_response.get('sources', []),
            "session_id": session_id,
            "model": rag_response.get('model', 'mistral'),
            "context_length": rag_response.get('context_length', 0),
            "cached": rag_response.get('cached', False)
        }
        
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

# Ažurirani multi-step RAG endpoint sa session_id podrškom
@app.post("/chat/rag-multistep")
async def multi_step_rag_chat_endpoint(message: dict, db: Session = Depends(get_db)):
    try:
        user_message = message.get("message", "")
        session_id = message.get("session_id", str(uuid.uuid4()))
        use_rerank = message.get("use_rerank", True)
        max_results = message.get("max_results", 3)
        
        if not user_message.strip():
            raise HTTPException(status_code=400, detail="Poruka ne može biti prazna")
        
        # Dohvati kontekst prethodnih poruka
        context = get_conversation_context(session_id, db)
        
        # Generiši multi-step RAG odgovor sa session_id podrškom (sada async)
        rag_response = await rag_service.generate_multi_step_rag_response(
            query=user_message,
            context=context,
            max_results=max_results,
            use_rerank=use_rerank,
            session_id=session_id
        )
        
        # Sačuvaj poruke u lokalnu bazu za kompatibilnost
        user_db_message = ChatMessage(
            sender="user",
            content=user_message,
            session_id=session_id
        )
        db.add(user_db_message)
        
        ai_db_message = ChatMessage(
            sender="ai",
            content=rag_response['response'],
            session_id=session_id
        )
        db.add(ai_db_message)
        db.commit()
        
        return {
            "status": "success",
            "response": rag_response['response'],
            "sources": rag_response.get('sources', []),
            "session_id": session_id,
            "model": rag_response.get('model', 'mistral'),
            "retrieval_steps": rag_response.get('retrieval_steps', []),
            "context_length": rag_response.get('context_length', 0),
            "cached": rag_response.get('cached', False)
        }
        
    except Exception as e:
        db.rollback()
        return {"status": "error", "message": str(e)}

# RAG API Endpoints

@app.post("/documents/upload")
async def upload_document(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Upload dokumenta za RAG sistem"""
    try:
        # Proveri tip fajla koristeći konfiguraciju
        if not Config.is_file_type_allowed(file.filename):
            raise HTTPException(
                status_code=400, 
                detail=f"Format {os.path.splitext(file.filename)[1]} nije podržan. Podržani formati: {', '.join(Config.get_allowed_extensions())}"
            )
        
        # Pročitaj sadržaj fajla
        file_content = await file.read()
        
        # Proveri veličinu fajla
        if not Config.is_file_size_valid(len(file_content)):
            raise HTTPException(
                status_code=400,
                detail=f"Fajl je prevelik. Maksimalna veličina: {Config.MAX_FILE_SIZE / (1024 * 1024)}MB"
            )
        
        # Ako je slika, prvo izvrši OCR
        if ocr_service.is_supported_format(file.filename):
            try:
                # Izvrši OCR na slici
                ocr_result = ocr_service.extract_text_from_bytes(file_content, file.filename)
                
                if ocr_result['status'] == 'success':
                    # Kreiraj tekstualni sadržaj iz OCR rezultata
                    extracted_text = ocr_result['text']
                    
                    if not extracted_text.strip():
                        return {
                            "status": "warning",
                            "message": "Nije pronađen tekst na slici",
                            "filename": file.filename,
                            "ocr_result": ocr_result
                        }
                    
                    # Kreiraj privremeni tekstualni fajl sa OCR rezultatima
                    temp_filename = f"ocr_{file.filename}.txt"
                    
                    # Upload OCR rezultata kao tekstualni dokument
                    result = rag_service.upload_document(
                        extracted_text.encode('utf-8'), 
                        temp_filename, 
                        db,
                        original_filename=file.filename,
                        ocr_metadata=ocr_result
                    )
                    
                    if result['status'] == 'success':
                        return {
                            "status": "success",
                            "message": f"Slika uspešno obrađena OCR-om i dodata u RAG sistem",
                            "filename": file.filename,
                            "extracted_text_length": len(extracted_text),
                            "ocr_confidence": ocr_result.get('confidence', 0),
                            "document_id": result.get('document_id'),
                            "ocr_result": ocr_result
                        }
                    else:
                        raise HTTPException(status_code=500, detail=result['message'])
                else:
                    raise HTTPException(status_code=500, detail=f"OCR greška: {ocr_result['message']}")
                    
            except Exception as ocr_error:
                raise HTTPException(status_code=500, detail=f"Greška pri OCR obradi: {str(ocr_error)}")
        else:
            # Za ostale dokumente, koristi postojeću logiku
            result = rag_service.upload_document(file_content, file.filename, db)
            
            if result['status'] == 'success':
                return result
            else:
                raise HTTPException(status_code=500, detail=result['message'])
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
                "filename": document_data['filename'],
                "file_type": document_data['file_type'],
                "total_pages": len(document_data['pages']),
                "pages": [
                    {
                        "page": page,
                        "content": page_content['content'],
                        "chunks": page_content['chunks']
                    }
                ]
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
                "filename": document_data['filename'],
                "file_type": document_data['file_type'],
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
        
        # Ekstraktuj tekst koristeći konfiguraciju
        result = ocr_service.extract_text_from_bytes(
            file_content, 
            file.filename,
            languages=Config.OCR_DEFAULT_LANGUAGES
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
    min_confidence: float = None,
    languages: str = None,
    deskew: bool = False,
    resize: bool = False
):
    """Napredna OCR ekstrakcija sa opcijama"""
    try:
        # Koristi konfiguraciju ako nije prosleđeno
        if min_confidence is None:
            min_confidence = Config.OCR_MIN_CONFIDENCE
        if languages is None:
            languages = ",".join(Config.OCR_DEFAULT_LANGUAGES)
        
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
async def batch_extract_text(files: List[UploadFile] = File(...), languages: str = None):
    """Batch OCR ekstrakcija za više slika"""
    try:
        # Koristi konfiguraciju ako nije prosleđeno
        if languages is None:
            languages = ",".join(Config.OCR_DEFAULT_LANGUAGES)
        
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

@app.get("/cache/health")
async def cache_health_check():
    """Provera zdravlja cache-a"""
    try:
        health_status = await cache_manager.health_check()
        return health_status
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/cache/stats")
async def cache_stats():
    """Dohvati statistike cache-a"""
    try:
        stats = await cache_manager.get_stats()
        return stats
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/cache/clear")
async def clear_cache(pattern: str = "*"):
    """Obriši cache"""
    try:
        deleted_count = await cache_manager.clear_cache(pattern)
        return {
            "status": "success",
            "message": f"Obrisano {deleted_count} ključeva iz cache-a",
            "deleted_count": deleted_count
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/cache/test")
async def test_cache():
    """Test cache funkcionalnosti"""
    try:
        # Test čitanja/pisanja
        test_key = "test_cache_key"
        test_value = {"message": "Test cache", "timestamp": datetime.now().isoformat()}
        
        # Test pisanja
        write_success = await cache_manager.set(test_key, test_value, 60)
        
        # Test čitanja
        read_value = await cache_manager.get(test_key)
        
        # Test brisanja
        delete_success = await cache_manager.delete(test_key)
        
        return {
            "status": "success",
            "write_success": write_success,
            "read_success": read_value is not None,
            "delete_success": delete_success,
            "test_value": test_value,
            "read_value": read_value
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.on_event("startup")
async def startup_event():
    """Pokreni background task manager i connection pool na startup-u"""
    await task_manager.start()
    print("Background task manager pokrenut")

@app.on_event("shutdown")
async def shutdown_event():
    """Zaustavi background task manager i connection pool na shutdown-u"""
    await task_manager.stop()
    await connection_pool.close_all()
    print("Background task manager i connection pool zaustavljeni")

# Background Tasks API Endpoints

@app.post("/tasks/add")
async def add_task_endpoint(task_data: dict):
    """Dodaj novi background task"""
    try:
        func_name = task_data.get("function")
        args = task_data.get("args", [])
        kwargs = task_data.get("kwargs", {})
        priority = TaskPriority(task_data.get("priority", TaskPriority.NORMAL.value))
        description = task_data.get("description", f"Task: {func_name}")
        
        # Mapiranje funkcija
        function_map = {
            "test_task": lambda: {"message": "Test task završen", "timestamp": datetime.now().isoformat()},
            "heavy_computation": lambda: {"result": "Heavy computation završen", "data": list(range(1000))},
            "data_processing": lambda: {"processed": True, "items": 100}
        }
        
        if func_name not in function_map:
            raise HTTPException(status_code=400, detail=f"Funkcija {func_name} nije podržana")
        
        task_id = await add_background_task(
            function_map[func_name],
            priority=priority,
            description=description
        )
        
        return {
            "status": "success",
            "task_id": task_id,
            "message": "Task dodat u queue"
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/tasks")
async def get_all_tasks_endpoint(status: str = None):
    """Dohvati sve taskove sa opcionim filterom"""
    try:
        status_filter = None
        if status:
            try:
                status_filter = TaskStatus(status)
            except ValueError:
                raise HTTPException(status_code=400, detail=f"Nevažeći status: {status}")
        
        tasks = await get_all_tasks(status_filter)
        
        return {
            "status": "success",
            "tasks": tasks,
            "total_count": len(tasks)
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/tasks/stats")
async def get_task_stats_endpoint():
    """Dohvati statistike taskova"""
    try:
        stats = await get_task_stats()
        return {
            "status": "success",
            "stats": stats
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/tasks/{task_id}")
async def get_task_status_endpoint(task_id: str):
    """Dohvati status taska"""
    try:
        status = await get_task_status(task_id)
        if not status:
            raise HTTPException(status_code=404, detail="Task nije pronađen")
        
        return {
            "status": "success",
            "task": status
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/tasks/{task_id}")
async def cancel_task_endpoint(task_id: str):
    """Otkaži task"""
    try:
        cancelled = await cancel_task(task_id)
        if not cancelled:
            raise HTTPException(status_code=404, detail="Task nije pronađen ili se ne može otkazati")
        
        return {
            "status": "success",
            "message": "Task otkazan"
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Connection Pool API Endpoints

@app.get("/connections/health")
async def check_connections_health():
    """Proveri zdravlje svih konekcija"""
    try:
        results = {}
        
        for conn_type in ConnectionType:
            health = await check_connection_health(conn_type)
            results[conn_type.value] = health
        
        return {
            "status": "success",
            "connections": results
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/connections/health/{connection_type}")
async def check_specific_connection_health(connection_type: str):
    """Proveri zdravlje specifične konekcije"""
    try:
        try:
            conn_type = ConnectionType(connection_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Nevažeći tip konekcije: {connection_type}")
        
        health = await check_connection_health(conn_type)
        
        return {
            "status": "success",
            "connection_type": connection_type,
            "health": health
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/connections/stats")
async def get_connections_stats():
    """Dohvati statistike svih konekcija"""
    try:
        stats = await get_connection_stats()
        return {
            "status": "success",
            "stats": stats
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/connections/stats/{connection_type}")
async def get_specific_connection_stats(connection_type: str):
    """Dohvati statistike specifične konekcije"""
    try:
        try:
            conn_type = ConnectionType(connection_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Nevažeći tip konekcije: {connection_type}")
        
        stats = await get_connection_stats(conn_type)
        
        return {
            "status": "success",
            "stats": stats
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Performance Monitoring Endpoints

@app.get("/performance/overview")
async def get_performance_overview():
    """Dohvati pregled performansi sistema"""
    try:
        # Dohvati statistike iz različitih komponenti
        cache_stats = await cache_manager.get_stats()
        task_stats = await get_task_stats()
        connection_stats = await get_connection_stats()
        
        # Dohvati RAG statistike
        rag_stats = rag_service.get_stats()
        
        return {
            "status": "success",
            "performance": {
                "cache": cache_stats,
                "background_tasks": task_stats,
                "connections": connection_stats,
                "rag": rag_stats
            }
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

# WebSocket Chat Endpoints

@app.websocket("/ws/chat")
async def websocket_chat_endpoint(websocket: WebSocket, user_id: str = None, session_id: str = None):
    """WebSocket endpoint za real-time chat"""
    try:
        # Prihvati konekciju
        connection = await websocket_manager.connect(websocket, user_id, session_id)
        
        try:
            while True:
                # Čekaj poruku od klijenta
                data = await websocket.receive_text()
                
                try:
                    # Parsiraj JSON poruku
                    message_data = json.loads(data)
                    message = WebSocketMessage.from_dict(message_data)
                    
                    # Ažuriraj statistike
                    websocket_manager.stats["total_messages"] += 1
                    websocket_manager.stats["messages_received"] += 1
                    
                    # Obradi poruku na osnovu tipa
                    if message.message_type == MessageType.CHAT:
                        await handle_chat_message(connection, message)
                    elif message.message_type == MessageType.TYPING:
                        await handle_typing_message(connection, message)
                    elif message.message_type == MessageType.STATUS:
                        await handle_status_message(connection, message)
                    else:
                        # Broadcast poruku u sesiju
                        await websocket_manager.broadcast_to_session(message, connection.session_id)
                        
                except json.JSONDecodeError:
                    # Ako nije validan JSON, pošalji error poruku
                    error_message = WebSocketMessage(
                        message_type=MessageType.SYSTEM,
                        content={"error": "Nevažeći JSON format"},
                        sender="system"
                    )
                    await connection.send_message(error_message)
                    
        except WebSocketDisconnect:
            # Klijent se odjavio
            websocket_manager.disconnect(connection)
            
            # Objavi da se korisnik odjavio
            leave_message = WebSocketMessage(
                message_type=MessageType.LEAVE,
                content={
                    "user_id": connection.user_id,
                    "session_id": connection.session_id
                },
                sender=connection.user_id
            )
            
            await websocket_manager.broadcast_to_session(leave_message, connection.session_id)
            
    except Exception as e:
        logger.error(f"WebSocket greška: {e}")
        try:
            await websocket.close()
        except:
            pass

async def handle_chat_message(connection, message: WebSocketMessage):
    """Obradi chat poruku"""
    try:
        # Broadcast poruku u sesiju
        await websocket_manager.broadcast_to_session(message, connection.session_id)
        
        # Ako je poruka ka AI-u, generiši odgovor
        if message.content.get("to_ai", False):
            await generate_ai_response(connection, message)
            
    except Exception as e:
        logger.error(f"Greška pri obradi chat poruke: {e}")

async def handle_typing_message(connection, message: WebSocketMessage):
    """Obradi typing indicator poruku"""
    try:
        is_typing = message.content.get("is_typing", False)
        connection.is_typing = is_typing
        
        # Broadcast typing indicator u sesiju
        await websocket_manager.broadcast_to_session(message, connection.session_id)
        
    except Exception as e:
        logger.error(f"Greška pri obradi typing poruke: {e}")

async def handle_status_message(connection, message: WebSocketMessage):
    """Obradi status poruku"""
    try:
        # Broadcast status update u sesiju
        await websocket_manager.broadcast_to_session(message, connection.session_id)
        
    except Exception as e:
        logger.error(f"Greška pri obradi status poruke: {e}")

async def generate_ai_response(connection, user_message: WebSocketMessage):
    """Generiši AI odgovor na chat poruku"""
    try:
        # Pošalji typing indicator da AI kuca
        await websocket_manager.send_typing_indicator(connection.session_id, "ai", True)
        
        # Generiši odgovor koristeći postojeći RAG servis
        user_text = user_message.content.get("text", "")
        
        # Koristi postojeći RAG endpoint logiku
        rag_response = await rag_service.generate_rag_response(
            query=user_text,
            context="",
            max_results=3,
            use_rerank=True,
            session_id=connection.session_id
        )
        
        # Kreiraj AI odgovor
        ai_message = WebSocketMessage(
            message_type=MessageType.CHAT,
            content={
                "text": rag_response['response'],
                "sources": rag_response.get('sources', []),
                "from_ai": True,
                "model": rag_response.get('model', 'mistral')
            },
            sender="ai",
            session_id=connection.session_id
        )
        
        # Pošalji AI odgovor u sesiju
        await websocket_manager.broadcast_to_session(ai_message, connection.session_id)
        
        # Zaustavi typing indicator
        await websocket_manager.send_typing_indicator(connection.session_id, "ai", False)
        
    except Exception as e:
        logger.error(f"Greška pri generisanju AI odgovora: {e}")
        
        # Pošalji error poruku
        error_message = WebSocketMessage(
            message_type=MessageType.SYSTEM,
            content={"error": "Greška pri generisanju AI odgovora"},
            sender="system"
        )
        await connection.send_message(error_message)
        
        # Zaustavi typing indicator
        await websocket_manager.send_typing_indicator(connection.session_id, "ai", False)

# WebSocket Management Endpoints

@app.get("/websocket/stats")
async def get_websocket_stats():
    """Dohvati statistike WebSocket konekcija"""
    try:
        stats = websocket_manager.get_connection_stats()
        return {
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/websocket/sessions")
async def get_websocket_sessions():
    """Dohvati listu aktivnih WebSocket sesija"""
    try:
        sessions = {}
        for session_id in websocket_manager.session_connections:
            sessions[session_id] = websocket_manager.get_session_info(session_id)
        
        return {
            "status": "success",
            "sessions": sessions
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/websocket/session/{session_id}")
async def get_websocket_session_info(session_id: str):
    """Dohvati informacije o specifičnoj WebSocket sesiji"""
    try:
        session_info = websocket_manager.get_session_info(session_id)
        return {
            "status": "success",
            "session": session_info
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Error Monitoring Endpoints

@app.get("/errors/stats")
async def get_error_stats():
    """Dohvati statistike grešaka"""
    try:
        stats = error_handler.get_error_stats()
        return {
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/errors/recent")
async def get_recent_errors(limit: int = 10):
    """Dohvati poslednje greške"""
    try:
        recent_errors = error_handler.error_log[-limit:] if error_handler.error_log else []
        
        formatted_errors = []
        for error in recent_errors:
            formatted_errors.append({
                "code": error.error_code,
                "message": error.message,
                "category": error.category.value,
                "severity": error.severity.value,
                "timestamp": error.context.timestamp.isoformat() if error.context.timestamp else None,
                "endpoint": error.context.endpoint,
                "method": error.context.method,
                "ip_address": error.context.ip_address,
                "retry_count": error.retry_count
            })
        
        return {
            "status": "success",
            "errors": formatted_errors
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/errors/category/{category}")
async def get_errors_by_category(category: str, limit: int = 20):
    """Dohvati greške po kategoriji"""
    try:
        category_errors = [
            error for error in error_handler.error_log 
            if error.category.value == category
        ][-limit:]
        
        formatted_errors = []
        for error in category_errors:
            formatted_errors.append({
                "code": error.error_code,
                "message": error.message,
                "severity": error.severity.value,
                "timestamp": error.context.timestamp.isoformat() if error.context.timestamp else None,
                "endpoint": error.context.endpoint,
                "retry_count": error.retry_count
            })
        
        return {
            "status": "success",
            "category": category,
            "count": len(formatted_errors),
            "errors": formatted_errors
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/errors/clear")
async def clear_error_log():
    """Obriši error log"""
    try:
        error_handler.error_log.clear()
        return {
            "status": "success",
            "message": "Error log je očišćen"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/errors/test")
async def test_error_handling():
    """Test error handling funkcionalnosti"""
    try:
        # Test različitih tipova grešaka
        test_errors = [
            ValidationError("Test validation greška", "TEST_VALIDATION_001"),
            ExternalServiceError("Test external service greška", "TEST_EXTERNAL_001"),
            RAGError("Test RAG greška", "TEST_RAG_001"),
            OCRError("Test OCR greška", "TEST_OCR_001")
        ]
        
        results = []
        for error in test_errors:
            # Simuliraj request context
            class MockRequest:
                def __init__(self):
                    self.url = type('obj', (object,), {'path': '/test/endpoint'})()
                    self.method = "POST"
                    self.client = type('obj', (object,), {'host': '127.0.0.1'})()
                    self.headers = {"user-agent": "Test-Agent"}
            
            mock_request = MockRequest()
            
            # Handle grešku
            response = await handle_api_error(error, mock_request)
            results.append({
                "error_type": type(error).__name__,
                "error_code": error.error_code,
                "status_code": response.status_code
            })
        
        return {
            "status": "success",
            "message": "Error handling test završen",
            "results": results
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Query Rewriter Endpoints

@app.post("/query/enhance")
async def enhance_query_endpoint(request: dict):
    """
    Poboljšaj upit za pretragu
    
    Request body:
    {
        "query": "originalni upit",
        "context": "dodatni kontekst (opciono)",
        "domain": "domena (opciono, default: general)",
        "max_enhancements": 3
    }
    """
    try:
        query = request.get("query", "").strip()
        if not query:
            raise HTTPException(status_code=400, detail="Query ne može biti prazan")
        
        context = request.get("context", "")
        domain = request.get("domain", "general")
        max_enhancements = request.get("max_enhancements", 3)
        
        # Poboljšaj upit
        enhancement = await query_rewriter.enhance_query(
            query=query,
            context=context,
            domain=domain,
            max_enhancements=max_enhancements
        )
        
        return {
            "status": "success",
            "enhancement": {
                "original_query": enhancement.original_query,
                "enhanced_query": enhancement.enhanced_query,
                "confidence": enhancement.confidence,
                "reasoning": enhancement.reasoning,
                "synonyms": enhancement.synonyms,
                "context_hints": enhancement.context_hints,
                "timestamp": enhancement.timestamp.isoformat()
            }
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/query/expand")
async def expand_query_endpoint(request: dict):
    """
    Proširi upit sa različitim varijantama
    
    Request body:
    {
        "query": "originalni upit",
        "domain": "domena (opciono, default: general)"
    }
    """
    try:
        query = request.get("query", "").strip()
        if not query:
            raise HTTPException(status_code=400, detail="Query ne može biti prazan")
        
        domain = request.get("domain", "general")
        
        # Proširi upit
        expanded_queries = await query_rewriter.expand_query(query, domain)
        
        return {
            "status": "success",
            "original_query": query,
            "expanded_queries": expanded_queries,
            "count": len(expanded_queries)
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/query/analyze")
async def analyze_query_endpoint(request: dict):
    """
    Analiziraj upit za intent, entitete i kompleksnost
    
    Request body:
    {
        "query": "upit za analizu",
        "domain": "domena (opciono, default: general)"
    }
    """
    try:
        query = request.get("query", "").strip()
        if not query:
            raise HTTPException(status_code=400, detail="Query ne može biti prazan")
        
        domain = request.get("domain", "general")
        
        # Analiziraj upit
        analysis = await query_rewriter._analyze_query(query, domain)
        
        return {
            "status": "success",
            "analysis": {
                "intent": analysis.intent,
                "entities": analysis.entities,
                "complexity": analysis.complexity,
                "domain": analysis.domain,
                "language": analysis.language
            }
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/query/stats")
async def get_query_rewriter_stats():
    """Dohvati statistike Query Rewriter servisa"""
    try:
        stats = await query_rewriter.get_enhancement_stats()
        return {
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/query/cache/clear")
async def clear_query_rewriter_cache():
    """Očisti Query Rewriter cache"""
    try:
        query_rewriter.clear_cache()
        return {
            "status": "success",
            "message": "Query rewriter cache je očišćen"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/query/test")
async def test_query_rewriter():
    """Test Query Rewriter funkcionalnosti"""
    try:
        test_queries = [
            {
                "query": "kako da naučim programiranje",
                "domain": "education",
                "description": "Edukativni upit"
            },
            {
                "query": "Python async await primer",
                "domain": "technical",
                "description": "Tehnički upit"
            },
            {
                "query": "šta je AI",
                "domain": "general",
                "description": "Opšti upit"
            }
        ]
        
        results = []
        for test in test_queries:
            try:
                # Test enhancement
                enhancement = await query_rewriter.enhance_query(
                    query=test["query"],
                    domain=test["domain"]
                )
                
                # Test expansion
                expanded = await query_rewriter.expand_query(
                    query=test["query"],
                    domain=test["domain"]
                )
                
                results.append({
                    "description": test["description"],
                    "original_query": test["query"],
                    "enhanced_query": enhancement.enhanced_query,
                    "confidence": enhancement.confidence,
                    "expanded_count": len(expanded),
                    "status": "success"
                })
                
            except Exception as e:
                results.append({
                    "description": test["description"],
                    "original_query": test["query"],
                    "error": str(e),
                    "status": "error"
                })
        
        return {
            "status": "success",
            "message": "Query rewriter test završen",
            "results": results
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}
