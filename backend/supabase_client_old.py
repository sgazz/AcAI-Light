"""
Supabase klijent za AcAIA projekat
Omogućava povezivanje sa Supabase bazom podataka i operacije sa tabelama
"""

import os
import json
import asyncio
import aiohttp
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

class AsyncSupabaseManager:
    """Async manager klasa za Supabase operacije"""
    
    def __init__(self):
        self.supabase_url = os.getenv('SUPABASE_URL')
        self.supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not self.supabase_url or not self.supabase_key:
            raise ValueError("SUPABASE_URL i SUPABASE_SERVICE_ROLE_KEY moraju biti postavljeni u environment varijablama")
        
        self.client: Client = create_client(self.supabase_url, self.supabase_key)
        self.http_session = None
        self._connection_stats = {
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "avg_response_time": 0.0
        }
    
    async def get_http_session(self):
        """Dohvati ili kreira HTTP session za async pozive"""
        if self.http_session is None:
            connector = aiohttp.TCPConnector(
                limit=50,
                limit_per_host=20,
                ttl_dns_cache=300,
                use_dns_cache=True,
                keepalive_timeout=30
            )
            timeout = aiohttp.ClientTimeout(total=30, connect=10)
            self.http_session = aiohttp.ClientSession(
                connector=connector,
                timeout=timeout,
                headers={
                    "apikey": self.supabase_key,
                    "Authorization": f"Bearer {self.supabase_key}",
                    "Content-Type": "application/json"
                }
            )
        return self.http_session
    
    async def test_connection(self) -> bool:
        """Testira povezivanje sa Supabase asinhrono"""
        try:
            start_time = asyncio.get_event_loop().time()
            
            # Koristi async HTTP poziv
            session = await self.get_http_session()
            url = f"{self.supabase_url}/rest/v1/documents?select=id&limit=1"
            
            async with session.get(url) as response:
                if response.status == 200:
                    self._update_stats(True, asyncio.get_event_loop().time() - start_time)
                    return True
                else:
                    self._update_stats(False, asyncio.get_event_loop().time() - start_time)
                    return False
                    
        except Exception as e:
            print(f"Greška pri async povezivanju sa Supabase: {e}")
            return False
    
    def _update_stats(self, success: bool, response_time: float):
        """Ažurira statistike konekcija"""
        self._connection_stats["total_requests"] += 1
        if success:
            self._connection_stats["successful_requests"] += 1
        else:
            self._connection_stats["failed_requests"] += 1
        
        # Ažuriraj prosečno vreme odgovora
        current_avg = self._connection_stats["avg_response_time"]
        total_requests = self._connection_stats["total_requests"]
        self._connection_stats["avg_response_time"] = (current_avg * (total_requests - 1) + response_time) / total_requests
    
    async def get_connection_stats(self) -> Dict[str, Any]:
        """Dohvati statistike konekcija"""
        return {
            "status": "healthy" if self._connection_stats["failed_requests"] == 0 else "degraded",
            "stats": self._connection_stats.copy(),
            "session_active": self.http_session is not None
        }
    
    async def save_chat_message(self, session_id: str, user_message: str, 
                               assistant_message: str, sources: List[Dict] = None) -> str:
        """Čuva chat poruku u istoriju asinhrono"""
        try:
            start_time = asyncio.get_event_loop().time()
            
            chat_data = {
                'session_id': session_id,
                'user_message': user_message,
                'assistant_message': assistant_message,
                'sources': sources or []
            }
            
            # Koristi async HTTP poziv
            session = await self.get_http_session()
            url = f"{self.supabase_url}/rest/v1/chat_history"
            
            async with session.post(url, json=chat_data) as response:
                if response.status == 201:
                    result = await response.json()
                    self._update_stats(True, asyncio.get_event_loop().time() - start_time)
                    return result[0]['id']
                else:
                    self._update_stats(False, asyncio.get_event_loop().time() - start_time)
                    raise Exception(f"Greška pri čuvanju poruke: {response.status}")
                    
        except Exception as e:
            print(f"Greška pri async čuvanju chat poruke: {e}")
            raise
    
    async def get_chat_history(self, session_id: str, limit: int = 50) -> List[Dict]:
        """Dohvata chat istoriju za sesiju asinhrono"""
        try:
            start_time = asyncio.get_event_loop().time()
            
            # Koristi async HTTP poziv
            session = await self.get_http_session()
            url = f"{self.supabase_url}/rest/v1/chat_history"
            params = {
                'session_id': f'eq.{session_id}',
                'order': 'created_at.desc',
                'limit': str(limit)
            }
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    result = await response.json()
                    self._update_stats(True, asyncio.get_event_loop().time() - start_time)
                    return result
                else:
                    self._update_stats(False, asyncio.get_event_loop().time() - start_time)
                    return []
                    
        except Exception as e:
            print(f"Greška pri async dohvatanju chat istorije: {e}")
            return []
    
    async def insert_document(self, filename: str, file_path: str, file_type: str, 
                             file_size: int, content: str = None, metadata: Dict = None) -> str:
        """Ubacuje novi dokument u bazu asinhrono"""
        try:
            start_time = asyncio.get_event_loop().time()
            
            document_data = {
                'filename': filename,
                'file_path': file_path,
                'file_type': file_type,
                'file_size': file_size,
                'content': content,
                'metadata': metadata or {}
            }
            
            # Koristi async HTTP poziv
            session = await self.get_http_session()
            url = f"{self.supabase_url}/rest/v1/documents"
            
            async with session.post(url, json=document_data) as response:
                if response.status == 201:
                    result = await response.json()
                    self._update_stats(True, asyncio.get_event_loop().time() - start_time)
                    return result[0]['id']
                else:
                    self._update_stats(False, asyncio.get_event_loop().time() - start_time)
                    raise Exception(f"Greška pri ubacivanju dokumenta: {response.status}")
                    
        except Exception as e:
            print(f"Greška pri async ubacivanju dokumenta: {e}")
            raise
    
    async def get_all_documents(self) -> List[Dict]:
        """Dohvata sve dokumente asinhrono"""
        try:
            start_time = asyncio.get_event_loop().time()
            
            # Koristi async HTTP poziv
            session = await self.get_http_session()
            url = f"{self.supabase_url}/rest/v1/documents"
            params = {'order': 'created_at.desc'}
            
            async with session.get(url, params=params) as response:
                if response.status == 200:
                    result = await response.json()
                    self._update_stats(True, asyncio.get_event_loop().time() - start_time)
                    return result
                else:
                    self._update_stats(False, asyncio.get_event_loop().time() - start_time)
                    return []
                    
        except Exception as e:
            print(f"Greška pri async dohvatanju dokumenata: {e}")
            return []
    
    async def close(self):
        """Zatvori HTTP session"""
        if self.http_session:
            await self.http_session.close()
            self.http_session = None

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
    
    def get_chat_history(self, session_id: str, limit: int = 50) -> List[Dict]:
        """Dohvata chat istoriju za sesiju"""
        try:
            result = self.client.table('chat_history').select('*').eq('session_id', session_id).order('created_at', desc=True).limit(limit).execute()
            return result.data
        except Exception as e:
            print(f"Greška pri dohvatanju chat istorije: {e}")
            return []
    
    def save_chat_message(self, session_id: str, user_message: str, 
                         assistant_message: str, sources: List[Dict] = None) -> str:
        """Čuva chat poruku u istoriju"""
        try:
            chat_data = {
                'session_id': session_id,
                'user_message': user_message,
                'assistant_message': assistant_message,
                'sources': sources or []
            }
            
            result = self.client.table('chat_history').insert(chat_data).execute()
            return result.data[0]['id']
        except Exception as e:
            print(f"Greška pri čuvanju chat poruke: {e}")
            raise
    
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

def get_async_supabase_manager() -> AsyncSupabaseManager:
    """Dohvati instancu async Supabase manager-a"""
    return AsyncSupabaseManager()

def init_supabase() -> bool:
    """Inicijalizuj Supabase konekciju"""
    try:
        manager = get_supabase_manager()
        return manager.test_connection()
    except Exception as e:
        print(f"Greška pri inicijalizaciji Supabase: {e}")
        return False

async def init_async_supabase() -> bool:
    """Inicijalizuj async Supabase konekciju"""
    try:
        manager = get_async_supabase_manager()
        return await manager.test_connection()
    except Exception as e:
        print(f"Greška pri inicijalizaciji async Supabase: {e}")
        return False 