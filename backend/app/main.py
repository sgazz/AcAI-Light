"""
AcAIA Backend - Supabase verzija
Samo Supabase endpoint-i bez lokalne SQLite baze
"""

import os
import uuid
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from ollama import Client
import sys

# Dodaj backend direktorijum u path za import supabase_client
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import Supabase klijenta
try:
    from supabase_client import get_supabase_manager
    SUPABASE_AVAILABLE = True
except ImportError as e:
    print(f"Supabase nije dostupan: {e}")
    SUPABASE_AVAILABLE = False

# Import app modula
from .prompts import SYSTEM_PROMPT, CONTEXT_PROMPT
from .rag_service import RAGService
from .ocr_service import OCRService
from .config import Config
from .cache_manager import cache_manager
from .background_tasks import task_manager, add_background_task, get_task_status, cancel_task, get_all_tasks, get_task_stats, TaskPriority, TaskStatus
from .websocket import websocket_manager, WebSocketMessage, MessageType, get_websocket_manager
from .error_handler import (
    error_handler, handle_api_error, ErrorCategory, ErrorSeverity,
    AcAIAException, ValidationError, ExternalServiceError, RAGError, OCRError,
    ErrorHandlingMiddleware
)
from .query_rewriter import query_rewriter, QueryEnhancement
from .fact_checker import fact_checker, FactCheckResult, VerificationStatus

# Kreiraj FastAPI aplikaciju
app = FastAPI(
    title="AcAIA Backend - Supabase",
    description="Backend za AcAIA projekat sa Supabase integracijom",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicijalizuj servise
rag_service = RAGService(use_supabase=True)
ocr_service = OCRService()
ollama_client = Client(host="http://localhost:11434")

# Supabase manager
supabase_manager = None
if SUPABASE_AVAILABLE:
    try:
        supabase_manager = get_supabase_manager()
        print("✅ Supabase manager uspešno inicijalizovan")
    except Exception as e:
        print(f"❌ Greška pri inicijalizaciji Supabase: {e}")

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

def get_conversation_context(session_id: str, max_messages: int = 5) -> str:
    """Dohvati prethodne poruke za kontekst iz Supabase"""
    try:
        if not supabase_manager:
            return ""
        
        history = supabase_manager.get_chat_history(session_id, max_messages)
        
        if not history:
            return ""
        
        # Obrni redosled da bude hronološki
        history.reverse()
        
        context = []
        for msg in history:
            role = "korisnik" if msg.get('user_message') else "AI"
            content = msg.get('user_message') or msg.get('assistant_message', '')
            context.append(f"{role}: {content}")
        
        return "\n".join(context)
    except Exception as e:
        print(f"Greška pri dohvatanju konteksta iz Supabase: {e}")
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

# Osnovni endpoint-i
@app.get("/")
def read_root():
    return {"message": "AcAIA Backend - Supabase verzija"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "supabase_available": SUPABASE_AVAILABLE,
        "supabase_connected": supabase_manager.test_connection() if supabase_manager else False
    }

@app.post("/chat/new-session")
async def create_new_session():
    """Kreira novu chat sesiju"""
    session_id = str(uuid.uuid4())
    return {"session_id": session_id}

# Supabase Chat Endpoint-i
@app.post("/chat")
async def chat_endpoint(message: dict):
    """Chat endpoint koji koristi Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        
        user_message = message.get("message", "")
        session_id = message.get("session_id", str(uuid.uuid4()))
        
        if not user_message.strip():
            raise HTTPException(status_code=400, detail="Poruka ne može biti prazna")
        
        # Dohvati kontekst prethodnih poruka
        context = get_conversation_context(session_id)
        
        # Kreiraj poboljšani prompt
        enhanced_prompt = create_enhanced_prompt(user_message, context)
        
        # Pozovi Ollama API
        response = ollama_client.chat(model='mistral', 
            messages=[{
                'role': 'user',
                'content': enhanced_prompt
            }]
        )
        
        ai_response = response['message']['content']
        
        # Sačuvaj poruke u Supabase
        supabase_manager.save_chat_message(
            session_id=session_id,
            user_message=user_message,
            assistant_message=ai_response
        )
        
        return {
            "status": "success",
            "response": ai_response,
            "session_id": session_id
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str, limit: int = 50):
    """Dohvata chat istoriju iz Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        
        history = supabase_manager.get_chat_history(session_id, limit)
        
        # Konvertuj Supabase format u frontend format
        formatted_messages = []
        for msg in history:
            # Dodaj korisničku poruku ako postoji
            if msg.get('user_message'):
                formatted_messages.append({
                    "id": msg.get('id'),
                    "sender": "user",
                    "content": msg.get('user_message', ''),
                    "timestamp": msg.get('created_at', '')
                })
            
            # Dodaj AI poruku ako postoji
            if msg.get('assistant_message'):
                formatted_messages.append({
                    "id": f"{msg.get('id')}-ai",
                    "sender": "ai",
                    "content": msg.get('assistant_message', ''),
                    "timestamp": msg.get('created_at', '')
                })
        
        # Sortiraj po timestamp-u
        formatted_messages.sort(key=lambda x: x['timestamp'])
        
        return {
            "status": "success",
            "session_id": session_id,
            "messages": formatted_messages,
            "count": len(formatted_messages)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/chat/sessions")
async def get_sessions():
    """Dohvata sve chat sesije iz Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        
        # Dohvati sve chat poruke i grupiši po sesijama
        all_messages = supabase_manager.client.table('chat_history').select('*').execute()
        
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

@app.delete("/chat/session/{session_id}")
async def delete_session(session_id: str):
    """Briše chat sesiju iz Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        
        # Obriši sve poruke za sesiju
        supabase_manager.client.table('chat_history').delete().eq('session_id', session_id).execute()
        
        return {"status": "success", "message": "Sesija obrisana"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# RAG Endpoint-i
@app.post("/chat/rag")
async def rag_chat_endpoint(message: dict):
    """RAG chat endpoint sa Supabase podrškom"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        
        user_message = message.get("message", "")
        session_id = message.get("session_id", str(uuid.uuid4()))
        use_rerank = message.get("use_rerank", True)
        max_results = message.get("max_results", 3)
        
        if not user_message.strip():
            raise HTTPException(status_code=400, detail="Poruka ne može biti prazna")
        
        # Dohvati kontekst prethodnih poruka
        context = get_conversation_context(session_id)
        
        # Generiši RAG odgovor
        rag_response = await rag_service.generate_rag_response(
            query=user_message,
            context=context,
            max_results=max_results,
            use_rerank=use_rerank,
            session_id=session_id
        )
        
        # Sačuvaj poruke u Supabase
        supabase_manager.save_chat_message(
            session_id=session_id,
            user_message=user_message,
            assistant_message=rag_response['response']
        )
        
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
        return {"status": "error", "message": str(e)}

# Document Upload Endpoint
@app.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload dokumenta sa Supabase podrškom"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        
        file_content = await file.read()
        
        # Upload dokumenta
        result = rag_service.upload_document(
            file_content=file_content,
            filename=file.filename
        )
        
        return {
            "status": "success",
            "message": "Dokument uspešno uploadovan",
            "document_id": result.get('document_id'),
            "filename": result.get('filename'),
            "file_type": result.get('file_type'),
            "total_pages": result.get('total_pages'),
            "chunks_created": result.get('chunks_created', 0)
        }
        
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Document Management Endpoint-i
@app.get("/documents")
async def list_documents():
    """Lista dokumenata iz Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        
        documents = supabase_manager.get_all_documents()
        
        return {
            "status": "success",
            "documents": documents,
            "count": len(documents)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/documents/{doc_id}")
async def get_document_info(doc_id: str):
    """Dohvata informacije o dokumentu"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        
        document = supabase_manager.get_document(doc_id)
        
        if not document:
            raise HTTPException(status_code=404, detail="Dokument nije pronađen")
        
        return {
            "status": "success",
            "document": document
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Briše dokument iz Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        
        success = supabase_manager.delete_document(doc_id)
        
        if success:
            return {"status": "success", "message": "Dokument obrisan"}
        else:
            return {"status": "error", "message": "Greška pri brisanju dokumenta"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# OCR Endpoint-i
@app.post("/ocr/extract")
async def extract_text_from_image(file: UploadFile = File(...)):
    """Ekstraktuje tekst iz slike"""
    try:
        file_content = await file.read()
        
        result = ocr_service.extract_text_from_bytes(
            image_bytes=file_content,
            filename=file.filename,
            languages=['srp+eng']
        )
        
        return {
            "status": "success",
            "text": result.get('text', ''),
            "confidence": result.get('confidence', 0),
            "languages": result.get('languages', []),
            "processing_time": result.get('processing_time', 0)
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Supabase Health i Stats Endpoint-i
@app.get("/supabase/health")
async def check_supabase_health():
    """Proverava zdravlje Supabase konekcije"""
    try:
        if not supabase_manager:
            return {
                "status": "disabled",
                "message": "Supabase nije omogućen"
            }
        
        # Test konekcije
        is_connected = supabase_manager.test_connection()
        
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
            "supabase_enabled": bool(supabase_manager)
        }

@app.get("/supabase/stats")
async def get_supabase_stats():
    """Dohvata statistike iz Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        stats = supabase_manager.get_database_stats()
        
        return {
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Session Management Endpoint-i
@app.post("/session/metadata")
async def create_session_metadata(session_id: str, name: str = None, description: str = None):
    """Kreira session metadata u Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        # Koristi RPC funkciju za kreiranje session metadata
        result = supabase_manager.client.rpc('ensure_session_metadata', {
            'session_id_param': session_id
        }).execute()
        
        # Ako je prosleđen name, ažuriraj ga
        if name:
            supabase_manager.client.table('session_metadata').update({
                'name': name,
                'description': description
            }).eq('session_id', session_id).execute()
        
        return {"status": "success", "message": "Session metadata kreiran"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/session/metadata/{session_id}")
async def get_session_metadata(session_id: str):
    """Dohvata session metadata iz Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        result = supabase_manager.client.table('session_metadata').select('*').eq('session_id', session_id).execute()
        
        if result.data:
            return {"status": "success", "metadata": result.data[0]}
        else:
            return {"status": "not_found", "message": "Session metadata nije pronađen"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.put("/session/metadata/{session_id}")
async def update_session_metadata(session_id: str, name: str = None, description: str = None, is_archived: bool = None):
    """Ažurira session metadata u Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        update_data = {}
        if name is not None:
            update_data['name'] = name
        if description is not None:
            update_data['description'] = description
        if is_archived is not None:
            update_data['is_archived'] = is_archived
            if is_archived:
                update_data['archived_at'] = datetime.now().isoformat()
        
        result = supabase_manager.client.table('session_metadata').update(update_data).eq('session_id', session_id).execute()
        
        return {"status": "success", "message": "Session metadata ažuriran"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/session/categories/{session_id}")
async def add_session_categories(session_id: str, categories: List[str]):
    """Dodaje kategorije za sesiju u Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        # Prvo obriši postojeće kategorije
        supabase_manager.client.table('session_categories').delete().eq('session_id', session_id).execute()
        
        # Dodaj nove kategorije
        for category_name in categories:
            supabase_manager.client.table('session_categories').insert({
                'session_id': session_id,
                'category_name': category_name,
                'color': '#3B82F6'  # Default boja
            }).execute()
        
        return {"status": "success", "message": "Kategorije dodane"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/session/categories/{session_id}")
async def get_session_categories(session_id: str):
    """Dohvata kategorije za sesiju iz Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        result = supabase_manager.client.table('session_categories').select('*').eq('session_id', session_id).execute()
        
        return {"status": "success", "categories": result.data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/session/sharing/{session_id}")
async def create_share_link(session_id: str, permissions: str = 'read', expires_in: str = '7d'):
    """Kreira share link za sesiju u Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        # Generiši unique share link
        share_link = f"share_{session_id}_{int(time.time())}"
        
        # Izračunaj expiry date
        expires_at = None
        if expires_in != 'never':
            if expires_in == '1h':
                expires_at = (datetime.now() + timedelta(hours=1)).isoformat()
            elif expires_in == '24h':
                expires_at = (datetime.now() + timedelta(days=1)).isoformat()
            elif expires_in == '7d':
                expires_at = (datetime.now() + timedelta(days=7)).isoformat()
            elif expires_in == '30d':
                expires_at = (datetime.now() + timedelta(days=30)).isoformat()
        
        result = supabase_manager.client.table('session_sharing').insert({
            'session_id': session_id,
            'share_link': share_link,
            'permissions': permissions,
            'expires_at': expires_at,
            'is_active': True
        }).execute()
        
        return {"status": "success", "share_link": share_link, "data": result.data[0]}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/session/sharing/{session_id}")
async def get_share_links(session_id: str):
    """Dohvata share linkove za sesiju iz Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        result = supabase_manager.client.table('session_sharing').select('*').eq('session_id', session_id).eq('is_active', True).execute()
        
        return {"status": "success", "share_links": result.data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/session/sharing/{share_link_id}")
async def revoke_share_link(share_link_id: str):
    """Opoziva share link u Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        supabase_manager.client.table('session_sharing').update({
            'is_active': False
        }).eq('id', share_link_id).execute()
        
        return {"status": "success", "message": "Share link opozvan"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/sessions/metadata")
async def get_all_sessions_metadata():
    """Dohvata sve session metadata iz Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        result = supabase_manager.client.table('session_metadata').select('*').order('created_at', desc=True).execute()
        
        return {"status": "success", "sessions": result.data}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Startup i shutdown eventi
@app.on_event("startup")
async def startup_event():
    """Startup event"""
    print("🚀 AcAIA Backend - Supabase verzija pokrenut")
    if supabase_manager:
        print("✅ Supabase konekcija uspostavljena")

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event"""
    print("🛑 AcAIA Backend zaustavljen") 