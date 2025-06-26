import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from collections import Counter
import numpy as np
from .vector_store import VectorStore
from .reranker import Reranker

class ContextSelector:
    """Napredni sistem za izbor i rangiranje konteksta"""
    
    def __init__(self, vector_store: VectorStore, reranker: Reranker = None):
        self.vector_store = vector_store
        self.reranker = reranker
        self.logger = logging.getLogger(__name__)
        
        # Konfiguracija
        self.max_context_length = 4000  # Maksimalna dužina konteksta
        self.min_relevance_score = 0.3  # Minimalni skor relevantnosti
        self.context_overlap_threshold = 0.7  # Prag za preklapanje konteksta
        
        # Tipovi konteksta
        self.context_types = {
            'document': 1.0,      # Dokumenti - najviši prioritet
            'conversation': 0.8,  # Prethodni razgovor
            'user_profile': 0.6,  # Korisnički profil
            'general': 0.4        # Opšti kontekst
        }
    
    def select_context(self, query: str, available_contexts: Dict[str, Any], 
                      max_results: int = 5) -> Dict[str, Any]:
        """Glavna metoda za izbor konteksta"""
        try:
            self.logger.info(f"Izbor konteksta za upit: {query[:50]}...")
            
            # Korak 1: Analiza upita
            query_analysis = self._analyze_query(query)
            
            # Korak 2: Prikupljanje kandidata za kontekst
            context_candidates = self._gather_context_candidates(query, available_contexts)
            
            # Korak 3: Rangiranje konteksta
            ranked_contexts = self._rank_contexts(query, context_candidates, query_analysis)
            
            # Korak 4: Optimizacija i filtriranje
            optimized_contexts = self._optimize_context_selection(ranked_contexts, max_results)
            
            # Korak 5: Kreiranje finalnog konteksta
            final_context = self._create_final_context(optimized_contexts, query_analysis)
            
            return {
                'status': 'success',
                'selected_context': final_context,
                'context_analysis': {
                    'query_complexity': query_analysis['complexity'],
                    'context_types_used': list(optimized_contexts.keys()),
                    'total_context_length': len(final_context),
                    'relevance_score': self._calculate_overall_relevance(optimized_contexts)
                },
                'context_candidates': len(context_candidates),
                'selected_candidates': len(optimized_contexts)
            }
            
        except Exception as e:
            self.logger.error(f"Greška pri izboru konteksta: {e}")
            return {
                'status': 'error',
                'message': str(e),
                'selected_context': ""
            }
    
    def _analyze_query(self, query: str) -> Dict[str, Any]:
        """Analizira upit za bolje razumevanje potreba za kontekstom"""
        # Ekstraktuj ključne reči
        keywords = self._extract_keywords(query)
        
        # Detektuj tip upita
        query_type = self._detect_query_type(query)
        
        # Izračunaj složenost
        complexity = self._calculate_query_complexity(query)
        
        # Detektuj entitete
        entities = self._extract_entities(query)
        
        return {
            'keywords': keywords,
            'query_type': query_type,
            'complexity': complexity,
            'entities': entities,
            'word_count': len(query.split()),
            'has_questions': '?' in query,
            'has_comparison': any(word in query.lower() for word in ['uporedi', 'razlika', 'sličnost'])
        }
    
    def _extract_keywords(self, query: str) -> List[str]:
        """Ekstraktuje ključne reči iz upita"""
        # Ukloni stop reči
        stop_words = {
            'je', 'su', 'i', 'ili', 'ali', 'takođe', 'pored', 'uz',
            'koji', 'koja', 'koje', 'šta', 'kako', 'zašto', 'kada', 'gde',
            'u', 'na', 'sa', 'za', 'od', 'do', 'pre', 'nakon', 'tokom'
        }
        
        words = re.findall(r'\b\w+\b', query.lower())
        keywords = [word for word in words if word not in stop_words and len(word) > 2]
        
        return keywords[:10]  # Vrati top 10 ključnih reči
    
    def _detect_query_type(self, query: str) -> str:
        """Detektuje tip upita"""
        query_lower = query.lower()
        
        if any(word in query_lower for word in ['uporedi', 'razlika', 'sličnost']):
            return 'comparison'
        elif any(word in query_lower for word in ['kako', 'zašto', 'kada', 'gde']):
            return 'explanation'
        elif '?' in query:
            return 'question'
        elif any(word in query_lower for word in ['korak', 'proces', 'metoda']):
            return 'process'
        else:
            return 'general'
    
    def _calculate_query_complexity(self, query: str) -> float:
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
        """Ekstraktuje entitete iz upita (pojednostavljena verzija)"""
        # Detektuj imena, datume, brojeve
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
        
        return entities
    
    def _gather_context_candidates(self, query: str, available_contexts: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Prikuplja kandidate za kontekst iz različitih izvora"""
        candidates = []
        
        # Dokumenti iz vector store-a
        if 'documents' in available_contexts:
            doc_candidates = self._get_document_candidates(query, available_contexts['documents'])
            candidates.extend(doc_candidates)
        
        # Prethodni razgovor
        if 'conversation_history' in available_contexts:
            conv_candidates = self._get_conversation_candidates(query, available_contexts['conversation_history'])
            candidates.extend(conv_candidates)
        
        # Korisnički profil
        if 'user_profile' in available_contexts:
            profile_candidates = self._get_profile_candidates(query, available_contexts['user_profile'])
            candidates.extend(profile_candidates)
        
        # Opšti kontekst
        if 'general_context' in available_contexts:
            general_candidates = self._get_general_candidates(query, available_contexts['general_context'])
            candidates.extend(general_candidates)
        
        return candidates
    
    def _get_document_candidates(self, query: str, documents: List[Dict]) -> List[Dict[str, Any]]:
        """Dohvata kandidate iz dokumenata"""
        candidates = []
        
        # Pretraži vector store
        search_results = self.vector_store.search(query, top_k=10)
        
        for result in search_results:
            candidates.append({
                'type': 'document',
                'content': result.get('content', ''),
                'source': result.get('filename', 'Unknown'),
                'score': float(result.get('score', 0)),
                'page': result.get('page', 1),
                'metadata': result.get('metadata', {}),
                'priority': self.context_types['document']
            })
        
        return candidates
    
    def _get_conversation_candidates(self, query: str, history: List[Dict]) -> List[Dict[str, Any]]:
        """Dohvata kandidate iz prethodnog razgovora"""
        candidates = []
        
        # Analiziraj prethodne poruke za relevantnost
        for i, message in enumerate(history[-10:], 1):  # Poslednjih 10 poruka
            content = message.get('content', '')
            
            # Izračunaj relevantnost
            relevance = self._calculate_text_relevance(query, content)
            
            if relevance > self.min_relevance_score:
                candidates.append({
                    'type': 'conversation',
                    'content': content,
                    'source': f"Prethodna poruka {i}",
                    'score': relevance,
                    'timestamp': message.get('timestamp'),
                    'sender': message.get('sender'),
                    'priority': self.context_types['conversation']
                })
        
        return candidates
    
    def _get_profile_candidates(self, query: str, profile: Dict) -> List[Dict[str, Any]]:
        """Dohvata kandidate iz korisničkog profila"""
        candidates = []
        
        # Analiziraj profil za relevantnost
        profile_text = f"{profile.get('interests', '')} {profile.get('preferences', '')} {profile.get('history', '')}"
        
        relevance = self._calculate_text_relevance(query, profile_text)
        
        if relevance > self.min_relevance_score:
            candidates.append({
                'type': 'user_profile',
                'content': profile_text,
                'source': 'Korisnički profil',
                'score': relevance,
                'priority': self.context_types['user_profile']
            })
        
        return candidates
    
    def _get_general_candidates(self, query: str, general_context: Dict) -> List[Dict[str, Any]]:
        """Dohvata opšte kandidate za kontekst"""
        candidates = []
        
        # Dodaj opšte informacije ako su relevantne
        for key, value in general_context.items():
            if isinstance(value, str):
                relevance = self._calculate_text_relevance(query, value)
                
                if relevance > self.min_relevance_score:
                    candidates.append({
                        'type': 'general',
                        'content': value,
                        'source': f"Opšti kontekst: {key}",
                        'score': relevance,
                        'priority': self.context_types['general']
                    })
        
        return candidates
    
    def _calculate_text_relevance(self, query: str, text: str) -> float:
        """Računa relevantnost teksta u odnosu na upit"""
        if not text or not query:
            return 0.0
        
        # Ekstraktuj ključne reči iz upita
        query_keywords = set(self._extract_keywords(query))
        
        # Ekstraktuj ključne reči iz teksta
        text_keywords = set(self._extract_keywords(text))
        
        # Izračunaj preklapanje
        if not query_keywords:
            return 0.0
        
        overlap = len(query_keywords.intersection(text_keywords))
        relevance = overlap / len(query_keywords)
        
        return float(relevance)
    
    def _rank_contexts(self, query: str, candidates: List[Dict[str, Any]], 
                      query_analysis: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Rangira kandidate za kontekst"""
        ranked_candidates = []
        
        for candidate in candidates:
            # Osnovni skor
            base_score = candidate.get('score', 0)
            
            # Prilagodi skor na osnovu tipa upita
            type_adjustment = self._calculate_type_adjustment(candidate, query_analysis)
            
            # Prilagodi skor na osnovu prioriteta
            priority_adjustment = candidate.get('priority', 0.5)
            
            # Prilagodi skor na osnovu dužine
            length_adjustment = self._calculate_length_adjustment(candidate['content'])
            
            # Kombinovani skor
            final_score = base_score * type_adjustment * priority_adjustment * length_adjustment
            
            ranked_candidate = candidate.copy()
            ranked_candidate['final_score'] = final_score
            ranked_candidates.append(ranked_candidate)
        
        # Sortiraj po finalnom skoru
        ranked_candidates.sort(key=lambda x: x['final_score'], reverse=True)
        
        return ranked_candidates
    
    def _calculate_type_adjustment(self, candidate: Dict[str, Any], query_analysis: Dict[str, Any]) -> float:
        """Računa prilagodbu skora na osnovu tipa upita"""
        query_type = query_analysis.get('query_type', 'general')
        candidate_type = candidate.get('type', 'general')
        
        # Matrica prilagodbi
        adjustments = {
            'comparison': {
                'document': 1.2,
                'conversation': 1.0,
                'user_profile': 0.8,
                'general': 0.6
            },
            'explanation': {
                'document': 1.1,
                'conversation': 1.0,
                'user_profile': 0.9,
                'general': 0.7
            },
            'question': {
                'document': 1.0,
                'conversation': 1.1,
                'user_profile': 0.8,
                'general': 0.6
            },
            'process': {
                'document': 1.3,
                'conversation': 0.9,
                'user_profile': 0.7,
                'general': 0.5
            },
            'general': {
                'document': 1.0,
                'conversation': 1.0,
                'user_profile': 1.0,
                'general': 1.0
            }
        }
        
        return adjustments.get(query_type, {}).get(candidate_type, 1.0)
    
    def _calculate_length_adjustment(self, content: str) -> float:
        """Računa prilagodbu skora na osnovu dužine sadržaja"""
        length = len(content)
        
        # Preferiraj srednje duge sadržaje (100-500 karaktera)
        if 100 <= length <= 500:
            return 1.2
        elif 50 <= length <= 1000:
            return 1.0
        elif length < 50:
            return 0.7
        else:
            return 0.8
    
    def _optimize_context_selection(self, ranked_contexts: List[Dict[str, Any]], 
                                   max_results: int) -> Dict[str, Any]:
        """Optimizuje izbor konteksta"""
        selected_contexts = {}
        current_length = 0
        
        for candidate in ranked_contexts:
            if len(selected_contexts) >= max_results:
                break
            
            content_length = len(candidate['content'])
            
            # Proveri da li dodavanje ovog konteksta neće premašiti limit
            if current_length + content_length > self.max_context_length:
                continue
            
            # Proveri preklapanje sa već odabranim kontekstom
            if not self._has_significant_overlap(candidate, selected_contexts):
                context_type = candidate['type']
                selected_contexts[context_type] = candidate
                current_length += content_length
        
        return selected_contexts
    
    def _has_significant_overlap(self, candidate: Dict[str, Any], 
                                selected_contexts: Dict[str, Any]) -> bool:
        """Proverava da li kandidat ima značajno preklapanje sa već odabranim kontekstom"""
        candidate_content = candidate['content'].lower()
        
        for selected in selected_contexts.values():
            selected_content = selected['content'].lower()
            
            # Izračunaj preklapanje
            overlap_ratio = self._calculate_content_overlap(candidate_content, selected_content)
            
            if overlap_ratio > self.context_overlap_threshold:
                return True
        
        return False
    
    def _calculate_content_overlap(self, content1: str, content2: str) -> float:
        """Računa preklapanje između dva sadržaja"""
        words1 = set(content1.split())
        words2 = set(content2.split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union)
    
    def _create_final_context(self, selected_contexts: Dict[str, Any], 
                             query_analysis: Dict[str, Any]) -> str:
        """Kreira finalni kontekst od odabranih kandidata"""
        context_parts = []
        
        # Dodaj kontekst po prioritetu
        for context_type in ['document', 'conversation', 'user_profile', 'general']:
            if context_type in selected_contexts:
                candidate = selected_contexts[context_type]
                context_parts.append(f"[{candidate['source']}]\n{candidate['content']}")
        
        # Dodaj analizu upita ako je složen
        if query_analysis['complexity'] > 0.7:
            context_parts.append(f"[Analiza upita]\nSložen upit tipa: {query_analysis['query_type']}")
        
        return "\n\n".join(context_parts)
    
    def _calculate_overall_relevance(self, selected_contexts: Dict[str, Any]) -> float:
        """Računa ukupan skor relevantnosti odabranog konteksta"""
        if not selected_contexts:
            return 0.0
        
        scores = [context['final_score'] for context in selected_contexts.values()]
        return float(np.mean(scores))
    
    def get_context_analytics(self, query: str, selected_context: str) -> Dict[str, Any]:
        """Vraća analitiku odabranog konteksta"""
        return {
            'context_length': len(selected_context),
            'context_efficiency': len(selected_context) / self.max_context_length if self.max_context_length > 0 else 0,
            'query_context_ratio': len(query) / len(selected_context) if selected_context else 0,
            'context_diversity': len(set(selected_context.split())) if selected_context else 0
        } 