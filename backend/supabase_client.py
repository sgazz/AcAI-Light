"""
Supabase klijent za AcAIA projekat
Omogućava povezivanje sa Supabase bazom podataka i operacije sa tabelama
"""

import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import uuid

# Učitaj .env fajl za environment varijable
try:
    from dotenv import load_dotenv
    
    # Pokušaj da učitaš .env iz backend direktorijuma
    backend_env_path = os.path.join(os.path.dirname(__file__), '.env')
    if os.path.exists(backend_env_path):
        load_dotenv(backend_env_path)
    else:
        # Ako ne postoji u backend, pokušaj u root direktorijumu
        load_dotenv()
        
except ImportError:
    print("python-dotenv nije instaliran. Environment varijable možda neće biti učitate.")

try:
    from supabase import create_client, Client
    from supabase.lib.client_options import ClientOptions
except ImportError:
    print("Supabase biblioteka nije instalirana. Instalirajte: pip install supabase")
    Client = None

class SupabaseManager:
    """Manager klasa za Supabase operacije"""
    
    def __init__(self):
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY moraju biti postavljeni u environment varijablama")
        
        self.client: Client = create_client(self.supabase_url, self.supabase_key)
    
    def test_connection(self) -> bool:
        """Testira povezivanje sa Supabase"""
        try:
            # Pokušaj da dohvatiš jedan red iz documents tabele
            result = self.client.table('documents').select('id').limit(1).execute()
            return True
        except Exception as e:
            print(f"Greška pri povezivanju sa Supabase: {e}")
            return False
    
    # Dokument operacije
    def insert_document(self, filename: str, file_path: str, file_type: str, 
                       file_size: int, content: str = None, metadata: Dict = None) -> str:
        """Ubacuje novi dokument u bazu"""
        document_data = {
            'filename': filename,
            'file_path': file_path,
            'file_type': file_type,
            'file_size': file_size,
            'content': content,
            'metadata': metadata or {}
        }
        
        result = self.client.table('documents').insert(document_data).execute()
        return result.data[0]['id']
    
    def get_document(self, document_id: str) -> Optional[Dict]:
        """Dohvata dokument po ID-u"""
        result = self.client.table('documents').select('*').eq('id', document_id).execute()
        return result.data[0] if result.data else None
    
    def get_all_documents(self) -> List[Dict]:
        """Dohvata sve dokumente"""
        result = self.client.table('documents').select('*').order('created_at', desc=True).execute()
        return result.data
    
    def delete_document(self, document_id: str) -> bool:
        """Briše dokument i sve povezane vektore"""
        try:
            self.client.table('documents').delete().eq('id', document_id).execute()
            return True
        except Exception as e:
            print(f"Greška pri brisanju dokumenta: {e}")
            return False
    
    # Vektor operacije
    def insert_document_vectors(self, document_id: str, vectors: List[Dict]) -> bool:
        """Ubacuje vektore za dokument"""
        try:
            for vector_data in vectors:
                vector_data['document_id'] = document_id
                self.client.table('document_vectors').insert(vector_data).execute()
            return True
        except Exception as e:
            print(f"Greška pri ubacivanju vektora: {e}")
            return False
    
    def search_similar_vectors(self, query_embedding: List[float], 
                             match_threshold: float = 0.7, 
                             match_count: int = 10) -> List[Dict]:
        """Pretražuje slične vektore koristeći pgvector"""
        try:
            # Koristi custom funkciju match_documents iz SQL skripte
            result = self.client.rpc('match_documents', {
                'query_embedding': query_embedding,
                'match_threshold': match_threshold,
                'match_count': match_count
            }).execute()
            return result.data
        except Exception as e:
            print(f"Greška pri pretraživanju vektora: {e}")
            return []
    
    # Chat istorija operacije
    def save_chat_message(self, session_id: str, user_message: str, 
                         assistant_message: str, sources: List[Dict] = None) -> str:
        """Čuva chat poruku u istoriju"""
        chat_data = {
            'session_id': session_id,
            'user_message': user_message,
            'assistant_message': assistant_message,
            'sources': sources or []
        }
        
        result = self.client.table('chat_history').insert(chat_data).execute()
        return result.data[0]['id']
    
    def get_chat_history(self, session_id: str, limit: int = 50) -> List[Dict]:
        """Dohvata chat istoriju za sesiju"""
        result = self.client.table('chat_history')\
            .select('*')\
            .eq('session_id', session_id)\
            .order('created_at', desc=True)\
            .limit(limit)\
            .execute()
        return result.data
    
    # OCR operacije
    def save_ocr_image(self, original_filename: str, original_path: str,
                      processed_filename: str = None, processed_path: str = None,
                      ocr_text: str = None, confidence_score: float = None,
                      language: str = 'srp+eng') -> str:
        """Čuva informacije o OCR obrađenoj slici"""
        ocr_data = {
            'original_filename': original_filename,
            'original_path': original_path,
            'processed_filename': processed_filename,
            'processed_path': processed_path,
            'ocr_text': ocr_text,
            'confidence_score': confidence_score,
            'language': language
        }
        
        result = self.client.table('ocr_images').insert(ocr_data).execute()
        return result.data[0]['id']
    
    def get_ocr_images(self) -> List[Dict]:
        """Dohvata sve OCR obrađene slike"""
        result = self.client.table('ocr_images').select('*').order('created_at', desc=True).execute()
        return result.data
    
    # Multi-step retrieval operacije
    def save_retrieval_session(self, session_id: str, query: str, 
                              steps: List[Dict] = None, final_results: List[Dict] = None) -> str:
        """Čuva multi-step retrieval sesiju"""
        session_data = {
            'session_id': session_id,
            'query': query,
            'steps': steps or [],
            'final_results': final_results or []
        }
        
        result = self.client.table('retrieval_sessions').insert(session_data).execute()
        return result.data[0]['id']
    
    def get_retrieval_sessions(self, session_id: str = None) -> List[Dict]:
        """Dohvata retrieval sesije"""
        query = self.client.table('retrieval_sessions').select('*')
        
        if session_id:
            query = query.eq('session_id', session_id)
        
        result = query.order('created_at', desc=True).execute()
        return result.data
    
    # Statistike i analitika
    def get_database_stats(self) -> Dict[str, Any]:
        """Dohvata statistike baze podataka"""
        stats = {}
        
        try:
            # Broj dokumenata
            docs_result = self.client.table('documents').select('id', count='exact').execute()
            stats['total_documents'] = docs_result.count
            
            # Broj vektora
            vectors_result = self.client.table('document_vectors').select('id', count='exact').execute()
            stats['total_vectors'] = vectors_result.count
            
            # Broj chat poruka
            chat_result = self.client.table('chat_history').select('id', count='exact').execute()
            stats['total_chat_messages'] = chat_result.count
            
            # Broj OCR slika
            ocr_result = self.client.table('ocr_images').select('id', count='exact').execute()
            stats['total_ocr_images'] = ocr_result.count
            
            # Broj retrieval sesija
            retrieval_result = self.client.table('retrieval_sessions').select('id', count='exact').execute()
            stats['total_retrieval_sessions'] = retrieval_result.count
            
        except Exception as e:
            print(f"Greška pri dohvatanju statistika: {e}")
            stats['error'] = str(e)
        
        return stats

# Globalna instanca za korišćenje u aplikaciji
supabase_manager = None

def get_supabase_manager() -> SupabaseManager:
    """Dohvata globalnu instancu Supabase manager-a"""
    global supabase_manager
    if supabase_manager is None:
        supabase_manager = SupabaseManager()
    return supabase_manager

def init_supabase() -> bool:
    """Inicijalizuje Supabase povezivanje"""
    try:
        manager = get_supabase_manager()
        return manager.test_connection()
    except Exception as e:
        print(f"Greška pri inicijalizaciji Supabase: {e}")
        return False 