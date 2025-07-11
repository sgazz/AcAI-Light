"""
RAG (Retrieval-Augmented Generation) servis
Lokalna verzija bez Supabase integracije
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
import numpy as np
from sentence_transformers import SentenceTransformer
import faiss
from .config import Config

logger = logging.getLogger(__name__)

class RAGService:
    """RAG servis za lokalni storage"""
    
    def __init__(self, use_supabase: bool = False):
        """Inicijalizuj RAG servis"""
        self.use_supabase = use_supabase
        self.embedding_model = None
        self.vector_index = None
        self.documents = []
        self.document_embeddings = []
        
        # Lokalni storage putanje
        self.data_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'data', 'vector_index')
        self.documents_file = os.path.join(self.data_dir, 'documents.json')
        self.metadata_file = os.path.join(self.data_dir, 'metadata.json')
        
        # Kreiraj direktorijum ako ne postoji
        os.makedirs(self.data_dir, exist_ok=True)
        
        # Učitaj postojeće dokumente
        self._load_documents()
        
        # Inicijalizuj embedding model
        self._init_embedding_model()
        
        # Kreiraj ili učitaj vector index
        self._init_vector_index()
    
    def _load_documents(self):
        """Učitaj dokumente iz lokalnog storage-a"""
        try:
            if os.path.exists(self.documents_file):
                with open(self.documents_file, 'r', encoding='utf-8') as f:
                    self.documents = json.load(f)
                logger.info(f"Učitano {len(self.documents)} dokumenata iz lokalnog storage-a")
            else:
                self.documents = []
                logger.info("Nema postojećih dokumenata, počinjem sa praznom listom")
        except Exception as e:
            logger.error(f"Greška pri učitavanju dokumenata: {e}")
            self.documents = []
    
    def _save_documents(self):
        """Sačuvaj dokumente u lokalni storage"""
        try:
            with open(self.documents_file, 'w', encoding='utf-8') as f:
                json.dump(self.documents, f, ensure_ascii=False, indent=2)
            logger.info(f"Sačuvano {len(self.documents)} dokumenata u lokalni storage")
        except Exception as e:
            logger.error(f"Greška pri čuvanju dokumenata: {e}")
    
    def _init_embedding_model(self):
        """Inicijalizuj embedding model"""
        try:
            self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Embedding model uspešno inicijalizovan")
        except Exception as e:
            logger.error(f"Greška pri inicijalizaciji embedding modela: {e}")
            self.embedding_model = None
    
    def _init_vector_index(self):
        """Inicijalizuj vector index"""
        try:
            if not self.embedding_model:
                logger.error("Embedding model nije inicijalizovan")
                return
            
            # Kreiraj FAISS index
            embedding_dim = self.embedding_model.get_sentence_embedding_dimension()
            self.vector_index = faiss.IndexFlatIP(embedding_dim)
            
            # Dodaj postojeće dokumente u index
            if self.documents:
                embeddings = []
                for doc in self.documents:
                    if 'embedding' in doc:
                        embeddings.append(doc['embedding'])
                
                if embeddings:
                    embeddings_array = np.array(embeddings, dtype=np.float32)
                    self.vector_index.add(embeddings_array)
                    logger.info(f"Dodato {len(embeddings)} embedding-a u vector index")
            
            logger.info("Vector index uspešno inicijalizovan")
        except Exception as e:
            logger.error(f"Greška pri inicijalizaciji vector index-a: {e}")
            self.vector_index = None
    
    def add_document(self, content: str, metadata: Dict[str, Any] = None) -> str:
        """Dodaj dokument u RAG sistem"""
        try:
            if not self.embedding_model:
                raise Exception("Embedding model nije inicijalizovan")
            
            # Kreiraj embedding
            embedding = self.embedding_model.encode(content).tolist()
            
            # Kreiraj dokument
            doc_id = f"doc_{len(self.documents)}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            document = {
                'id': doc_id,
                'content': content,
                'embedding': embedding,
                'metadata': metadata or {},
                'created_at': datetime.now().isoformat()
            }
            
            # Dodaj u listu dokumenata
            self.documents.append(document)
            
            # Dodaj u vector index
            if self.vector_index:
                embedding_array = np.array([embedding], dtype=np.float32)
                self.vector_index.add(embedding_array)
            
            # Sačuvaj u lokalni storage
            self._save_documents()
            
            logger.info(f"Dokument {doc_id} uspešno dodat u RAG sistem")
            return doc_id
            
            except Exception as e:
            logger.error(f"Greška pri dodavanju dokumenta: {e}")
            raise
    
    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Pretraži dokumente na osnovu upita"""
        try:
            if not self.embedding_model or not self.vector_index:
                raise Exception("RAG sistem nije inicijalizovan")
            
            # Kreiraj embedding za upit
            query_embedding = self.embedding_model.encode(query)
            
            # Pretraži vector index
            scores, indices = self.vector_index.search(
                query_embedding.reshape(1, -1).astype(np.float32), 
                min(top_k, len(self.documents))
            )
            
            # Vraća rezultate
            results = []
            for i, (score, idx) in enumerate(zip(scores[0], indices[0])):
                if idx < len(self.documents):
                    doc = self.documents[idx].copy()
                    doc['score'] = float(score)
                    doc['rank'] = i + 1
                    results.append(doc)
            
            logger.info(f"Pretraga vratila {len(results)} rezultata za upit: {query[:50]}...")
            return results
            
        except Exception as e:
            logger.error(f"Greška pri pretraživanju: {e}")
            return []
    
    def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        """Dohvati dokument po ID-u"""
        for doc in self.documents:
            if doc['id'] == doc_id:
                return doc
        return None
    
    def delete_document(self, doc_id: str) -> bool:
        """Obriši dokument"""
        try:
            # Pronađi dokument
            doc_index = None
            for i, doc in enumerate(self.documents):
                if doc['id'] == doc_id:
                    doc_index = i
                    break
            
            if doc_index is None:
                logger.warning(f"Dokument {doc_id} nije pronađen")
                return False
            
            # Ukloni iz liste
            removed_doc = self.documents.pop(doc_index)
            
            # Rekreiraj vector index (FAISS ne podržava brisanje)
            self._init_vector_index()
            
            # Sačuvaj u lokalni storage
            self._save_documents()
            
            logger.info(f"Dokument {doc_id} uspešno obrisan")
            return True
            
        except Exception as e:
            logger.error(f"Greška pri brisanju dokumenta: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Dohvati statistike RAG sistema"""
        return {
            'total_documents': len(self.documents),
            'vector_index_size': self.vector_index.ntotal if self.vector_index else 0,
            'embedding_model': 'all-MiniLM-L6-v2' if self.embedding_model else None,
            'storage_type': 'local',
            'last_updated': datetime.now().isoformat()
        }
