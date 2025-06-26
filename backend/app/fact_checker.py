"""
Fact Checker Service

Ovaj servis proverava tačnost odgovora koristeći LLM integraciju.
Pomaže u verifikaciji informacija i daje confidence score.
"""

import asyncio
import json
import logging
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

from .config import Config
from ollama import Client

logger = logging.getLogger(__name__)

class VerificationStatus(Enum):
    """Status verifikacije"""
    VERIFIED = "verified"
    PARTIALLY_VERIFIED = "partially_verified"
    UNVERIFIED = "unverified"
    CONTRADICTED = "contradicted"

@dataclass
class FactCheckResult:
    """Rezultat fact checking-a"""
    verified: bool
    confidence: float
    reasoning: str
    sources: List[str]
    status: VerificationStatus
    contradictions: List[str]
    missing_info: List[str]
    timestamp: datetime

class FactChecker:
    """Servis za proveru tačnosti odgovora"""
    
    def __init__(self):
        self.ollama_client = Client()
        self.cache = {}  # Simple in-memory cache
        self.max_cache_size = 1000
        self.stats = {
            'total_checks': 0,
            'verified': 0,
            'partially_verified': 0,
            'unverified': 0,
            'contradicted': 0,
            'avg_confidence': 0.0
        }
    
    def _get_cache_key(self, answer: str, context: str) -> str:
        """Generiši cache ključ"""
        return f"fact_check:{hash(answer + context)}"
    
    async def verify_answer(self, answer: str, context: str, sources: List[str] = None) -> FactCheckResult:
        """Proveri tačnost odgovora na osnovu konteksta"""
        cache_key = self._get_cache_key(answer, context)
        
        # Proveri cache
        if cache_key in self.cache:
            logger.info(f"Fact check rezultat pronađen u cache-u")
            return self.cache[cache_key]
        
        try:
            # Kreiraj prompt za verifikaciju
            prompt = self._create_verification_prompt(answer, context, sources)
            
            # Pozovi LLM
            response = await self._call_llm(prompt)
            
            # Parsiraj odgovor
            result = self._parse_verification_response(response, answer, context)
            
            # Ažuriraj statistike
            self._update_stats(result)
            
            # Sačuvaj u cache
            self._cache_result(cache_key, result)
            
            logger.info(f"Fact check završen - Confidence: {result.confidence:.2f}, Status: {result.status.value}")
            return result
            
        except Exception as e:
            logger.error(f"Greška pri fact checking-u: {e}")
            # Vrati default rezultat
            return FactCheckResult(
                verified=False,
                confidence=0.0,
                reasoning=f"Greška pri verifikaciji: {str(e)}",
                sources=[],
                status=VerificationStatus.UNVERIFIED,
                contradictions=[],
                missing_info=[],
                timestamp=datetime.now()
            )
    
    def _create_verification_prompt(self, answer: str, context: str, sources: List[str] = None) -> str:
        """Kreiraj prompt za verifikaciju"""
        sources_text = ""
        if sources:
            sources_text = f"\nIzvori informacija:\n" + "\n".join([f"- {source}" for source in sources])
        
        prompt = f"""
        Proveri tačnost sledećeg odgovora na osnovu konteksta:
        
        ODGOVOR: {answer}
        KONTEKST: {context}{sources_text}
        
        Analiziraj i vrati JSON odgovor sa sledećim poljima:
        {{
            "verified": boolean (da li je odgovor tačan),
            "confidence": float (0-1, pouzdanost verifikacije),
            "reasoning": string (obrazloženje verifikacije),
            "sources_verified": list (izvori koji potvrđuju odgovor),
            "contradictions": list (protivrečnosti sa kontekstom),
            "missing_info": list (nedostajuće informacije),
            "status": string ("verified", "partially_verified", "unverified", "contradicted")
        }}
        
        Samo JSON odgovor, bez dodatnog teksta:
        """
        
        return prompt.strip()
    
    async def _call_llm(self, prompt: str) -> str:
        """Pozovi LLM za verifikaciju"""
        try:
            response = self.ollama_client.generate(
                model="mistral",
                prompt=prompt,
                options={
                    "temperature": 0.1,  # Niska temperatura za konzistentnost
                    "top_p": 0.9,
                    "max_tokens": 1000
                }
            )
            return response['response']
        except Exception as e:
            logger.error(f"Greška pri pozivu LLM-a: {e}")
            raise
    
    def _parse_verification_response(self, response: str, answer: str, context: str) -> FactCheckResult:
        """Parsiraj odgovor LLM-a"""
        try:
            # Pokušaj da parsiraj JSON
            data = json.loads(response.strip())
            
            # Mapiraj status
            status_map = {
                "verified": VerificationStatus.VERIFIED,
                "partially_verified": VerificationStatus.PARTIALLY_VERIFIED,
                "unverified": VerificationStatus.UNVERIFIED,
                "contradicted": VerificationStatus.CONTRADICTED
            }
            
            status = status_map.get(data.get("status", "unverified"), VerificationStatus.UNVERIFIED)
            
            return FactCheckResult(
                verified=data.get("verified", False),
                confidence=float(data.get("confidence", 0.0)),
                reasoning=data.get("reasoning", "Nema obrazloženja"),
                sources=data.get("sources_verified", []),
                status=status,
                contradictions=data.get("contradictions", []),
                missing_info=data.get("missing_info", []),
                timestamp=datetime.now()
            )
            
        except (json.JSONDecodeError, KeyError, ValueError) as e:
            logger.warning(f"Greška pri parsiranju LLM odgovora: {e}")
            # Vrati default rezultat
            return FactCheckResult(
                verified=False,
                confidence=0.0,
                reasoning=f"Greška pri parsiranju odgovora: {str(e)}",
                sources=[],
                status=VerificationStatus.UNVERIFIED,
                contradictions=[],
                missing_info=[],
                timestamp=datetime.now()
            )
    
    def _update_stats(self, result: FactCheckResult):
        """Ažuriraj statistike"""
        self.stats['total_checks'] += 1
        
        if result.status == VerificationStatus.VERIFIED:
            self.stats['verified'] += 1
        elif result.status == VerificationStatus.PARTIALLY_VERIFIED:
            self.stats['partially_verified'] += 1
        elif result.status == VerificationStatus.UNVERIFIED:
            self.stats['unverified'] += 1
        elif result.status == VerificationStatus.CONTRADICTED:
            self.stats['contradicted'] += 1
        
        # Ažuriraj prosečnu pouzdanost
        total_checks = self.stats['total_checks']
        current_avg = self.stats['avg_confidence']
        self.stats['avg_confidence'] = (current_avg * (total_checks - 1) + result.confidence) / total_checks
    
    def _cache_result(self, key: str, result: FactCheckResult):
        """Sačuvaj rezultat u cache"""
        if len(self.cache) >= self.max_cache_size:
            # Ukloni najstariji rezultat
            oldest_key = next(iter(self.cache))
            del self.cache[oldest_key]
        
        self.cache[key] = result
    
    async def verify_multiple_answers(self, answers: List[Dict]) -> List[FactCheckResult]:
        """Proveri više odgovora odjednom"""
        results = []
        for answer_data in answers:
            answer = answer_data.get("answer", "")
            context = answer_data.get("context", "")
            sources = answer_data.get("sources", [])
            
            result = await self.verify_answer(answer, context, sources)
            results.append(result)
        
        return results
    
    async def get_verification_stats(self) -> Dict:
        """Dohvati statistike verifikacije"""
        return {
            "total_checks": self.stats['total_checks'],
            "verified": self.stats['verified'],
            "partially_verified": self.stats['partially_verified'],
            "unverified": self.stats['unverified'],
            "contradicted": self.stats['contradicted'],
            "avg_confidence": round(self.stats['avg_confidence'], 3),
            "cache_size": len(self.cache),
            "success_rate": round((self.stats['verified'] + self.stats['partially_verified']) / max(self.stats['total_checks'], 1) * 100, 2)
        }
    
    async def clear_cache(self) -> bool:
        """Očisti cache"""
        try:
            self.cache.clear()
            logger.info("Fact checker cache očišćen")
            return True
        except Exception as e:
            logger.error(f"Greška pri čišćenju cache-a: {e}")
            return False
    
    async def test_connection(self) -> Dict:
        """Testiraj konekciju sa LLM-om"""
        try:
            # Test LLM konekcije
            test_response = self.ollama_client.generate(
                model="mistral",
                prompt="Test konekcije - odgovori sa 'OK'",
                options={"max_tokens": 10}
            )
            
            return {
                'status': 'success',
                'message': 'LLM konekcija uspešna',
                'test_response': test_response['response'].strip()
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'message': f'LLM konekcija neuspešna: {str(e)}'
            }

# Globalna instanca
fact_checker = FactChecker() 