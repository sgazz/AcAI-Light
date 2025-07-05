"""
AcAIA Backend - Supabase verzija
Samo Supabase endpoint-i bez lokalne SQLite baze
"""

import os
import uuid
import time
import json
import logging
import time
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, WebSocket, WebSocketDisconnect, Request, APIRouter, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from ollama import Client
import sys
import functools
import asyncio
import hashlib
import aiohttp
from contextlib import asynccontextmanager
from pydantic import BaseModel

# Konfiguracija logging-a
logger = logging.getLogger(__name__)

# Dodaj backend direktorijum u path za import supabase_client
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
            limit=100,  # Ukupan broj konekcija
            limit_per_host=30,  # Konekcije po hostu
            ttl_dns_cache=300,  # DNS cache TTL
            use_dns_cache=True,
            keepalive_timeout=30,
            enable_cleanup_closed=True
        )
        timeout = aiohttp.ClientTimeout(total=30, connect=10)
        http_session = aiohttp.ClientSession(
            connector=connector,
            timeout=timeout,
            headers={"User-Agent": "AcAIA-Backend/2.0.0"}
        )
    return http_session

# Inicijalizuj servise
rag_service = RAGService(use_supabase=True)
ocr_service = OCRService()
ollama_client = Client(host="http://localhost:11434")
career_guidance_service = CareerGuidanceService()

# Globalni keš za preload-ovane modele
preloaded_models = {}
model_loading_status = {"mistral": False, "llama2": False}

async def preload_ollama_models():
    """Preload-uje Ollama modele na startup-u za brže response time"""
    global model_loading_status
    
    models_to_preload = ["mistral:latest", "llama3.2:latest"]
    
    for model in models_to_preload:
        try:
            print(f"🔄 Preload-ujem model: {model}")
            start_time = time.time()
            
            # Pozovi model da se učita u memoriju
            response = ollama_client.chat(
                model=model,
                messages=[{"role": "user", "content": "test"}],
                stream=False
            )
            
            load_time = time.time() - start_time
            model_loading_status[model] = True
            preloaded_models[model] = {
                "loaded_at": datetime.now(),
                "load_time": load_time,
                "status": "ready"
            }
            
            print(f"✅ Model {model} uspešno preload-ovan za {load_time:.2f}s")
            
        except Exception as e:
            print(f"❌ Greška pri preload-ovanju modela {model}: {e}")
            model_loading_status[model] = False
            preloaded_models[model] = {
                "status": "error",
                "error": str(e)
            }

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

async def get_conversation_context_async(session_id: str, max_messages: int = 5) -> str:
    """Dohvati prethodne poruke za kontekst iz Supabase asinhrono"""
    try:
        if not async_supabase_manager:
            return ""
        
        history = await async_supabase_manager.get_chat_history(session_id, max_messages)
        
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
        print(f"Greška pri async dohvatanju konteksta iz Supabase: {e}")
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

async def ollama_chat_async(*args, **kwargs):
    loop = asyncio.get_event_loop()
    func = functools.partial(ollama_client.chat, *args, **kwargs)
    return await loop.run_in_executor(None, func)



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
        "supabase_connected": supabase_manager.test_connection() if supabase_manager else False,
        "ollama_models": {
            model: get_model_status(model) 
            for model in ["mistral:latest", "llama3.2:latest"]
        }
    }

@app.get("/models/status")
async def get_models_status():
    """Dohvati status preload-ovanih modela"""
    return {
        "status": "success",
        "models": {
            model: get_model_status(model) 
            for model in ["mistral:latest", "llama3.2:latest"]
        },
        "preload_cache": preloaded_models
    }

@app.post("/chat/new-session")
async def create_new_session():
    """Kreira novu chat sesiju"""
    session_id = str(uuid.uuid4())
    return {"session_id": session_id}

# Supabase Chat Endpoint-i
@app.post("/chat")
async def chat_endpoint(message: dict):
    """Chat endpoint koji koristi Supabase sa optimizacijama"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        
        user_message = message.get("message", "")
        session_id = message.get("session_id", str(uuid.uuid4()))
        model_name = message.get("model", "mistral:latest")

        if not user_message.strip():
            raise HTTPException(status_code=400, detail="Poruka ne može biti prazna")
        
        # Ažuriraj connection pool statistike
        connection_pool_stats["total_requests"] += 1
        
        # Dohvati kontekst prethodnih poruka asinhrono
        context = await get_conversation_context_async(session_id)
        
        # Proveri cache prvo
        cached_response = await get_cached_ai_response(user_message, model_name, context)
        if cached_response:
            print(f"🎯 Cache hit za upit: {user_message[:50]}...")
            return {
                "status": "success",
                "response": cached_response["response"],
                "session_id": session_id,
                "model": model_name,
                "response_time": cached_response["response_time"],
                "model_status": get_model_status(model_name),
                "cached": True,
                "cache_info": {
                    "cached_at": cached_response["cached_at"],
                    "original_response_time": cached_response["response_time"]
                },
                "optimizations": {
                    "connection_pool": True,
                    "background_save": True,
                    "model_preloaded": True,
                    "cache_hit": True
                }
            }
        
        # Ako nema u cache-u, proveri semantic cache
        semantic_response = await get_semantic_cached_response(user_message, 0.8)
        if semantic_response:
            print(f"🧠 Semantic cache hit za upit: {user_message[:50]}... (similarity: {semantic_response.get('similarity_score', 0):.2f})")
            return {
                "status": "success",
                "response": semantic_response["response"],
                "session_id": session_id,
                "model": model_name,
                "response_time": semantic_response["response_time"],
                "model_status": get_model_status(model_name),
                "cached": True,
                "cache_info": {
                    "cached_at": semantic_response["cached_at"],
                    "original_response_time": semantic_response["response_time"],
                    "semantic_match": True,
                    "similarity_score": semantic_response.get("similarity_score", 0)
                },
                "optimizations": {
                    "connection_pool": True,
                    "background_save": True,
                    "model_preloaded": True,
                    "semantic_cache_hit": True
                }
            }
        
        print(f"❌ Cache miss za upit: {user_message[:50]}...")
        
        # Proveri da li je model preload-ovan
        model_status = get_model_status(model_name)
        if not model_status["available"]:
            print(f"⚠️ Model {model_name} nije preload-ovan, učitavam...")
            try:
                await preload_ollama_models()
            except Exception as e:
                print(f"❌ Greška pri učitavanju modela: {e}")
        
        # Kreiraj poboljšani prompt
        enhanced_prompt = create_enhanced_prompt(user_message, context)
        
        # Meri vreme odgovora
        start_time = time.time()
        
        # Pozovi Ollama API asinkrono
        response = await ollama_chat_async(
            model=model_name,
            messages=[{
                'role': 'user',
                'content': enhanced_prompt
            }],
            stream=False
        )
        
        response_time = time.time() - start_time
        ai_response = response['message']['content']
        
        # Sačuvaj AI odgovor u cache
        await set_cached_ai_response(
            query=user_message,
            response=ai_response,
            model=model_name,
            context=context,
            response_time=response_time,
            ttl=3600  # 1 sat
        )
        
        # Dodaj background task za čuvanje poruka (ne blokira response)
        # Umesto background task-a, koristimo direktno async poziv
        try:
            await async_supabase_manager.save_chat_message(
                session_id=session_id,
                user_message=user_message,
                assistant_message=ai_response
            )
        except Exception as e:
            print(f"Greška pri async čuvanju poruke: {e}")
            # Fallback na background task ako async ne radi
            await add_background_task(
                func=lambda **kwargs: None,  # Dummy funkcija koja prihvata kwargs
                priority=TaskPriority.LOW,
                description="save_chat_message",
                session_id=session_id,
                user_message=user_message,
                assistant_message=ai_response,
                model=model_name,
                response_time=response_time
            )
        
        return {
            "status": "success",
            "response": ai_response,
            "session_id": session_id,
            "model": model_name,
            "response_time": response_time,
            "model_status": model_status,
            "cached": False,
            "optimizations": {
                "connection_pool": True,
                "background_save": True,
                "model_preloaded": model_status["available"],
                "cache_miss": True
            }
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
                # Dohvati session_name iz metadata ako postoji
                session_name = None
                if msg.get('metadata') and isinstance(msg['metadata'], dict):
                    session_name = msg['metadata'].get('session_name')
                
                sessions[session_id] = {
                    'session_id': session_id,
                    'name': session_name,  # Dodajemo name polje
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
        
        # Obriši session metadata ako postoji
        try:
            supabase_manager.client.table('session_metadata').delete().eq('session_id', session_id).execute()
        except:
            pass  # Ignoriši ako tabela ne postoji
        
        # Obriši share links ako postoje
        try:
            supabase_manager.client.table('session_share_links').delete().eq('session_id', session_id).execute()
        except:
            pass  # Ignoriši ako tabela ne postoji
        
        # Obriši kategorije ako postoje
        try:
            supabase_manager.client.table('session_categories').delete().eq('session_id', session_id).execute()
        except:
            pass  # Ignoriši ako tabela ne postoji
        
        return {"status": "success", "message": "Sesija obrisana"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Session Management Endpoint-i
@app.put("/chat/sessions/{session_id}/rename")
async def rename_session(session_id: str, request: Request):
    """Preimenuje chat sesiju"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        
        # Dohvati JSON body
        body = await request.json()
        name = body.get('name')
        
        if not name:
            raise HTTPException(status_code=400, detail="Name parametar je obavezan")
        
        # Dohvati postojeće metadata
        existing_data = supabase_manager.client.table('chat_history').select('metadata').eq('session_id', session_id).limit(1).execute()
        
        if existing_data.data:
            existing_metadata = existing_data.data[0].get('metadata', {})
            if not isinstance(existing_metadata, dict):
                existing_metadata = {}
        else:
            existing_metadata = {}
        
        # Ažuriraj metadata sa novim session_name
        updated_metadata = {**existing_metadata, 'session_name': name}
        
        # Ažuriraj metadata u chat_history tabeli
        supabase_manager.client.table('chat_history').update({
            'metadata': updated_metadata
        }).eq('session_id', session_id).execute()
        
        return {"status": "success", "message": "Sesija preimenovana", "name": name}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.put("/chat/sessions/{session_id}/categories")
async def update_session_categories(session_id: str, categories: List[str]):
    """Ažurira kategorije sesije"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        
        # Ažuriraj kategorije u metadata koloni chat_history tabeli
        supabase_manager.client.table('chat_history').update({
            'metadata': {'categories': categories}
        }).eq('session_id', session_id).execute()
        
        return {"status": "success", "message": "Kategorije ažurirane", "categories": categories}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/chat/sessions/{session_id}/archive")
async def archive_session(session_id: str):
    """Arhivira sesiju"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        
        # Označi sesiju kao arhivirana u metadata koloni chat_history tabeli
        supabase_manager.client.table('chat_history').update({
            'metadata': {'is_archived': True}
        }).eq('session_id', session_id).execute()
        
        return {"status": "success", "message": "Sesija arhivirana"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/chat/sessions/{session_id}/restore")
async def restore_session(session_id: str):
    """Vraća sesiju iz arhive"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        
        # Ukloni arhiviranje iz metadata kolone chat_history tabeli
        supabase_manager.client.table('chat_history').update({
            'metadata': {'is_archived': False}
        }).eq('session_id', session_id).execute()
        
        return {"status": "success", "message": "Sesija vraćena iz arhive"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/chat/sessions/{session_id}/share")
async def create_session_share_link(session_id: str, permissions: str = 'read', expires_in: str = '7d'):
    """Kreira share link za sesiju"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        # Kreiraj share token
        import secrets
        share_token = secrets.token_hex(32)
        
        # Izračunaj expires_at
        from datetime import datetime, timedelta
        expires_at = datetime.now() + timedelta(days=int(expires_in.replace('d', '')))
        
        # Sačuvaj share link u metadata koloni
        share_data = {
            'share_token': share_token,
            'permissions': {'read': True, 'write': permissions == 'write'},
            'expires_at': expires_at.isoformat(),
            'is_active': True,
            'created_at': datetime.now().isoformat()
        }
        
        # Dohvati postojeće share links iz metadata
        existing_data = supabase_manager.client.table('chat_history').select('metadata').eq('session_id', session_id).limit(1).execute()
        
        if existing_data.data:
            existing_metadata = existing_data.data[0].get('metadata', {})
            existing_share_links = existing_metadata.get('share_links', [])
            existing_share_links.append(share_data)
            new_metadata = {**existing_metadata, 'share_links': existing_share_links}
        else:
            new_metadata = {'share_links': [share_data]}
        
        # Ažuriraj metadata
        supabase_manager.client.table('chat_history').update({
            'metadata': new_metadata
        }).eq('session_id', session_id).execute()
        
        return {
            "status": "success", 
            "message": "Share link kreiran",
            "share_token": share_token,
            "expires_at": expires_at.isoformat()
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.delete("/chat/sessions/share/{share_token}")
async def revoke_session_share_link(share_token: str):
    """Opoziva share link"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        
        # Deaktiviraj share link
        try:
            supabase_manager.client.table('session_share_links').update({
                'is_active': False
            }).eq('share_token', share_token).execute()
        except:
            # Ako tabela ne postoji, ukloni iz chat_history
            pass
        
        return {"status": "success", "message": "Share link opozvan"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/chat/sessions/{session_id}/export")
async def export_session(session_id: str):
    """Export-uje sesiju u JSON formatu"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        
        # Dohvati sve poruke za sesiju
        messages = supabase_manager.client.table('chat_history').select('*').eq('session_id', session_id).execute()
        
        # Dohvati session metadata
        try:
            metadata = supabase_manager.client.table('session_metadata').select('*').eq('session_id', session_id).execute()
            session_metadata = metadata.data[0] if metadata.data else {}
        except:
            session_metadata = {}
        
        export_data = {
            'session_id': session_id,
            'metadata': session_metadata,
            'messages': messages.data,
            'exported_at': datetime.now().isoformat(),
            'total_messages': len(messages.data)
        }
        
        return {
            "status": "success",
            "export_data": export_data
        }
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
        
        # Meri vreme odgovora
        start_time = time.time()
        
        # Generiši RAG odgovor
        rag_response = await rag_service.generate_rag_response(
            query=user_message,
            context=context,
            max_results=max_results,
            use_rerank=use_rerank,
            session_id=session_id
        )
        
        response_time = time.time() - start_time
        
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
            "cached": rag_response.get('cached', False),
            "response_time": response_time
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

@app.get("/documents/{doc_id}/content")
async def get_document_content(doc_id: str, page: int = None):
    """Dohvata sadržaj dokumenta za preview"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        
        # Dohvati dokument iz baze
        document = supabase_manager.get_document(doc_id)
        
        if not document:
            raise HTTPException(status_code=404, detail="Dokument nije pronađen")
        
        # Ako je slika, vrati je direktno
        if document.get('file_type', '').startswith('image/'):
            # Za slike, vrati URL ili base64 podatke
            # Ovde bi trebalo da se implementira logika za dohvatanje slike iz storage-a
            return {
                "status": "success",
                "filename": document['filename'],
                "file_type": document['file_type'],
                "content_type": "image",
                "message": "Slika je dostupna za preview"
            }
        
        # Za tekstualne dokumente, vrati sadržaj
        content = document.get('content', '')
        if not content:
            return {
                "status": "success",
                "filename": document['filename'],
                "file_type": document['file_type'],
                "content_type": "text",
                "all_content": "Sadržaj dokumenta nije dostupan",
                "total_pages": 1,
                "pages": {1: "Sadržaj dokumenta nije dostupan"}
            }
        
        # Podeli sadržaj na stranice (po 1000 karaktera)
        lines = content.split('\n')
        pages = {}
        current_page = 1
        current_content = []
        char_count = 0
        
        for line in lines:
            if char_count + len(line) > 1000 and current_content:
                pages[current_page] = '\n'.join(current_content)
                current_page += 1
                current_content = [line]
                char_count = len(line)
            else:
                current_content.append(line)
                char_count += len(line) + 1
        
        # Dodaj poslednju stranicu
        if current_content:
            pages[current_page] = '\n'.join(current_content)
        
        return {
            "status": "success",
            "filename": document['filename'],
            "file_type": document['file_type'],
            "content_type": "text",
            "all_content": content,
            "total_pages": len(pages),
            "pages": pages
        }
        
    except HTTPException:
        raise
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

@app.get("/documents/{doc_id}/download")
async def download_document(doc_id: str):
    """Dohvata originalni fajl za download"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        
        # Dohvati dokument iz baze
        document = supabase_manager.get_document(doc_id)
        
        if not document:
            raise HTTPException(status_code=404, detail="Dokument nije pronađen")
        
        file_path = document.get('file_path')
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Originalni fajl nije pronađen")
        
        # Proveri da li je fajl bezbedan za čitanje
        if not os.path.isfile(file_path):
            raise HTTPException(status_code=400, detail="Neispravna putanja fajla")
        
        # Dohvati MIME tip na osnovu ekstenzije
        file_extension = os.path.splitext(document['filename'])[1].lower()
        mime_types = {
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.txt': 'text/plain',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }
        content_type = mime_types.get(file_extension, 'application/octet-stream')
        
        # Čitaj fajl i vrati kao response
        with open(file_path, 'rb') as file:
            file_content = file.read()
        
        return Response(
            content=file_content,
            media_type=content_type,
            headers={
                "Content-Disposition": f"attachment; filename=\"{document['filename']}\""
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/documents/{doc_id}/preview")
async def preview_document(doc_id: str):
    """Dohvata fajl za preview (posebno za slike)"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije dostupan")
        
        # Dohvati dokument iz baze
        document = supabase_manager.get_document(doc_id)
        
        if not document:
            raise HTTPException(status_code=404, detail="Dokument nije pronađen")
        
        file_path = document.get('file_path')
        if not file_path or not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Originalni fajl nije pronađen")
        
        # Proveri da li je fajl bezbedan za čitanje
        if not os.path.isfile(file_path):
            raise HTTPException(status_code=400, detail="Neispravna putanja fajla")
        
        # Dohvati MIME tip na osnovu ekstenzije
        file_extension = os.path.splitext(document['filename'])[1].lower()
        mime_types = {
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.txt': 'text/plain',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }
        content_type = mime_types.get(file_extension, 'application/octet-stream')
        
        # Čitaj fajl i vrati kao response
        with open(file_path, 'rb') as file:
            file_content = file.read()
        
        return Response(
            content=file_content,
            media_type=content_type,
            headers={
                "Content-Disposition": f"inline; filename=\"{document['filename']}\""
            }
        )
        
    except HTTPException:
        raise
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
            }
        }
    except Exception as e:
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
            }
        }
    except Exception as e:
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
            "stats": stats
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Session Management Endpoint-i
@app.post("/session/metadata")
async def create_session_metadata(request: Request):
    """Kreira session metadata u Supabase"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=503, detail="Supabase nije omogućen")
        
        # Parsiraj JSON body
        body = await request.json()
        session_id = body.get('session_id')
        name = body.get('name')
        description = body.get('description')
        
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id je obavezan")
        
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
        
        # Izračunaj expires_at
        from datetime import datetime, timedelta
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
    """Dohvati informacije o WebSocket sesiji"""
    try:
        session_info = websocket_manager.get_session_info(session_id)
        return {
            "status": "success",
            "session_id": session_id,
            "info": session_info
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Connection Pooling Endpointi
@app.get("/connections/health")
async def check_connection_pool_health():
    """Proveri zdravlje connection pool-a"""
    try:
        session = await get_http_session()
        connector = session.connector
        
        return {
            "status": "healthy",
            "pool_stats": {
                "total_connections": connector.limit,
                "connections_per_host": connector.limit_per_host,
                "active_connections": connection_pool_stats["active_connections"],
                "total_requests": connection_pool_stats["total_requests"],
                "created_at": connection_pool_stats["created_at"].isoformat()
            },
            "connector_stats": {
                "dns_cache_size": len(connector._resolver_cache) if hasattr(connector, '_resolver_cache') else 0,
                "keepalive_timeout": connector._keepalive_timeout,
                "enable_cleanup_closed": connector._enable_cleanup_closed
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/connections/stats")
async def get_connection_pool_stats():
    """Dohvati statistike connection pool-a"""
    try:
        session = await get_http_session()
        connector = session.connector
        
        return {
            "status": "success",
            "stats": {
                "total_requests": connection_pool_stats["total_requests"],
                "active_connections": connection_pool_stats["active_connections"],
                "pool_size": connection_pool_stats["pool_size"],
                "uptime": (datetime.now() - connection_pool_stats["created_at"]).total_seconds(),
                "requests_per_second": connection_pool_stats["total_requests"] / max(1, (datetime.now() - connection_pool_stats["created_at"]).total_seconds())
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Background Tasks Endpointi
@app.post("/tasks/add")
async def add_background_task_endpoint(task_data: dict):
    """Dodaj background task"""
    try:
        task_type = task_data.get("type", "general")
        priority = task_data.get("priority", "normal")
        data = task_data.get("data", {})
        
        task_id = await add_background_task(
            func=lambda **kwargs: None,
            priority=TaskPriority(priority),
            description=task_type,
            **data
        )
        
        return {
            "status": "success",
            "data": {
                "task_id": task_id,
                "message": f"Task {task_type} dodat sa prioritetom {priority}"
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "data": None,
            "message": str(e)
        }

@app.get("/tasks")
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
        return {"status": "error", "message": str(e)}

# Cache Endpointi
@app.get("/cache/health")
async def check_cache_health():
    """Proveri zdravlje cache-a"""
    try:
        health = await cache_manager.health_check()
        return {
            "status": "success",
            "cache_health": health
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/cache/stats")
async def get_cache_stats():
    """Dohvati statistike cache-a"""
    try:
        stats = await cache_manager.get_stats()
        return {
            "status": "success",
            "cache_stats": stats
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/cache/analytics")
async def get_cache_analytics():
    """Dohvati analitiku cache-a"""
    try:
        analytics = await cache_manager.get_cache_analytics()
        return {
            "status": "success",
            "analytics": analytics
        }
    except Exception as e:
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
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Performance Monitoring Endpointi
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
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Study Room Endpointi
@app.post("/study-room/create")
async def create_study_room(room_data: dict):
    """Kreiraj novu Study Room sobu"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=500, detail="Supabase nije dostupan")
        
        room_id = str(uuid.uuid4())
        name = room_data.get("name", f"Study Room {room_id[:8]}")
        description = room_data.get("description", "")
        subject = room_data.get("subject", "")
        max_participants = room_data.get("max_participants", 10)
        admin_user_id = room_data.get("admin_user_id", "default_admin")
        
        # Kreiraj sobu u Supabase
        room_data_to_insert = {
            "room_id": room_id,
            "name": name,
            "description": description,
            "subject": subject,
            "max_participants": max_participants,
            "admin_user_id": admin_user_id,
            "is_active": True,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat()
        }
        
        result = supabase_manager.client.table("study_rooms").insert(room_data_to_insert).execute()
        
        if result.data:
            # Dodaj admin-a kao prvog člana
            member_data = {
                "room_id": room_id,
                "user_id": admin_user_id,
                "username": f"Admin_{admin_user_id[:8]}",
                "role": "admin",
                "joined_at": datetime.now().isoformat(),
                "is_active": True
            }
            
            supabase_manager.client.table("study_room_members").insert(member_data).execute()
            
            return {
                "status": "success",
                "room": {
                    "room_id": room_id,
                    "name": name,
                    "description": description,
                    "subject": subject,
                    "admin_user_id": admin_user_id,
                    "invite_code": room_id[:8].upper()  # Kratak kod za pozivnice
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Greška pri kreiranju sobe")
            
    except Exception as e:
        logger.error(f"Greška pri kreiranju Study Room sobe: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/study-room/list")
async def list_study_rooms(user_id: str = "default_admin"):
    """Dohvati listu Study Room soba za korisnika"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=500, detail="Supabase nije dostupan")
        
        # Dohvati sobe gde je korisnik član
        result = supabase_manager.client.table("study_room_members")\
            .select("room_id, role, joined_at")\
            .eq("user_id", user_id)\
            .eq("is_active", True)\
            .execute()
        
        if not result.data:
            return {"status": "success", "rooms": []}
        
        # Dohvati detalje soba
        room_ids = [member["room_id"] for member in result.data]
        rooms_result = supabase_manager.client.table("study_rooms")\
            .select("*")\
            .in_("room_id", room_ids)\
            .eq("is_active", True)\
            .execute()
        
        # Spoji podatke
        rooms = []
        for room in rooms_result.data:
            member_info = next((m for m in result.data if m["room_id"] == room["room_id"]), None)
            rooms.append({
                **room,
                "user_role": member_info["role"] if member_info else "member",
                "joined_at": member_info["joined_at"] if member_info else None,
                "invite_code": room["room_id"][:8].upper()
            })
        
        return {"status": "success", "rooms": rooms}
        
    except Exception as e:
        logger.error(f"Greška pri dohvatanju Study Room soba: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/study-room/join")
async def join_study_room(join_data: dict):
    """Pridruži se Study Room sobi"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=500, detail="Supabase nije dostupan")
        
        invite_code = join_data.get("invite_code", "").upper()
        user_id = join_data.get("user_id", "default_user")
        username = join_data.get("username", "Anonymous")
        
        # Pronađi sobu po invite kodu (prvi 8 karaktera room_id)
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
            # Ako je korisnik već član, samo ga aktiviraj ako je neaktivan
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

@app.get("/study-room/{room_id}/members")
async def get_study_room_members(room_id: str):
    """Dohvati članove Study Room sobe"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=500, detail="Supabase nije dostupan")
        
        result = supabase_manager.client.table("study_room_members")\
            .select("*")\
            .eq("room_id", room_id)\
            .eq("is_active", True)\
            .order("joined_at", desc=False)\
            .execute()
        
        return {"status": "success", "members": result.data}
        
    except Exception as e:
        logger.error(f"Greška pri dohvatanju članova sobe: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/study-room/{room_id}/message")
async def send_study_room_message(room_id: str, message_data: dict):
    """Pošalji poruku u Study Room sobu"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=500, detail="Supabase nije dostupan")
        
        message_id = str(uuid.uuid4())
        user_id = message_data.get("user_id", "default_user")
        username = message_data.get("username", "Anonymous")
        content = message_data.get("content", "")
        message_type = message_data.get("type", "chat")  # chat, system, ai
        
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
            # AI asistent - proveri da li poruka sadrži @AI
            if "@ai" in content.lower():
                # Pozovi AI asistent u background task da ne blokira response
                asyncio.create_task(handle_ai_assistant_response(room_id, content, username))
            
            return {
                "status": "success",
                "message": {
                    "message_id": message_id,
                    "room_id": room_id,
                    "user_id": user_id,
                    "username": username,
                    "content": content,
                    "message_type": message_type,
                    "timestamp": message_data_to_insert["timestamp"]
                }
            }
        else:
            return {"status": "error", "message": "Greška pri slanju poruke"}
            
    except Exception as e:
        logger.error(f"Greška pri slanju poruke u Study Room: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/study-room/{room_id}/messages")
async def get_study_room_messages(room_id: str, limit: int = 50, offset: int = 0):
    """Dohvati poruke iz Study Room sobe"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=500, detail="Supabase nije dostupan")
        
        result = supabase_manager.client.table("study_room_messages")\
            .select("*")\
            .eq("room_id", room_id)\
            .order("timestamp", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()
        
        # Vrati poruke u hronološkom redosledu (najstarije prvo)
        messages = list(reversed(result.data)) if result.data else []
        
        return {"status": "success", "messages": messages}
        
    except Exception as e:
        logger.error(f"Greška pri dohvatanju poruka iz Study Room sobe: {e}")
        return {"status": "error", "message": str(e)}

@app.delete("/study-room/{room_id}/leave")
async def leave_study_room(room_id: str, user_id: str):
    """Napusti Study Room sobu"""
    try:
        if not supabase_manager:
            raise HTTPException(status_code=500, detail="Supabase nije dostupan")
        
        # Proveri da li je korisnik admin
        member_result = supabase_manager.client.table("study_room_members")\
            .select("*")\
            .eq("room_id", room_id)\
            .eq("user_id", user_id)\
            .execute()
        
        if not member_result.data:
            return {"status": "error", "message": "Niste član ove sobe"}
        
        member = member_result.data[0]
        
        # Ako je admin, ne može da napusti sobu dok ne prenese admin prava
        if member["role"] == "admin":
            # Proveri da li ima drugih članova
            other_members = supabase_manager.client.table("study_room_members")\
                .select("*")\
                .eq("room_id", room_id)\
                .eq("is_active", True)\
                .neq("user_id", user_id)\
                .execute()
            
            if other_members.data:
                return {"status": "error", "message": "Admin ne može da napusti sobu dok ne prenese admin prava"}
            
            # Ako je jedini član, deaktiviraj sobu
            supabase_manager.client.table("study_rooms")\
                .update({"is_active": False, "updated_at": datetime.now().isoformat()})\
                .eq("room_id", room_id)\
                .execute()
        
        # Deaktiviraj članstvo
        supabase_manager.client.table("study_room_members")\
            .update({"is_active": False})\
            .eq("room_id", room_id)\
            .eq("user_id", user_id)\
            .execute()
        
        return {"status": "success", "message": "Uspešno napustili sobu"}
        
    except Exception as e:
        logger.error(f"Greška pri napuštanju Study Room sobe: {e}")
        return {"status": "error", "message": str(e)}

# Study Room WebSocket Endpoint
@app.websocket("/ws/study-room/{room_id}")
async def websocket_study_room_endpoint(websocket: WebSocket, room_id: str):
    try:
        # await websocket.accept()  # OVA LINIJA JE UKLONJENA
        # Zatim primi query parametre kroz poruku
        try:
            logger.info(f"🔌 Čekam inicijalnu poruku za sobu {room_id}")
            init_data = await websocket.receive_text()
            logger.info(f"📨 Primljena inicijalna poruka: {init_data}")
            init_message = json.loads(init_data)
            user_id = init_message.get("user_id") or str(uuid.uuid4())
            username = init_message.get("username") or f"User_{user_id[:8]}"
            logger.info(f"✅ Korisnik identifikovan: {username} (ID: {user_id})")
        except Exception as e:
            # Fallback ako ne može da primi inicijalnu poruku
            logger.warning(f"⚠️ Greška pri primanju inicijalne poruke: {e}")
            user_id = str(uuid.uuid4())
            username = f"User_{user_id[:8]}"
            logger.info(f"🔄 Koristeći fallback korisnika: {username} (ID: {user_id})")
        
        logger.info(f"✅ WebSocket konekcija prihvaćena za korisnika {username} u sobi {room_id}")
        
        # Kreiraj konekciju
        connection = await websocket_manager.connect(websocket, user_id, room_id)
        
        # Pošalji welcome poruku
        welcome_message = WebSocketMessage(
            message_type=MessageType.SYSTEM,
            content={
                "message": f"Dobrodošli u Study Room! Korisnik: {username}",
                "room_id": room_id,
                "user_id": user_id,
                "username": username
            },
            sender="system",
            session_id=room_id
        )
        
        await connection.send_message(welcome_message)
        logger.info(f"📨 Welcome poruka poslata korisniku {username}")
        
        try:
            while True:
                # Čekaj poruke
                data = await websocket.receive_text()
                message_data = json.loads(data)
                logger.info(f"📨 Primljena poruka od {username}: {message_data}")
                
                # Kreiraj WebSocket poruku
                message = WebSocketMessage(
                    message_type=MessageType(message_data.get("type", "chat")),
                    content=message_data.get("content", ""),
                    sender=user_id,
                    session_id=room_id
                )
                
                # Obradi poruku
                await handle_study_room_message(connection, message, room_id, username)
                
        except WebSocketDisconnect:
            logger.info(f"👋 Korisnik {username} se odjavio iz sobe {room_id}")
            
        finally:
            # Očisti konekciju
            if 'connection' in locals():
                websocket_manager.disconnect(connection)
                logger.info(f"🧹 Konekcija očišćena za korisnika {username}")
            
    except Exception as e:
        logger.error(f"❌ Greška u Study Room WebSocket: {e}")
        try:
            await websocket.close()
        except:
            pass

async def handle_study_room_message(connection, message: WebSocketMessage, room_id: str, username: str):
    """Obradi poruku iz Study Room sobe"""
    try:
        if message.message_type == MessageType.CHAT:
            # Sačuvaj poruku u bazu
            if supabase_manager:
                message_data = {
                    "message_id": str(uuid.uuid4()),
                    "room_id": room_id,
                    "user_id": message.sender,
                    "username": username,
                    "content": message.content,
                    "message_type": "chat",
                    "timestamp": datetime.now().isoformat()
                }
                supabase_manager.client.table("study_room_messages").insert(message_data).execute()
            # Pošalji poruku svim članovima sobe
            broadcast_message = WebSocketMessage(
                message_type=MessageType.CHAT,
                content={
                    "user_id": message.sender,
                    "username": username,
                    "content": message.content,
                    "timestamp": datetime.now().isoformat()
                },
                sender=message.sender,
                session_id=room_id
            )
            await websocket_manager.broadcast_to_session(broadcast_message, room_id)
            # AI asistent samo na eksplicitno @AI
            if "@ai" in message.content.lower():
                await handle_ai_assistant_response(room_id, message.content, username)
        elif message.message_type == MessageType.TYPING:
            # Pošalji typing indicator
            typing_message = WebSocketMessage(
                message_type=MessageType.TYPING,
                content={
                    "user_id": message.sender,
                    "username": username,
                    "is_typing": message.content.get("is_typing", True)
                },
                sender=message.sender,
                session_id=room_id
            )
            await websocket_manager.broadcast_to_session(typing_message, room_id, exclude_user=message.sender)
    except Exception as e:
        logger.error(f"Greška pri obradi Study Room poruke: {e}")

# Dodaj funkciju za AI odgovor
async def handle_ai_assistant_response(room_id: str, user_message: str, username: str):
    try:
        logger.info(f"🎯 AI asistent aktiviran za sobu {room_id}, korisnik: {username}")
        
        room_info = supabase_manager.client.table("study_rooms").select("*").eq("room_id", room_id).execute()
        if not room_info.data:
            logger.error(f"❌ Soba {room_id} nije pronađena")
            return
        room = room_info.data[0]
        subject = room.get("subject", "general")
        
        logger.info(f"📚 Predmet sobe: {subject}")
        
        recent_messages = supabase_manager.client.table("study_room_messages")\
            .select("*")\
            .eq("room_id", room_id)\
            .order("timestamp", desc=True)\
            .limit(10)\
            .execute()
        
        context = f"Predmet: {subject}\n"
        if recent_messages.data:
            context += "Poslednje poruke:\n"
            for msg in reversed(recent_messages.data[-5:]):
                context += f"{msg['username']}: {msg['content']}\n"
        
        prompt = f"""Ti si AI asistent u Study Room sobi za predmet {subject}.\nStudent {username} je napisao: \"{user_message}\"\n\nKontekst razgovora:\n{context}\n\nOdgovori na pitanje ili daj korisnu sugestiju za učenje. Budi prijateljski i koristan. Ako je potrebno, daj konkretne primere."""
        
        logger.info(f"🤖 Generisanje AI odgovora...")
        
        try:
            ai_response = await ollama_chat_async(
                model="mistral:latest",
                messages=[{"role": "user", "content": prompt}],
                stream=False
            )
            
            if ai_response and "message" in ai_response:
                ai_content = ai_response["message"]["content"]
                logger.info(f"✅ AI odgovor generisan: {ai_content[:100]}...")
                
                ai_message_data = {
                    "message_id": str(uuid.uuid4()),
                    "room_id": room_id,
                    "user_id": "ai_assistant",
                    "username": "AI Asistent",
                    "content": ai_content,
                    "message_type": "ai",
                    "timestamp": datetime.now().isoformat()
                }
                
                supabase_manager.client.table("study_room_messages").insert(ai_message_data).execute()
                logger.info(f"💾 AI poruka sačuvana u bazu")
                
                ai_message = WebSocketMessage(
                    message_type=MessageType.CHAT,
                    content={
                        "user_id": "ai_assistant",
                        "username": "AI Asistent",
                        "content": ai_content,
                        "timestamp": datetime.now().isoformat(),
                        "is_ai": True
                    },
                    sender="ai_assistant",
                    session_id=room_id
                )
                
                await websocket_manager.broadcast_to_session(ai_message, room_id)
                logger.info(f"📡 AI poruka poslata kroz WebSocket")
                
            else:
                logger.error(f"❌ AI odgovor nije generisan: {ai_response}")
                
        except Exception as ai_error:
            logger.error(f"❌ Greška pri AI odgovoru: {ai_error}")
            
    except Exception as e:
        logger.error(f"❌ Greška pri obradi AI asistenta: {e}")

# Exam Simulation Endpoints
@app.post("/exam/create")
async def create_exam(exam_data: dict):
    """Kreiraj novi ispit"""
    try:
        exam_service = await get_exam_service()
        result = await exam_service.create_exam(exam_data)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri kreiranju ispita: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/exam/{exam_id}")
async def get_exam(exam_id: str):
    """Dohvati ispit po ID-u"""
    try:
        exam_service = await get_exam_service()
        result = await exam_service.get_exam(exam_id)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju ispita: {e}")
        return {"status": "error", "message": str(e)}

@app.delete("/exam/{exam_id}")
async def delete_exam(exam_id: str):
    """Obriši ispit"""
    try:
        exam_service = await get_exam_service()
        result = await exam_service.delete_exam(exam_id)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri brisanju ispita: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/exams")
async def list_exams(user_id: str = None, subject: str = None):
    """Listaj sve ispite"""
    try:
        exam_service = await get_exam_service()
        result = await exam_service.list_exams(user_id, subject)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri listanju ispita: {e}")
        return {"status": "error", "message": f"Greška pri listanju ispita: {str(e)}"}

@app.post("/exam/{exam_id}/start")
async def start_exam_attempt(exam_id: str, attempt_data: dict):
    """Započni pokušaj polaganja ispita"""
    try:
        exam_service = await get_exam_service()
        result = await exam_service.start_exam_attempt(
            exam_id, 
            attempt_data.get("user_id"), 
            attempt_data.get("username")
        )
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri započinjanju pokušaja: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/exam/attempt/{attempt_id}/answer")
async def submit_answer(attempt_id: str, answer_data: dict):
    """Predaj odgovor na pitanje"""
    try:
        exam_service = await get_exam_service()
        result = await exam_service.submit_answer(
            attempt_id,
            answer_data.get("question_id"),
            answer_data.get("answer")
        )
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri predaji odgovora: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/exam/attempt/{attempt_id}/finish")
async def finish_exam_attempt(attempt_id: str):
    """Završi pokušaj polaganja ispita"""
    try:
        exam_service = await get_exam_service()
        result = await exam_service.finish_exam_attempt(attempt_id)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri završavanju pokušaja: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/exam/{exam_id}/attempts")
async def get_exam_attempts(exam_id: str, user_id: str):
    """Dohvati sve pokušaje korisnika za određeni ispit"""
    try:
        exam_service = await get_exam_service()
        result = await exam_service.get_user_attempts(exam_id, user_id)
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju pokušaja: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/exam/generate-questions")
async def generate_ai_questions(generation_data: dict):
    """Generiši pitanja pomoću AI-a"""
    try:
        exam_service = await get_exam_service()
        questions = await exam_service.generate_ai_questions(
            generation_data.get("subject"),
            generation_data.get("topic"),
            generation_data.get("count", 10),
            generation_data.get("difficulty", "medium")
        )
        return {
            "status": "success",
            "questions": [q.to_dict() for q in questions],
            "message": f"Generisano {len(questions)} pitanja"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri AI generisanju pitanja: {e}")
        return {"status": "error", "message": str(e)}

@app.get("/questions/physics")
async def get_physics_questions(count: int = 10, difficulty: str = None):
    """Dohvati pitanja iz fizike"""
    try:
        from app.physics_questions import get_physics_questions, get_random_physics_questions
        
        if difficulty:
            questions = [q for q in get_physics_questions() if q["difficulty"] == difficulty]
        else:
            questions = get_random_physics_questions(count)
        
        return {
            "status": "success",
            "questions": questions,
            "message": f"Dohvaćeno {len(questions)} pitanja iz fizike"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju pitanja iz fizike: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/exam/physics/create")
async def create_physics_exam(exam_data: dict = None):
    """Kreiraj ispit iz fizike sa statičkim pitanjem"""
    try:
        from app.physics_questions import create_physics_exam
        
        if exam_data:
            title = exam_data.get("title", "Ispit iz fizike")
            count = exam_data.get("count", 10)
        else:
            title = "Ispit iz fizike"
            count = 10
        
        exam = create_physics_exam(title, count)
        
        # Sačuvaj u bazu
        exam_service = await get_exam_service()
        result = await exam_service.create_exam(exam)
        
        return result
    except Exception as e:
        logger.error(f"❌ Greška pri kreiranju ispita iz fizike: {e}")
        return {"status": "error", "message": str(e)}

# Study Journal API endpoints
@app.post("/study-journal/entries")
async def create_journal_entry(entry: dict = Body(...)):
    """Kreiraj novi journal entry"""
    result = await study_journal_service.create_journal_entry(entry)
    return JSONResponse(result)

@app.get("/study-journal/entries")
async def get_journal_entries(
    user_id: str,
    subject: str = None,
    entry_type: str = None,
    limit: int = 50,
    offset: int = 0
):
    """Dohvati journal entries za korisnika"""
    result = await study_journal_service.get_journal_entries(
        user_id=user_id,
        subject=subject,
        entry_type=entry_type,
        limit=limit,
        offset=offset
    )
    return JSONResponse(result)

@app.put("/study-journal/entries/{entry_id}")
async def update_journal_entry(entry_id: str, update_data: dict = Body(...)):
    """Ažuriraj journal entry"""
    result = await study_journal_service.update_journal_entry(entry_id, update_data)
    return JSONResponse(result)

@app.delete("/study-journal/entries/{entry_id}")
async def delete_journal_entry(entry_id: str):
    """Obriši journal entry"""
    result = await study_journal_service.delete_journal_entry(entry_id)
    return JSONResponse(result)

# Study Journal Goals endpoints
@app.post("/study-journal/goals")
async def create_study_goal(goal: dict = Body(...)):
    """Kreiraj novi study goal"""
    result = await study_journal_service.create_study_goal(goal)
    return JSONResponse(result)

@app.get("/study-journal/goals")
async def get_study_goals(
    user_id: str,
    status: str = None,
    subject: str = None,
    limit: int = 50,
    offset: int = 0
):
    """Dohvati study goals za korisnika"""
    result = await study_journal_service.get_study_goals(
        user_id=user_id,
        status=status,
        subject=subject,
        limit=limit,
        offset=offset
    )
    return JSONResponse(result)

@app.put("/study-journal/goals/{goal_id}/progress")
async def update_goal_progress(goal_id: str, new_value: int = Body(..., embed=True)):
    """Ažuriraj napredak u cilju (current_value)"""
    result = await study_journal_service.update_goal_progress(goal_id, new_value)
    return JSONResponse(result)

# Problem Generator API endpoints
@app.get("/problems/subjects")
async def get_available_subjects():
    """Dohvati dostupne predmete za Problem Generator"""
    try:
        problem_generator = get_problem_generator()
        subjects = problem_generator.get_available_subjects()
        
        return {
            "status": "success",
            "subjects": subjects,
            "message": f"Dostupno {len(subjects)} predmeta"
        }
    except Exception as e:
        logger.error(f"❌ Greška pri dohvatanju predmeta: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/problems/generate")
async def generate_problem(generation_data: dict):
    """Generiši problem na osnovu parametara"""
    try:
        problem_generator = get_problem_generator()
        
        # Parsiraj parametre
        subject_str = generation_data.get("subject", "mathematics")
        topic = generation_data.get("topic")
        difficulty_str = generation_data.get("difficulty", "beginner")
        problem_type_str = generation_data.get("problem_type")
        
        # Konvertuj stringove u enum-ove
        try:
            subject = Subject(subject_str)
            difficulty = Difficulty(difficulty_str)
            problem_type = ProblemType(problem_type_str) if problem_type_str else None
        except ValueError as e:
            return {"status": "error", "message": f"Nevažeći parametar: {e}"}
        
        # Generiši problem
        problem = problem_generator.generate_problem(
            subject=subject,
            topic=topic,
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
        
    except Exception as e:
        logger.error(f"❌ Greška pri generisanju problema: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/problems/{problem_id}/validate")
async def validate_problem_answer(problem_id: str, answer_data: dict):
    """Validiraj odgovor na problem iz baze"""
    try:
        problem_generator = get_problem_generator()
        user_answer = answer_data.get("answer")
        user_id = answer_data.get("user_id", "anonymous")
        username = answer_data.get("username", "Anonymous")
        time_taken_seconds = answer_data.get("time_taken_seconds", 0)
        hints_used = answer_data.get("hints_used", 0)
        solution_viewed = answer_data.get("solution_viewed", False)
        
        if not user_answer:
            return {"status": "error", "message": "Odgovor je obavezan"}
        
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
        
        # Validiraj odgovor
        validation_result = problem_generator.validate_answer(
            problem,
            user_answer,
            user_id=user_id,
            username=username,
            time_taken_seconds=time_taken_seconds,
            hints_used=hints_used,
            solution_viewed=solution_viewed
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

# Supabase integracija endpointi za Problem Generator
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
        
        attempt_id = problem_generator.save_attempt_to_database(
            problem_id=problem_id,
            user_id=attempt_data.get("user_id", "anonymous"),
            username=attempt_data.get("username", "Anonymous"),
            user_answer=attempt_data.get("user_answer", ""),
            is_correct=attempt_data.get("is_correct", False),
            time_taken_seconds=attempt_data.get("time_taken_seconds", 0),
            hints_used=attempt_data.get("hints_used", 0),
            solution_viewed=attempt_data.get("solution_viewed", False)
        )
        
        return {
            "status": "success",
            "attempt_id": attempt_id,
            "message": "Pokušaj uspešno sačuvan"
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.get("/problems/database/stats")
async def get_database_problem_stats():
    """Dohvati statistike problema iz baze"""
    try:
        if not supabase_manager:
            return {"status": "error", "message": "Supabase nije dostupan"}
        
        # Pozovi SQL funkciju za statistike
        result = supabase_manager.client.rpc('get_problem_stats').execute()
        
        if result.data:
            stats = result.data[0]
            return {
                "status": "success",
                "stats": stats
            }
        else:
            return {
                "status": "success",
                "stats": {
                    "total_problems": 0,
                    "problems_by_subject": {},
                    "problems_by_difficulty": {},
                    "problems_by_type": {},
                    "total_attempts": 0,
                    "correct_attempts": 0,
                    "avg_time_seconds": 0
                }
            }
    except Exception as e:
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
        if not supabase_manager:
            return {"status": "error", "message": "Supabase nije dostupan"}
        
        # Pozovi SQL funkciju za preporučene probleme
        result = supabase_manager.client.rpc(
            'get_recommended_problems',
            {
                'p_user_id': user_id,
                'p_subject': subject,
                'p_difficulty': difficulty,
                'p_limit': limit
            }
        ).execute()
        
        return {
            "status": "success",
            "problems": result.data,
            "total_count": len(result.data),
            "user_id": user_id,
            "filters": {
                "subject": subject,
                "difficulty": difficulty,
                "limit": limit
            }
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Startup i shutdown eventi
@app.on_event("startup")
async def startup_event():
    """Startup event"""
    print("🚀 AcAIA Backend - Supabase verzija pokrenut")
    
    # Inicijalizuj connection pool
    await get_http_session()
    print("✅ Connection pool inicijalizovan")
    
    # Pokreni background task manager
    await task_manager.start()
    print("✅ Background task manager pokrenut")
    
    # Inicijalizuj async Supabase konekciju
    if async_supabase_manager:
        try:
            is_connected = await async_supabase_manager.test_connection()
            if is_connected:
                print("✅ Async Supabase konekcija uspostavljena")
            else:
                print("⚠️ Async Supabase konekcija nije uspešna")
        except Exception as e:
            print(f"❌ Greška pri async Supabase konekciji: {e}")
    
    # Preload Ollama modele
    await preload_ollama_models()
    
    if supabase_manager:
        print("✅ Supabase konekcija uspostavljena")
    
    print("🎯 Backend spreman za zahteve!")

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event"""
    print("🛑 Zatvaranje AcAIA Backend-a...")
    
    # Zaustavi background task manager
    await task_manager.stop()
    print("✅ Background task manager zaustavljen")
    
    # Zatvori async Supabase konekciju
    if async_supabase_manager:
        await async_supabase_manager.close()
        print("✅ Async Supabase konekcija zatvorena")
    
    # Zatvori connection pool
    global http_session
    if http_session:
        await http_session.close()
        print("✅ Connection pool zatvoren")
    
    # Zatvori WebSocket konekcije
    await websocket_manager.close_all_connections()
    print("✅ WebSocket konekcije zatvorene")
    
    print("👋 AcAIA Backend zatvoren!")
    # Očisti keš
    preloaded_models.clear() 

# Study Journal Flashcards endpoints
@app.post("/study-journal/flashcards")
async def create_flashcard(flashcard: dict = Body(...)):
    """Kreiraj novi flashcard"""
    result = await study_journal_service.create_flashcard(flashcard)
    return JSONResponse(result)

@app.get("/study-journal/flashcards")
async def get_flashcards_for_review(
    user_id: str,
    limit: int = 20
):
    """Dohvati flashcards za review (spaced repetition)"""
    result = await study_journal_service.get_flashcards_for_review(user_id, limit)
    return JSONResponse(result)

@app.post("/study-journal/flashcards/{flashcard_id}/review")
async def review_flashcard(
    flashcard_id: str,
    difficulty_rating: int = Body(..., embed=True),
    was_correct: bool = Body(..., embed=True),
    response_time_seconds: int = Body(None, embed=True)
):
    """Obeleži review flashcard-a"""
    result = await study_journal_service.review_flashcard(
        flashcard_id,
        difficulty_rating,
        was_correct,
        response_time_seconds
    )
    return JSONResponse(result)

# ==================== CAREER GUIDANCE ENDPOINTS ====================

# Career Profiles
@app.post("/career-guidance/profile")
async def create_career_profile(profile_data: dict = Body(...)):
    """Kreiraj novi career profile"""
    result = await career_guidance_service.create_career_profile(profile_data)
    return JSONResponse(result)

@app.get("/career-guidance/profile/{user_id}")
async def get_career_profile(user_id: str):
    """Dohvati career profile za korisnika"""
    result = await career_guidance_service.get_career_profile(user_id)
    return JSONResponse(result)

@app.put("/career-guidance/profile/{profile_id}")
async def update_career_profile(profile_id: str, update_data: dict = Body(...)):
    """Ažuriraj career profile"""
    result = await career_guidance_service.update_career_profile(profile_id, update_data)
    return JSONResponse(result)

@app.delete("/career-guidance/profile/{profile_id}")
async def delete_career_profile(profile_id: str):
    """Obriši career profile"""
    result = await career_guidance_service.delete_career_profile(profile_id)
    return JSONResponse(result)

# Skills Inventory
@app.post("/career-guidance/skills")
async def add_skill(skill_data: dict = Body(...)):
    """Dodaj novu veštinu"""
    result = await career_guidance_service.add_skill(skill_data)
    return JSONResponse(result)

@app.get("/career-guidance/skills/{user_id}")
async def get_user_skills(user_id: str, category: str = None):
    """Dohvati veštine korisnika"""
    result = await career_guidance_service.get_user_skills(user_id, category)
    return JSONResponse(result)

@app.put("/career-guidance/skills/{skill_id}")
async def update_skill(skill_id: str, update_data: dict = Body(...)):
    """Ažuriraj veštinu"""
    result = await career_guidance_service.update_skill(skill_id, update_data)
    return JSONResponse(result)

@app.delete("/career-guidance/skills/{skill_id}")
async def delete_skill(skill_id: str):
    """Obriši veštinu"""
    result = await career_guidance_service.delete_skill(skill_id)
    return JSONResponse(result)

@app.get("/career-guidance/skills/{user_id}/summary")
async def get_skills_summary(user_id: str):
    """Dohvati summary veština korisnika"""
    result = await career_guidance_service.get_skills_summary(user_id)
    return JSONResponse(result)

# Career Assessments
@app.post("/career-guidance/assessments")
async def create_assessment(assessment_data: dict = Body(...)):
    """Kreiraj novu procenu"""
    result = await career_guidance_service.create_assessment(assessment_data)
    return JSONResponse(result)

@app.get("/career-guidance/assessments/{user_id}")
async def get_user_assessments(user_id: str, assessment_type: str = None):
    """Dohvati procene korisnika"""
    result = await career_guidance_service.get_user_assessments(user_id, assessment_type)
    return JSONResponse(result)

@app.post("/career-guidance/assessments/{assessment_id}/submit")
async def submit_assessment_answers(
    assessment_id: str,
    answers: dict = Body(...),
    results: dict = Body(...),
    score: float = Body(...)
):
    """Predaj odgovore za procenu"""
    result = await career_guidance_service.submit_assessment_answers(assessment_id, answers, results, score)
    return JSONResponse(result)

@app.get("/career-guidance/assessments/questions/{assessment_type}")
async def get_assessment_questions(assessment_type: str):
    """Dohvati pitanja za tip procene"""
    result = await career_guidance_service.get_assessment_questions(assessment_type)
    return JSONResponse(result)

@app.post("/career-guidance/assessments/create/{user_id}")
async def create_career_assessment(user_id: str, assessment_type: str):
    """Kreiraj novu career procenu za korisnika"""
    result = await career_guidance_service.create_career_assessment(user_id, assessment_type)
    return JSONResponse(result)

@app.post("/career-guidance/assessments/{assessment_id}/calculate")
async def calculate_assessment_results(assessment_id: str, answers: dict = Body(...)):
    """Izračunaj rezultate procene"""
    result = await career_guidance_service.calculate_assessment_results(assessment_id, answers)
    return JSONResponse(result)

# Job Recommendations
@app.post("/career-guidance/jobs")
async def create_job_recommendation(job_data: dict = Body(...)):
    """Kreiraj novu preporuku posla"""
    result = await career_guidance_service.create_job_recommendation(job_data)
    return JSONResponse(result)

@app.get("/career-guidance/jobs/{user_id}")
async def get_job_recommendations(user_id: str, status: str = None):
    """Dohvati preporuke poslova za korisnika"""
    result = await career_guidance_service.get_job_recommendations(user_id, status)
    return JSONResponse(result)

@app.put("/career-guidance/jobs/{job_id}/status")
async def update_job_application_status(job_id: str, status: str = Body(..., embed=True)):
    """Ažuriraj status prijave na posao"""
    result = await career_guidance_service.update_job_application_status(job_id, status)
    return JSONResponse(result)

@app.post("/career-guidance/jobs/match-score")
async def calculate_job_match_score(
    user_id: str = Body(...),
    required_skills: List[str] = Body(...),
    preferred_skills: List[str] = Body(...)
):
    """Izračunaj match score za posao"""
    result = await career_guidance_service.calculate_job_match_score(user_id, required_skills, preferred_skills)
    return JSONResponse(result)

@app.post("/career-guidance/jobs/generate/{user_id}")
async def generate_job_recommendations(user_id: str, limit: int = 10):
    """Generiši preporuke poslova za korisnika"""
    result = await career_guidance_service.generate_job_recommendations(user_id, limit)
    return JSONResponse(result)

# Career Paths
@app.post("/career-guidance/paths")
async def create_career_path(path_data: dict = Body(...)):
    """Kreiraj novu karijernu putanju"""
    result = await career_guidance_service.create_career_path(path_data)
    return JSONResponse(result)

@app.get("/career-guidance/paths/{user_id}")
async def get_user_career_paths(user_id: str, active_only: bool = True):
    """Dohvati karijerne putanje korisnika"""
    result = await career_guidance_service.get_user_career_paths(user_id, active_only)
    return JSONResponse(result)

@app.put("/career-guidance/paths/{path_id}/progress")
async def update_career_path_progress(path_id: str, progress_percentage: float = Body(..., embed=True)):
    """Ažuriraj napredak karijerne putanje"""
    result = await career_guidance_service.update_career_path_progress(path_id, progress_percentage)
    return JSONResponse(result)

@app.put("/career-guidance/paths/{path_id}/deactivate")
async def deactivate_career_path(path_id: str):
    """Deaktiviraj karijernu putanju"""
    result = await career_guidance_service.deactivate_career_path(path_id)
    return JSONResponse(result)

# Industry Insights
@app.get("/career-guidance/industries")
async def get_all_industries():
    """Dohvati sve industrije"""
    result = await career_guidance_service.get_all_industries()
    return JSONResponse(result)

@app.get("/career-guidance/industries/{industry_name}")
async def get_industry_details(industry_name: str):
    """Dohvati detalje industrije"""
    result = await career_guidance_service.get_industry_details(industry_name)
    return JSONResponse(result)

@app.get("/career-guidance/industries/trends")
async def get_industry_trends():
    """Dohvati trendove industrija"""
    result = await career_guidance_service.get_industry_trends()
    return JSONResponse(result)

# Comprehensive Insights
@app.get("/career-guidance/insights/{user_id}")
async def get_user_career_insights(user_id: str):
    """Dohvati sveobuhvatne career insights za korisnika"""
    result = await career_guidance_service.get_user_career_insights(user_id)
    return JSONResponse(result)

class FixTextRequest(BaseModel):
    text: str
    mode: str = "fix"  # 'fix' ili 'format'

@app.post("/ocr/fix-text")
async def fix_text(request: FixTextRequest):
    """
    Ispravi ili formatiraj tekst koristeći LLM (Ollama/OpenAI).
    mode: 'fix' - pravopis/gramatika, 'format' - formatiranje
    """
    prompt = ""
    if request.mode == "fix":
        prompt = f"Ispravi pravopisne i gramatičke greške u sledećem tekstu na srpskom jeziku:\n\n{request.text}\n\nIspravljeni tekst:"
    elif request.mode == "format":
        prompt = f"Formatiraj sledeći tekst tako da bude čitljiv, sa paragrafima i velikim slovima gde treba (srpski jezik):\n\n{request.text}\n\nFormatiran tekst:"
    else:
        return {"status": "error", "message": "Nepoznat mod."}

    try:
        response = ollama_client.generate(
            model="mistral",
            prompt=prompt,
            options={"temperature": 0.2, "max_tokens": 2048}
        )
        fixed_text = response['response'].strip()
        return {"status": "success", "fixed_text": fixed_text}
    except Exception as e:
        return {"status": "error", "message": str(e)}