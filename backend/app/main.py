"""
AcAIA Backend - Čista verzija
Lokalni storage bez Supabase i Ollama integracije
"""

import os
import uuid
import time
import json
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Depends, File, UploadFile, WebSocket, WebSocketDisconnect, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sys
import asyncio
import hashlib
import aiohttp
from pydantic import BaseModel
import mimetypes
from io import BytesIO
try:
    import docx
except ImportError:
    docx = None
try:
    import PyPDF2
except ImportError:
    PyPDF2 = None
try:
    from PIL import Image
except ImportError:
    Image = None
try:
    import pytesseract
except ImportError:
    pytesseract = None
from fastapi.responses import StreamingResponse

# Konfiguracija logging-a
logger = logging.getLogger(__name__)

# Dodaj backend direktorijum u path za import
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import app modula
from .prompts import SYSTEM_PROMPT, CONTEXT_PROMPT
from .rag_service import RAGService
from .ocr_service import OCRService
from .config import Config
from .cache_manager import cache_manager, get_cached_ai_response, set_cached_ai_response
from .openai_service import openai_service
from .background_tasks import task_manager, add_background_task, get_task_status, cancel_task, get_all_tasks, get_task_stats
from .websocket import websocket_manager, WebSocketMessage, MessageType
from .exam_service import get_exam_service
from .problem_generator import get_problem_generator, Subject, Difficulty, ProblemType
from .error_handler import (
    error_handler, handle_api_error, ErrorCategory, ErrorSeverity,
    AcAIAException, ValidationError, ExternalServiceError, RAGError, OCRError,
    ErrorHandlingMiddleware
)
from .query_rewriter import QueryRewriter
from .fact_checker import FactChecker, FactCheckResult
from .study_journal_service import study_journal_service
from .career_guidance_service import CareerGuidanceService
from .models import SessionRenameRequest

# Kreiraj FastAPI aplikaciju
app = FastAPI(
    title="AcAIA Backend - Čista verzija",
    description="Backend za AcAIA projekat sa lokalnim storage-om",
    version="3.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dodaj error handling middleware
app.add_middleware(ErrorHandlingMiddleware)

# Globalni exception handler
@app.exception_handler(AcAIAException)
async def acaia_exception_handler(request: Request, exc: AcAIAException):
    """Handler za AcAIA custom greške"""
    return await handle_api_error(exc, request, exc.category, exc.severity, exc.error_code)

# Database manager
from .database_manager import get_db_manager, init_database

# Inicijalizuj bazu podataka
db_manager = get_db_manager()

# Lokalni storage za sve podatke (fallback)
chat_history = {}
session_metadata = {}
documents = {}
study_rooms = {}
study_room_members = {}
study_room_messages = {}

# Fajl za čuvanje dokumenata
DOCUMENTS_FILE = "data/documents.json"

def load_documents():
    """Učitaj dokumente iz JSON fajla"""
    global documents
    try:
        if os.path.exists(DOCUMENTS_FILE):
            with open(DOCUMENTS_FILE, 'r', encoding='utf-8') as f:
                documents = json.load(f)
            logger.info(f"Učitano {len(documents)} dokumenata iz {DOCUMENTS_FILE}")
        else:
            documents = {}
            logger.info("Dokumenti fajl ne postoji, kreiran prazan dictionary")
    except Exception as e:
        logger.error(f"Greška pri učitavanju dokumenata: {e}")
        documents = {}

def save_documents():
    """Sačuvaj dokumente u JSON fajl"""
    try:
        os.makedirs(os.path.dirname(DOCUMENTS_FILE), exist_ok=True)
        with open(DOCUMENTS_FILE, 'w', encoding='utf-8') as f:
            json.dump(documents, f, ensure_ascii=False, indent=2)
        logger.info(f"Sačuvano {len(documents)} dokumenata u {DOCUMENTS_FILE}")
    except Exception as e:
        logger.error(f"Greška pri čuvanju dokumenata: {e}")

# Inicijalizuj servise
rag_service = RAGService(use_supabase=False)
ocr_service = OCRService()
query_rewriter = QueryRewriter()
fact_checker = FactChecker()

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

def get_conversation_context(session_id: str, max_messages: int = 10) -> str:
    """Dohvati prethodne poruke za kontekst iz lokalnog storage-a"""
    try:
        if session_id not in chat_history:
            return ""
        
        messages = chat_history[session_id][-max_messages:]
        context = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
        return context
    except Exception as e:
        logger.error(f"Greška pri dohvatanju konteksta: {e}")
        return ""

async def get_conversation_context_async(session_id: str, max_messages: int = 10) -> str:
    """Dohvati prethodne poruke za kontekst iz lokalnog storage-a asinhrono"""
    try:
        if session_id not in chat_history:
            return ""
        
        messages = chat_history[session_id][-max_messages:]
        context = "\n".join([f"{msg['role']}: {msg['content']}" for msg in messages])
        return context
    except Exception as e:
        logger.error(f"Greška pri async dohvatanju konteksta: {e}")
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

# OpenAI funkcija za chat
async def ai_chat_async(model: str, messages: list, stream: bool = False):
    """Funkcija za komunikaciju sa OpenAI API-jem"""
    try:
        if not openai_service.is_available():
            return {
                "message": {
                    "content": "OpenAI servis nije dostupan. Proveri API ključ u .env fajlu."
                }
            }
        
        # Pozovi OpenAI servis
        try:
            response = await openai_service.chat_completion(
                messages=messages,
                model=model,
                stream=stream
            )
            return response
        except Exception as e:
            logger.error(f"Greška pri OpenAI pozivu: {e}")
            return {
                "message": {
                    "content": f"Greška pri komunikaciji sa AI servisom: {str(e)}"
                }
            }
        
    except Exception as e:
        logger.error(f"Greška pri OpenAI pozivu: {e}")
        return {
            "message": {
                "content": f"Greška pri komunikaciji sa AI servisom: {str(e)}"
            }
        }

# ============================================================================
# BASIC ENDPOINTS
# ============================================================================

@app.get("/")
async def root():
    return {"message": "AcAIA Backend - Čista verzija"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "ai_service": "openai_available" if openai_service.is_available() else "openai_not_configured",
            "cache": cache_manager.is_available(),
            "rag": True,
            "ocr": True
        },
        "version": "3.0.0"
    }

# ============================================================================
# CHAT ENDPOINTS
# ============================================================================

@app.post("/chat/new-session")
async def create_new_session():
    """Kreira novu chat sesiju"""
    try:
        session_id = str(uuid.uuid4())
        session_name = f"Session {datetime.now().strftime('%Y-%m-%d %H:%M')}"
        
        # Kreiraj sesiju u bazi podataka
        success = db_manager.create_session(session_id, session_name, "default_user")
        
        if success:
            return {
                "status": "success",
                "data": {
                    "session_id": session_id,
                    "name": session_name,
                    "created_at": datetime.now().isoformat()
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to create session in database")
    except Exception as e:
        logger.error(f"Greška pri kreiranju sesije: {e}")
        raise HTTPException(status_code=500, detail="Failed to create session")

@app.post("/chat/stream")
async def chat_stream_endpoint(message: dict):
    """Streaming chat endpoint sa Server-Sent Events"""
    try:
        if not message.get('content', '').strip():
            raise ValidationError("Message content cannot be empty")
        
        session_id = message.get('session_id')
        user_id = message.get('user_id', 'default_user')
        content = message['content']
        
        # Dohvati kontekst ako postoji session_id
        context = ""
        if session_id:
            context = await get_conversation_context_async(session_id)
        
        # Kreiraj poboljšani prompt
        enhanced_prompt = create_enhanced_prompt(content, context)
        
        # Kreiraj messages za OpenAI
        messages = [{"role": "user", "content": enhanced_prompt}]
        
        # Pozovi OpenAI sa streaming
        try:
            response = await openai_service.chat_completion(
                messages=messages,
                model="gpt-4",
                stream=True
            )
            
            # Vraćamo streaming response
            return StreamingResponse(
                stream_chat_response(response, session_id or "", content, user_id),
                media_type="text/plain",
                headers={
                    "Cache-Control": "no-cache",
                    "Connection": "keep-alive",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Headers": "*"
                }
            )
            
        except Exception as e:
            logger.error(f"Greška pri streaming pozivu: {e}")
            return StreamingResponse(
                stream_error_response(f"Greška pri komunikaciji sa AI servisom: {str(e)}"),
                media_type="text/plain"
            )
            
    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Streaming chat error: {e}")
        raise HTTPException(status_code=500, detail="Streaming chat processing failed")

async def stream_chat_response(openai_response, session_id: str, user_content: str, user_id: str):
    """Stream chat response iz OpenAI-a"""
    try:
        full_response = ""
        message_id = str(uuid.uuid4())
        
        # Pošalji početak poruke
        yield f"data: {json.dumps({'type': 'start', 'message_id': message_id})}\n\n"
        
        # Stream odgovor - OpenAI response je generator, ne async generator
        for chunk in openai_response:
            if hasattr(chunk.choices[0], 'delta') and chunk.choices[0].delta.content:
                content = chunk.choices[0].delta.content
                full_response += content
                
                # Pošalji chunk
                yield f"data: {json.dumps({'type': 'chunk', 'content': content})}\n\n"
        
        # Pošalji kraj poruke
        yield f"data: {json.dumps({'type': 'end', 'message_id': message_id})}\n\n"
        
        # Sačuvaj u bazu podataka ako postoji session_id
        if session_id:
            # Sačuvaj korisničku poruku
            user_message_id = str(uuid.uuid4())
            db_manager.save_chat_message(
                session_id=session_id,
                message_id=user_message_id,
                sender="user",
                content=user_content,
                metadata={"user_id": user_id}
            )
            
            # Sačuvaj AI odgovor
            ai_message_id = str(uuid.uuid4())
            db_manager.save_chat_message(
                session_id=session_id,
                message_id=ai_message_id,
                sender="assistant",
                content=full_response,
                metadata={"user_id": "ai_assistant"}
            )
            
            # Ažuriraj session last_accessed
            db_manager.update_session(session_id, last_accessed=datetime.now().isoformat())
        
        # Sačuvaj u cache
        cache_key = f"chat:{hashlib.md5(user_content.encode()).hexdigest()}"
        await set_cached_ai_response(cache_key, full_response)
        
    except Exception as e:
        logger.error(f"Greška u streaming response: {e}")
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

async def stream_error_response(error_message: str):
    """Stream error response"""
    yield f"data: {json.dumps({'type': 'error', 'message': error_message})}\n\n"

@app.post("/chat")
async def chat_endpoint(message: dict):
    """Glavni chat endpoint"""
    try:
        if not message.get('content', '').strip():
            raise ValidationError("Message content cannot be empty")
        
        session_id = message.get('session_id')
        user_id = message.get('user_id', 'default_user')
        content = message['content']
        
        # Proveri cache
        cache_key = f"chat:{hashlib.md5(content.encode()).hexdigest()}"
        cached_response = await get_cached_ai_response(cache_key)
        
        if cached_response:
            logger.info(f"Cache hit za: {content[:50]}...")
            return {
                "status": "success",
                "data": {
                    "response": cached_response.get('response', ''),
                    "cached": True,
                    "session_id": session_id
                }
            }
        
        # Dohvati kontekst ako postoji session_id
        context = ""
        if session_id:
            context = await get_conversation_context_async(session_id)
        
        # Kreiraj poboljšani prompt
        enhanced_prompt = create_enhanced_prompt(content, context)
        
        # Pozovi AI model
        start_time = time.time()
        ai_response = await ai_chat_async(
            model="gpt-4",
            messages=[{"role": "user", "content": enhanced_prompt}],
            stream=False
        )
        response_time = time.time() - start_time
        
        response_content = ai_response['message']['content']
        
        # Sačuvaj u cache
        await set_cached_ai_response(cache_key, response_content)
        
        # Sačuvaj u bazu podataka ako postoji session_id
        if session_id:
            # Sačuvaj korisničku poruku
            user_message_id = str(uuid.uuid4())
            db_manager.save_chat_message(
                session_id=session_id,
                message_id=user_message_id,
                sender="user",
                content=content,
                metadata={"user_id": user_id}
            )
            
            # Sačuvaj AI odgovor
            ai_message_id = str(uuid.uuid4())
            db_manager.save_chat_message(
                session_id=session_id,
                message_id=ai_message_id,
                sender="assistant",
                content=response_content,
                metadata={"user_id": "ai_assistant"}
            )
            
            # Ažuriraj session last_accessed
            db_manager.update_session(session_id, last_accessed=datetime.now().isoformat())
        
        return {
            "status": "success",
            "data": {
                "response": response_content,
                "session_id": session_id,
                "response_time": response_time,
                "cached": False
            }
        }
        
    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Chat processing failed")

@app.get("/chat/history/{session_id}")
async def get_chat_history(session_id: str, limit: int = 50):
    """Dohvata chat istoriju iz baze podataka"""
    try:
        # Dohvati poruke iz baze podataka
        messages = db_manager.get_chat_history(session_id, limit)
        
        # Konvertuj u frontend format
        formatted_messages = []
        for msg in messages:
            formatted_messages.append({
                'id': msg['message_id'],
                'sender': msg['sender'],
                'content': msg['content'],
                'timestamp': msg['created_at'],
                'sources': json.loads(msg['sources']) if msg['sources'] else [],
                'metadata': json.loads(msg['metadata']) if msg['metadata'] else {}
            })
        
        return {
            "status": "success",
            "data": {
                "session_id": session_id,
                "messages": formatted_messages,
                "total": len(formatted_messages)
            }
        }
    except Exception as e:
        logger.error(f"Greška pri dohvatanju chat istorije: {e}")
        raise HTTPException(status_code=500, detail="Greška pri dohvatanju istorije")

@app.get("/chat/sessions")
async def get_sessions():
    """Dohvata sve chat sesije iz baze podataka"""
    try:
        # Dohvati sesije iz baze podataka
        sessions = db_manager.get_all_sessions("default_user", include_archived=False)
        
        sessions_list = []
        for session in sessions:
            # Dohvati broj poruka za svaku sesiju
            message_count = db_manager.get_message_count(session['session_id'])
            
            # Dohvati prvu i poslednju poruku za sesiju
            chat_history = db_manager.get_chat_history(session['session_id'], limit=1000)
            first_message = ""
            last_message = session['updated_at'] or session['created_at']
            
            if chat_history:
                # Prva poruka (najstarija)
                first_message = chat_history[0].get('content', '')[:100] + ('...' if len(chat_history[0].get('content', '')) > 100 else '')
                
                # Poslednja poruka (najnovija)
                last_message = chat_history[-1].get('created_at', session['updated_at'] or session['created_at'])
            
            sessions_list.append({
                'session_id': session['session_id'],
                'name': session['name'] or f'Session {session["session_id"][:8]}',
                'message_count': message_count,
                'first_message': first_message,
                'last_message': last_message,
                'created_at': session['created_at'],
                'updated_at': session['updated_at']
            })
        
        return {
            "status": "success",
            "data": {
                "sessions": sessions_list,
                "total": len(sessions_list)
            }
        }
    except Exception as e:
        logger.error(f"Greška pri dohvatanju sesija: {e}")
        raise HTTPException(status_code=500, detail="Greška pri dohvatanju sesija")

@app.delete("/chat/session/{session_id}")
async def delete_session(session_id: str):
    """Briše chat sesiju iz baze podataka"""
    try:
        success = db_manager.delete_session(session_id)
        
        if success:
            return {"status": "success", "message": "Sesija obrisana"}
        else:
            raise HTTPException(status_code=500, detail="Greška pri brisanju sesije")
    except Exception as e:
        logger.error(f"Greška pri brisanju sesije: {e}")
        raise HTTPException(status_code=500, detail="Greška pri brisanju sesije")

@app.put("/chat/sessions/{session_id}/rename")
async def rename_session(session_id: str, rename_request: SessionRenameRequest):
    """Preimenuje chat sesiju"""
    try:
        # Proveri da li sesija postoji
        sessions = db_manager.get_all_sessions("default_user")
        session_exists = any(s['session_id'] == session_id for s in sessions)
        
        if not session_exists:
            raise HTTPException(status_code=404, detail="Sesija nije pronađena")
        
        # Ažuriraj ime sesije
        success = db_manager.update_session(session_id, name=rename_request.name)
        
        if success:
            return {
                "status": "success", 
                "message": "Sesija uspešno preimenovana",
                "data": {
                    "session_id": session_id,
                    "new_name": rename_request.name
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Greška pri preimenovanju sesije")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Greška pri preimenovanju sesije: {e}")
        raise HTTPException(status_code=500, detail="Greška pri preimenovanju sesije")

@app.post("/chat/message/{message_id}/reaction")
async def add_message_reaction(message_id: str, reaction_data: dict):
    """Dodaje reakciju na poruku"""
    try:
        reaction = reaction_data.get('reaction')  # 'like' ili 'dislike'
        user_id = reaction_data.get('user_id', 'default_user')
        
        if reaction not in ['like', 'dislike']:
            raise ValidationError("Reaction must be 'like' or 'dislike'")
        
        success = db_manager.add_message_reaction(message_id, reaction, user_id)
        
        if success:
            return {
                "status": "success",
                "data": {
                    "message_id": message_id,
                    "reaction": reaction,
                    "user_id": user_id
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Greška pri dodavanju reakcije")
    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Greška pri dodavanju reakcije: {e}")
        raise HTTPException(status_code=500, detail="Greška pri dodavanju reakcije")

@app.delete("/chat/message/{message_id}/reaction")
async def remove_message_reaction(message_id: str, user_id: str = "default_user"):
    """Uklanja reakciju sa poruke"""
    try:
        success = db_manager.remove_message_reaction(message_id, user_id)
        
        if success:
            return {
                "status": "success",
                "data": {
                    "message_id": message_id,
                    "user_id": user_id,
                    "reaction_removed": True
                }
            }
        else:
            raise HTTPException(status_code=500, detail="Greška pri uklanjanju reakcije")
    except Exception as e:
        logger.error(f"Greška pri uklanjanju reakcije: {e}")
        raise HTTPException(status_code=500, detail="Greška pri uklanjanju reakcije")

@app.post("/chat/suggestions")
async def get_message_suggestions(context: dict):
    """Generiše predloge za sledeće poruke na osnovu konteksta"""
    try:
        conversation_history = context.get('history', [])
        current_topic = context.get('topic', '')
        user_style = context.get('user_style', 'formal')
        
        # Kreiraj prompt za predloge
        suggestions_prompt = f"""
        Na osnovu sledećeg konteksta razgovora, generiši 3-5 predloga za sledeće korisničke poruke.
        
        Kontekst razgovora:
        {conversation_history[-5:] if conversation_history else 'Nema prethodnog konteksta'}
        
        Trenutna tema: {current_topic if current_topic else 'Opšta tema'}
        Stil korisnika: {user_style}
        
        Generiši predloge koje su:
        1. Relevantne za trenutni kontekst
        2. Prirodne i raznovrsne
        3. U stilu korisnika
        4. Kratke i jasne (maksimalno 50 reči)
        
        Vrati samo listu predloga, jedan predlog po liniji, bez numeracije.
        """
        
        # Pozovi AI za predloge
        ai_response = await ai_chat_async(
            model="gpt-4",
            messages=[{"role": "user", "content": suggestions_prompt}],
            stream=False
        )
        
        suggestions = [s.strip() for s in ai_response['message']['content'].split('\n') if s.strip()]
        
        return {
            "status": "success",
            "data": {
                "suggestions": suggestions,
                "context_used": {
                    "history_length": len(conversation_history),
                    "topic": current_topic,
                    "user_style": user_style
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Greška pri generisanju predloga: {e}")
        raise HTTPException(status_code=500, detail="Greška pri generisanju predloga")

@app.get("/chat/analytics/{session_id}")
async def get_chat_analytics(session_id: str):
    """Dohvata analitiku za chat sesiju"""
    try:
        # Dohvati poruke iz baze podataka
        messages = db_manager.get_chat_history(session_id, limit=1000)
        
        if not messages:
            return {
                "status": "success",
                "data": {
                    "session_id": session_id,
                    "analytics": {
                        "total_messages": 0,
                        "user_messages": 0,
                        "ai_messages": 0,
                        "avg_message_length": 0,
                        "topics": [],
                        "sentiment": "neutral",
                        "engagement_score": 0
                    }
                }
            }
        
        # Analiziraj poruke
        user_messages = [msg for msg in messages if msg['sender'] == 'user']
        ai_messages = [msg for msg in messages if msg['sender'] == 'assistant']
        
        # Izračunaj osnovne statistike
        total_messages = len(messages)
        user_message_count = len(user_messages)
        ai_message_count = len(ai_messages)
        
        # Prosečna dužina poruka
        total_length = sum(len(msg['content']) for msg in messages)
        avg_message_length = total_length / total_messages if total_messages > 0 else 0
        
        # Analiza tema (jednostavna implementacija)
        topics = analyze_topics(messages)
        
        # Sentiment analiza (jednostavna implementacija)
        sentiment = analyze_sentiment(messages)
        
        # Engagement score
        engagement_score = calculate_engagement_score(messages)
        
        return {
            "status": "success",
            "data": {
                "session_id": session_id,
                "analytics": {
                    "total_messages": total_messages,
                    "user_messages": user_message_count,
                    "ai_messages": ai_message_count,
                    "avg_message_length": round(avg_message_length, 2),
                    "topics": topics,
                    "sentiment": sentiment,
                    "engagement_score": round(engagement_score, 2),
                    "session_duration": calculate_session_duration(messages),
                    "response_time_stats": calculate_response_times(messages)
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Greška pri dohvatanju analitike: {e}")
        raise HTTPException(status_code=500, detail="Greška pri dohvatanju analitike")

def analyze_topics(messages: list) -> list:
    """Jednostavna analiza tema iz poruka"""
    # Implementiraj analizu tema
    return ["Opšta tema", "Pitanja", "Objašnjenja"]

def analyze_sentiment(messages: list) -> str:
    """Jednostavna sentiment analiza"""
    # Implementiraj sentiment analizu
    return "positive"

def calculate_engagement_score(messages: list) -> float:
    """Izračunaj engagement score"""
    if len(messages) < 2:
        return 0.0
    
    # Jednostavna formula: broj poruka / vreme sesije
    return min(len(messages) / 10, 1.0)

def calculate_session_duration(messages: list) -> dict:
    """Izračunaj trajanje sesije"""
    if len(messages) < 2:
        return {"minutes": 0, "seconds": 0}
    
    # Implementiraj izračunavanje trajanja
    return {"minutes": 5, "seconds": 30}

def calculate_response_times(messages: list) -> dict:
    """Izračunaj statistike vremena odgovora"""
    return {
        "avg_response_time": 2.5,
        "min_response_time": 1.0,
        "max_response_time": 5.0
    }

# ============================================================================
# RAG ENDPOINTS
# ============================================================================

@app.post("/chat/rag")
async def rag_chat_endpoint(message: dict):
    """RAG chat endpoint"""
    try:
        if not message.get('query', '').strip():
            raise ValidationError("Query cannot be empty")
        
        session_id = message.get('session_id')
        query = message['query']
        
        # Proveri cache
        cache_key = f"rag:{hashlib.md5(query.encode()).hexdigest()}"
        cached_response = await get_cached_ai_response(cache_key)
        
        if cached_response:
            return {
                "status": "success",
                "data": {
                    "response": cached_response,
                    "cached": True,
                    "session_id": session_id
                }
            }
        
        start_time = time.time()
        
        # RAG search
        search_time = time.time()
        rag_results = rag_service.search(query, limit=5)
        search_time = time.time() - search_time
        
        # Kreiraj kontekst
        if rag_results:
            # Loguj rezultate za debugging
            logger.info(f"RAG rezultati: {len(rag_results)} rezultata")
            for i, result in enumerate(rag_results):
                logger.info(f"Rezultat {i+1}: keys={list(result.keys())}, content_exists={'content' in result}")
            
            # Filtriraj rezultate koji imaju content
            valid_results = [result for result in rag_results if 'content' in result and result['content']]
            logger.info(f"Validnih rezultata: {len(valid_results)}")
            
            if valid_results:
                # Ograniči dužinu konteksta na ~1000 karaktera (otprilike 250 tokena)
                max_context_length = 1000
                context_parts = []
                current_length = 0
                
                for i, result in enumerate(valid_results):
                    source_text = f"Source {i+1}: {result['content']}"
                    if current_length + len(source_text) > max_context_length:
                        break
                    context_parts.append(source_text)
                    current_length += len(source_text)
                
                context = "\n\n".join(context_parts)
                logger.info(f"Kontekst dužina: {len(context)} karaktera")
                
                sources = [
                    {
                        "title": result.get('metadata', {}).get('filename', f'Source {i+1}'),
                        "content": result['content'][:200] + "...",
                        "score": result.get('score', 0)
                    }
                    for i, result in enumerate(valid_results)
                ]
            else:
                # Ako nema validnih rezultata, koristi običan prompt
                context = ""
                sources = []
                logger.warning("Nema validnih RAG rezultata sa content poljem")
            
            # Kreiraj pojednostavljen prompt sa RAG kontekstom
            rag_prompt = f"Ti si AI Study Assistant. Odgovaraj na srpskom.\n\nRelevant sources:\n{context}\n\nUser question: {query}\n\nAI Assistant:"
            logger.info(f"Prompt dužina: {len(rag_prompt)} karaktera")
        else:
            # Ako nema dokumenata, koristi običan prompt
            context = ""
            sources = []
            rag_prompt = f"Ti si AI Study Assistant. Odgovaraj na srpskom.\n\nKorisnik: {query}\n\nAI Assistant:"
        
        # Pozovi AI model (placeholder)
        ai_response = await ai_chat_async(
            model="gpt-4",
            messages=[{"role": "user", "content": rag_prompt}],
            stream=False
        )
        
        response_content = ai_response['message']['content']
        total_time = time.time() - start_time
        
        # Sačuvaj u cache
        await set_cached_ai_response(cache_key, response_content)
        
        return {
            "status": "success",
            "data": {
                "response": response_content,
                "sources": sources,
                "search_time": search_time,
                "total_time": total_time,
                "cached": False,
                "session_id": session_id
            }
        }
        
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
    """Upload dokumenta sa automatskom ekstrakcijom teksta za RAG"""
    try:
        if not file.filename:
            raise ValidationError("Filename is required")
        
        # Provera veličine fajla (ako postoji)
        file_size = getattr(file, 'size', None)
        if file_size is not None and file_size > 50 * 1024 * 1024:  # 50MB limit
            raise ValidationError("File size exceeds 50MB limit")
        
        allowed_types = [
            'application/pdf',
            'text/plain',
            'text/markdown',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'image/png',
            'image/jpeg',
            'image/jpg'
        ]
        
        if file.content_type not in allowed_types:
            raise ValidationError(f"Unsupported file type: {file.content_type}")
        
        # Procesiraj dokument
        content = await file.read()
        doc_id = str(uuid.uuid4())
        extracted_text = ""
        
        # Ekstrakcija teksta po tipu fajla
        if file.content_type.startswith('text/'):
            extracted_text = content.decode('utf-8', errors='ignore')
        elif file.content_type == 'application/pdf' and PyPDF2:
            try:
                pdf_reader = PyPDF2.PdfReader(BytesIO(content))
                extracted_text = "\n".join([page.extract_text() or '' for page in pdf_reader.pages])
            except Exception as e:
                logger.error(f"PDF extraction error: {e}")
        elif file.content_type in ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'] and docx:
            try:
                doc = docx.Document(BytesIO(content))
                extracted_text = "\n".join([p.text for p in doc.paragraphs])
            except Exception as e:
                logger.error(f"DOCX extraction error: {e}")
        elif file.content_type in ['image/png', 'image/jpeg', 'image/jpg'] and pytesseract and Image:
            try:
                image = Image.open(BytesIO(content))
                extracted_text = pytesseract.image_to_string(image)
            except Exception as e:
                logger.error(f"OCR extraction error: {e}")
        else:
            logger.warning(f"Ekstrakcija teksta nije podržana za: {file.content_type}")
        
        document_data = {
            "doc_id": doc_id,
            "filename": file.filename,
            "content_type": file.content_type,
            "size": len(content),
            "user_id": "default_user",
            "created_at": datetime.now().isoformat(),
            "content": extracted_text
        }
        documents[doc_id] = document_data
        save_documents() # Sačuvaj dokument u fajl
        
        # Dodaj u vector store ako ima teksta
        if extracted_text.strip():
            rag_service.add_document(
                content=extracted_text,
                metadata={"filename": file.filename, "content_type": file.content_type}
            )
        
        return {
            "status": "success",
            "data": {
                "message": "Document uploaded successfully",
                "doc_id": doc_id,
                "filename": file.filename,
                "size": len(content)
            }
        }
        
    except ValidationError as e:
        logger.error(f"Document upload validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Document upload error: {e}")
        raise HTTPException(status_code=500, detail="Document upload failed")

@app.get("/documents")
async def list_documents():
    """Lista dokumenata"""
    try:
        docs_list = []
        for doc_id, doc_data in documents.items():
            docs_list.append({
                "id": doc_id,
                "filename": doc_data["filename"],
                "file_type": doc_data["content_type"],
                "file_size": doc_data["size"],
                "created_at": doc_data["created_at"],
                "user_id": doc_data["user_id"],
                "metadata": {
                    "total_pages": 1,  # Default vrednost
                    "embedding_count": 0,  # Default vrednost
                    "chunks": []
                }
            })
        
        return {
            "status": "success",
            "documents": docs_list
        }
        
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail="Failed to list documents")

@app.get("/documents/{doc_id}")
async def get_document_info(doc_id: str):
    """Dohvata informacije o dokumentu"""
    try:
        if doc_id not in documents:
            raise HTTPException(status_code=404, detail="Document not found")
        
        doc_data = documents[doc_id]
        
        return {
            "status": "success",
            "data": {
                "document": {
                    "doc_id": doc_id,
                    "filename": doc_data["filename"],
                    "content_type": doc_data["content_type"],
                    "size": doc_data["size"],
                    "created_at": doc_data["created_at"],
                    "user_id": doc_data["user_id"]
                }
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get document info")

@app.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """Briše dokument"""
    try:
        if doc_id not in documents:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Obriši dokument
        del documents[doc_id]
        save_documents() # Sačuvaj dokument u fajl
        
        # Obriši iz vector store-a ako postoji
        try:
            rag_service.delete_document(doc_id)
        except Exception as e:
            logger.warning(f"Failed to delete document from vector store: {e}")
        
        return {
            "status": "success",
            "data": {
                "message": "Document deleted successfully"
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting document: {e}")
        raise HTTPException(status_code=500, detail="Failed to delete document")

# ============================================================================
# OCR ENDPOINTS
# ============================================================================

@app.post("/ocr/extract")
async def extract_text_from_image(file: UploadFile = File(...)):
    """Extract text from image"""
    try:
        if not file.filename:
            raise ValidationError("Filename is required")
        
        # Procesiraj sliku
        content = await file.read()
        
        # OCR processing
        extracted_text = await ocr_service.extract_text_from_image(content)
        
        return {
            "status": "success",
            "data": {
                "extracted_text": extracted_text,
                "filename": file.filename,
                "confidence": 0.85  # Placeholder
            }
        }
        
    except ValidationError as e:
        logger.error(f"OCR validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"OCR error: {e}")
        raise HTTPException(status_code=500, detail="OCR processing failed")

# ============================================================================
# STARTUP & SHUTDOWN EVENTS
# ============================================================================

@app.on_event("startup")
async def startup_event():
    """Startup event"""
    print("🚀 AcAIA Backend - Čista verzija se pokreće...")
    
    # Inicijalizuj cache
    if cache_manager.is_available():
        print("✅ Cache manager inicijalizovan")
    else:
        print("⚠️ Cache manager nije dostupan")
    
    # Inicijalizuj background tasks
    await task_manager.start()
    print("✅ Background task manager pokrenut")
    
    # Inicijalizuj WebSocket manager
    websocket_manager.start()
    print("✅ WebSocket manager pokrenut")

    # Učitaj dokumente pri startupu
    load_documents()
    print("✅ Dokumenti učitani")
    
    print("✅ AcAIA Backend uspešno pokrenut!")

@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event"""
    print("🛑 AcAIA Backend se zaustavlja...")
    
    # Zaustavi background tasks
    await task_manager.stop()
    print("✅ Background task manager zaustavljen")
    
    # Zaustavi WebSocket manager
    websocket_manager.stop()
    print("✅ WebSocket manager zaustavljen")
    
    # Zatvori sve WebSocket konekcije
    await websocket_manager.close_all_connections()
    print("✅ WebSocket konekcije zatvorene")
    
    # Zatvori HTTP session
    global http_session
    if http_session:
        await http_session.close()
        print("✅ HTTP session zatvoren")
    
    # Sačuvaj dokumente pri zaustavljanju
    save_documents()
    print("✅ Dokumenti sačuvani")
    
    print("✅ AcAIA Backend uspešno zaustavljen!")

# ============================================================================
# PLACEHOLDER ENDPOINTS (za ostale funkcionalnosti)
# ============================================================================

@app.get("/cache/health")
async def check_cache_health():
    """Cache health check"""
    return {
        "status": "success",
        "data": {
            "cache_available": cache_manager.is_available(),
            "cache_stats": cache_manager.get_stats()
        }
    }

@app.get("/cache/stats")
async def get_cache_stats():
    """Cache statistics"""
    return {
        "status": "success",
        "data": cache_manager.get_stats()
    }

@app.post("/cache/clear")
async def clear_cache():
    """Clear cache"""
    cache_manager.clear()
    return {
        "status": "success",
        "data": {
            "message": "Cache cleared successfully"
        }
    }

@app.get("/performance/overview")
async def get_performance_overview():
    """Performance overview"""
    return {
        "status": "success",
        "data": {
            "uptime": "placeholder",
            "memory_usage": "placeholder",
            "cpu_usage": "placeholder",
            "active_connections": connection_pool_stats["active_connections"],
            "total_requests": connection_pool_stats["total_requests"]
        }
    }

# ============================================================================
# SESSION METADATA ENDPOINTS
# ============================================================================

@app.post("/session/metadata")
async def update_session_metadata(metadata: dict = Body(...)):
    """Ažurira metapodatke sesije"""
    try:
        session_id = metadata.get('session_id')
        if not session_id:
            raise HTTPException(status_code=400, detail="session_id is required")
        
        if session_id not in session_metadata:
            raise HTTPException(status_code=404, detail="Session not found")
        
        # Ažuriraj metapodatke
        session_metadata[session_id].update(metadata)
        session_metadata[session_id]['updated_at'] = datetime.now().isoformat()
        
        return {
            "status": "success",
            "data": {
                "message": "Session metadata updated successfully",
                "session_id": session_id
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating session metadata: {e}")
        raise HTTPException(status_code=500, detail="Failed to update session metadata")

# ============================================================================
# STUDY ROOM ENDPOINTS
# ============================================================================

@app.get("/study-room/list")
async def list_study_rooms(user_id: str = None):
    """Lista study soba"""
    try:
        # Filtriraj sobe po user_id ako je prosleđen
        filtered_rooms = []
        for room_id, room_data in study_rooms.items():
            if user_id is None or user_id in room_data.get('members', []):
                filtered_rooms.append({
                    'id': room_id,
                    'name': room_data.get('name', 'Bez imena'),
                    'description': room_data.get('description', ''),
                    'subject': room_data.get('subject', 'Opšte'),
                    'member_count': len(room_data.get('members', [])),
                    'max_members': room_data.get('max_members', 10),
                    'is_private': room_data.get('is_private', False),
                    'created_at': room_data.get('created_at', ''),
                    'created_by': room_data.get('created_by', '')
                })
        
        return {
            "status": "success",
            "data": {
                "rooms": filtered_rooms,
                "total": len(filtered_rooms)
            }
        }
        
    except Exception as e:
        logger.error(f"Error listing study rooms: {e}")
        raise HTTPException(status_code=500, detail="Failed to list study rooms")

@app.post("/study-room/create")
async def create_study_room(room_data: dict):
    """Kreira novu study sobu"""
    try:
        room_id = str(uuid.uuid4())
        
        study_rooms[room_id] = {
            'id': room_id,
            'name': room_data.get('name', 'Bez imena'),
            'description': room_data.get('description', ''),
            'subject': room_data.get('subject', 'Opšte'),
            'max_members': room_data.get('max_members', 10),
            'is_private': room_data.get('is_private', False),
            'password': room_data.get('password'),
            'members': [room_data.get('created_by', 'default_user')],
            'created_by': room_data.get('created_by', 'default_user'),
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat()
        }
        
        study_room_members[room_id] = [room_data.get('created_by', 'default_user')]
        study_room_messages[room_id] = []
        
        return {
            "status": "success",
            "data": {
                "room_id": room_id,
                "message": "Study room created successfully"
            }
        }
        
    except Exception as e:
        logger.error(f"Error creating study room: {e}")
        raise HTTPException(status_code=500, detail="Failed to create study room")

# ============================================================================
# EXAM ENDPOINTS
# ============================================================================

@app.get("/exams")
async def list_exams():
    """Lista ispita"""
    try:
        exam_service = get_exam_service()
        exams = exam_service.list_exams()
        
        return {
            "status": "success",
            "data": {
                "exams": exams,
                "total": len(exams)
            }
        }
        
    except Exception as e:
        logger.error(f"Error listing exams: {e}")
        raise HTTPException(status_code=500, detail="Failed to list exams")

@app.post("/exam/create")
async def create_exam(exam_data: dict):
    """Kreira novi ispit"""
    try:
        exam_service = get_exam_service()
        exam_id = exam_service.create_exam(exam_data)
        
        return {
            "status": "success",
            "data": {
                "exam_id": exam_id,
                "message": "Exam created successfully"
            }
        }
        
    except Exception as e:
        logger.error(f"Error creating exam: {e}")
        raise HTTPException(status_code=500, detail="Failed to create exam")

# ============================================================================
# PROBLEM GENERATOR ENDPOINTS
# ============================================================================

@app.get("/problems/subjects")
async def list_problem_subjects():
    """Lista predmeta za probleme"""
    try:
        # Koristi Subject enum iz problem_generator modula
        from .problem_generator import Subject
        
        subjects = [
            {"id": Subject.MATHEMATICS, "name": "Matematika", "description": "Matematički problemi"},
            {"id": Subject.PHYSICS, "name": "Fizika", "description": "Fizički problemi"},
            {"id": Subject.CHEMISTRY, "name": "Hemija", "description": "Hemijski problemi"},
            {"id": Subject.BIOLOGY, "name": "Biologija", "description": "Biološki problemi"},
            {"id": Subject.COMPUTER_SCIENCE, "name": "Informatika", "description": "Problemi iz informatike"},
            {"id": Subject.GENERAL, "name": "Opšte", "description": "Opšti problemi"}
        ]
        
        return {
            "status": "success",
            "data": {
                "subjects": subjects
            }
        }
        
    except Exception as e:
        logger.error(f"Error listing problem subjects: {e}")
        raise HTTPException(status_code=500, detail="Failed to list problem subjects")

@app.get("/problems/stats")
async def get_problem_stats():
    """Statistike problema"""
    try:
        problem_generator = get_problem_generator()
        stats = problem_generator.get_stats()
        
        return {
            "status": "success",
            "data": stats
        }
        
    except Exception as e:
        logger.error(f"Error getting problem stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to get problem stats")

@app.get("/problems/database")
async def get_problem_database(limit: int = 20, offset: int = 0, subject: str = None):
    """Baza problema"""
    try:
        problem_generator = get_problem_generator()
        
        # Kreiraj filtere
        filters = {}
        if subject:
            filters['subject'] = subject
        
        # Dohvati sve probleme sa filterima
        all_problems = problem_generator.list_problems(filters)
        
        # Primeni limit i offset
        total_problems = len(all_problems)
        problems = all_problems[offset:offset + limit]
        
        return {
            "status": "success",
            "data": {
                "problems": problems,
                "total": total_problems,
                "limit": limit,
                "offset": offset
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting problem database: {e}")
        raise HTTPException(status_code=500, detail="Failed to get problem database")

# ============================================================================
# STUDY JOURNAL ENDPOINTS
# ============================================================================

@app.get("/study-journal/entries")
async def list_study_journal_entries(user_id: str, limit: int = 50, offset: int = 0):
    """Lista study journal entrija"""
    try:
        # Koristi postojeću list_entries metodu sa filterima
        filters = {}  # Možemo dodati filtere po user_id kasnije ako je potrebno
        all_entries = study_journal_service.list_entries(filters)
        
        # Primeni limit i offset
        total_entries = len(all_entries)
        entries = all_entries[offset:offset + limit]
        
        return {
            "status": "success",
            "data": {
                "entries": entries,
                "total": total_entries,
                "limit": limit,
                "offset": offset
            }
        }
        
    except Exception as e:
        logger.error(f"Error listing study journal entries: {e}")
        raise HTTPException(status_code=500, detail="Failed to list study journal entries")

# ============================================================================
# CAREER GUIDANCE ENDPOINTS
# ============================================================================

@app.get("/career-guidance/profile/{user_id}")
async def get_career_profile(user_id: str):
    """Dohvata career profile korisnika"""
    try:
        career_service = CareerGuidanceService()
        
        # Pokušaj da pronađeš profile po user_id (možda je user_id zapravo profile_id)
        profile = career_service.get_profile(user_id)
        
        if not profile:
            # Kreiraj default profile ako ne postoji
            profile_data = {
                'name': 'Default User',
                'age': 25,
                'education_level': 'Bachelor',
                'interests': [],
                'skills': [],
                'experience_years': 0,
                'user_id': user_id  # Dodaj user_id u metadata
            }
            profile_id = career_service.create_profile(profile_data)
            profile = career_service.get_profile(profile_id)
        
        return {
            "status": "success",
            "data": {
                "profile": profile
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting career profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to get career profile")

# TODO: Dodati ostale endpoint-e (study rooms, exams, problems, etc.)
# Trenutno su placeholder-i da se fokusiramo na osnovne funkcionalnosti


