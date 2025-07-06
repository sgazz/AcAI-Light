"""
Fact Checker Service

Ovaj servis proverava tačnost odgovora koristeći LLM integraciju.
Pomaže u verifikaciji informacija i daje confidence score.
"""

import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from collections import Counter
import numpy as np
from sentence_transformers import SentenceTransformer
import asyncio
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import datetime

@dataclass
class FactCheckResult:
    """Rezultat fact checking-a"""
    original_text: str
    is_factual: bool
    confidence: float
    sources: List[Dict[str, Any]]
    contradictions: List[Dict[str, Any]]
    verified_claims: List[Dict[str, Any]]
    unverified_claims: List[Dict[str, Any]]
    timestamp: datetime
    processing_time: float

class FactChecker:
    """Napredni sistem za fact checking i verifikaciju informacija"""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self.logger = logging.getLogger(__name__)
        self.executor = ThreadPoolExecutor(max_workers=3)
        
        # Factual indicators
        self.factual_indicators = {
            'positive': [
                'studija pokazuje', 'istraživanje dokazuje', 'podaci pokazuju',
                'statistika', 'procenat', 'broj', 'datum', 'godina',
                'prema', 'saglasno', 'na osnovu', 'prema podacima'
            ],
            'negative': [
                'možda', 'verovatno', 'možda', 'pretpostavljam', 'mislim',
                'čini mi se', 'možda', 'ne znam', 'nije sigurno'
            ]
        }
        
        # Claim patterns
        self.claim_patterns = {
            'statistical': r'\b\d+%?\b|\b\d+\.\d+\b|\b\d+\s+(procenat|posto|%)\b',
            'temporal': r'\b\d{4}\b|\b\d{1,2}\.\d{1,2}\.\d{2,4}\b',
            'comparative': r'\bviše\b|\bmanje\b|\bveći\b|\bmanji\b|\bbolji\b|\bgore\b',
            'causal': r'\bzbog\b|\bjer\b|\bpošto\b|\bna osnovu\b|\bkao rezultat\b'
        }
        
        # Contradiction indicators
        self.contradiction_indicators = [
            'ali', 'međutim', 's druge strane', 'nasuprot', 'za razliku od',
            'ne', 'nije', 'nema', 'nije tačno', 'pogrešno'
        ]
        
        self._load_model()
    
    def _load_model(self):
        """Učitava sentence transformer model"""
        try:
            self.model = SentenceTransformer(self.model_name)
            self.logger.info(f"Fact checker model {self.model_name} uspešno učitan")
        except Exception as e:
            self.logger.error(f"Greška pri učitavanju modela: {e}")
            self.model = None
    
    async def check_facts(self, text: str, sources: List[Dict[str, Any]] = None) -> FactCheckResult:
        """Glavna metoda za fact checking"""
        start_time = datetime.now()
        
        try:
            # Korak 1: Ekstraktuj claims iz teksta
            claims = self._extract_claims(text)
            
            # Korak 2: Analiziraj factual indicators
            factual_score = self._analyze_factual_indicators(text)
            
            # Korak 3: Proveri claims protiv sources
            verified_claims = []
            unverified_claims = []
            
            if sources:
                verified_claims, unverified_claims = await self._verify_claims_against_sources(
                    claims, sources
                )
            else:
                unverified_claims = claims
            
            # Korak 4: Detektuj kontradikcije
            contradictions = self._detect_contradictions(text, verified_claims)
            
            # Korak 5: Izračunaj confidence score
            confidence = self._calculate_confidence(
                factual_score, verified_claims, unverified_claims, contradictions
            )
            
            # Korak 6: Odredi da li je tekst factual
            is_factual = confidence > 0.7 and len(contradictions) == 0
            
            processing_time = (datetime.now() - start_time).total_seconds()
            
            return FactCheckResult(
                original_text=text,
                is_factual=is_factual,
                confidence=confidence,
                sources=sources or [],
                contradictions=contradictions,
                verified_claims=verified_claims,
                unverified_claims=unverified_claims,
                timestamp=datetime.now(),
                processing_time=processing_time
            )
            
        except Exception as e:
            self.logger.error(f"Greška pri fact checking-u: {e}")
            return FactCheckResult(
                original_text=text,
                is_factual=False,
                confidence=0.0,
                sources=sources or [],
                contradictions=[],
                verified_claims=[],
                unverified_claims=[],
                timestamp=datetime.now(),
                processing_time=0.0
            )
    
    def _extract_claims(self, text: str) -> List[Dict[str, Any]]:
        """Ekstraktuje claims iz teksta"""
        claims = []
        
        # Razbiji tekst na rečenice
        sentences = re.split(r'[.!?]+', text)
        
        for i, sentence in enumerate(sentences):
            sentence = sentence.strip()
            if not sentence:
                continue
            
            # Detektuj tip claim-a
            claim_type = self._detect_claim_type(sentence)
            
            # Ekstraktuj numeričke vrednosti
            numbers = re.findall(r'\b\d+\.?\d*\b', sentence)
            
            # Ekstraktuj datume
            dates = re.findall(r'\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b', sentence)
            
            # Ekstraktuj procenate
            percentages = re.findall(r'\b\d+%\b', sentence)
            
            if claim_type or numbers or dates or percentages:
                claims.append({
                    'sentence': sentence,
                    'sentence_index': i,
                    'claim_type': claim_type,
                    'numbers': numbers,
                    'dates': dates,
                    'percentages': percentages,
                    'confidence': self._calculate_claim_confidence(sentence)
                })
        
        return claims
    
    def _detect_claim_type(self, sentence: str) -> str:
        """Detektuje tip claim-a"""
        sentence_lower = sentence.lower()
        
        # Statistički claim
        if re.search(self.claim_patterns['statistical'], sentence):
            return 'statistical'
        
        # Temporalni claim
        if re.search(self.claim_patterns['temporal'], sentence):
            return 'temporal'
        
        # Komparativni claim
        if re.search(self.claim_patterns['comparative'], sentence):
            return 'comparative'
        
        # Kauzalni claim
        if re.search(self.claim_patterns['causal'], sentence):
            return 'causal'
        
        # Definiciona tvrdnja
        if any(word in sentence_lower for word in ['je', 'su', 'znači', 'definiše']):
            return 'definition'
        
        return 'general'
    
    def _calculate_claim_confidence(self, sentence: str) -> float:
        """Računa confidence za claim"""
        confidence = 0.5  # Base confidence
        
        # Povećaj ako ima numeričke vrednosti
        numbers = re.findall(r'\b\d+\.?\d*\b', sentence)
        if numbers:
            confidence += 0.2
        
        # Povećaj ako ima datume
        dates = re.findall(r'\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b', sentence)
        if dates:
            confidence += 0.1
        
        # Povećaj ako ima factual indicators
        for indicator in self.factual_indicators['positive']:
            if indicator in sentence.lower():
                confidence += 0.1
                break
        
        # Smanji ako ima negative indicators
        for indicator in self.factual_indicators['negative']:
            if indicator in sentence.lower():
                confidence -= 0.2
                break
        
        return max(0.0, min(1.0, confidence))
    
    def _analyze_factual_indicators(self, text: str) -> float:
        """Analizira factual indicators u tekstu"""
        text_lower = text.lower()
        positive_count = 0
        negative_count = 0
        
        # Broj positive indicators
        for indicator in self.factual_indicators['positive']:
            positive_count += text_lower.count(indicator)
        
        # Broj negative indicators
        for indicator in self.factual_indicators['negative']:
            negative_count += text_lower.count(indicator)
        
        # Izračunaj score
        total_indicators = positive_count + negative_count
        if total_indicators == 0:
            return 0.5
        
        return positive_count / total_indicators
    
    async def _verify_claims_against_sources(self, claims: List[Dict], sources: List[Dict]) -> Tuple[List[Dict], List[Dict]]:
        """Proverava claims protiv sources"""
        verified_claims = []
        unverified_claims = []
        
        try:
            for claim in claims:
                claim_verified = False
                supporting_sources = []
                
                for source in sources:
                    source_content = source.get('content', '')
                    if source_content:
                        # Proveri sličnost između claim-a i source-a
                        similarity = await self._calculate_similarity(
                            claim['sentence'], source_content
                        )
                        
                        if similarity > 0.7:  # High similarity threshold
                            claim_verified = True
                            supporting_sources.append({
                                'source': source,
                                'similarity': similarity
                            })
                
                if claim_verified:
                    claim['supporting_sources'] = supporting_sources
                    verified_claims.append(claim)
                else:
                    unverified_claims.append(claim)
            
        except Exception as e:
            self.logger.error(f"Greška pri verifikaciji claims: {e}")
            unverified_claims = claims
        
        return verified_claims, unverified_claims
    
    async def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Računa semantičku sličnost između dva teksta"""
        try:
            if not self.model:
                return 0.0
            
            # Koristi thread pool za CPU-intensive operacije
            loop = asyncio.get_event_loop()
            embeddings = await loop.run_in_executor(
                self.executor,
                self.model.encode,
                [text1, text2]
            )
            
            # Računaj cosine similarity
            similarity = np.dot(embeddings[0], embeddings[1]) / (
                np.linalg.norm(embeddings[0]) * np.linalg.norm(embeddings[1])
            )
            
            return float(similarity)
            
        except Exception as e:
            self.logger.error(f"Greška pri računanju sličnosti: {e}")
            return 0.0
    
    def _detect_contradictions(self, text: str, verified_claims: List[Dict]) -> List[Dict[str, Any]]:
        """Detektuje kontradikcije u tekstu"""
        contradictions = []
        
        # Detektuj kontradikcije između claims
        for i, claim1 in enumerate(verified_claims):
            for j, claim2 in enumerate(verified_claims[i+1:], i+1):
                if self._are_claims_contradictory(claim1, claim2):
                    contradictions.append({
                        'claim1': claim1,
                        'claim2': claim2,
                        'contradiction_type': 'between_claims',
                        'confidence': 0.8
                    })
        
        # Detektuj kontradikcije unutar rečenica
        sentences = re.split(r'[.!?]+', text)
        for sentence in sentences:
            if self._has_internal_contradiction(sentence):
                contradictions.append({
                    'sentence': sentence,
                    'contradiction_type': 'internal',
                    'confidence': 0.9
                })
        
        return contradictions
    
    def _are_claims_contradictory(self, claim1: Dict, claim2: Dict) -> bool:
        """Proverava da li su dva claim-a kontradiktorna"""
        try:
            # Proveri numeričke kontradikcije
            numbers1 = claim1.get('numbers', [])
            numbers2 = claim2.get('numbers', [])
            
            if numbers1 and numbers2:
                # Ako oba claim-a imaju brojeve, proveri da li su različiti
                for num1 in numbers1:
                    for num2 in numbers2:
                        if abs(float(num1) - float(num2)) > 0.1:
                            return True
            
            # Proveri datumske kontradikcije
            dates1 = claim1.get('dates', [])
            dates2 = claim2.get('dates', [])
            
            if dates1 and dates2 and dates1 != dates2:
                return True
            
            # Proveri procenate
            percentages1 = claim1.get('percentages', [])
            percentages2 = claim2.get('percentages', [])
            
            if percentages1 and percentages2:
                for p1 in percentages1:
                    for p2 in percentages2:
                        if p1 != p2:
                            return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Greška pri proveri kontradikcija: {e}")
            return False
    
    def _has_internal_contradiction(self, sentence: str) -> bool:
        """Proverava da li rečenica ima internu kontradikciju"""
        sentence_lower = sentence.lower()
        
        # Proveri contradiction indicators
        for indicator in self.contradiction_indicators:
            if indicator in sentence_lower:
                return True
        
        # Proveri negacije
        if 'ne' in sentence_lower and any(word in sentence_lower for word in ['je', 'su', 'ima']):
            return True
        
        return False
    
    def _calculate_confidence(self, factual_score: float, verified_claims: List[Dict], 
                            unverified_claims: List[Dict], contradictions: List[Dict]) -> float:
        """Računa overall confidence score"""
        confidence = factual_score * 0.3  # Base confidence
        
        # Povećaj na osnovu verified claims
        total_claims = len(verified_claims) + len(unverified_claims)
        if total_claims > 0:
            verification_ratio = len(verified_claims) / total_claims
            confidence += verification_ratio * 0.4
        
        # Povećaj na osnovu claim confidence
        if verified_claims:
            avg_claim_confidence = sum(c.get('confidence', 0.5) for c in verified_claims) / len(verified_claims)
            confidence += avg_claim_confidence * 0.2
        
        # Smanji na osnovu kontradikcija
        contradiction_penalty = len(contradictions) * 0.1
        confidence -= contradiction_penalty
        
        return max(0.0, min(1.0, confidence))
    
    async def batch_fact_check(self, texts: List[str], sources_list: List[List[Dict]] = None) -> List[FactCheckResult]:
        """Batch fact checking za više tekstova"""
        try:
            if sources_list is None:
                sources_list = [None] * len(texts)
            
            tasks = [
                self.check_facts(text, sources) 
                for text, sources in zip(texts, sources_list)
            ]
            
            results = await asyncio.gather(*tasks)
            return results
            
        except Exception as e:
            self.logger.error(f"Greška pri batch fact checking-u: {e}")
            return []
    
    def get_fact_check_statistics(self) -> Dict[str, Any]:
        """Vraća statistike o fact checking-u"""
        return {
            'model_loaded': self.model is not None,
            'model_name': self.model_name,
            'factual_indicators_count': len(self.factual_indicators['positive']) + len(self.factual_indicators['negative']),
            'claim_patterns_count': len(self.claim_patterns),
            'contradiction_indicators_count': len(self.contradiction_indicators),
            'max_workers': self.executor._max_workers
        } 