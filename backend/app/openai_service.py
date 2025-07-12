"""
OpenAI Service
Upravlja komunikacijom sa OpenAI API-jem
"""

import os
import asyncio
import logging
from typing import List, Dict, Any, Optional
from openai import OpenAI
from .config import Config
from .error_handler import ExternalServiceError, ErrorCategory, ErrorSeverity

logger = logging.getLogger(__name__)

class OpenAIService:
    """Servis za komunikaciju sa OpenAI API-jem"""
    
    def __init__(self):
        """Inicijalizuj OpenAI servis"""
        self.api_key = Config.OPENAI_API_KEY
        self.model = Config.OPENAI_MODEL
        self.max_tokens = Config.OPENAI_MAX_TOKENS
        self.temperature = Config.OPENAI_TEMPERATURE
        
        if not self.api_key:
            logger.warning("OpenAI API ključ nije postavljen")
            self.client = None
        else:
            try:
                self.client = OpenAI(api_key=self.api_key)
                logger.info(f"OpenAI servis inicijalizovan sa modelom: {self.model}")
            except Exception as e:
                logger.error(f"Greška pri inicijalizaciji OpenAI klijenta: {e}")
                self.client = None
    
    def is_available(self) -> bool:
        """Proveri da li je OpenAI servis dostupan"""
        return self.client is not None and self.api_key is not None
    
    async def chat_completion(
        self, 
        messages: List[Dict[str, str]], 
        model: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
        stream: bool = False
    ) -> Dict[str, Any]:
        """
        Pošalji chat completion zahtev ka OpenAI API-ju
        
        Args:
            messages: Lista poruka u formatu [{"role": "user", "content": "..."}]
            model: Model koji će se koristiti (opciono)
            max_tokens: Maksimalan broj tokena (opciono)
            temperature: Temperatura za kreativnost (opciono)
            stream: Da li da koristi streaming (opciono)
        
        Returns:
            Dict sa odgovorom od OpenAI-a
        """
        try:
            if not self.is_available():
                raise ExternalServiceError(
                    "OpenAI servis nije dostupan - proveri API ključ",
                    "OPENAI_NOT_AVAILABLE",
                    ErrorCategory.EXTERNAL_SERVICE,
                    ErrorSeverity.HIGH
                )
            
            # Koristi default vrednosti ako nisu prosleđene
            model = model or self.model
            max_tokens = max_tokens or self.max_tokens
            temperature = temperature or self.temperature
            
            logger.info(f"Slanje zahteva ka OpenAI sa modelom: {model}")
            
            # Pošalji zahtev ka OpenAI (asinhrono poziv)
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.chat.completions.create(
                    model=model,
                    messages=messages,
                    max_tokens=max_tokens,
                    temperature=temperature,
                    stream=stream
                )
            )
            
            if stream:
                # Za streaming, vraćamo generator
                return response
            else:
                # Za obične zahteve, vraćamo sadržaj
                content = response.choices[0].message.content
                usage = response.usage.dict() if response.usage else {}
                
                logger.info(f"OpenAI odgovor primljen. Tokeni: {usage.get('total_tokens', 'N/A')}")
                
                return {
                    "message": {
                        "content": content,
                        "role": "assistant"
                    },
                    "usage": usage,
                    "model": model
                }
                
        except Exception as e:
            logger.error(f"Greška pri komunikaciji sa OpenAI: {e}")
            raise ExternalServiceError(
                f"Greška pri komunikaciji sa OpenAI: {str(e)}",
                "OPENAI_API_ERROR",
                ErrorCategory.EXTERNAL_SERVICE,
                ErrorSeverity.HIGH
            )
    
    async def simple_chat(self, user_message: str, context: str = "") -> str:
        """
        Jednostavan chat - pošalji poruku i dohvati odgovor
        
        Args:
            user_message: Korisnička poruka
            context: Kontekst (opciono)
        
        Returns:
            Odgovor od AI-a
        """
        try:
            messages = []
            
            # Dodaj sistem poruku
            messages.append({
                "role": "system",
                "content": "Ti si AI Study Assistant. Odgovaraj na srpskom, budi jasan i koristan."
            })
            
            # Dodaj kontekst ako postoji
            if context:
                messages.append({
                    "role": "user",
                    "content": f"Kontekst: {context}\n\nKorisnik: {user_message}"
                })
            else:
                messages.append({
                    "role": "user",
                    "content": user_message
                })
            
            response = await self.chat_completion(messages)
            return response["message"]["content"]
            
        except Exception as e:
            logger.error(f"Greška u simple_chat: {e}")
            return f"Greška pri komunikaciji sa AI servisom: {str(e)}"

# Globalna instanca servisa
openai_service = OpenAIService() 