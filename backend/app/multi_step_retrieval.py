import re
import logging
from typing import List, Dict, Any, Tuple, Optional
from .reranker import Reranker
from .vector_store import VectorStore

class MultiStepRetrieval:
    """Klasa za multi-step retrieval funkcionalnost"""
    
    def __init__(self, vector_store: VectorStore, reranker: Reranker):
        self.vector_store = vector_store
        self.reranker = reranker
        self.logger = logging.getLogger(__name__)
        
        # Ključne reči za identifikaciju složenih upita
        self.complex_query_indicators = [
            "uporedi", "razlika", "sličnost", "različit", "sličan",
            "kako", "zašto", "kada", "gde", "ko", "šta",
            "i", "ili", "ali", "takođe", "pored", "uz",
            "prvo", "drugo", "treće", "nakon", "pre", "tokom",
            "korak", "proces", "metoda", "tehnika", "pristup"
        ]
    
    def is_complex_query(self, query: str) -> bool:
        """Proverava da li je upit složen i zahteva multi-step retrieval"""
        query_lower = query.lower()
        
        # Proveri dužinu upita
        if len(query.split()) > 8:
            return True
        
        # Proveri ključne reči
        for indicator in self.complex_query_indicators:
            if indicator in query_lower:
                return True
        
        # Proveri broj pitanja
        question_marks = query.count("?")
        if question_marks > 1:
            return True
        
        return False
    
    def decompose_query(self, query: str) -> List[str]:
        """Razbija složeni upit na jednostavnije delove"""
        sub_queries = []
        
        # Razbijanje po pitanjima
        if "?" in query:
            parts = re.split(r"\?+", query)
            for part in parts:
                part = part.strip()
                if part and len(part) > 3:
                    sub_queries.append(part + "?")
        else:
            # Razbijanje po konjunkcijama
            conjunctions = [" i ", " ili ", " ali ", " takođe ", " pored ", " uz "]
            current_query = query
            
            for conj in conjunctions:
                if conj in current_query:
                    parts = current_query.split(conj)
                    for part in parts:
                        part = part.strip()
                        if part and len(part) > 3:
                            sub_queries.append(part)
                    break
            
            # Ako nema konjunkcija, razbij po klauzulama
            if not sub_queries:
                clauses = re.split(r"[,;]", query)
                for clause in clauses:
                    clause = clause.strip()
                    if clause and len(clause) > 5:
                        sub_queries.append(clause)
        
        # Ako nismo dobili sub-queries, vrati originalni upit
        if not sub_queries:
            sub_queries = [query]
        
        return sub_queries
    
    def extract_key_concepts(self, query: str) -> List[str]:
        """Ekstraktuje ključne koncepte iz upita"""
        # Ukloni stop reči
        stop_words = {
            "je", "su", "i", "ili", "ali", "takođe", "pored", "uz",
            "koji", "koja", "koje", "šta", "kako", "zašto", "kada", "gde",
            "u", "na", "sa", "za", "od", "do", "pre", "nakon", "tokom"
        }
        
        words = query.lower().split()
        concepts = [word for word in words if word not in stop_words and len(word) > 2]
        
        return concepts[:5]  # Vrati top 5 koncepata
    
    def search_with_expansion(self, query: str, concepts: List[str], top_k: int = 5) -> List[Dict[str, Any]]:
        """Pretražuje sa proširenim upitom"""
        results = []
        
        # Prvo pretraži originalni upit
        original_results = self.vector_store.search(query, top_k)
        results.extend(original_results)
        
        # Zatim pretraži za svaki ključni koncept
        for concept in concepts:
            concept_results = self.vector_store.search(concept, top_k // 2)
            results.extend(concept_results)
        
        # Ukloni duplikate i sortiraj
        unique_results = self._remove_duplicates(results)
        return unique_results[:top_k]
    
    def _remove_duplicates(self, results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Uklanja duplikate iz rezultata"""
        seen = set()
        unique_results = []
        
        for result in results:
            # Koristi kombinaciju sadržaja i fajla kao ključ
            key = f"{result.get('filename', '')}_{result.get('content', '')[:50]}"
            if key not in seen:
                seen.add(key)
                unique_results.append(result)
        
        return unique_results
    
    def iterative_search(self, query: str, max_iterations: int = 3, top_k: int = 5) -> List[Dict[str, Any]]:
        """Iterativna pretraga sa proširenjem konteksta"""
        all_results = []
        current_query = query
        
        for iteration in range(max_iterations):
            self.logger.info(f"Iteracija {iteration + 1} za upit: {current_query}")
            
            # Pretraži sa trenutnim upitom
            results = self.vector_store.search(current_query, top_k * 2)
            
            if not results:
                break
            
            # Dodaj rezultate
            all_results.extend(results)
            
            # Ako imamo dovoljno rezultata, zaustavi
            if len(all_results) >= top_k * 3:
                break
            
            # Proširi upit na osnovu pronađenih rezultata
            if iteration < max_iterations - 1:
                current_query = self._expand_query(query, results)
        
        # Ukloni duplikate i vrati najbolje rezultate
        unique_results = self._remove_duplicates(all_results)
        return unique_results[:top_k]
    
    def _expand_query(self, original_query: str, results: List[Dict[str, Any]]) -> str:
        """Proširuje upit na osnovu pronađenih rezultata"""
        # Ekstraktuj ključne reči iz rezultata
        keywords = []
        for result in results[:3]:  # Koristi top 3 rezultata
            content = result.get("content", "")
            words = content.lower().split()
            # Dodaj reči koje nisu stop reči
            stop_words = {"je", "su", "i", "ili", "ali", "u", "na", "sa", "za", "od", "do"}
            keywords.extend([word for word in words if word not in stop_words and len(word) > 3])
        
        # Dodaj najčešće ključne reči u upit
        if keywords:
            # Uzmi top 2 ključne reči
            from collections import Counter
            keyword_counts = Counter(keywords)
            top_keywords = [word for word, count in keyword_counts.most_common(2)]
            
            expanded_query = f"{original_query} {' '.join(top_keywords)}"
            return expanded_query
        
        return original_query
    
    def multi_step_search(self, query: str, top_k: int = 5, use_rerank: bool = True) -> Dict[str, Any]:
        """Glavna metoda za multi-step retrieval"""
        try:
            # Proveri da li je upit složen
            if not self.is_complex_query(query):
                # Ako nije složen, koristi običnu pretragu
                results = self.vector_store.search(query, top_k)
                if use_rerank and self.reranker.model:
                    results = self.reranker.rerank(query, results, top_k)
                
                return {
                    "status": "success",
                    "results": results,
                    "steps_used": 1,
                    "query_type": "simple",
                    "sub_queries": [query]
                }
            
            # Multi-step retrieval za složene upite
            self.logger.info(f"Multi-step retrieval za složeni upit: {query}")
            
            # Korak 1: Razbijanje upita
            sub_queries = self.decompose_query(query)
            self.logger.info(f"Razbijeno na {len(sub_queries)} sub-queries: {sub_queries}")
            
            # Korak 2: Ekstrakcija ključnih koncepata
            concepts = self.extract_key_concepts(query)
            self.logger.info(f"Ključni koncepti: {concepts}")
            
            # Korak 3: Pretraga za svaki sub-query
            all_results = []
            for i, sub_query in enumerate(sub_queries):
                self.logger.info(f"Pretraga za sub-query {i+1}: {sub_query}")
                
                # Pretraži sa proširenim upitom
                results = self.search_with_expansion(sub_query, concepts, top_k)
                
                # Dodaj informacije o sub-query
                for result in results:
                    result["sub_query"] = sub_query
                    result["step"] = i + 1
                
                all_results.extend(results)
            
            # Korak 4: Iterativna pretraga za glavni upit
            iterative_results = self.iterative_search(query, max_iterations=2, top_k=top_k)
            for result in iterative_results:
                result["sub_query"] = query
                result["step"] = len(sub_queries) + 1
            
            all_results.extend(iterative_results)
            
            # Korak 5: Ukloni duplikate
            unique_results = self._remove_duplicates(all_results)
            
            # Korak 6: Re-ranking ako je omogućen
            if use_rerank and self.reranker.model:
                unique_results = self.reranker.rerank(query, unique_results, top_k)
            
            # Vrati najbolje rezultate
            final_results = unique_results[:top_k]
            
            # Konvertuj skorove u float
            for res in final_results:
                if 'score' in res:
                    res['score'] = float(res['score'])
                if 'combined_score' in res:
                    res['combined_score'] = float(res['combined_score'])
            
            return {
                "status": "success",
                "results": final_results,
                "steps_used": len(sub_queries) + 1,
                "query_type": "complex",
                "sub_queries": sub_queries,
                "concepts": concepts,
                "total_candidates": len(all_results),
                "unique_candidates": len(unique_results)
            }
            
        except Exception as e:
            self.logger.error(f"Greška pri multi-step retrieval: {e}")
            return {
                "status": "error",
                "message": str(e),
                "results": [],
                "steps_used": 0,
                "query_type": "error"
            }
    
    def get_search_analytics(self, query: str) -> Dict[str, Any]:
        """Vraća analitiku pretrage"""
        return {
            "is_complex": self.is_complex_query(query),
            "word_count": len(query.split()),
            "has_questions": "?" in query,
            "concepts": self.extract_key_concepts(query),
            "complexity_score": self._calculate_complexity_score(query)
        }
    
    def _calculate_complexity_score(self, query: str) -> float:
        """Računa skor složenosti upita"""
        score = 0.0
        
        # Dužina upita
        word_count = len(query.split())
        score += min(word_count / 10.0, 1.0) * 0.3
        
        # Broj pitanja
        question_count = query.count("?")
        score += min(question_count / 2.0, 1.0) * 0.2
        
        # Broj ključnih reči
        indicator_count = sum(1 for indicator in self.complex_query_indicators if indicator in query.lower())
        score += min(indicator_count / 5.0, 1.0) * 0.3
        
        # Broj konjunkcija
        conjunctions = [" i ", " ili ", " ali ", " takođe ", " pored ", " uz "]
        conj_count = sum(1 for conj in conjunctions if conj in query)
        score += min(conj_count / 3.0, 1.0) * 0.2
        
        return float(min(score, 1.0))
