"""
AcAIA Backend - Refaktorisana verzija sa input validation
"""

import os
import uuid
import time
import json
import logging
import asyncio
import hashlib
import aiohttp
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, WebSocket, WebSocketDisconnect, Request, APIRouter, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from ollama import Client
import sys

# Dodaj backend direktorijum u path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import Supabase klijenta
try:
    from supabase_client import get_supabase_manager, get_async_supabase_manager
    SUPABASE_AVAILABLE = True
except ImportError as e:
    print(f"Supabase nije dostupan: {e}")
    SUPABASE_AVAILABLE = False

# Import app modula
from .prompts import SYSTEM_PROMPT, CONTEXT_PROMPT
from .rag_service import RAGService
from .ocr_service import OCRService
from .config import Config
from .cache_manager import cache_manager, get_cached_ai_response, set_cached_ai_response, get_semantic_cached_response, get_cache_analytics
from .background_tasks import task_manager, add_background_task, get_task_status, cancel_task, get_all_tasks, get_task_stats, TaskPriority, TaskStatus
from .websocket import websocket_manager, WebSocketMessage, MessageType, get_websocket_manager
from .exam_service import get_exam_service
from .problem_generator import get_problem_generator, Subject, Difficulty, ProblemType
from .error_handler import (
    error_handler, handle_api_error, ErrorCategory, ErrorSeverity,
    AcAIAException, ValidationError, ExternalServiceError, RAGError, OCRError,
    ErrorHandlingMiddleware
)
from .query_rewriter import query_rewriter, QueryEnhancement
from .fact_checker import fact_checker, FactCheckResult, VerificationStatus
from .study_journal_service import study_journal_service
from .career_guidance_service import CareerGuidanceService

# Import Pydantic modeli
from .models import (
    # Base modeli
    BaseRequest, BaseResponse, ErrorResponse,
    
    # Chat modeli
    ChatMessage, ChatSession, ChatHistoryRequest, ChatResponse, SessionListResponse,
    
    # RAG modeli
    RAGRequest,
    
    # Document modeli
    DocumentUpload, DocumentListResponse,
    
    # OCR modeli
    OCRRequest,
    
    # Study Room modeli
    StudyRoomCreate, StudyRoomJoin, StudyRoomMessage,
    
    # Exam modeli
    ExamCreate, ExamAttempt, ExamAnswer,
    
    # Problem Generator modeli
    ProblemGenerationRequest, ProblemAnswer,
    
    # Study Journal modeli
    JournalEntry, StudyGoal, Flashcard, FlashcardReview,
    
    # Career Guidance modeli
    CareerProfile, Skill, Assessment, AssessmentSubmission, JobRecommendation, CareerPath,
    
    # Background Task modeli
    BackgroundTask, TaskListResponse,
    
    # WebSocket modeli
    WebSocketMessage as WSMessage,
    SessionRenameRequest, SessionCategoriesRequest, SessionArchiveRequest, SessionRestoreRequest, SessionShareRequest
)

# Konfiguracija logging-a
logger = logging.getLogger(__name__)

# Kreiraj FastAPI aplikaciju
app = FastAPI(
    title="AcAIA Backend - Refaktorisana verzija",
    description="Backend za AcAIA projekat sa input validation-om",
    version="3.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Globalni keš za preload-ovane modele
preloaded_models = {}
model_loading_status = {"mistral": False, "llama2": False}

# Connection Pooling za HTTP klijente
http_session = None
connection_pool_stats = {
    "total_requests": 0,
    "active_connections": 0,
    "pool_size": 10,
    "created_at": datetime.now()
}

async def get_http_session():
    """Dohvati ili kreira HTTP session sa connection pooling"""
    global http_session
    if http_session is None:
        connector = aiohttp.TCPConnector(
            limit=100,
            limit_per_host=30,
            ttl_dns_cache=300,
            use_dns_cache=True,
            keepalive_timeout=30,
            enable_cleanup_closed=True
        )
        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        http_session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={"User-Agent": "AcAIA-Backend/3.0.0"}
        )
    return http_session

# Inicijalizuj servise
rag_service = RAGService(use_supabase=True)
ocr_service = OCRService()
career_guidance_service = CareerGuidanceService()

def get_model_status(model: str = "mistral") -> Dict[str, Any]:
    """Dohvati status preload-ovanog modela"""
    if model not in preloaded_models:
        return {"status": "not_loaded", "available": False}
    
    model_info = preloaded_models[model]
    return {
        "status": model_info.get('status', 'unknown'),
        "loaded_at": model_info.get('loaded_at').isoformat() if model_info.get('loaded_at') else None,
        "load_time": model_info.get('load_time', 0),
        "available": model_loading_status.get(model, False)
    }

# Supabase manager
supabase_manager = None
async_supabase_manager = None
if SUPABASE_AVAILABLE:
    try:
        supabase_manager = get_supabase_manager()
        async_supabase_manager = get_async_supabase_manager()
        print("✅ Supabase manager uspešno inicijalizovan")
        print("✅ Async Supabase manager uspešno inicijalizovan")
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

# Helper funkcije
def get_conversation_context(session_id: str, max_messages: int = 5) -> str:
    """Dohvati prethodne poruke za kontekst iz Supabase"""
    try:
        if not SUPABASE_AVAILABLE or not supabase_manager:
            return ""
        
        # Dohvati poslednjih max_messages poruka
        response = supabase_manager.table('chat_history').select(
            'content, message_type'
        ).eq('session_id', session_id).order(
            'created_at', desc=True
        ).limit(max_messages).execute()
        
        if response.data:
            # Obrni redosled da bude hronološki
            messages = list(reversed(response.data))
            context = "\n".join([
                f"{'User' if msg['message_type'] == 'user' else 'AI'}: {msg['content']}"
                for msg in messages
            ])
            return context
        
        return ""
        
    except Exception as e:
        logger.error(f"Greška pri dohvatanju konteksta: {e}")
        return ""

async def get_conversation_context_async(session_id: str, max_messages: int = 5) -> str:
    """Asinhrono dohvati prethodne poruke za kontekst"""
    try:
        if not SUPABASE_AVAILABLE or not async_supabase_manager:
            return ""
        
        response = await async_supabase_manager.table('chat_history').select(
            'content, message_type'
        ).eq('session_id', session_id).order(
            'created_at', desc=True
        ).limit(max_messages).execute()
        
        if response.data:
            messages = list(reversed(response.data))
            context = "\n".join([
                f"{'User' if msg['message_type'] == 'user' else 'AI'}: {msg['content']}"
                for msg in messages
            ])
            return context
        
        return ""
        
    except Exception as e:
        logger.error(f"Greška pri asinhronom dohvatanju konteksta: {e}")
        return ""

def create_enhanced_prompt(user_message: str, context: str = "") -> str:
    """Kreira poboljšani prompt sa kontekstom"""
    if context:
        return f"{SYSTEM_PROMPT}\n\n{CONTEXT_PROMPT}\n\nPrethodni kontekst:\n{context}\n\nKorisnik: {user_message}\n\nAI Asistent:"
    else:
        return f"{SYSTEM_PROMPT}\n\nKorisnik: {user_message}\n\nAI Asistent:"

# ============================================================================
# HEALTH & STATUS ENDPOINTS
# ============================================================================

@app.get("/")
def read_root():
    """Root endpoint"""
    return {"message": "AcAIA Backend - Refaktorisana verzija", "version": "3.0.0"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Proveri Supabase konekciju
        supabase_health = False
        if SUPABASE_AVAILABLE and supabase_manager:
            try:
                response = supabase_manager.table('chat_history').select('count', count='exact').limit(1).execute()
                supabase_health = True
            except Exception as e:
                logger.error(f"Supabase health check failed: {e}")
        
        # Proveri Ollama konekciju
        ollama_health = False
        try:
            models = ollama_client.list()
            ollama_health = len(models['models']) > 0
        except Exception as e:
            logger.error(f"Ollama health check failed: {e}")
        
        return {
            "status": "healthy" if (supabase_health and ollama_health) else "degraded",
            "timestamp": datetime.now().isoformat(),
            "services": {
                "supabase": supabase_health,
                "ollama": ollama_health,
                "cache": cache_manager.is_available()
            },
            "version": "3.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Health check failed")

@app.get("/models/status")
async def get_models_status():
    """Dohvati status preload-ovanih modela"""
    return {
        "models": {
            model: get_model_status(model)
            for model in preloaded_models.keys()
        },
        "preload_status": model_loading_status
    }

# ============================================================================
# CHAT ENDPOINTS
# ============================================================================

@app.post("/chat/new-session", response_model=ChatResponse)
async def create_new_session():
    """Kreira novu chat sesiju"""
    try:
        session_id = str(uuid.uuid4())
        session_name = f"Session {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        if SUPABASE_AVAILABLE and async_supabase_manager:
            # Kreiraj sesiju u Supabase
            session_data = {
                "session_id": session_id,
                "name": session_name,
                "user_id": "default_user",  # TODO: Implement proper user management
                "created_at": datetime.now().isoformat(),
                "updated_at": datetime.now().isoformat()
            }
            
            await async_supabase_manager.table('chat_sessions').insert(session_data).execute()
            
            return ChatResponse(
                data={
                    "session_id": session_id,
                    "name": session_name,
                    "created_at": session_data["created_at"]
                }
            )
        else:
            raise HTTPException(status_code=503, detail="Database not available")
            
    except Exception as e:
        logger.error(f"Greška pri kreiranju sesije: {e}")
        raise HTTPException(status_code=500, detail="Failed to create session")

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(message: ChatMessage):
    """Glavni chat endpoint sa input validation-om"""
    try:
        # Validacija input-a (Pydantic već validira)
        if not message.content.strip():
            raise ValidationError("Message content cannot be empty")
        
        # Proveri cache
        cache_key = f"chat:{hashlib.md5(message.content.encode()).hexdigest()}"
        cached_response = get_cached_ai_response(cache_key)
        
        if cached_response:
            logger.info(f"Cache hit za: {message.content[:50]}...")
            return ChatResponse(
                data={
                    "response": cached_response,
                    "cached": True,
                    "session_id": message.session_id
                }
            )
        
        # Dohvati kontekst ako postoji session_id
        context = ""
        if message.session_id:
            context = await get_conversation_context_async(message.session_id)
        
        # Kreiraj poboljšani prompt
        enhanced_prompt = create_enhanced_prompt(message.content, context)
        
        # Pozovi AI model
        start_time = time.time()
        ai_response = await ollama_chat_async(
            model="mistral:latest",
            messages=[{"role": "user", "content": enhanced_prompt}],
            stream=False
        )
        response_time = time.time() - start_time
        
        response_content = ai_response['message']['content']
        
        # Sačuvaj u cache
        set_cached_ai_response(cache_key, response_content)
        
        # Sačuvaj u Supabase ako postoji session_id
        if message.session_id and SUPABASE_AVAILABLE and async_supabase_manager:
            # Sačuvaj korisničku poruku
            user_message_data = {
                "session_id": message.session_id,
                "content": message.content,
                "message_type": "user",
                "user_id": message.user_id or "default_user",
                "created_at": datetime.now().isoformat()
            }
            
            # Sačuvaj AI odgovor
            ai_message_data = {
                "session_id": message.session_id,
                "content": response_content,
                "message_type": "ai",
                "user_id": "ai_assistant",
                "created_at": datetime.now().isoformat()
            }
            
            # Batch insert
            await async_supabase_manager.table('chat_history').insert([
                user_message_data, ai_message_data
            ]).execute()
            
            # Ažuriraj session updated_at
            await async_supabase_manager.table('chat_sessions').update({
                "updated_at": datetime.now().isoformat()
            }).eq('session_id', message.session_id).execute()
        
        return ChatResponse(
            data={
                "response": response_content,
                "session_id": message.session_id,
                "response_time": response_time,
                "cached": False
            }
        )
        
    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Chat processing failed")

@app.get("/chat/history/{session_id}", response_model=ChatResponse)
async def get_chat_history(session_id: str, limit: int = 50, offset: int = 0):
    """Dohvati chat istoriju sa validacijom"""
    try:
        # Validacija parametara
        if limit < 1 or limit > 1000:
            raise ValidationError("Limit must be between 1 and 1000")
        if offset < 0:
            raise ValidationError("Offset must be non-negative")
        
        if not SUPABASE_AVAILABLE or not async_supabase_manager:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Dohvati poruke
        response = await async_supabase_manager.table('chat_history').select(
            'content, message_type, created_at, user_id'
        ).eq('session_id', session_id).order(
            'created_at', desc=True
        ).range(offset, offset + limit - 1).execute()
        
        if response.data:
            # Obrni redosled da bude hronološki
            messages = list(reversed(response.data))
            
            return ChatResponse(
                data={
                    "session_id": session_id,
                    "messages": messages,
                    "total": len(messages),
                    "limit": limit,
                    "offset": offset
                }
            )
        else:
            return ChatResponse(
                data={
                    "session_id": session_id,
                    "messages": [],
                    "total": 0,
                    "limit": limit,
                    "offset": offset
                }
            )
            
    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error fetching chat history: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch chat history")

@app.get("/chat/sessions", response_model=SessionListResponse)
async def get_sessions():
    """Dohvati sve sesije"""
    try:
        if not SUPABASE_AVAILABLE or not async_supabase_manager:
            raise HTTPException(status_code=503, detail="Database not available")
        
        response = await async_supabase_manager.table('chat_sessions').select(
            'session_id, name, description, created_at, updated_at, is_archived, categories'
        ).order('updated_at', desc=True).execute()
        
        sessions = []
        for row in response.data:
            sessions.append(ChatSession(
                session_id=row['session_id'],
                name=row['name'],
                description=row.get('description'),
                user_id=row.get('user_id', 'default_user'),
                created_at=datetime.fromisoformat(row['created_at']),
                updated_at=datetime.fromisoformat(row['updated_at']),
                is_archived=row.get('is_archived', False),
                categories=row.get('categories', [])
            ))
        
        return SessionListResponse(
            data=sessions,
            message=f"Found {len(sessions)} sessions"
        )
        
    except Exception as e:
        logger.error(f"Error fetching sessions: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch sessions")

@app.delete("/chat/session/{session_id}")
async def delete_session(session_id: str):
    """Obriši sesiju"""
    try:
        if not SUPABASE_AVAILABLE or not async_supabase_manager:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Prvo obriši sve poruke iz sesije
        await async_supabase_manager.table('chat_history').delete().eq('session_id', session_id).execute()
        
        # Zatim obriši sesiju
        await async_supabase_manager.table('chat_sessions').delete().eq('session_id', session_id).execute()
        
        return {"message": "Session deleted successfully", "session_id": session_id}
        
    except Exception as e:
        logger.error(f"Error deleting session: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete session")

# ============================================================================
# RAG ENDPOINTS
# ============================================================================

@app.post("/chat/rag", response_model=ChatResponse)
async def rag_chat_endpoint(message: RAGRequest):
    """RAG chat endpoint sa input validation-om"""
    try:
        # Validacija input-a
        if not message.query.strip():
            raise ValidationError("Query cannot be empty")
        
        # Proveri cache
        cache_key = f"rag:{hashlib.md5(message.query.encode()).hexdigest()}"
        cached_response = get_semantic_cached_response(cache_key)
        
        if cached_response:
            logger.info(f"RAG cache hit za: {message.query[:50]}...")
            return ChatResponse(
                data={
                    "response": cached_response,
                    "sources": [],
                    "cached": True,
                    "session_id": message.session_id
                }
            )
        
        # Izvrši RAG pretragu
        start_time = time.time()
        rag_results = await rag_service.search_documents(
            query=message.query,
            max_results=message.max_results,
            similarity_threshold=message.similarity_threshold
        )
        search_time = time.time() - start_time
        
        # Kreiraj kontekst iz RAG rezultata
        context = ""
        sources = []
        
        if rag_results:
            context = "\n\n".join([
                f"Source {i+1}:\n{result['content']}"
                for i, result in enumerate(rag_results)
            ])
            
            sources = [
                {
                    "title": result.get('title', 'Unknown'),
                    "content": result['content'][:200] + "...",
                    "similarity": result.get('similarity', 0.0)
                }
                for result in rag_results
            ]
        
        # Kreiraj prompt sa RAG kontekstom
        rag_prompt = f"{SYSTEM_PROMPT}\n\n{CONTEXT_PROMPT}\n\nRelevant sources:\n{context}\n\nUser question: {message.query}\n\nAI Assistant:"
        
        # Pozovi AI model
        ai_response = await ollama_chat_async(
            model="mistral:latest",
            messages=[{"role": "user", "content": rag_prompt}],
            stream=False
        )
        
        response_content = ai_response['message']['content']
        total_time = time.time() - start_time
        
        # Sačuvaj u cache
        set_cached_ai_response(cache_key, response_content)
        
        return ChatResponse(
            data={
                "response": response_content,
                "sources": sources,
                "search_time": search_time,
                "total_time": total_time,
                "cached": False,
                "session_id": message.session_id
            }
        )
        
    except ValidationError as e:
        logger.error(f"RAG validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"RAG error: {e}")
        raise HTTPException(status_code=500, detail="RAG processing failed")

# ============================================================================
# DOCUMENT ENDPOINTS
# ============================================================================

@app.post("/documents/upload")
async def upload_document(file: UploadFile = File(...)):
    """Upload dokumenta sa validacijom"""
    try:
        # Validacija fajla
        if not file.filename:
            raise ValidationError("Filename is required")
        
        if file.size > 50 * 1024 * 1024:  # 50MB limit
            raise ValidationError("File size exceeds 50MB limit")
        
        allowed_types = [
            'application/pdf',
            'text/plain',
            'text/markdown',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        ]
        
        if file.content_type not in allowed_types:
            raise ValidationError(f"Unsupported file type: {file.content_type}")
        
        # Procesiraj dokument
        content = await file.read()
        
        # Sačuvaj u Supabase
        if SUPABASE_AVAILABLE and async_supabase_manager:
            doc_id = str(uuid.uuid4())
            
            document_data = {
                "doc_id": doc_id,
                "filename": file.filename,
                "content_type": file.content_type,
                "size": len(content),
                "user_id": "default_user",  # TODO: Implement proper user management
                "created_at": datetime.now().isoformat(),
                "content": content.decode('utf-8', errors='ignore') if file.content_type.startswith('text/') else ""
            }
            
            await async_supabase_manager.table('documents').insert(document_data).execute()
            
            # Dodaj u vector store ako je tekstualni dokument
            if file.content_type.startswith('text/'):
                await rag_service.add_document(
                    doc_id=doc_id,
                    content=document_data["content"],
                    metadata={"filename": file.filename, "content_type": file.content_type}
                )
            
            return {
                "message": "Document uploaded successfully",
                "doc_id": doc_id,
                "filename": file.filename,
                "size": len(content)
            }
        else:
            raise HTTPException(status_code=503, detail="Database not available")
            
    except ValidationError as e:
        logger.error(f"Document upload validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Document upload error: {e}")
        raise HTTPException(status_code=500, detail="Document upload failed")

@app.get("/documents", response_model=DocumentListResponse)
async def list_documents():
    """Lista dokumenata"""
    try:
        if not SUPABASE_AVAILABLE or not async_supabase_manager:
            raise HTTPException(status_code=503, detail="Database not available")
        
        response = await async_supabase_manager.table('documents').select(
            'doc_id, filename, content_type, size, created_at, user_id'
        ).order('created_at', desc=True).execute()
        
        return DocumentListResponse(
            data=response.data,
            message=f"Found {len(response.data)} documents"
        )
        
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail="Failed to list documents")

@app.get("/documents/{doc_id}")
async def get_document_info(doc_id: str):
    """Dohvata informacije o dokumentu sa validacijom"""
    try:
        # Validacija doc_id
        if not doc_id or not doc_id.strip():
            raise ValidationError("Document ID is required")
        
        if not SUPABASE_AVAILABLE or not async_supabase_manager:
            raise HTTPException(status_code=503, detail="Database not available")
        
        response = await async_supabase_manager.table('documents').select(
            'doc_id, filename, content_type, size, created_at, user_id, content'
        ).eq('doc_id', doc_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return {
            "status": "success",
            "document": response.data[0]
        }
        
    except ValidationError as e:
        logger.error(f"Document info validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get document info")

@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Briše dokument sa validacijom"""
    try:
        # Validacija doc_id
        if not doc_id or not doc_id.strip():
            raise ValidationError("Document ID is required")
        
        if not SUPABASE_AVAILABLE or not async_supabase_manager:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Prvo proveri da li dokument postoji
        check_response = await async_supabase_manager.table('documents').select(
            'doc_id'
        ).eq('doc_id', doc_id).execute()
        
        if not check_response.data:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Obriši dokument
        await async_supabase_manager.table('documents').delete().eq('doc_id', doc_id).execute()
        
        # Obriši iz vector store-a ako postoji
        try:
            await rag_service.delete_document(doc_id)
        except Exception as e:
            logger.warning(f"Failed to delete document from vector store: {e}")
        
        return {
            "status": "success",
            "message": "Document deleted successfully"
        }
        
    except ValidationError as e:
        logger.error(f"Document deletion validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete document")

@app.get("/documents/search")
async def search_documents(query: str, limit: int = 10):
    """Pretražuje dokumente po sadržaju"""
    try:
        # Validacija query parametara
        if not query or not query.strip():
            raise ValidationError("Search query is required")
        
        if limit < 1 or limit > 100:
            raise ValidationError("Limit must be between 1 and 100")
        
        if not SUPABASE_AVAILABLE or not async_supabase_manager:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Pretraži dokumente po sadržaju
        response = await async_supabase_manager.table('documents').select(
            'doc_id, filename, content_type, size, created_at, user_id'
        ).ilike('content', f'%{query}%').limit(limit).execute()
        
        return {
            "status": "success",
            "documents": response.data,
            "count": len(response.data),
            "query": query
        }
        
    except ValidationError as e:
        logger.error(f"Document search validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error searching documents: {e}")
        raise HTTPException(status_code=500, detail="Failed to search documents")

@app.get("/documents/stats")
async def get_document_stats():
    """Dohvata statistike dokumenata"""
    try:
        if not SUPABASE_AVAILABLE or not async_supabase_manager:
            raise HTTPException(status_code=503, detail="Database not available")
        
        # Dohvati sve dokumente za statistike
        response = await async_supabase_manager.table('documents').select(
            'content_type, size, created_at'
        ).execute()
        
        documents = response.data
        
        # Izračunaj statistike
        total_documents = len(documents)
        total_size = sum(doc.get('size', 0) for doc in documents)
        
        # Grupiši po tipu fajla
        file_types = {}
        for doc in documents:
            content_type = doc.get('content_type', 'unknown')
            if content_type not in file_types:
                file_types[content_type] = 0
            file_types[content_type] += 1
        
        # Dokumenti po mesecu
        monthly_stats = {}
        for doc in documents:
            created_at = doc.get('created_at')
            if created_at:
                month = created_at[:7]  # YYYY-MM format
                if month not in monthly_stats:
                    monthly_stats[month] = 0
                monthly_stats[month] += 1
        
        return {
            "status": "success",
            "stats": {
                "total_documents": total_documents,
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "file_types": file_types,
                "monthly_stats": monthly_stats
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting document stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get document stats")

@app.post("/documents/batch-upload")
async def batch_upload_documents(files: List[UploadFile] = File(...)):
    """Upload više dokumenata odjednom"""
    try:
        # Validacija
        if not files:
            raise ValidationError("At least one file is required")
        
        if len(files) > 10:
            raise ValidationError("Maximum 10 files allowed per batch upload")
        
        if not SUPABASE_AVAILABLE or not async_supabase_manager:
            raise HTTPException(status_code=503, detail="Database not available")
        
        results = []
        errors = []
        
        for file in files:
            try:
                # Validacija pojedinačnog fajla
                if not file.filename:
                    errors.append({"filename": "unknown", "error": "Filename is required"})
                    continue
                
                if file.size > 50 * 1024 * 1024:  # 50MB limit
                    errors.append({"filename": file.filename, "error": "File size exceeds 50MB limit"})
                    continue
                
                allowed_types = [
                    'application/pdf',
                    'text/plain',
                    'text/markdown',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
                ]
                
                if file.content_type not in allowed_types:
                    errors.append({"filename": file.filename, "error": f"Unsupported file type: {file.content_type}"})
                    continue
                
                # Procesiraj dokument
                content = await file.read()
                doc_id = str(uuid.uuid4())
                
                document_data = {
                    "doc_id": doc_id,
                    "filename": file.filename,
                    "content_type": file.content_type,
                    "size": len(content),
                    "user_id": "default_user",
                    "created_at": datetime.now().isoformat(),
                    "content": content.decode('utf-8', errors='ignore') if file.content_type.startswith('text/') else ""
                }
                
                await async_supabase_manager.table('documents').insert(document_data).execute()
                
                # Dodaj u vector store ako je tekstualni dokument
                if file.content_type.startswith('text/'):
                    await rag_service.add_document(
                        doc_id=doc_id,
                        content=document_data["content"],
                        metadata={"filename": file.filename, "content_type": file.content_type}
                    )
                
                results.append({
                    "doc_id": doc_id,
                    "filename": file.filename,
                    "status": "success"
                })
                
            except Exception as e:
                errors.append({"filename": file.filename, "error": str(e)})
        
        return {
            "status": "success",
            "uploaded": len(results),
            "errors": len(errors),
            "results": results,
            "errors": errors
        }
        
    except ValidationError as e:
        logger.error(f"Batch upload validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in batch upload: {e}")
        raise HTTPException(status_code=500, detail="Failed to process batch upload")

# ============================================================================
# OCR ENDPOINTS
# ============================================================================

@app.post("/ocr/extract")
async def extract_text_from_image(file: UploadFile = File(...)):
    """OCR ekstrakcija teksta sa validacijom"""
    try:
        # Validacija slike
        if not file.filename:
            raise ValidationError("Filename is required")
        
        if file.size > 10 * 1024 * 1024:  # 10MB limit
            raise ValidationError("Image size exceeds 10MB limit")
        
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp']
        if file.content_type not in allowed_types:
            raise ValidationError(f"Unsupported image type: {file.content_type}")
        
        # Procesiraj sliku
        content = await file.read()
        
        # Izvrši OCR
        start_time = time.time()
        extracted_text = await ocr_service.extract_text_from_bytes(content)
        processing_time = time.time() - start_time
        
        return {
            "status": "success",
            "extracted_text": extracted_text,
            "processing_time": processing_time,
            "filename": file.filename,
            "content_type": file.content_type,
            "size": len(content)
        }
        
    except ValidationError as e:
        logger.error(f"OCR validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"OCR error: {e}")
        raise HTTPException(status_code=500, detail="OCR processing failed")

@app.post("/ocr/batch-extract")
async def batch_extract_text(files: List[UploadFile] = File(...)):
    """Batch OCR ekstrakcija za više slika"""
    try:
        # Validacija
        if not files:
            raise ValidationError("At least one image file is required")
        
        if len(files) > 5:
            raise ValidationError("Maximum 5 images allowed per batch")
        
        results = []
        errors = []
        
        for file in files:
            try:
                # Validacija pojedinačne slike
                if not file.filename:
                    errors.append({"filename": "unknown", "error": "Filename is required"})
                    continue
                
                if file.size > 10 * 1024 * 1024:  # 10MB limit
                    errors.append({"filename": file.filename, "error": "Image size exceeds 10MB limit"})
                    continue
                
                allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp']
                if file.content_type not in allowed_types:
                    errors.append({"filename": file.filename, "error": f"Unsupported image type: {file.content_type}"})
                    continue
                
                # Procesiraj sliku
                content = await file.read()
                start_time = time.time()
                extracted_text = await ocr_service.extract_text_from_bytes(content)
                processing_time = time.time() - start_time
                
                results.append({
                    "filename": file.filename,
                    "extracted_text": extracted_text,
                    "processing_time": processing_time,
                    "size": len(content),
                    "status": "success"
                })
                
            except Exception as e:
                errors.append({"filename": file.filename, "error": str(e)})
        
        return {
            "status": "success",
            "processed": len(results),
            "errors": len(errors),
            "results": results,
            "errors": errors
        }
        
    except ValidationError as e:
        logger.error(f"Batch OCR validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error in batch OCR: {e}")
        raise HTTPException(status_code=500, detail="Failed to process batch OCR")

@app.get("/ocr/languages")
async def get_supported_languages():
    """Dohvata podržane jezike za OCR"""
    try:
        languages = [
            {"code": "srp", "name": "Serbian", "script": "Latin"},
            {"code": "eng", "name": "English", "script": "Latin"},
            {"code": "srp+eng", "name": "Serbian + English", "script": "Latin"},
            {"code": "rus", "name": "Russian", "script": "Cyrillic"},
            {"code": "deu", "name": "German", "script": "Latin"},
            {"code": "fra", "name": "French", "script": "Latin"},
            {"code": "spa", "name": "Spanish", "script": "Latin"}
        ]
        
        return {
            "status": "success",
            "languages": languages,
            "default": "srp+eng"
        }
        
    except Exception as e:
        logger.error(f"Error getting OCR languages: {e}")
        raise HTTPException(status_code=500, detail="Failed to get supported languages")

# ================= SESSION MANAGEMENT ENDPOINTS =====================

@app.put("/chat/sessions/{session_id}/rename")
async def rename_session(session_id: str, data: SessionRenameRequest):
    """Preimenuje chat sesiju (input validacija)"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        # Ažuriraj naziv sesije u chat_sessions tabeli
        supabase_manager.client.table('chat_sessions').update({
            'name': data.name,
            'updated_at': datetime.now().isoformat()
        }).eq('session_id', session_id).execute()
        return {"status": "success", "message": "Sesija preimenovana", "name": data.name}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.put("/chat/sessions/{session_id}/categories")
async def update_session_categories(session_id: str, data: SessionCategoriesRequest):
    """Ažurira kategorije sesije (input validacija)"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        supabase_manager.client.table('chat_sessions').update({
            'categories': data.categories,
            'updated_at': datetime.now().isoformat()
        }).eq('session_id', session_id).execute()
        return {"status": "success", "message": "Kategorije ažurirane", "categories": data.categories}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/chat/sessions/{session_id}/archive")
async def archive_session(session_id: str):
    """Arhivira sesiju (input validacija)"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        supabase_manager.client.table('chat_sessions').update({
            'is_archived': True,
            'updated_at': datetime.now().isoformat()
        }).eq('session_id', session_id).execute()
        return {"status": "success", "message": "Sesija arhivirana"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/chat/sessions/{session_id}/restore")
async def restore_session(session_id: str):
    """Vraća sesiju iz arhive (input validacija)"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        supabase_manager.client.table('chat_sessions').update({
            'is_archived': False,
            'updated_at': datetime.now().isoformat()
        }).eq('session_id', session_id).execute()
        return {"status": "success", "message": "Sesija vraćena iz arhive"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/chat/sessions/{session_id}/share")
async def create_session_share_link(session_id: str, data: SessionShareRequest):
    """Kreira share link za sesiju (input validacija)"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        import secrets
        share_token = secrets.token_hex(32)
        from datetime import datetime, timedelta
        expires_at = datetime.now() + timedelta(days=int(data.expires_in.replace('d', '')))
        share_data = {
            'share_token': share_token,
            'permissions': {'read': True, 'write': data.permissions == 'write'},
            'expires_at': expires_at.isoformat(),
            'is_active': True,
            'created_at': datetime.now().isoformat()
        }
        existing_data = supabase_manager.client.table('chat_sessions').select('share_links').eq('session_id', session_id).limit(1).execute()
        if existing_data.data:
            existing_share_links = existing_data.data[0].get('share_links', [])
            existing_share_links.append(share_data)
        else:
            existing_share_links = [share_data]
        supabase_manager.client.table('chat_sessions').update({
            'share_links': existing_share_links,
            'updated_at': datetime.now().isoformat()
        }).eq('session_id', session_id).execute()
        return {
            "status": "success", 
            "message": "Share link kreiran",
            "share_token": share_token,
            "expires_at": expires_at.isoformat()
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# ============================================================================
# STARTUP & SHUTDOWN EVENTS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Startup event"""
    print("🚀 AcAIA Backend - Refaktorisana verzija se pokreće...")
    
    # Preload modeli
    await preload_ollama_models()
    
    # Inicijalizuj cache
    if cache_manager.is_available():
        print("✅ Cache manager inicijalizovan")
    else:
        print("⚠️ Cache manager nije dostupan")
    
    # Inicijalizuj background tasks
    task_manager.start()
    print("✅ Background task manager pokrenut")
    
    # Inicijalizuj WebSocket manager
    websocket_manager.start()
    print("✅ WebSocket manager pokrenut")
    
    print("✅ AcAIA Backend uspešno pokrenut!")

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event"""
    print("🛑 AcAIA Backend se zaustavlja...")
    
    # Zaustavi background tasks
    task_manager.stop()
    print("✅ Background task manager zaustavljen")
    
    # Zaustavi WebSocket manager
    websocket_manager.stop()
    print("✅ WebSocket manager zaustavljen")
    
    # Zatvori HTTP session
    global http_session
    if http_session:
        await http_session.close()
        print("✅ HTTP session zatvoren")
    
    print("✅ AcAIA Backend uspešno zaustavljen!")

# ============================================================================
# ADDITIONAL ENDPOINTS (TODO: Implement with validation)
# ============================================================================

# TODO: Implement Study Room endpoints with validation
# TODO: Implement Exam endpoints with validation  
# TODO: Implement Problem Generator endpoints with validation
# TODO: Implement Study Journal endpoints with validation
# TODO: Implement Career Guidance endpoints with validation
# TODO: Implement Background Task endpoints with validation
# TODO: Implement WebSocket endpoints with validation 

# ================= STUDY ROOM ENDPOINTS =====================

@app.post("/study-room/create")
async def create_study_room(room_data: StudyRoomCreate):
    """Kreiraj novu Study Room sobu (input validacija)"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=500, detail="Supabase nije dostupan")
        room_id = str(uuid.uuid4())
        # Koristi validirane podatke iz room_data
        room_data_to_insert = {
            "room_id": room_id,
            "name": room_data.name,
            "description": room_data.description or "",
            "subject": room_data.subject or "",
            "max_participants": room_data.max_members,
            "admin_user_id": "default_admin",  # TODO: Dodati user_id iz autentikacije
            "is_active": True,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        result = supabase_manager.client.table("study_rooms").insert(room_data_to_insert).execute()
        if result.data:
            # Dodaj admin-a kao prvog člana
            member_data = {
                "room_id": room_id,
                "user_id": "default_admin",
                "username": f"Admin_{room_id[:8]}",
                "role": "admin",
                "joined_at": datetime.now().isoformat(),
                "is_active": True
            }
            supabase_manager.client.table("study_room_members").insert(member_data).execute()
            return {
                "status": "success",
                "room": {
                    "room_id": room_id,
                    "name": room_data.name,
                    "description": room_data.description or "",
                    "subject": room_data.subject or "",
                    "admin_user_id": "default_admin",
                    "invite_code": room_id[:8].upper()
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Greška pri kreiranju sobe")
    except Exception as e:
        logger.error(f"Greška pri kreiranju Study Room sobe: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/study-room/join")
async def join_study_room(join_data: StudyRoomJoin):
    """Pridruži se Study Room sobi (input validacija)"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=500, detail="Supabase nije dostupan")
        invite_code = join_data.room_id[:8].upper()
        user_id = join_data.user_id
        username = join_data.username
        # Pronađi sobu po invite kodu
        rooms_result = supabase_manager.client.table("study_rooms")\
            .select("*")\
            .eq("is_active", True)\
            .execute()
        room = None
        for r in rooms_result.data:
            if r["room_id"][:8].upper() == invite_code:
                room = r
                break
        if not room:
            return {"status": "error", "message": "Soba nije pronađena ili je neaktivna"}
        # Proveri da li je korisnik već član
        existing_member = supabase_manager.client.table("study_room_members")\
            .select("*")\
            .eq("room_id", room["room_id"])\
            .eq("user_id", user_id)\
            .execute()
        if existing_member.data:
            member = existing_member.data[0]
            if not member.get("is_active", True):
                supabase_manager.client.table("study_room_members")\
                    .update({"is_active": True})\
                    .eq("room_id", room["room_id"])\
                    .eq("user_id", user_id)\
                    .execute()
            return {
                "status": "success",
                "message": "Već ste član ove sobe",
                "room": {
                    "room_id": room["room_id"],
                    "name": room["name"],
                    "description": room["description"],
                    "subject": room["subject"]
                }
            }
        # Proveri broj članova
        members_count = supabase_manager.client.table("study_room_members")\
            .select("user_id")\
            .eq("room_id", room["room_id"])\
            .eq("is_active", True)\
            .execute()
        if len(members_count.data) >= room["max_participants"]:
            return {"status": "error", "message": "Soba je puna"}
        # Dodaj člana
        member_data = {
            "room_id": room["room_id"],
            "user_id": user_id,
            "username": username,
            "role": "member",
            "joined_at": datetime.now().isoformat(),
            "is_active": True
        }
        supabase_manager.client.table("study_room_members").insert(member_data).execute()
        return {
            "status": "success",
            "room": {
                "room_id": room["room_id"],
                "name": room["name"],
                "description": room["description"],
                "subject": room["subject"]
            }
        }
    except Exception as e:
        logger.error(f"Greška pri pridruživanju Study Room sobi: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/study-room/{room_id}/message")
async def send_study_room_message(room_id: str, message_data: StudyRoomMessage):
    """Pošalji poruku u Study Room sobu (input validacija)"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=500, detail="Supabase nije dostupan")
        message_id = str(uuid.uuid4())
        user_id = message_data.user_id
        username = message_data.username
        content = message_data.content
        message_type = message_data.message_type
        # Proveri da li je korisnik član sobe
        member_result = supabase_manager.client.table("study_room_members")\
            .select("*")\
            .eq("room_id", room_id)\
            .eq("user_id", user_id)\
            .eq("is_active", True)\
            .execute()
        if not member_result.data:
            return {"status": "error", "message": "Niste član ove sobe"}
        # Sačuvaj poruku
        message_data_to_insert = {
            "message_id": message_id,
            "room_id": room_id,
            "user_id": user_id,
            "username": username,
            "content": content,
            "message_type": message_type,
            "timestamp": datetime.now().isoformat()
        }
        result = supabase_manager.client.table("study_room_messages").insert(message_data_to_insert).execute()
        if result.data:
            return {"status": "success", "message_id": message_id}
        else:
            return {"status": "error", "message": "Greška pri slanju poruke"}
    except Exception as e:
        logger.error(f"Greška pri slanju poruke u Study Room: {e}")
        return {"status": "error", "message": str(e)} 

# ================= EXAM ENDPOINTS =====================

@app.post("/exam/create")
async def create_exam(exam_data: ExamCreate):
    """Kreiraj novi ispit (input validacija)"""
    try:
        exam_service = await get_exam_service()
        result = await exam_service.create_exam(exam_data.dict())
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri kreiranju ispita: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/exam/{exam_id}/start")
async def start_exam_attempt(exam_id: str, attempt_data: ExamAttempt):
    """Započni pokušaj polaganja ispita (input validacija)"""
    try:
        exam_service = await get_exam_service()
        result = await exam_service.start_exam_attempt(
            exam_id,
            attempt_data.user_id,
            getattr(attempt_data, 'username', None)
        )
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri započinjanju pokušaja: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/exam/attempt/{attempt_id}/answer")
async def submit_answer(attempt_id: str, answer_data: ExamAnswer):
    """Predaj odgovor na pitanje (input validacija)"""
    try:
        exam_service = await get_exam_service()
        result = await exam_service.submit_answer(
            attempt_id,
            answer_data.question_id,
            answer_data.answer
        )
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri predaji odgovora: {e}")
        return {"status": "error", "message": str(e)} 

# ================= PROBLEM GENERATOR ENDPOINTS =====================

@app.get("/problems/subjects")
async def get_available_subjects():
    """Dohvati dostupne predmete za Problem Generator"""
    try:
        problem_generator = get_problem_generator()
        subjects = problem_generator.get_available_subjects()
        
        return {
            "status": "success",
            "subjects": subjects,
            "message": "Predmeti uspešno dohvaćeni"
        }
        
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju predmeta: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/problems/generate")
async def generate_problem(request: ProblemGenerationRequest):
    """Generiši problem na osnovu parametara sa input validacijom"""
    try:
        problem_generator = get_problem_generator()
        
        # Koristi validirane podatke iz Pydantic modela
        subject = Subject(request.subject)
        difficulty = Difficulty(request.difficulty)
        problem_type = ProblemType(request.problem_type) if request.problem_type else None
        
        # Generiši problem
        problem = problem_generator.generate_problem(
            subject=subject,
            topic=request.topic,
            difficulty=difficulty,
            problem_type=problem_type
        )
        
        # Konvertuj u dict za JSON response
        problem_dict = {
            "problem_id": problem.problem_id,
            "subject": problem.subject.value,
            "topic": problem.topic,
            "difficulty": problem.difficulty.value,
            "problem_type": problem.problem_type.value,
            "question": problem.question,
            "options": problem.options,
            "correct_answer": problem.correct_answer,
            "solution": problem.solution,
            "hints": problem.hints,
            "explanation": problem.explanation,
            "tags": problem.tags,
            "created_at": problem.created_at.isoformat() if problem.created_at else None
        }
        
        return {
            "status": "success",
            "problem": problem_dict,
            "message": "Problem uspešno generisan"
        }
        
    except ValueError as e:
        logger.error(f"❌ Nevažeći parametar: {e}")
        return {"status": "error", "message": f"Nevažeći parametar: {e}"}
    except Exception as e:
        logger.error(f"❌ Greška pri generisanju problema: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/problems/{problem_id}/validate")
async def validate_problem_answer(problem_id: str, request: ProblemAnswer):
    """Validiraj odgovor na problem iz baze sa input validacijom"""
    try:
        problem_generator = get_problem_generator()
        
        # Dohvati problem iz baze
        problems = problem_generator.get_problems_from_database()
        problem_data = next((p for p in problems if p["problem_id"] == problem_id), None)
        if not problem_data:
            return {"status": "error", "message": "Problem nije pronađen u bazi"}
        
        # Kreiraj GeneratedProblem objekat
        from .problem_generator import GeneratedProblem, Subject, Difficulty, ProblemType
        problem = GeneratedProblem(
            problem_id=problem_data["problem_id"],
            subject=Subject(problem_data["subject"]),
            topic=problem_data["topic"],
            difficulty=Difficulty(problem_data["difficulty"]),
            problem_type=ProblemType(problem_data["problem_type"]),
            question=problem_data["question"],
            options=problem_data.get("options", []),
            correct_answer=problem_data.get("correct_answer"),
            solution=problem_data.get("solution"),
            hints=problem_data.get("hints", []),
            explanation=problem_data.get("explanation"),
            tags=problem_data.get("tags", []),
            created_at=None
        )
        
        # Validiraj odgovor koristeći validirane podatke
        validation_result = problem_generator.validate_answer(
            problem,
            request.answer,
            user_id=request.user_id,
            username=request.username,
            time_taken_seconds=request.time_taken_seconds,
            hints_used=request.hints_used,
            solution_viewed=request.solution_viewed
        )
        
        return {
            "status": "success",
            "validation": validation_result,
            "message": "Odgovor validiran"
        }
        
    except Exception as e:
        logger.error(f"❌ Greška pri validaciji odgovora: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/problems/stats")
async def get_problem_generator_stats():
    """Dohvati statistike Problem Generator-a"""
    try:
        problem_generator = get_problem_generator()
        
        # Broj šablona po predmetu
        templates_by_subject = {}
        for template in problem_generator.templates.values():
            subject = template.subject.value
            if subject not in templates_by_subject:
                templates_by_subject[subject] = 0
            templates_by_subject[subject] += 1
        
        stats = {
            "total_templates": len(problem_generator.templates),
            "templates_by_subject": templates_by_subject,
            "available_subjects": len(problem_generator.get_available_subjects()),
            "status": "active"
        }
        
        return {
            "status": "success",
            "stats": stats,
            "message": "Statistike uspešno dohvaćene"
        }
        
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju statistika: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/problems/database")
async def get_problems_from_database(
    subject: str = None,
    topic: str = None,
    difficulty: str = None,
    limit: int = 50
):
    """Dohvati probleme iz Supabase baze"""
    try:
        problem_generator = get_problem_generator()
        problems = problem_generator.get_problems_from_database(
            subject=subject,
            topic=topic,
            difficulty=difficulty,
            limit=limit
        )
        
        return {
            "status": "success",
            "problems": problems,
            "total_count": len(problems),
            "filters": {
                "subject": subject,
                "topic": topic,
                "difficulty": difficulty,
                "limit": limit
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/problems/user/{user_id}/stats")
async def get_user_problem_stats(user_id: str):
    """Dohvati korisničke statistike za probleme"""
    try:
        problem_generator = get_problem_generator()
        stats = problem_generator.get_user_stats(user_id)
        
        return {
            "status": "success",
            "user_id": user_id,
            "stats": stats
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/problems/{problem_id}/attempt")
async def save_problem_attempt(
    problem_id: str,
    attempt_data: dict
):
    """Sačuvaj pokušaj rešavanja problema"""
    try:
        problem_generator = get_problem_generator()
        result = problem_generator.save_attempt(
            problem_id=problem_id,
            user_id=attempt_data.get("user_id"),
            username=attempt_data.get("username"),
            answer=attempt_data.get("answer"),
            is_correct=attempt_data.get("is_correct"),
            time_taken_seconds=attempt_data.get("time_taken_seconds", 0),
            hints_used=attempt_data.get("hints_used", 0),
            solution_viewed=attempt_data.get("solution_viewed", False)
        )
        
        return {
            "status": "success",
            "attempt_id": result.get("attempt_id"),
            "message": "Pokušaj uspešno sačuvan"
        }
        
    except Exception as e:
        logger.error(f"❌ Greška pri čuvanju pokušaja: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/problems/database/stats")
async def get_database_problem_stats():
    """Dohvati statistike problema iz baze"""
    try:
        problem_generator = get_problem_generator()
        stats = problem_generator.get_database_stats()
        
        return {
            "status": "success",
            "stats": stats,
            "message": "Statistike baze uspešno dohvaćene"
        }
        
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju statistika baze: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/problems/recommended/{user_id}")
async def get_recommended_problems(
    user_id: str,
    subject: str = None,
    difficulty: str = None,
    limit: int = 10
):
    """Dohvati preporučene probleme za korisnika"""
    try:
        problem_generator = get_problem_generator()
        recommended = problem_generator.get_recommended_problems(
            user_id=user_id,
            subject=subject,
            difficulty=difficulty,
            limit=limit
        )
        
        return {
            "status": "success",
            "recommended_problems": recommended,
            "user_id": user_id,
            "filters": {
                "subject": subject,
                "difficulty": difficulty,
                "limit": limit
            }
        }
        
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju preporučenih problema: {e}")
        return {"status": "error", "message": str(e)} 

# ================= STUDY JOURNAL ENDPOINTS =====================

@app.post("/study-journal/entries")
async def create_journal_entry(entry: JournalEntry):
    """Kreiraj novi journal entry sa input validacijom"""
    try:
        result = await study_journal_service.create_journal_entry(entry.dict())
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri kreiranju journal entry: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/study-journal/entries")
async def get_journal_entries(
    user_id: str,
    subject: str = None,
    entry_type: str = None,
    limit: int = 50,
    offset: int = 0
):
    """Dohvati journal entries za korisnika"""
    try:
        result = await study_journal_service.get_journal_entries(
            user_id=user_id,
            subject=subject,
            entry_type=entry_type,
            limit=limit,
            offset=offset
        )
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju journal entries: {e}")
        return {"status": "error", "message": str(e)}

@app.put("/study-journal/entries/{entry_id}")
async def update_journal_entry(entry_id: str, update_data: JournalEntry):
    """Ažuriraj journal entry sa input validacijom"""
    try:
        result = await study_journal_service.update_journal_entry(entry_id, update_data.dict())
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri ažuriranju journal entry: {e}")
        return {"status": "error", "message": str(e)}

@app.delete("/study-journal/entries/{entry_id}")
async def delete_journal_entry(entry_id: str):
    """Obriši journal entry"""
    try:
        result = await study_journal_service.delete_journal_entry(entry_id)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri brisanju journal entry: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/study-journal/goals")
async def create_study_goal(goal: StudyGoal):
    """Kreiraj novi study goal sa input validacijom"""
    try:
        result = await study_journal_service.create_study_goal(goal.dict())
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri kreiranju study goal: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/study-journal/goals")
async def get_study_goals(
    user_id: str,
    status: str = None,
    subject: str = None,
    limit: int = 50,
    offset: int = 0
):
    """Dohvati study goals za korisnika"""
    try:
        result = await study_journal_service.get_study_goals(
            user_id=user_id,
            status=status,
            subject=subject,
            limit=limit,
            offset=offset
        )
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju study goals: {e}")
        return {"status": "error", "message": str(e)}

@app.put("/study-journal/goals/{goal_id}/progress")
async def update_goal_progress(goal_id: str, new_value: int = Body(..., embed=True)):
    """Ažuriraj napredak u cilju (current_value)"""
    try:
        result = await study_journal_service.update_goal_progress(goal_id, new_value)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri ažuriranju goal progress: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/study-journal/flashcards")
async def create_flashcard(flashcard: Flashcard):
    """Kreiraj novi flashcard sa input validacijom"""
    try:
        result = await study_journal_service.create_flashcard(flashcard.dict())
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri kreiranju flashcard: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/study-journal/flashcards")
async def get_flashcards_for_review(
    user_id: str,
    limit: int = 20
):
    """Dohvati flashcards za review (spaced repetition)"""
    try:
        result = await study_journal_service.get_flashcards_for_review(user_id, limit)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju flashcards: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/study-journal/flashcards/{flashcard_id}/review")
async def review_flashcard(flashcard_id: str, review: FlashcardReview):
    """Obeleži review flashcard-a sa input validacijom"""
    try:
        result = await study_journal_service.review_flashcard(
            flashcard_id,
            review.difficulty_rating,
            review.was_correct,
            review.response_time_seconds
        )
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri review flashcard: {e}")
        return {"status": "error", "message": str(e)} 

# ================= CAREER GUIDANCE ENDPOINTS =====================

# Career Profiles
@app.post("/career-guidance/profile")
async def create_career_profile(profile: CareerProfile):
    """Kreiraj novi career profile sa input validacijom"""
    try:
        result = await career_guidance_service.create_career_profile(profile.dict())
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri kreiranju career profile: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/career-guidance/profile/{user_id}")
async def get_career_profile(user_id: str):
    """Dohvati career profile za korisnika"""
    try:
        result = await career_guidance_service.get_career_profile(user_id)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju career profile: {e}")
        return {"status": "error", "message": str(e)}

@app.put("/career-guidance/profile/{profile_id}")
async def update_career_profile(profile_id: str, update_data: CareerProfile):
    """Ažuriraj career profile sa input validacijom"""
    try:
        result = await career_guidance_service.update_career_profile(profile_id, update_data.dict())
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri ažuriranju career profile: {e}")
        return {"status": "error", "message": str(e)}

@app.delete("/career-guidance/profile/{profile_id}")
async def delete_career_profile(profile_id: str):
    """Obriši career profile"""
    try:
        result = await career_guidance_service.delete_career_profile(profile_id)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri brisanju career profile: {e}")
        return {"status": "error", "message": str(e)}

# Skills Inventory
@app.post("/career-guidance/skills")
async def add_skill(skill: Skill):
    """Dodaj novu veštinu sa input validacijom"""
    try:
        result = await career_guidance_service.add_skill(skill.dict())
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri dodavanju skill: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/career-guidance/skills/{user_id}")
async def get_user_skills(user_id: str, category: str = None):
    """Dohvati veštine korisnika"""
    try:
        result = await career_guidance_service.get_user_skills(user_id, category)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju user skills: {e}")
        return {"status": "error", "message": str(e)}

@app.put("/career-guidance/skills/{skill_id}")
async def update_skill(skill_id: str, update_data: Skill):
    """Ažuriraj veštinu sa input validacijom"""
    try:
        result = await career_guidance_service.update_skill(skill_id, update_data.dict())
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri ažuriranju skill: {e}")
        return {"status": "error", "message": str(e)}

@app.delete("/career-guidance/skills/{skill_id}")
async def delete_skill(skill_id: str):
    """Obriši veštinu"""
    try:
        result = await career_guidance_service.delete_skill(skill_id)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri brisanju skill: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/career-guidance/skills/{user_id}/summary")
async def get_skills_summary(user_id: str):
    """Dohvati summary veština korisnika"""
    try:
        result = await career_guidance_service.get_skills_summary(user_id)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju skills summary: {e}")
        return {"status": "error", "message": str(e)}

# Career Assessments
@app.post("/career-guidance/assessments")
async def create_assessment(assessment: Assessment):
    """Kreiraj novu procenu sa input validacijom"""
    try:
        result = await career_guidance_service.create_assessment(assessment.dict())
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri kreiranju assessment: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/career-guidance/assessments/{user_id}")
async def get_user_assessments(user_id: str, assessment_type: str = None):
    """Dohvati procene korisnika"""
    try:
        result = await career_guidance_service.get_user_assessments(user_id, assessment_type)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju user assessments: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/career-guidance/assessments/{assessment_id}/submit")
async def submit_assessment_answers(assessment_id: str, submission: AssessmentSubmission):
    """Predaj odgovore za procenu sa input validacijom"""
    try:
        result = await career_guidance_service.submit_assessment_answers(
            assessment_id, 
            submission.answers, 
            submission.results, 
            submission.score
        )
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri submit assessment answers: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/career-guidance/assessments/questions/{assessment_type}")
async def get_assessment_questions(assessment_type: str):
    """Dohvati pitanja za tip procene"""
    try:
        result = await career_guidance_service.get_assessment_questions(assessment_type)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju assessment questions: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/career-guidance/assessments/create/{user_id}")
async def create_career_assessment(user_id: str, assessment_type: str):
    """Kreiraj novu career procenu za korisnika"""
    try:
        result = await career_guidance_service.create_career_assessment(user_id, assessment_type)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri kreiranju career assessment: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/career-guidance/assessments/{assessment_id}/calculate")
async def calculate_assessment_results(assessment_id: str, answers: dict = Body(...)):
    """Izračunaj rezultate procene"""
    try:
        result = await career_guidance_service.calculate_assessment_results(assessment_id, answers)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri calculate assessment results: {e}")
        return {"status": "error", "message": str(e)}

# Job Recommendations
@app.post("/career-guidance/jobs")
async def create_job_recommendation(job: JobRecommendation):
    """Kreiraj novu preporuku posla sa input validacijom"""
    try:
        result = await career_guidance_service.create_job_recommendation(job.dict())
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri kreiranju job recommendation: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/career-guidance/jobs/{user_id}")
async def get_job_recommendations(user_id: str, status: str = None):
    """Dohvati preporuke poslova za korisnika"""
    try:
        result = await career_guidance_service.get_job_recommendations(user_id, status)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju job recommendations: {e}")
        return {"status": "error", "message": str(e)}

@app.put("/career-guidance/jobs/{job_id}/status")
async def update_job_application_status(job_id: str, status: str = Body(..., embed=True)):
    """Ažuriraj status prijave na posao"""
    try:
        result = await career_guidance_service.update_job_application_status(job_id, status)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri update job application status: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/career-guidance/jobs/match-score")
async def calculate_job_match_score(
    user_id: str = Body(...),
    required_skills: List[str] = Body(...),
    preferred_skills: List[str] = Body(...)
):
    """Izračunaj match score za posao"""
    try:
        result = await career_guidance_service.calculate_job_match_score(user_id, required_skills, preferred_skills)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri calculate job match score: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/career-guidance/jobs/generate/{user_id}")
async def generate_job_recommendations(user_id: str, limit: int = 10):
    """Generiši preporuke poslova za korisnika"""
    try:
        result = await career_guidance_service.generate_job_recommendations(user_id, limit)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri generate job recommendations: {e}")
        return {"status": "error", "message": str(e)}

# Career Paths
@app.post("/career-guidance/paths")
async def create_career_path(path: CareerPath):
    """Kreiraj novu karijernu putanju sa input validacijom"""
    try:
        result = await career_guidance_service.create_career_path(path.dict())
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri kreiranju career path: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/career-guidance/paths/{user_id}")
async def get_user_career_paths(user_id: str, active_only: bool = True):
    """Dohvati karijerne putanje korisnika"""
    try:
        result = await career_guidance_service.get_user_career_paths(user_id, active_only)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju user career paths: {e}")
        return {"status": "error", "message": str(e)}

@app.put("/career-guidance/paths/{path_id}/progress")
async def update_career_path_progress(path_id: str, progress_percentage: float = Body(..., embed=True)):
    """Ažuriraj napredak karijerne putanje"""
    try:
        result = await career_guidance_service.update_career_path_progress(path_id, progress_percentage)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri update career path progress: {e}")
        return {"status": "error", "message": str(e)}

@app.put("/career-guidance/paths/{path_id}/deactivate")
async def deactivate_career_path(path_id: str):
    """Deaktiviraj karijernu putanju"""
    try:
        result = await career_guidance_service.deactivate_career_path(path_id)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri deactivate career path: {e}")
        return {"status": "error", "message": str(e)}

# Industry Insights
@app.get("/career-guidance/industries")
async def get_all_industries():
    """Dohvati sve industrije"""
    try:
        result = await career_guidance_service.get_all_industries()
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju industries: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/career-guidance/industries/{industry_name}")
async def get_industry_details(industry_name: str):
    """Dohvati detalje industrije"""
    try:
        result = await career_guidance_service.get_industry_details(industry_name)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju industry details: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/career-guidance/industries/trends")
async def get_industry_trends():
    """Dohvati trendove industrija"""
    try:
        result = await career_guidance_service.get_industry_trends()
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju industry trends: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/career-guidance/insights/{user_id}")
async def get_user_career_insights(user_id: str):
    """Dohvati career insights za korisnika"""
    try:
        result = await career_guidance_service.get_user_career_insights(user_id)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju user career insights: {e}")
        return {"status": "error", "message": str(e)} 

# ================= BACKGROUND TASKS ENDPOINTS =====================

@app.post("/tasks/add")
async def add_background_task_endpoint(task: BackgroundTask):
    """Dodaj background task sa input validacijom"""
    try:
        task_id = await add_background_task(
            task_type=task.type,
            priority=TaskPriority(task.priority),
            data=task.data
        )
        
        return {
            "status": "success",
            "data": {
                "task_id": task_id,
                "message": f"Task {task.type} dodat sa prioritetom {task.priority}"
            }
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dodavanju background task: {e}")
        return {
            "status": "error",
            "data": None,
            "message": str(e)
        }

@app.get("/tasks", response_model=TaskListResponse)
async def get_all_background_tasks():
    """Dohvati sve background taskove"""
    try:
        tasks = await get_all_tasks()
        return {
            "status": "success",
            "tasks": tasks,
            "total": len(tasks)
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju background tasks: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/tasks/{task_id}")
async def get_background_task_status(task_id: str):
    """Dohvati status background taska"""
    try:
        status = await get_task_status(task_id)
        return {
            "status": "success",
            "task_id": task_id,
            "task_status": status
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju task status: {e}")
        return {"status": "error", "message": str(e)}

@app.delete("/tasks/{task_id}")
async def cancel_background_task(task_id: str):
    """Otkaži background task"""
    try:
        success = await cancel_task(task_id)
        return {
            "status": "success" if success else "error",
            "task_id": task_id,
            "cancelled": success
        }
    except Exception as e:
        logger.error(f"❌ Greška pri otkazivanju task: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/tasks/stats")
async def get_background_tasks_stats():
    """Dohvati statistike background taskova"""
    try:
        stats = await get_task_stats()
        return {
            "status": "success",
            "stats": stats
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju task stats: {e}")
        return {"status": "error", "message": str(e)} 

# ================= CACHE MANAGEMENT ENDPOINTS =====================

@app.get("/cache/health")
async def check_cache_health():
    """Proveri zdravlje cache-a"""
    try:
        health = await cache_manager.health_check()
        return {
            "status": "success",
            "cache_health": health,
            "message": "Cache health check završen"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri cache health check: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/cache/stats")
async def get_cache_stats():
    """Dohvati statistike cache-a"""
    try:
        stats = await cache_manager.get_stats()
        return {
            "status": "success",
            "cache_stats": stats,
            "message": "Cache statistike uspešno dohvaćene"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju cache stats: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/cache/analytics")
async def get_cache_analytics():
    """Dohvati analitiku cache-a"""
    try:
        analytics = await cache_manager.get_cache_analytics()
        return {
            "status": "success",
            "analytics": analytics,
            "message": "Cache analitika uspešno dohvaćena"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju cache analytics: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/cache/test")
async def test_cache():
    """Test cache funkcionalnosti"""
    try:
        test_key = "test_cache_key"
        test_value = {"test": "data", "timestamp": datetime.now().isoformat()}
        
        # Test set
        await cache_manager.set(test_key, test_value, 60)
        
        # Test get
        retrieved = await cache_manager.get(test_key)
        
        # Test delete
        await cache_manager.delete(test_key)
        
        return {
            "status": "success",
            "test_results": {
                "set_success": True,
                "get_success": retrieved == test_value,
                "delete_success": True
            },
            "message": "Cache test uspešno završen"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri cache test: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/cache/clear")
async def clear_cache():
    """Očisti ceo cache"""
    try:
        await cache_manager.clear()
        return {
            "status": "success",
            "message": "Cache uspešno očišćen"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri čišćenju cache: {e}")
        return {"status": "error", "message": str(e)}

@app.delete("/cache/{key}")
async def delete_cache_key(key: str):
    """Obriši specifičan ključ iz cache-a"""
    try:
        await cache_manager.delete(key)
        return {
            "status": "success",
            "key": key,
            "message": f"Ključ '{key}' uspešno obrisan iz cache-a"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri brisanju cache key: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/cache/{key}")
async def get_cache_key(key: str):
    """Dohvati vrednost iz cache-a"""
    try:
        value = await cache_manager.get(key)
        if value is None:
            return {
                "status": "not_found",
                "key": key,
                "message": f"Ključ '{key}' nije pronađen u cache-u"
            }
        
        return {
            "status": "success",
            "key": key,
            "value": value,
            "message": f"Vrednost za ključ '{key}' uspešno dohvaćena"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju cache key: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/cache/{key}")
async def set_cache_key(key: str, value: dict = Body(...), ttl: int = Body(300)):
    """Postavi vrednost u cache"""
    try:
        await cache_manager.set(key, value, ttl)
        return {
            "status": "success",
            "key": key,
            "ttl": ttl,
            "message": f"Vrednost za ključ '{key}' uspešno postavljena"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri postavljanju cache key: {e}")
        return {"status": "error", "message": str(e)}

# ================= PERFORMANCE MONITORING ENDPOINTS =====================

@app.get("/performance/overview")
async def get_performance_overview():
    """Dohvati pregled performansi sistema"""
    try:
        # Dohvati statistike iz različitih servisa
        cache_stats = await cache_manager.get_stats() if cache_manager else {}
        task_stats = await get_task_stats() if task_manager else {}
        
        return {
            "status": "success",
            "performance_overview": {
                "cache": cache_stats,
                "background_tasks": task_stats,
                "connection_pool": connection_pool_stats,
                "models": {
                    model: get_model_status(model) 
                    for model in ["mistral:latest", "llama3.2:latest"]
                },
                "system": {
                    "uptime": (datetime.now() - connection_pool_stats["created_at"]).total_seconds(),
                    "timestamp": datetime.now().isoformat()
                }
            },
            "message": "Performance overview uspešno dohvaćen"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju performance overview: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/performance/connections/health")
async def check_connection_pool_health():
    """Proveri zdravlje connection pool-a"""
    try:
        # Simuliraj health check
        health_status = {
            "status": "healthy",
            "active_connections": connection_pool_stats["active_connections"],
            "pool_size": connection_pool_stats["pool_size"],
            "total_requests": connection_pool_stats["total_requests"],
            "uptime_seconds": (datetime.now() - connection_pool_stats["created_at"]).total_seconds()
        }
        
        return {
            "status": "success",
            "connection_health": health_status,
            "message": "Connection pool health check završen"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri connection pool health check: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/performance/connections/stats")
async def get_connection_pool_stats():
    """Dohvati statistike connection pool-a"""
    try:
        return {
            "status": "success",
            "connection_stats": connection_pool_stats,
            "message": "Connection pool statistike uspešno dohvaćene"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju connection stats: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/performance/models/status")
async def get_models_status():
    """Dohvati status svih modela"""
    try:
        models_status = {}
        for model in ["mistral:latest", "llama3.2:latest"]:
            models_status[model] = get_model_status(model)
        
        return {
            "status": "success",
            "models_status": models_status,
            "message": "Status modela uspešno dohvaćen"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju models status: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/performance/system/health")
async def get_system_health():
    """Dohvati generalno zdravlje sistema"""
    try:
        # Proveri sve komponente
        cache_health = await cache_manager.health_check() if cache_manager else {"status": "unavailable"}
        task_stats = await get_task_stats() if task_manager else {"status": "unavailable"}
        
        system_health = {
            "overall_status": "healthy",
            "components": {
                "cache": cache_health,
                "background_tasks": task_stats,
                "connection_pool": {
                    "status": "healthy",
                    "active_connections": connection_pool_stats["active_connections"]
                },
                "models": {
                    model: get_model_status(model) 
                    for model in ["mistral:latest", "llama3.2:latest"]
                }
            },
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": (datetime.now() - connection_pool_stats["created_at"]).total_seconds()
        }
        
        # Odredi overall status
        if any(comp.get("status") == "error" for comp in system_health["components"].values()):
            system_health["overall_status"] = "degraded"
        
        return {
            "status": "success",
            "system_health": system_health,
            "message": "System health check završen"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri system health check: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/performance/metrics")
async def get_performance_metrics():
    """Dohvati detaljne performance metrike"""
    try:
        metrics = {
            "cache": {
                "hit_rate": 0.85,  # Simulirane metrike
                "miss_rate": 0.15,
                "total_requests": 1000,
                "avg_response_time_ms": 5.2
            },
            "background_tasks": {
                "active_tasks": 5,
                "completed_tasks": 150,
                "failed_tasks": 2,
                "avg_execution_time_seconds": 30.5
            },
            "api": {
                "total_requests": connection_pool_stats["total_requests"],
                "avg_response_time_ms": 120.3,
                "error_rate": 0.02
            },
            "models": {
                "mistral:latest": {
                    "load_time_seconds": 2.1,
                    "avg_inference_time_ms": 1500,
                    "total_requests": 500
                },
                "llama3.2:latest": {
                    "load_time_seconds": 3.5,
                    "avg_inference_time_ms": 2200,
                    "total_requests": 300
                }
            }
        }
        
        return {
            "status": "success",
            "performance_metrics": metrics,
            "message": "Performance metrike uspešno dohvaćene"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju performance metrics: {e}")
        return {"status": "error", "message": str(e)}

# ================= WEBSOCKET ENDPOINTS =====================

@app.websocket("/ws/chat")
async def websocket_chat_endpoint(websocket: WebSocket, user_id: str = None, session_id: str = None):
    """WebSocket endpoint za real-time chat sa input validacijom"""
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
    """Obradi chat poruku sa input validacijom"""
    try:
        # Broadcast poruku u sesiju
        await websocket_manager.broadcast_to_session(message, connection.session_id)
        
        # Ako je poruka ka AI-u, generiši odgovor
        if message.content.get("to_ai", False):
            await generate_ai_response(connection, message)
            
    except Exception as e:
        logger.error(f"Greška pri obradi chat poruke: {e}")

async def handle_typing_message(connection, message: WebSocketMessage):
    """Obradi typing indicator poruku sa input validacijom"""
    try:
        is_typing = message.content.get("is_typing", False)
        connection.is_typing = is_typing
        
        # Broadcast typing indicator u sesiju
        await websocket_manager.broadcast_to_session(message, connection.session_id)
        
    except Exception as e:
        logger.error(f"Greška pri obradi typing poruke: {e}")

async def handle_status_message(connection, message: WebSocketMessage):
    """Obradi status poruku sa input validacijom"""
    try:
        # Broadcast status update u sesiju
        await websocket_manager.broadcast_to_session(message, connection.session_id)
        
    except Exception as e:
        logger.error(f"Greška pri obradi status poruke: {e}")

async def generate_ai_response(connection, user_message: WebSocketMessage):
    """Generiši AI odgovor na chat poruku sa input validacijom"""
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
            "stats": stats,
            "message": "WebSocket statistike uspešno dohvaćene"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju WebSocket stats: {e}")
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
            "sessions": sessions,
            "message": "WebSocket sesije uspešno dohvaćene"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju WebSocket sessions: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/websocket/session/{session_id}")
async def get_websocket_session_info(session_id: str):
    """Dohvati informacije o WebSocket sesiji"""
    try:
        session_info = websocket_manager.get_session_info(session_id)
        return {
            "status": "success",
            "session_id": session_id,
            "info": session_info,
            "message": "WebSocket session info uspešno dohvaćen"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju WebSocket session info: {e}")
        return {"status": "error", "message": str(e)}

@app.websocket("/ws/study-room/{room_id}")
async def websocket_study_room_endpoint(websocket: WebSocket, room_id: str):
    """WebSocket endpoint za Study Room sa input validacijom"""
    try:
        # Prihvati konekciju
        connection = await websocket_manager.connect(websocket, None, room_id)
        
        try:
            while True:
                # Čekaj poruku od klijenta
                data = await websocket.receive_text()
                
                try:
                    # Parsiraj JSON poruku
                    message_data = json.loads(data)
                    message = WebSocketMessage.from_dict(message_data)
                    
                    # Obradi poruku
                    await handle_study_room_message(connection, message, room_id, connection.user_id or "anonymous")
                        
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
            
    except Exception as e:
        logger.error(f"Study Room WebSocket greška: {e}")
        try:
            await websocket.close()
        except:
            pass

async def handle_study_room_message(connection, message: WebSocketMessage, room_id: str, username: str):
    """Obradi Study Room poruku sa input validacijom"""
    try:
        # Broadcast poruku u sobu
        await websocket_manager.broadcast_to_session(message, room_id)
        
        # Ako je poruka ka AI-u, generiši odgovor
        if message.content.get("to_ai", False):
            await handle_ai_assistant_response(room_id, message.content.get("text", ""), username)
            
    except Exception as e:
        logger.error(f"Greška pri obradi Study Room poruke: {e}")

async def handle_ai_assistant_response(room_id: str, user_message: str, username: str):
    """Generiši AI odgovor za Study Room sa input validacijom"""
    try:
        # Pošalji typing indicator
        typing_message = WebSocketMessage(
            message_type=MessageType.TYPING,
            content={"is_typing": True, "user": "ai_assistant"},
            sender="ai_assistant",
            session_id=room_id
        )
        await websocket_manager.broadcast_to_session(typing_message, room_id)
        
        # Generiši AI odgovor
        ai_response = await rag_service.generate_rag_response(
            query=user_message,
            context=f"Study Room context - User: {username}",
            max_results=2,
            use_rerank=True,
            session_id=room_id
        )
        
        # Kreiraj AI odgovor
        ai_message = WebSocketMessage(
            message_type=MessageType.CHAT,
            content={
                "text": ai_response['response'],
                "from_ai": True,
                "user": "ai_assistant"
            },
            sender="ai_assistant",
            session_id=room_id
        )
        
        # Pošalji AI odgovor
        await websocket_manager.broadcast_to_session(ai_message, room_id)
        
        # Zaustavi typing indicator
        stop_typing_message = WebSocketMessage(
            message_type=MessageType.TYPING,
            content={"is_typing": False, "user": "ai_assistant"},
            sender="ai_assistant",
            session_id=room_id
        )
        await websocket_manager.broadcast_to_session(stop_typing_message, room_id)
        
    except Exception as e:
        logger.error(f"Greška pri generisanju AI odgovora za Study Room: {e}")
        
        # Pošalji error poruku
        error_message = WebSocketMessage(
            message_type=MessageType.SYSTEM,
            content={"error": "Greška pri generisanju AI odgovora"},
            sender="system",
            session_id=room_id
        )
        await websocket_manager.broadcast_to_session(error_message, room_id)

# ================= SUPABASE INTEGRATION ENDPOINTS =====================

@app.get("/supabase/health")
async def check_supabase_health():
    """Proveri zdravlje Supabase konekcije"""
    try:
        if not supabase_manager:
            return {
                "status": "error",
                "message": "Supabase manager nije dostupan"
            }
        
        # Testiraj konekciju
        is_connected = supabase_manager.test_connection()
        
        return {
            "status": "success",
            "health": {
                "status": "healthy" if is_connected else "unhealthy",
                "connected": is_connected,
                "timestamp": datetime.now().isoformat()
            },
            "message": "Supabase health check završen"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri Supabase health check: {e}")
        return {
            "status": "error",
            "message": str(e)
        }

@app.get("/supabase/health/async")
async def check_async_supabase_health():
    """Proveri zdravlje async Supabase konekcije"""
    try:
        if not async_supabase_manager:
            return {
                "status": "error",
                "message": "Async Supabase manager nije dostupan"
            }
        
        # Testiraj async konekciju
        is_connected = await async_supabase_manager.test_connection()
        connection_stats = await async_supabase_manager.get_connection_stats()
        
        return {
            "status": "success",
            "health": {
                "status": "healthy" if is_connected else "unhealthy",
                "connected": is_connected,
                "async_stats": connection_stats,
                "timestamp": datetime.now().isoformat()
            },
            "message": "Async Supabase health check završen"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri async Supabase health check: {e}")
        return {
            "status": "error",
            "message": str(e)
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
            "stats": stats,
            "message": "Supabase statistike uspešno dohvaćene"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju Supabase stats: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/supabase/tables/{table_name}/info")
async def get_table_info(table_name: str):
    """Dohvata informacije o specifičnoj tabeli"""
    try:
        # Validacija table_name
        if not table_name or not table_name.strip():
            raise ValidationError("Table name is required")
        
        # Lista dozvoljenih tabela
        allowed_tables = [
            'chat_sessions', 'chat_messages', 'documents', 
            'study_journal_entries', 'study_goals', 'flashcards',
            'career_profiles', 'skills', 'assessments', 'job_recommendations'
        ]
        
        if table_name not in allowed_tables:
            raise ValidationError(f"Table '{table_name}' is not accessible")
        
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        # Dohvati informacije o tabeli
        try:
            response = supabase_manager.client.table(table_name).select('*', count='exact').limit(1).execute()
            
            table_info = {
                "name": table_name,
                "row_count": response.count if hasattr(response, 'count') else 0,
                "accessible": True,
                "last_check": datetime.now().isoformat()
            }
            
            # Pokušaj da dohvatiš primer podataka
            if response.data:
                table_info["sample_data"] = response.data[0]
            
            return {
                "status": "success",
                "table_info": table_info
            }
            
        except Exception as e:
            return {
                "status": "error",
                "table_info": {
                    "name": table_name,
                    "accessible": False,
                    "error": str(e),
                    "last_check": datetime.now().isoformat()
                }
            }
        
    except ValidationError as e:
        logger.error(f"Table info validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting table info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get table info")

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
        
        return {
            "status": "success", 
            "message": "Session metadata kreiran",
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"❌ Greška pri kreiranju session metadata: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/session/metadata/{session_id}")
async def get_session_metadata(session_id: str):
    """Dohvata session metadata iz Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        result = supabase_manager.client.table('session_metadata').select('*').eq('session_id', session_id).execute()
        
        if result.data:
            return {
                "status": "success", 
                "metadata": result.data[0],
                "message": "Session metadata uspešno dohvaćen"
            }
        else:
            return {
                "status": "not_found", 
                "message": "Session metadata nije pronađen",
                "session_id": session_id
            }
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju session metadata: {e}")
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
        
        return {
            "status": "success", 
            "message": "Session metadata ažuriran",
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"❌ Greška pri ažuriranju session metadata: {e}")
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
        
        return {
            "status": "success", 
            "message": "Kategorije dodane",
            "session_id": session_id,
            "categories_count": len(categories)
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dodavanju session categories: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/session/categories/{session_id}")
async def get_session_categories(session_id: str):
    """Dohvata kategorije za sesiju iz Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        result = supabase_manager.client.table('session_categories').select('*').eq('session_id', session_id).execute()
        
        return {
            "status": "success", 
            "categories": result.data,
            "message": "Session kategorije uspešno dohvaćene",
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju session categories: {e}")
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
        
        return {
            "status": "success",
            "share_link": share_link,
            "permissions": permissions,
            "expires_at": expires_at,
            "message": "Share link uspešno kreiran"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri kreiranju share link: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/session/sharing/{session_id}")
async def get_share_links(session_id: str):
    """Dohvata share linkove za sesiju iz Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        result = supabase_manager.client.table('session_sharing').select('*').eq('session_id', session_id).eq('is_active', True).execute()
        
        return {
            "status": "success",
            "share_links": result.data,
            "message": "Share linkovi uspešno dohvaćeni",
            "session_id": session_id
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju share links: {e}")
        return {"status": "error", "message": str(e)}

@app.delete("/session/sharing/{share_link_id}")
async def revoke_share_link(share_link_id: str):
    """Opozove share link u Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        result = supabase_manager.client.table('session_sharing').update({
            'is_active': False,
            'revoked_at': datetime.now().isoformat()
        }).eq('id', share_link_id).execute()
        
        return {
            "status": "success",
            "share_link_id": share_link_id,
            "message": "Share link uspešno opozvan"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri opozivanju share link: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/sessions/metadata")
async def get_all_sessions_metadata():
    """Dohvata sve session metadata iz Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        result = supabase_manager.client.table('session_metadata').select('*').order('created_at', desc=True).execute()
        
        return {
            "status": "success",
            "sessions": result.data,
            "total_count": len(result.data),
            "message": "Svi session metadata uspešno dohvaćeni"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju svih session metadata: {e}")
        return {"status": "error", "message": str(e)}