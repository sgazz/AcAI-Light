import logging
import traceback
import asyncio
from datetime import datetime
from typing import Dict, Any, Optional, Callable, List
from enum import Enum
from dataclasses import dataclass
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse
import json

# Konfiguracija logging-a
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ErrorSeverity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ErrorCategory(Enum):
    VALIDATION = "validation"
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    NOT_FOUND = "not_found"
    RATE_LIMIT = "rate_limit"
    EXTERNAL_SERVICE = "external_service"
    DATABASE = "database"
    CACHE = "cache"
    WEBSOCKET = "websocket"
    RAG = "rag"
    OCR = "ocr"
    DOCUMENT_PROCESSING = "document_processing"
    GENERAL = "general"

@dataclass
class ErrorContext:
    """Kontekst informacije za grešku"""
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    request_id: Optional[str] = None
    endpoint: Optional[str] = None
    method: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    timestamp: Optional[datetime] = None

@dataclass
class ErrorDetails:
    """Detalji greške"""
    error_code: str
    message: str
    category: ErrorCategory
    severity: ErrorSeverity
    context: ErrorContext
    original_error: Optional[Exception] = None
    stack_trace: Optional[str] = None
    retry_count: int = 0
    max_retries: int = 3

class ErrorHandler:
    """Centralizovani error handler"""
    
    def __init__(self):
        self.error_log: List[ErrorDetails] = []
        self.retry_strategies: Dict[str, Callable] = {}
        self.error_callbacks: List[Callable] = []
        
        # Inicijalizuj retry strategije
        self._init_retry_strategies()
    
    def _init_retry_strategies(self):
        """Inicijalizuj retry strategije za različite tipove grešaka"""
        self.retry_strategies = {
            ErrorCategory.EXTERNAL_SERVICE: self._retry_external_service,
            ErrorCategory.DATABASE: self._retry_database,
            ErrorCategory.CACHE: self._retry_cache,
            ErrorCategory.RAG: self._retry_rag,
            ErrorCategory.OCR: self._retry_ocr
        }
    
    def create_error_response(self, error_details: ErrorDetails) -> Dict[str, Any]:
        """Kreiraj strukturirani error response"""
        response = {
            "status": "error",
            "error": {
                "code": error_details.error_code,
                "message": error_details.message,
                "category": error_details.category.value,
                "severity": error_details.severity.value,
                "timestamp": error_details.context.timestamp.isoformat() if error_details.context.timestamp else datetime.utcnow().isoformat(),
                "request_id": error_details.context.request_id
            }
        }
        
        # Dodaj dodatne informacije za development
        if self._is_development_mode():
            response["error"]["debug"] = {
                "stack_trace": error_details.stack_trace,
                "original_error": str(error_details.original_error) if error_details.original_error else None,
                "retry_count": error_details.retry_count
            }
        
        return response
    
    def log_error(self, error_details: ErrorDetails):
        """Loguj grešku sa detaljima"""
        # Dodaj u error log
        self.error_log.append(error_details)
        
        # Loguj u fajl
        log_message = self._format_log_message(error_details)
        
        if error_details.severity == ErrorSeverity.CRITICAL:
            logger.critical(log_message)
        elif error_details.severity == ErrorSeverity.HIGH:
            logger.error(log_message)
        elif error_details.severity == ErrorSeverity.MEDIUM:
            logger.warning(log_message)
        else:
            logger.info(log_message)
        
        # Pozovi error callbacks
        for callback in self.error_callbacks:
            try:
                callback(error_details)
            except Exception as e:
                logger.error(f"Greška u error callback-u: {e}")
    
    def _format_log_message(self, error_details: ErrorDetails) -> str:
        """Formatiraj log poruku"""
        context = error_details.context
        return (
            f"ERROR [{error_details.error_code}] {error_details.message} | "
            f"Category: {error_details.category.value} | "
            f"Severity: {error_details.severity.value} | "
            f"User: {context.user_id} | "
            f"Session: {context.session_id} | "
            f"Endpoint: {context.method} {context.endpoint} | "
            f"IP: {context.ip_address} | "
            f"Retry: {error_details.retry_count}/{error_details.max_retries}"
        )
    
    async def handle_error(self, error: Exception, context: ErrorContext, 
                          category: ErrorCategory = ErrorCategory.GENERAL,
                          severity: ErrorSeverity = ErrorSeverity.MEDIUM,
                          error_code: str = None) -> Dict[str, Any]:
        """Glavna metoda za handling grešaka"""
        
        # Kreiraj error details
        error_details = ErrorDetails(
            error_code=error_code or self._generate_error_code(error, category),
            message=str(error),
            category=category,
            severity=severity,
            context=context,
            original_error=error,
            stack_trace=traceback.format_exc()
        )
        
        # Loguj grešku
        self.log_error(error_details)
        
        # Pokušaj retry ako je moguće
        if self._should_retry(error_details):
            retry_result = await self._attempt_retry(error_details)
            if retry_result:
                return retry_result
        
        # Kreiraj error response
        return self.create_error_response(error_details)
    
    def _generate_error_code(self, error: Exception, category: ErrorCategory) -> str:
        """Generiši error kod"""
        error_name = type(error).__name__.upper()
        return f"{category.value.upper()}_{error_name}"
    
    def _should_retry(self, error_details: ErrorDetails) -> bool:
        """Proveri da li treba pokušati retry"""
        return (
            error_details.retry_count < error_details.max_retries and
            error_details.category in self.retry_strategies and
            error_details.severity in [ErrorSeverity.LOW, ErrorSeverity.MEDIUM]
        )
    
    async def _attempt_retry(self, error_details: ErrorDetails) -> Optional[Dict[str, Any]]:
        """Pokušaj retry za grešku"""
        try:
            retry_strategy = self.retry_strategies.get(error_details.category)
            if retry_strategy:
                error_details.retry_count += 1
                logger.info(f"Pokušaj retry {error_details.retry_count} za {error_details.error_code}")
                
                # Sačekaj pre retry-a (exponential backoff)
                await asyncio.sleep(2 ** error_details.retry_count)
                
                result = await retry_strategy(error_details)
                if result:
                    logger.info(f"Retry uspešan za {error_details.error_code}")
                    return result
                
        except Exception as e:
            logger.error(f"Greška pri retry-u: {e}")
        
        return None
    
    # Retry strategije
    async def _retry_external_service(self, error_details: ErrorDetails) -> Optional[Dict[str, Any]]:
        """Retry strategija za external service greške"""
        # Implementacija za retry external servisa
        return None
    
    async def _retry_database(self, error_details: ErrorDetails) -> Optional[Dict[str, Any]]:
        """Retry strategija za database greške"""
        # Implementacija za retry database operacija
        return None
    
    async def _retry_cache(self, error_details: ErrorDetails) -> Optional[Dict[str, Any]]:
        """Retry strategija za cache greške"""
        # Implementacija za retry cache operacija
        return None
    
    async def _retry_rag(self, error_details: ErrorDetails) -> Optional[Dict[str, Any]]:
        """Retry strategija za RAG greške"""
        # Implementacija za retry RAG operacija
        return None
    
    async def _retry_ocr(self, error_details: ErrorDetails) -> Optional[Dict[str, Any]]:
        """Retry strategija za OCR greške"""
        # Implementacija za retry OCR operacija
        return None
    
    def _is_development_mode(self) -> bool:
        """Proveri da li je development mode"""
        import os
        return os.getenv("ENVIRONMENT", "development").lower() == "development"
    
    def add_error_callback(self, callback: Callable[[ErrorDetails], None]):
        """Dodaj callback za error handling"""
        self.error_callbacks.append(callback)
    
    def get_error_stats(self) -> Dict[str, Any]:
        """Dohvati statistike grešaka"""
        total_errors = len(self.error_log)
        errors_by_category = {}
        errors_by_severity = {}
        
        for error in self.error_log:
            # Po kategoriji
            category = error.category.value
            errors_by_category[category] = errors_by_category.get(category, 0) + 1
            
            # Po severitetu
            severity = error.severity.value
            errors_by_severity[severity] = errors_by_severity.get(severity, 0) + 1
        
        return {
            "total_errors": total_errors,
            "errors_by_category": errors_by_category,
            "errors_by_severity": errors_by_severity,
            "recent_errors": [
                {
                    "code": error.error_code,
                    "message": error.message,
                    "category": error.category.value,
                    "severity": error.severity.value,
                    "timestamp": error.context.timestamp.isoformat() if error.context.timestamp else None
                }
                for error in self.error_log[-10:]  # Poslednjih 10 grešaka
            ]
        }

# Globalna instanca error handler-a
error_handler = ErrorHandler()

# Helper funkcije
async def handle_api_error(error: Exception, request: Request, 
                          category: ErrorCategory = ErrorCategory.GENERAL,
                          severity: ErrorSeverity = ErrorSeverity.MEDIUM,
                          error_code: str = None) -> JSONResponse:
    """Helper funkcija za handling API grešaka"""
    
    # Kreiraj context
    context = ErrorContext(
        endpoint=str(request.url.path),
        method=request.method,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        timestamp=datetime.utcnow()
    )
    
    # Handle grešku
    error_response = await error_handler.handle_error(error, context, category, severity, error_code)
    
    # Odredi HTTP status kod
    status_code = _get_http_status_code(category, severity)
    
    return JSONResponse(
        status_code=status_code,
        content=error_response
    )

def _get_http_status_code(category: ErrorCategory, severity: ErrorSeverity) -> int:
    """Odredi HTTP status kod na osnovu kategorije i severiteta"""
    status_codes = {
        ErrorCategory.VALIDATION: 400,
        ErrorCategory.AUTHENTICATION: 401,
        ErrorCategory.AUTHORIZATION: 403,
        ErrorCategory.NOT_FOUND: 404,
        ErrorCategory.RATE_LIMIT: 429,
        ErrorCategory.EXTERNAL_SERVICE: 502,
        ErrorCategory.DATABASE: 503,
        ErrorCategory.CACHE: 503,
        ErrorCategory.WEBSOCKET: 500,
        ErrorCategory.RAG: 500,
        ErrorCategory.OCR: 500,
        ErrorCategory.GENERAL: 500
    }
    
    return status_codes.get(category, 500)

# Custom exception klase
class AcAIAException(Exception):
    """Bazna klasa za AcAIA greške"""
    def __init__(self, message: str, category: ErrorCategory = ErrorCategory.GENERAL,
                 severity: ErrorSeverity = ErrorSeverity.MEDIUM, error_code: str = None):
        super().__init__(message)
        self.category = category
        self.severity = severity
        self.error_code = error_code

class ValidationError(AcAIAException):
    """Greška validacije"""
    def __init__(self, message: str, error_code: str = None):
        super().__init__(message, ErrorCategory.VALIDATION, ErrorSeverity.LOW, error_code)

class ExternalServiceError(AcAIAException):
    """Greška external servisa"""
    def __init__(self, message: str, error_code: str = None):
        super().__init__(message, ErrorCategory.EXTERNAL_SERVICE, ErrorSeverity.HIGH, error_code)

class RAGError(AcAIAException):
    """Greška RAG servisa"""
    def __init__(self, message: str, error_code: str = None):
        super().__init__(message, ErrorCategory.RAG, ErrorSeverity.MEDIUM, error_code)

class OCRError(AcAIAException):
    """Greška OCR servisa"""
    def __init__(self, message: str, error_code: str = None):
        super().__init__(message, ErrorCategory.OCR, ErrorSeverity.MEDIUM, error_code)

# FastAPI middleware za error handling
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware za centralizovani error handling"""
    
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as exc:
            # Handle grešku kroz naš error handler
            return await handle_api_error(exc, request)

# Custom exception handler za FastAPI
def create_error_response(request: Request, exc: Exception) -> JSONResponse:
    """Kreira error response za FastAPI exception handler"""
    # Kreiraj context
    context = ErrorContext(
        endpoint=str(request.url.path),
        method=request.method,
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        timestamp=datetime.utcnow()
    )
    
    # Odredi kategoriju i severitet na osnovu tipa greške
    if isinstance(exc, AcAIAException):
        category = exc.category
        severity = exc.severity
        error_code = exc.error_code
    elif isinstance(exc, HTTPException):
        category = ErrorCategory.GENERAL
        severity = ErrorSeverity.MEDIUM
        error_code = f"HTTP_{exc.status_code}"
    else:
        category = ErrorCategory.GENERAL
        severity = ErrorSeverity.HIGH
        error_code = f"UNEXPECTED_{type(exc).__name__.upper()}"
    
    # Kreiraj error details
    error_details = ErrorDetails(
        error_code=error_code,
        message=str(exc),
        category=category,
        severity=severity,
        context=context,
        original_error=exc,
        stack_trace=traceback.format_exc()
    )
    
    # Loguj grešku
    error_handler.log_error(error_details)
    
    # Kreiraj response
    response = error_handler.create_error_response(error_details)
    status_code = _get_http_status_code(category, severity)
    
    return JSONResponse(
        status_code=status_code,
        content=response
    ) 