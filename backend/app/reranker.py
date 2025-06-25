import os
import numpy as np
from sentence_transformers import CrossEncoder
from typing import List, Dict, Any, Tuple
import logging

class Reranker:
    """Klasa za re-ranking rezultata pretrage koristeći cross-encoder model"""
    
    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        """
        Inicijalizuje re-ranker sa cross-encoder modelom
        
        Args:
            model_name: Naziv cross-encoder modela za re-ranking
        """
        self.model_name = model_name
        self.model = None
        self.logger = logging.getLogger(__name__)
        
        self._load_model()
    
    def _load_model(self):
        """Učitava cross-encoder model"""
        try:
            self.model = CrossEncoder(self.model_name)
            self.logger.info(f"Cross-encoder model {self.model_name} uspešno učitan")
        except Exception as e:
            self.logger.error(f"Greška pri učitavanju cross-encoder modela: {e}")
            # Fallback na jednostavniji model
            try:
                self.model = CrossEncoder("cross-encoder/ms-marco-MiniLM-L-12-v2")
                self.logger.info("Fallback na alternativni cross-encoder model")
            except Exception as e2:
                self.logger.error(f"Greška pri učitavanju fallback modela: {e2}")
                self.model = None
    
    def rerank(self, query: str, documents: List[Dict[str, Any]], top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Re-rangira dokumente na osnovu upita
        
        Args:
            query: Korisnički upit
            documents: Lista dokumenata za re-ranking
            top_k: Broj najboljih rezultata za vraćanje
            
        Returns:
            Lista re-rangiranih dokumenata
        """
        if not self.model or not documents:
            return documents[:top_k]
        
        try:
            # Pripremi parove (query, document) za cross-encoder
            pairs = [(query, doc['content']) for doc in documents]
            
            # Generiši scores koristeći cross-encoder
            scores = self.model.predict(pairs)
            
            # Dodaj scores dokumentima
            for doc, score in zip(documents, scores):
                doc['rerank_score'] = float(score)
                # Kombinuj originalni score sa re-rank score-om
                doc['combined_score'] = (doc.get('score', 0) * 0.3) + (score * 0.7)
            
            # Sortiraj po kombinovanom score-u
            reranked_docs = sorted(documents, key=lambda x: x['combined_score'], reverse=True)
            
            # Vrati top_k rezultata
            return reranked_docs[:top_k]
            
        except Exception as e:
            self.logger.error(f"Greška pri re-ranking-u: {e}")
            return documents[:top_k]
    
    def rerank_with_metadata(self, query: str, documents: List[Dict[str, Any]], 
                           top_k: int = 5, use_metadata: bool = True) -> List[Dict[str, Any]]:
        """
        Re-rangira dokumente sa dodatnim metapodacima
        
        Args:
            query: Korisnički upit
            documents: Lista dokumenata za re-ranking
            top_k: Broj najboljih rezultata za vraćanje
            use_metadata: Da li koristiti metapodatke za poboljšanje re-ranking-a
            
        Returns:
            Lista re-rangiranih dokumenata
        """
        if not self.model or not documents:
            return documents[:top_k]
        
        try:
            # Pripremi parove za cross-encoder
            pairs = []
            for doc in documents:
                if use_metadata:
                    # Dodaj metapodatke u kontekst
                    context = f"Fajl: {doc.get('filename', 'Nepoznat')}, Stranica: {doc.get('page', 'N/A')}\n{doc['content']}"
                    pairs.append((query, context))
                else:
                    pairs.append((query, doc['content']))
            
            # Generiši scores
            scores = self.model.predict(pairs)
            
            # Dodaj scores i sortiraj
            for doc, score in zip(documents, scores):
                doc['rerank_score'] = float(score)
                doc['combined_score'] = (doc.get('score', 0) * 0.3) + (score * 0.7)
            
            reranked_docs = sorted(documents, key=lambda x: x['combined_score'], reverse=True)
            return reranked_docs[:top_k]
            
        except Exception as e:
            self.logger.error(f"Greška pri re-ranking-u sa metapodacima: {e}")
            return documents[:top_k]
    
    def batch_rerank(self, queries: List[str], documents_list: List[List[Dict[str, Any]]], 
                    top_k: int = 5) -> List[List[Dict[str, Any]]]:
        """
        Batch re-ranking za više upita
        
        Args:
            queries: Lista upita
            documents_list: Lista lista dokumenata za svaki upit
            top_k: Broj najboljih rezultata za vraćanje
            
        Returns:
            Lista re-rangiranih lista dokumenata
        """
        if not self.model:
            return [docs[:top_k] for docs in documents_list]
        
        try:
            results = []
            for query, documents in zip(queries, documents_list):
                reranked = self.rerank(query, documents, top_k)
                results.append(reranked)
            
            return results
            
        except Exception as e:
            self.logger.error(f"Greška pri batch re-ranking-u: {e}")
            return [docs[:top_k] for docs in documents_list]
    
    def get_model_info(self) -> Dict[str, Any]:
        """Vraća informacije o modelu"""
        return {
            'model_name': self.model_name,
            'model_loaded': self.model is not None,
            'model_type': 'cross-encoder'
        } 