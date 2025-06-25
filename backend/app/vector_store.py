import os
import json
import pickle
import numpy as np
import faiss
from sentence_transformers import SentenceTransformer
from typing import List, Dict, Any, Tuple
import uuid

class VectorStore:
    """Klasa za upravljanje vector store-om sa FAISS"""
    
    def __init__(self, model_name: str = "all-MiniLM-L6-v2", index_path: str = "data/vector_index"):
        self.model_name = model_name
        self.index_path = index_path
        self.model = None
        self.index = None
        self.documents = []
        self.document_metadata = {}
        
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
                
                print(f"Indeks uspešno učitan sa {len(self.documents)} dokumenata")
            except Exception as e:
                print(f"Greška pri učitavanju indeksa: {e}")
                self._create_new_index()
        else:
            self._create_new_index()
    
    def _create_new_index(self):
        """Kreira novi FAISS indeks"""
        try:
            # Kreiraj indeks za 384-dimenzionalne vektore (all-MiniLM-L6-v2)
            dimension = 384
            self.index = faiss.IndexFlatL2(dimension)
            print("Novi FAISS indeks kreiran")
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
            
            print("Indeks uspešno sačuvan")
        except Exception as e:
            print(f"Greška pri čuvanju indeksa: {e}")
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
            
            # Dodaj embeddings u FAISS indeks
            self.index.add(embeddings.astype('float32'))
            
            # Sačuvaj metapodatke
            self.document_metadata[doc_id] = {
                'filename': filename,
                'file_type': document_data['file_type'],
                'total_pages': document_data['total_pages'],
                'chunks': all_chunks,
                'embedding_count': len(all_chunks)
            }
            
            # Dodaj OCR informacije ako postoje
            if 'ocr_info' in document_data:
                self.document_metadata[doc_id]['ocr_info'] = document_data['ocr_info']
            
            # Sačuvaj indeks
            self._save_index()
            
            print(f"Dokument {filename} uspešno dodat sa {len(all_chunks)} chunka")
            return doc_id
            
        except Exception as e:
            print(f"Greška pri dodavanju dokumenta: {e}")
            raise
    
    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Pretražuje dokumente na osnovu upita"""
        try:
            if not self.documents:
                return []
            
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
            
        except Exception as e:
            print(f"Greška pri pretraživanju: {e}")
            return []
    
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
    
    def get_document_info(self, doc_id: str) -> Dict[str, Any]:
        """Dohvata informacije o dokumentu"""
        if doc_id in self.document_metadata:
            return self.document_metadata[doc_id]
        return None
    
    def get_document(self, doc_id: str) -> Dict[str, Any]:
        """Dohvata kompletan sadržaj dokumenta sa stranicama i chunkovima"""
        if doc_id not in self.document_metadata:
            return None
        
        metadata = self.document_metadata[doc_id]
        chunks = metadata.get('chunks', [])
        
        # Grupiši chunke po stranicama
        pages = {}
        for chunk in chunks:
            page_num = chunk.get('page', 0)
            if page_num not in pages:
                pages[page_num] = {
                    'content': '',
                    'chunks': []
                }
            pages[page_num]['content'] += chunk['content'] + ' '
            pages[page_num]['chunks'].append(chunk)
        
        # Konvertuj u listu stranica
        pages_list = []
        for page_num in sorted(pages.keys()):
            pages_list.append({
                'page': page_num,
                'content': pages[page_num]['content'].strip(),
                'chunks': pages[page_num]['chunks']
            })
        
        return {
            'id': doc_id,
            'filename': metadata['filename'],
            'file_type': metadata['file_type'],
            'total_pages': metadata['total_pages'],
            'pages': pages_list,
            'ocr_info': metadata.get('ocr_info')
        }
    
    def list_documents(self) -> List[Dict[str, Any]]:
        """Vraća listu svih dokumenata"""
        return self.documents
    
    def delete_document(self, doc_id: str) -> bool:
        """Briše dokument iz vector store-a"""
        try:
            if doc_id not in self.document_metadata:
                return False
            
            # Ovo je pojednostavljena implementacija
            # U produkciji bi trebalo da se reindeksira ceo indeks
            print(f"Brisanje dokumenta {doc_id} - potrebna je reindeksacija")
            return True
            
        except Exception as e:
            print(f"Greška pri brisanju dokumenta: {e}")
            return False
    
    def get_stats(self) -> Dict[str, Any]:
        """Vraća statistike vector store-a"""
        return {
            'total_documents': len(self.documents),
            'total_embeddings': self.index.ntotal if self.index else 0,
            'index_dimension': self.index.d if self.index else 0,
            'model_name': self.model_name
        } 