"""
Vector Store - Lokalna verzija
Upravlja vector store-om sa FAISS (bez Supabase integracije)
"""

import os
import json
import pickle
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Tuple
import uuid
import sys

# Vector store bez Supabase integracije
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

class VectorStore:
    """Klasa za upravljanje vector store-om sa FAISS (bez Supabase)"""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2", index_path: str = "data/vector_index", use_supabase: bool = False):
        self.model_name = model_name
        self.index_path = index_path
        self.model = None
        self.index = None
        self.documents = []
        self.document_metadata = {}
        self.use_supabase = False  # Uvek false - Supabase je uklonjen
        
        # Kreiraj direktorijum ako ne postoji
        os.makedirs(self.index_path, exist_ok=True)
        
        self._load_model()
        self._load_index()
    
    def _load_model(self):
        """Učitava sentence transformer model"""
        try:
            self.model = SentenceTransformer(self.model_name)
            print(f"Model {self.model_name} uspešno učitan")
        except Exception as e:
            print(f"Greška pri učitavanju modela: {e}")
            raise
    
    def _load_index(self):
        """Učitava postojeći FAISS indeks"""
        self._load_from_local()
    
    def _load_from_local(self):
        """Učitava lokalni FAISS indeks"""
        index_file = os.path.join(self.index_path, "faiss_index.bin")
        metadata_file = os.path.join(self.index_path, "metadata.json")
        
        if os.path.exists(index_file) and os.path.exists(metadata_file):
            try:
                # Učitaj FAISS indeks
                self.index = faiss.read_index(index_file)
                
                # Učitaj metapodatke
                with open(metadata_file, 'r', encoding='utf-8') as f:
                    self.document_metadata = json.load(f)
                
                # Učitaj dokumente
                documents_file = os.path.join(self.index_path, "documents.json")
                if os.path.exists(documents_file):
                    with open(documents_file, 'r', encoding='utf-8') as f:
                        self.documents = json.load(f)
                
                print(f"Lokalni indeks uspešno učitan sa {len(self.documents)} dokumenata")
            except Exception as e:
                print(f"Greška pri učitavanju lokalnog indeksa: {e}")
                self._create_new_index()
        else:
            self._create_new_index()
    
    def _create_new_index(self):
        """Kreira novi FAISS indeks"""
        try:
            # Koristi dimenziju modela
            dimension = self.model.get_sentence_embedding_dimension()
            self.index = faiss.IndexFlatL2(dimension)
            print(f"Novi FAISS indeks kreiran sa dimenzijom {dimension}")
        except Exception as e:
            print(f"Greška pri kreiranju indeksa: {e}")
            raise
    
    def _save_index(self):
        """Čuva FAISS indeks i metapodatke"""
        try:
            # Sačuvaj FAISS indeks
            index_file = os.path.join(self.index_path, "faiss_index.bin")
            faiss.write_index(self.index, index_file)
            
            # Sačuvaj metapodatke
            metadata_file = os.path.join(self.index_path, "metadata.json")
            with open(metadata_file, 'w', encoding='utf-8') as f:
                json.dump(self.document_metadata, f, ensure_ascii=False, indent=2)
            
            # Sačuvaj dokumente
            documents_file = os.path.join(self.index_path, "documents.json")
            with open(documents_file, 'w', encoding='utf-8') as f:
                json.dump(self.documents, f, ensure_ascii=False, indent=2)
            
            print("Lokalni indeks uspešno sačuvan")
        except Exception as e:
            print(f"Greška pri čuvanju lokalnog indeksa: {e}")
            raise
    
    def add_document(self, document_data: Dict[str, Any]) -> str:
        """Dodaje dokument u vector store"""
        try:
            doc_id = str(uuid.uuid4())
            filename = document_data['filename']
            
            # Dodaj dokument u listu
            self.documents.append({
                'id': doc_id,
                'filename': filename,
                'file_type': document_data['file_type'],
                'total_pages': document_data['total_pages']
            })
            
            # Procesiraj sve chunke iz dokumenta
            all_chunks = []
            for page in document_data['pages']:
                for chunk in page['chunks']:
                    all_chunks.append({
                        'id': chunk['id'],
                        'content': chunk['content'],
                        'page': chunk['page'],
                        'doc_id': doc_id,
                        'filename': filename
                    })
            
            # Generiši embeddings za sve chunke
            texts = [chunk['content'] for chunk in all_chunks]
            embeddings = self.model.encode(texts, show_progress_bar=True)
            
            # Sačuvaj lokalno
            self._save_to_local(doc_id, document_data, all_chunks, embeddings)
            
            print(f"Dokument {filename} uspešno dodat sa {len(all_chunks)} chunka")
            return doc_id
            
        except Exception as e:
            print(f"Greška pri dodavanju dokumenta: {e}")
            raise
    
    def _save_to_local(self, doc_id: str, document_data: Dict, chunks: List[Dict], embeddings: np.ndarray):
        """Čuva dokument i vektore lokalno"""
        # Dodaj embeddings u FAISS indeks
        self.index.add(embeddings.astype('float32'))
        
        # Sačuvaj metapodatke
        self.document_metadata[doc_id] = {
            'filename': document_data['filename'],
            'file_type': document_data['file_type'],
            'total_pages': document_data['total_pages'],
            'chunks': chunks,
            'embedding_count': len(chunks)
        }
        
        # Dodaj OCR informacije ako postoje
        if 'ocr_info' in document_data:
            self.document_metadata[doc_id]['ocr_info'] = document_data['ocr_info']
        
        # Sačuvaj indeks
        self._save_index()
    
    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Pretražuje dokumente na osnovu upita"""
        try:
            if not self.documents:
                return []
            
            return self._search_local(query, top_k)
                
        except Exception as e:
            print(f"Greška pri pretraživanju: {e}")
            return []
    
    def _search_local(self, query: str, top_k: int) -> List[Dict[str, Any]]:
        """Pretražuje u lokalnom FAISS indeksu"""
        # Generiši embedding za upit
        query_embedding = self.model.encode([query])
        
        # Pretraži FAISS indeks
        distances, indices = self.index.search(
            query_embedding.astype('float32'), 
            min(top_k, self.index.ntotal)
        )
        
        results = []
        for i, (distance, idx) in enumerate(zip(distances[0], indices[0])):
            if idx < len(self.documents):
                # Pronađi odgovarajući chunk
                chunk_info = self._find_chunk_by_index(idx)
                if chunk_info:
                    results.append({
                        'rank': i + 1,
                        'score': float(1 / (1 + distance)),  # Konvertuj distance u score
                        'content': chunk_info['content'],
                        'page': chunk_info['page'],
                        'filename': chunk_info['filename'],
                        'doc_id': chunk_info['doc_id']
                    })
        
        return results
    
    def _find_chunk_by_index(self, index: int) -> Dict[str, Any]:
        """Pronalazi chunk na osnovu FAISS indeksa"""
        current_index = 0
        
        for doc_id, metadata in self.document_metadata.items():
            chunk_count = metadata['embedding_count']
            if current_index <= index < current_index + chunk_count:
                chunk_idx = index - current_index
                return metadata['chunks'][chunk_idx]
            current_index += chunk_count
        
        return None
    
    def get_document(self, doc_id: str) -> Dict[str, Any]:
        """Dohvata dokument po ID-u"""
        try:
            # Dohvati iz lokalnih podataka
            for doc in self.documents:
                if doc['id'] == doc_id:
                    return {
                        'id': doc['id'],
                        'filename': doc['filename'],
                        'file_type': doc['file_type'],
                        'metadata': self.document_metadata.get(doc_id, {})
                    }
            
            return None
            
        except Exception as e:
            print(f"Greška pri dohvatanju dokumenta: {e}")
            return None
    
    def list_documents(self) -> List[Dict[str, Any]]:
        """Lista svih dokumenata"""
        return self.documents
    
    def delete_document(self, doc_id: str) -> bool:
        """Briše dokument"""
        try:
            # Ukloni iz lokalnih podataka
            self.documents = [doc for doc in self.documents if doc['id'] != doc_id]
            if doc_id in self.document_metadata:
                del self.document_metadata[doc_id]
            
            # Ažuriraj lokalni indeks
            self._save_index()
            
            return True
            
        except Exception as e:
            print(f"Greška pri brisanju dokumenta: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Dohvata statistike vector store-a"""
        try:
            stats = {
                'total_documents': len(self.documents),
                'total_chunks': sum(meta.get('embedding_count', 0) for meta in self.document_metadata.values()),
                'model_name': self.model_name,
                'use_supabase': False,  # Uvek false
                'index_type': 'FAISS',
                'index_size': self.index.ntotal if self.index else 0
            }
            
            return stats
            
        except Exception as e:
            print(f"Greška pri dohvatanju statistika: {e}")
            return {'error': str(e)} 