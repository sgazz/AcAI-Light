"""
Query Rewriter Service

Ovaj servis poboljšava korisničke upite za pretragu koristeći LLM integraciju.
Pomaže u generisanju boljih upita za RAG sistem.
"""

import asyncio
import json
import logging
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime

from .config import Config
from ollama import Client

logger = logging.getLogger(__name__)

@dataclass
class QueryEnhancement:
    """Struktura za poboljšani upit"""
    original_query: str
    enhanced_query: str
    confidence: float
    reasoning: str
    synonyms: List[str]
    context_hints: List[str]
    timestamp: datetime

@dataclass
class QueryAnalysis:
    """Analiza upita"""
    intent: str
    entities: List[str]
    complexity: str  # 'simple', 'moderate', 'complex'
    domain: str
    language: str

class QueryRewriter:
    """
    Query Rewriter servis za poboljšavanje upita
    """
    
    def __init__(self):
        self.ollama_client = Client()
        self.cache = {}  # Simple in-memory cache
        self.max_cache_size = 1000
        
    async def enhance_query(
        self, 
        query: str, 
        context: str = "", 
        domain: str = "general",
        max_enhancements: int = 3
    ) -> QueryEnhancement:
        """
        Poboljšaj upit za pretragu
        
        Args:
            query: Originalni upit
            context: Dodatni kontekst
            domain: Domena (general, technical, academic, etc.)
            max_enhancements: Maksimalan broj poboljšanja
            
        Returns:
            QueryEnhancement objekat
        """
        try:
            # Proveri cache
            cache_key = f"{query}:{context}:{domain}"
            if cache_key in self.cache:
                logger.info(f"Query enhancement found in cache: {query}")
                return self.cache[cache_key]
            
            # Analiziraj upit
            analysis = await self._analyze_query(query, domain)
            
            # Generiši poboljšani upit
            enhanced_query = await self._generate_enhanced_query(
                query, context, analysis, domain
            )
            
            # Generiši sinonime
            synonyms = await self._generate_synonyms(query, domain)
            
            # Generiši context hints
            context_hints = await self._generate_context_hints(
                query, analysis, domain
            )
            
            # Izračunaj confidence
            confidence = self._calculate_confidence(analysis, enhanced_query)
            
            # Kreiraj reasoning
            reasoning = self._generate_reasoning(analysis, enhanced_query)
            
            # Kreiraj enhancement objekat
            enhancement = QueryEnhancement(
                original_query=query,
                enhanced_query=enhanced_query,
                confidence=confidence,
                reasoning=reasoning,
                synonyms=synonyms,
                context_hints=context_hints,
                timestamp=datetime.now()
            )
            
            # Sačuvaj u cache
            self._add_to_cache(cache_key, enhancement)
            
            logger.info(f"Query enhanced successfully: {query} -> {enhanced_query}")
            return enhancement
            
        except Exception as e:
            logger.error(f"Error enhancing query '{query}': {str(e)}")
            # Vrati fallback enhancement
            return QueryEnhancement(
                original_query=query,
                enhanced_query=query,  # Koristi originalni upit
                confidence=0.5,
                reasoning="Fallback: using original query due to enhancement error",
                synonyms=[],
                context_hints=[],
                timestamp=datetime.now()
            )
    
    async def expand_query(self, query: str, domain: str = "general") -> List[str]:
        """
        Proširi upit sa različitim varijantama
        
        Args:
            query: Originalni upit
            domain: Domena
            
        Returns:
            Lista proširenih upita
        """
        try:
            prompt = f"""
            Proširi sledeći upit sa različitim varijantama i sinonimima:
            
            Upit: {query}
            Domena: {domain}
            
            Generiši 5 različitih varijanti upita koji imaju isti smisao:
            1. Direktna varijanta
            2. Sinonimna varijanta
            3. Detaljnija varijanta
            4. Opštija varijanta
            5. Tehnička varijanta
            
            Vrati samo listu upita, jedan po liniji, bez numeracije.
            """
            
            response = await self.ollama_client.generate(prompt)
            expanded_queries = [
                line.strip() for line in response.strip().split('\n') 
                if line.strip() and not line.strip().startswith(('1.', '2.', '3.', '4.', '5.'))
            ]
            
            # Dodaj originalni upit ako nije u listi
            if query not in expanded_queries:
                expanded_queries.insert(0, query)
            
            logger.info(f"Query expanded: {query} -> {len(expanded_queries)} variants")
            return expanded_queries[:5]  # Maksimalno 5 varijanti
            
        except Exception as e:
            logger.error(f"Error expanding query '{query}': {str(e)}")
            return [query]  # Vrati originalni upit
    
    async def _analyze_query(self, query: str, domain: str) -> QueryAnalysis:
        """Analiziraj upit za intent, entitete i kompleksnost"""
        try:
            prompt = f"""
            Analiziraj sledeći upit i vrati JSON sa analizom:
            
            Upit: {query}
            Domena: {domain}
            
            Analiziraj:
            1. Intent (šta korisnik traži)
            2. Entiteti (ključne reči, imena, koncepti)
            3. Kompleksnost (simple/moderate/complex)
            4. Domena (tehnička, akademska, opšta, itd.)
            5. Jezik (srpski, engleski, itd.)
            
            Vrati JSON format:
            {{
                "intent": "string",
                "entities": ["string"],
                "complexity": "simple|moderate|complex",
                "domain": "string",
                "language": "string"
            }}
            """
            
            response = await self.ollama_client.generate(prompt)
            
            # Pokušaj parsirati JSON
            try:
                analysis_data = json.loads(response.strip())
                return QueryAnalysis(
                    intent=analysis_data.get('intent', 'unknown'),
                    entities=analysis_data.get('entities', []),
                    complexity=analysis_data.get('complexity', 'simple'),
                    domain=analysis_data.get('domain', domain),
                    language=analysis_data.get('language', 'srpski')
                )
            except json.JSONDecodeError:
                # Fallback analiza
                return QueryAnalysis(
                    intent='search',
                    entities=query.split(),
                    complexity='simple',
                    domain=domain,
                    language='srpski'
                )
                
        except Exception as e:
            logger.error(f"Error analyzing query: {str(e)}")
            return QueryAnalysis(
                intent='search',
                entities=query.split(),
                complexity='simple',
                domain=domain,
                language='srpski'
            )
    
    async def _generate_enhanced_query(
        self, 
        query: str, 
        context: str, 
        analysis: QueryAnalysis,
        domain: str
    ) -> str:
        """Generiši poboljšani upit"""
        try:
            prompt = f"""
            Poboljšaj sledeći upit za pretragu u dokumentima:
            
            Original upit: {query}
            Kontekst: {context}
            Intent: {analysis.intent}
            Entiteti: {', '.join(analysis.entities)}
            Kompleksnost: {analysis.complexity}
            Domena: {analysis.domain}
            
            Poboljšani upit treba da:
            1. Bude jasniji i precizniji
            2. Uključi ključne entitete
            3. Bude optimizovan za pretragu
            4. Zadrži originalni smisao
            
            Vrati samo poboljšani upit, bez objašnjenja.
            """
            
            response = await self.ollama_client.generate(prompt)
            enhanced_query = response.strip().strip('"').strip("'")
            
            # Ako je response prazan ili previše dugačak, koristi original
            if not enhanced_query or len(enhanced_query) > 500:
                return query
                
            return enhanced_query
            
        except Exception as e:
            logger.error(f"Error generating enhanced query: {str(e)}")
            return query
    
    async def _generate_synonyms(self, query: str, domain: str) -> List[str]:
        """Generiši sinonime za upit"""
        try:
            prompt = f"""
            Generiši sinonime za sledeći upit:
            
            Upit: {query}
            Domena: {domain}
            
            Vrati samo listu sinonima, jedan po liniji.
            """
            
            response = await self.ollama_client.generate(prompt)
            synonyms = [
                line.strip() for line in response.strip().split('\n') 
                if line.strip()
            ]
            
            return synonyms[:5]  # Maksimalno 5 sinonima
            
        except Exception as e:
            logger.error(f"Error generating synonyms: {str(e)}")
            return []
    
    async def _generate_context_hints(
        self, 
        query: str, 
        analysis: QueryAnalysis,
        domain: str
    ) -> List[str]:
        """Generiši context hints za upit"""
        try:
            prompt = f"""
            Generiši context hints za sledeći upit:
            
            Upit: {query}
            Intent: {analysis.intent}
            Domena: {domain}
            
            Context hints su ključne reči ili koncepti koji mogu pomoći u pretrazi.
            
            Vrati samo listu hints, jedan po liniji.
            """
            
            response = await self.ollama_client.generate(prompt)
            hints = [
                line.strip() for line in response.strip().split('\n') 
                if line.strip()
            ]
            
            return hints[:3]  # Maksimalno 3 hints
            
        except Exception as e:
            logger.error(f"Error generating context hints: {str(e)}")
            return []
    
    def _calculate_confidence(self, analysis: QueryAnalysis, enhanced_query: str) -> float:
        """Izračunaj confidence score za enhancement"""
        try:
            confidence = 0.7  # Base confidence
            
            # Povećaj confidence na osnovu kompleksnosti
            if analysis.complexity == 'simple':
                confidence += 0.1
            elif analysis.complexity == 'moderate':
                confidence += 0.05
            
            # Povećaj confidence ako ima entiteta
            if len(analysis.entities) > 0:
                confidence += min(0.1, len(analysis.entities) * 0.02)
            
            # Smanji confidence ako je enhancement previše dugačak
            if len(enhanced_query) > len(analysis.entities) * 50:
                confidence -= 0.1
            
            return max(0.1, min(1.0, confidence))
            
        except Exception as e:
            logger.error(f"Error calculating confidence: {str(e)}")
            return 0.5
    
    def _generate_reasoning(self, analysis: QueryAnalysis, enhanced_query: str) -> str:
        """Generiši reasoning za enhancement"""
        try:
            reasoning_parts = []
            
            if analysis.intent != 'unknown':
                reasoning_parts.append(f"Intent: {analysis.intent}")
            
            if analysis.entities:
                reasoning_parts.append(f"Entiteti: {', '.join(analysis.entities[:3])}")
            
            if analysis.complexity != 'simple':
                reasoning_parts.append(f"Kompleksnost: {analysis.complexity}")
            
            if analysis.domain != 'general':
                reasoning_parts.append(f"Domena: {analysis.domain}")
            
            if reasoning_parts:
                return "; ".join(reasoning_parts)
            else:
                return "Standardno poboljšanje upita"
                
        except Exception as e:
            logger.error(f"Error generating reasoning: {str(e)}")
            return "Poboljšanje upita"
    
    def _add_to_cache(self, key: str, enhancement: QueryEnhancement):
        """Dodaj enhancement u cache"""
        try:
            # Ako je cache pun, obriši najstariji entry
            if len(self.cache) >= self.max_cache_size:
                oldest_key = min(self.cache.keys(), key=lambda k: self.cache[k].timestamp)
                del self.cache[oldest_key]
            
            self.cache[key] = enhancement
            
        except Exception as e:
            logger.error(f"Error adding to cache: {str(e)}")
    
    async def get_enhancement_stats(self) -> Dict:
        """Vrati statistike enhancement-a"""
        try:
            total_enhancements = len(self.cache)
            avg_confidence = sum(e.confidence for e in self.cache.values()) / total_enhancements if total_enhancements > 0 else 0
            
            return {
                'total_enhancements': total_enhancements,
                'cache_size': len(self.cache),
                'avg_confidence': round(avg_confidence, 3),
                'cache_hit_rate': 0.8,  # Placeholder
                'last_enhancement': max(e.timestamp for e in self.cache.values()).isoformat() if self.cache else None
            }
            
        except Exception as e:
            logger.error(f"Error getting enhancement stats: {str(e)}")
            return {
                'total_enhancements': 0,
                'cache_size': 0,
                'avg_confidence': 0,
                'cache_hit_rate': 0,
                'last_enhancement': None
            }
    
    def clear_cache(self):
        """Očisti cache"""
        try:
            self.cache.clear()
            logger.info("Query rewriter cache cleared")
        except Exception as e:
            logger.error(f"Error clearing cache: {str(e)}")

# Global instance
query_rewriter = QueryRewriter() 