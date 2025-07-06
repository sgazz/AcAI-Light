"""
Query Rewriter Service

Ovaj servis poboljšava korisničke upite za pretragu koristeći LLM integraciju.
Pomaže u generisanju boljih upita za RAG sistem.
"""

import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from collections import Counter
import numpy as np
from sentence_transformers import SentenceTransformer
import asyncio
from concurrent.futures import ThreadPoolExecutor

class QueryRewriter:
    """Napredni sistem za query rewriting i optimization"""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model_name = model_name
        self.model = None
        self.logger = logging.getLogger(__name__)
        self.executor = ThreadPoolExecutor(max_workers=2)
        
        # Query patterns
        self.query_patterns = {
            'definition': r'\b(šta je|šta znači|definiši|objasni)\b',
            'comparison': r'\b(uporedi|razlika|sličnost|različit|sličan)\b',
            'process': r'\b(kako|korak|proces|metoda|tehnika)\b',
            'example': r'\b(primer|primeri|instanca|slučaj)\b',
            'application': r'\b(gde se koristi|aplikacija|primenjuje)\b'
        }
        
        # Stop words za srpski jezik
        self.stop_words = {
            'je', 'su', 'i', 'ili', 'ali', 'takođe', 'pored', 'uz',
            'koji', 'koja', 'koje', 'šta', 'kako', 'zašto', 'kada', 'gde',
            'u', 'na', 'sa', 'za', 'od', 'do', 'pre', 'nakon', 'tokom',
            'ovo', 'to', 'ono', 'moj', 'moja', 'moje', 'tvoj', 'tvoja', 'tvoje'
        }
        
        self._load_model()
    
    def _load_model(self):
        """Učitava sentence transformer model"""
        try:
            self.model = SentenceTransformer(self.model_name)
            self.logger.info(f"Query rewriter model {self.model_name} uspešno učitan")
        except Exception as e:
            self.logger.error(f"Greška pri učitavanju modela: {e}")
            self.model = None
    
    def analyze_query(self, query: str) -> Dict[str, Any]:
        """Analizira upit i vraća detaljne informacije"""
        try:
            query_lower = query.lower()
            
            # Detektuj tip upita
            query_type = self._detect_query_type(query_lower)
            
            # Ekstraktuj ključne reči
            keywords = self._extract_keywords(query)
            
            # Izračunaj složenost
            complexity = self._calculate_complexity(query)
            
            # Detektuj entitete
            entities = self._extract_entities(query)
            
            # Analiziraj sentiment
            sentiment = self._analyze_sentiment(query)
            
            return {
                'original_query': query,
                'query_type': query_type,
                'keywords': keywords,
                'complexity_score': complexity,
                'entities': entities,
                'sentiment': sentiment,
                'word_count': len(query.split()),
                'has_questions': '?' in query,
                'has_comparison': bool(re.search(self.query_patterns['comparison'], query_lower)),
                'has_definition': bool(re.search(self.query_patterns['definition'], query_lower))
            }
            
        except Exception as e:
            self.logger.error(f"Greška pri analizi upita: {e}")
            return {'error': str(e)}
    
    def _detect_query_type(self, query: str) -> str:
        """Detektuje tip upita na osnovu patterns"""
        for pattern_name, pattern in self.query_patterns.items():
            if re.search(pattern, query):
                return pattern_name
        
        # Dodatna logika za detekciju
        if '?' in query:
            return 'question'
        elif any(word in query for word in ['primer', 'primeri', 'instanca']):
            return 'example'
        else:
            return 'general'
    
    def _extract_keywords(self, query: str) -> List[str]:
        """Ekstraktuje ključne reči iz upita"""
        # Ukloni interpunkciju i konvertuj u mala slova
        clean_query = re.sub(r'[^\w\s]', ' ', query.lower())
        words = clean_query.split()
        
        # Filtriraj stop reči i kratke reči
        keywords = [word for word in words if word not in self.stop_words and len(word) > 2]
        
        # Vrati top 10 ključnih reči
        return keywords[:10]
    
    def _calculate_complexity(self, query: str) -> float:
        """Računa složenost upita"""
        score = 0.0
        
        # Dužina upita
        word_count = len(query.split())
        score += min(word_count / 15.0, 1.0) * 0.3
        
        # Broj pitanja
        question_count = query.count('?')
        score += min(question_count / 2.0, 1.0) * 0.2
        
        # Broj ključnih reči
        keywords = self._extract_keywords(query)
        score += min(len(keywords) / 8.0, 1.0) * 0.3
        
        # Broj konjunkcija
        conjunctions = [' i ', ' ili ', ' ali ', ' takođe ', ' pored ', ' uz ']
        conj_count = sum(1 for conj in conjunctions if conj in query)
        score += min(conj_count / 3.0, 1.0) * 0.2
        
        return float(min(score, 1.0))
    
    def _extract_entities(self, query: str) -> List[str]:
        """Ekstraktuje entitete iz upita"""
        entities = []
        
        # Imena (velika slova)
        names = re.findall(r'\b[A-Z][a-z]+\b', query)
        entities.extend(names)
        
        # Datumi
        dates = re.findall(r'\b\d{1,2}[./]\d{1,2}[./]\d{2,4}\b', query)
        entities.extend(dates)
        
        # Brojevi
        numbers = re.findall(r'\b\d+\b', query)
        entities.extend(numbers)
        
        # Tehnički termini (camelCase ili snake_case)
        tech_terms = re.findall(r'\b[a-z]+[A-Z][a-z]*\b|\b[a-z]+_[a-z]+\b', query)
        entities.extend(tech_terms)
        
        return list(set(entities))
    
    def _analyze_sentiment(self, query: str) -> str:
        """Analizira sentiment upita (pojednostavljena verzija)"""
        positive_words = {'dobro', 'odlično', 'korisno', 'pomoći', 'hvala', 'super'}
        negative_words = {'loše', 'problem', 'greška', 'ne radi', 'ne radi', 'teško'}
        
        query_lower = query.lower()
        
        positive_count = sum(1 for word in positive_words if word in query_lower)
        negative_count = sum(1 for word in negative_words if word in query_lower)
        
        if positive_count > negative_count:
            return 'positive'
        elif negative_count > positive_count:
            return 'negative'
        else:
            return 'neutral'
    
    def rewrite_query(self, query: str, strategy: str = 'auto') -> Dict[str, Any]:
        """Glavna metoda za query rewriting"""
        try:
            analysis = self.analyze_query(query)
            
            if strategy == 'auto':
                strategy = self._determine_rewrite_strategy(analysis)
            
            rewritten_queries = []
            
            if strategy == 'expansion':
                rewritten_queries = self._expand_query(query, analysis)
            elif strategy == 'reformulation':
                rewritten_queries = self._reformulate_query(query, analysis)
            elif strategy == 'simplification':
                rewritten_queries = self._simplify_query(query, analysis)
            elif strategy == 'specialization':
                rewritten_queries = self._specialize_query(query, analysis)
            else:
                rewritten_queries = [query]  # Fallback
            
            return {
                'original_query': query,
                'rewritten_queries': rewritten_queries,
                'strategy_used': strategy,
                'analysis': analysis,
                'confidence': self._calculate_rewrite_confidence(analysis, strategy)
            }
            
        except Exception as e:
            self.logger.error(f"Greška pri query rewriting-u: {e}")
            return {
                'original_query': query,
                'rewritten_queries': [query],
                'strategy_used': 'fallback',
                'error': str(e)
            }
    
    def _determine_rewrite_strategy(self, analysis: Dict[str, Any]) -> str:
        """Određuje najbolju strategiju za rewriting"""
        complexity = analysis.get('complexity_score', 0)
        query_type = analysis.get('query_type', 'general')
        word_count = analysis.get('word_count', 0)
        
        if complexity > 0.7:
            return 'simplification'
        elif word_count < 3:
            return 'expansion'
        elif query_type in ['comparison', 'process']:
            return 'specialization'
        elif query_type == 'definition':
            return 'reformulation'
        else:
            return 'expansion'
    
    def _expand_query(self, query: str, analysis: Dict[str, Any]) -> List[str]:
        """Proširuje upit sa sinonimima i povezanim terminima"""
        expanded_queries = [query]
        keywords = analysis.get('keywords', [])
        
        # Sinonimi za česte termine
        synonyms = {
            'mašinsko učenje': ['ML', 'machine learning', 'AI', 'artificial intelligence'],
            'veštačka inteligencija': ['AI', 'artificial intelligence', 'mašinska inteligencija'],
            'algoritam': ['algoritmi', 'metoda', 'tehnika', 'pristup'],
            'model': ['modeli', 'sistem', 'rešenje'],
            'podaci': ['data', 'informacije', 'dataset', 'skup podataka'],
            'obuka': ['training', 'treniranje', 'učenje', 'obrazovanje'],
            'testiranje': ['testing', 'evaluacija', 'provera', 'validacija']
        }
        
        # Dodaj sinonime za ključne reči
        for keyword in keywords[:3]:  # Koristi top 3 ključne reči
            for term, syns in synonyms.items():
                if keyword in term or term in keyword:
                    for syn in syns:
                        expanded_query = query.replace(keyword, syn)
                        if expanded_query != query:
                            expanded_queries.append(expanded_query)
        
        # Dodaj varijante sa različitim formulacijama
        if analysis.get('has_definition'):
            expanded_queries.extend([
                f"definicija {query}",
                f"šta znači {query}",
                f"objasni {query}"
            ])
        
        if analysis.get('has_comparison'):
            expanded_queries.extend([
                f"uporedi {query}",
                f"razlika {query}",
                f"sličnost {query}"
            ])
        
        return list(set(expanded_queries))[:5]  # Vrati max 5 varijanti
    
    def _reformulate_query(self, query: str, analysis: Dict[str, Any]) -> List[str]:
        """Reformuliše upit sa različitim strukturama"""
        reformulated = [query]
        
        # Različite formulacije za pitanja
        if '?' in query:
            question_variants = [
                query.replace('?', ''),
                query.replace('šta je', 'definicija'),
                query.replace('kako', 'metoda za'),
                query.replace('zašto', 'razlog za')
            ]
            reformulated.extend(question_variants)
        
        # Različite formulacije za definicije
        if analysis.get('query_type') == 'definition':
            definition_variants = [
                f"definicija {query}",
                f"šta znači {query}",
                f"objasni {query}",
                f"opis {query}"
            ]
            reformulated.extend(definition_variants)
        
        return list(set(reformulated))[:5]
    
    def _simplify_query(self, query: str, analysis: Dict[str, Any]) -> List[str]:
        """Pojednostavljuje složene upite"""
        simplified = [query]
        
        # Ukloni nepotrebne reči
        words = query.split()
        if len(words) > 5:
            # Zadrži samo ključne reči
            keywords = analysis.get('keywords', [])
            simplified_query = ' '.join([word for word in words if word.lower() in keywords])
            if simplified_query and simplified_query != query:
                simplified.append(simplified_query)
        
        # Razbiji složene upite
        if analysis.get('complexity_score', 0) > 0.7:
            # Razbiji po konjunkcijama
            conjunctions = [' i ', ' ili ', ' ali ']
            for conj in conjunctions:
                if conj in query:
                    parts = query.split(conj)
                    simplified.extend([part.strip() for part in parts if len(part.strip()) > 3])
        
        return list(set(simplified))[:5]
    
    def _specialize_query(self, query: str, analysis: Dict[str, Any]) -> List[str]:
        """Specializuje upit za specifične tipove"""
        specialized = [query]
        
        query_type = analysis.get('query_type', 'general')
        
        if query_type == 'comparison':
            specialized.extend([
                f"uporedi {query}",
                f"razlika između {query}",
                f"sličnost {query}"
            ])
        elif query_type == 'process':
            specialized.extend([
                f"koraci za {query}",
                f"proces {query}",
                f"metoda {query}"
            ])
        elif query_type == 'example':
            specialized.extend([
                f"primer {query}",
                f"instanca {query}",
                f"slučaj {query}"
            ])
        
        return list(set(specialized))[:5]
    
    def _calculate_rewrite_confidence(self, analysis: Dict[str, Any], strategy: str) -> float:
        """Računa confidence score za rewriting"""
        confidence = 0.5  # Base confidence
        
        # Povećaj na osnovu analize
        if analysis.get('complexity_score', 0) > 0.5:
            confidence += 0.2
        
        if analysis.get('keywords'):
            confidence += 0.1
        
        if strategy in ['expansion', 'reformulation']:
            confidence += 0.1
        
        return min(confidence, 1.0)
    
    async def batch_rewrite_queries(self, queries: List[str]) -> List[Dict[str, Any]]:
        """Batch rewriting za više upita"""
        try:
            loop = asyncio.get_event_loop()
            tasks = [
                loop.run_in_executor(self.executor, self.rewrite_query, query)
                for query in queries
            ]
            results = await asyncio.gather(*tasks)
            return results
        except Exception as e:
            self.logger.error(f"Greška pri batch rewriting-u: {e}")
            return [{'original_query': q, 'rewritten_queries': [q], 'error': str(e)} for q in queries]
    
    def get_rewrite_statistics(self) -> Dict[str, Any]:
        """Vraća statistike o query rewriting-u"""
        return {
            'model_loaded': self.model is not None,
            'model_name': self.model_name,
            'patterns_count': len(self.query_patterns),
            'stop_words_count': len(self.stop_words),
            'max_workers': self.executor._max_workers
        } 