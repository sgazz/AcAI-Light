"""
AcAIA Backend - Ollama servis
Samo AI funkcionalnosti (Ollama, LangChain, OCR) bez Supabase
"""

import os
import uuid
import time
import json
import logging
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
import numpy as np
import psutil

# Konfiguracija logging-a
logger = logging.getLogger(__name__)

# Import app modula
from app.prompts import SYSTEM_PROMPT, CONTEXT_PROMPT
from app.rag_service import RAGService
from app.ocr_service import OCRService
from app.config import Config
from app.cache_manager import cache_manager, get_cached_ai_response, set_cached_ai_response, get_semantic_cached_response, get_cache_analytics
from app.background_tasks import task_manager, add_background_task, get_task_status, cancel_task, get_all_tasks, get_task_stats, TaskPriority, TaskStatus
from app.websocket import websocket_manager, WebSocketMessage, MessageType, get_websocket_manager
from app.exam_service import get_exam_service
from app.problem_generator import get_problem_generator, Subject, Difficulty, ProblemType
from app.error_handler import (
    error_handler, handle_api_error, ErrorCategory, ErrorSeverity,
    AcAIAException, ValidationError, ExternalServiceError, RAGError, OCRError,
    ErrorHandlingMiddleware
)
from app.query_rewriter import QueryRewriter
from app.fact_checker import FactChecker, FactCheckResult
# from app.career_guidance_service import CareerGuidanceService  # Lazy import
from app.rag_analytics import RAGAnalytics, QueryMetrics, QueryType, SystemMetrics

# Kreiraj FastAPI aplikaciju
app = FastAPI(
    title="AcAIA Backend - Ollama",
    description="Backend za AcAIA projekat - AI funkcionalnosti",
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
rag_service = RAGService(use_supabase=False)  # Bez Supabase
ocr_service = OCRService()
ollama_host = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
ollama_client = Client(host=ollama_host)
# career_guidance_service = CareerGuidanceService()  # Lazy loading - inicijalizuj tek kada je potreban

# RAG Unapređenja - Inicijalizuj nove servise
query_rewriter = QueryRewriter()
fact_checker = FactChecker()
rag_analytics = RAGAnalytics()

# Lazy loading za career guidance service
_career_guidance_service = None

def get_career_guidance_service():
    """Lazy loading za CareerGuidanceService"""
    global _career_guidance_service
    if _career_guidance_service is None:
        try:
            from app.career_guidance_service import CareerGuidanceService
            _career_guidance_service = CareerGuidanceService()
        except Exception as e:
            print(f"⚠️ Greška pri inicijalizaciji CareerGuidanceService: {e}")
            return None
    return _career_guidance_service

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
    """Globalni exception handler"""
    return await handle_api_error(exc, request, ErrorCategory.GENERAL, ErrorSeverity.HIGH)

# Osnovni endpoint-i
@app.get("/")
def read_root():
    return {"message": "AcAIA Backend - Ollama servis", "status": "running"}

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Proveri Ollama konekciju
        models = ollama_client.list()
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "ollama_models": len(models.get('models', [])),
            "services": {
                "ollama": "connected",
                "rag_service": "ready",
                "ocr_service": "ready"
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

@app.get("/models/status")
async def get_models_status():
    """Dohvati status Ollama modela"""
    try:
        models = ollama_client.list()
        return {
            "status": "success",
            "models": models.get('models', []),
            "count": len(models.get('models', []))
        }
    except Exception as e:
        return {
            "status": "error",
            "error": str(e)
        }

# Chat endpoint
@app.post("/chat")
async def chat_endpoint(message: dict):
    """Chat endpoint sa Ollama modelom"""
    try:
        user_message = message.get('message', '')
        session_id = message.get('session_id', str(uuid.uuid4()))
        model = message.get('model', 'mistral:latest')
        
        # Pozovi Ollama
        response = ollama_client.chat(
            model=model,
            messages=[{"role": "user", "content": user_message}],
            stream=False
        )
        
        return {
            "status": "success",
            "response": response['message']['content'],
            "session_id": session_id,
            "model": model,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Greška pri chat-u: {str(e)}")

# OCR endpoint
@app.post("/ocr/extract")
async def extract_text_from_image(file: UploadFile = File(...)):
    """Extract text from image using OCR"""
    try:
        # Čitaj fajl
        contents = await file.read()
        
        # Sačuvaj privremeno
        temp_path = f"/tmp/{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(contents)
        
        # OCR obrada
        extracted_text = ocr_service.extract_text(temp_path)
        
        # Obriši privremeni fajl
        os.remove(temp_path)
        
        return {
            "status": "success",
            "extracted_text": extracted_text,
            "filename": file.filename,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Greška pri OCR obradi: {str(e)}")

# RAG endpoint
@app.post("/rag/query")
async def rag_query_endpoint(query_data: dict):
    """RAG query endpoint"""
    try:
        query = query_data.get('query', '')
        
        # Izvrši RAG query
        results = await rag_service.query(query)
        
        return {
            "status": "success",
            "results": results,
            "query": query,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Greška pri RAG query-ju: {str(e)}")

# Problem generation endpoint
@app.post("/problems/generate")
async def generate_problem(generation_data: dict):
    """Generate problem using AI"""
    try:
        subject = generation_data.get('subject', 'mathematics')
        difficulty = generation_data.get('difficulty', 'medium')
        topic = generation_data.get('topic', 'general')
        
        # Generiši problem
        problem_generator = get_problem_generator()
        problem = problem_generator.generate_problem(
            subject=Subject(subject),
            difficulty=Difficulty(difficulty),
            topic=topic
        )
        
        return {
            "status": "success",
            "problem": problem,
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Greška pri generisanju problema: {str(e)}")

# Startup event
@app.on_event("startup")
async def startup_event():
    """Startup event - inicijalizuj servise"""
    print("🚀 AcAIA Backend - Ollama servis se pokreće...")
    
    # Inicijalizuj background tasks
    await task_manager.start()
    
    # Inicijalizuj websocket manager (ako postoji start metoda)
    if hasattr(websocket_manager, 'start'):
        await websocket_manager.start()
    
    print("✅ AcAIA Backend - Ollama servis je spreman!")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Shutdown event - cleanup"""
    print("🛑 AcAIA Backend - Ollama servis se zaustavlja...")
    
    # Zaustavi background tasks
    task_manager.stop()
    
    # Zaustavi websocket manager
    websocket_manager.stop()
    
    # Cleanup cache
    await cache_manager.cleanup()
    
    print("✅ AcAIA Backend - Ollama servis je zaustavljen!")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001) 