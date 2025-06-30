#!/usr/bin/env python3
"""
Sveobuhvatan test za sve Supabase funkcionalnosti u AcAIA sistemu
"""

import asyncio
import aiohttp
import json
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any
import sys
import os

# Dodaj backend direktorijum u path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

try:
    from supabase_client import get_supabase_manager
    SUPABASE_AVAILABLE = True
except ImportError as e:
    print(f"❌ Greška pri importu Supabase klijenta: {e}")
    SUPABASE_AVAILABLE = False

class ComprehensiveSupabaseTest:
    """Sveobuhvatan test za sve Supabase funkcionalnosti"""
    
    def __init__(self):
        self.backend_url = "http://localhost:8001"
        self.test_session_id = f"test_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        self.test_document_id = None
        self.test_ocr_image_id = None
        self.test_share_link_id = None
        
        if SUPABASE_AVAILABLE:
            try:
                self.supabase_manager = get_supabase_manager()
                print("✅ Supabase manager uspešno inicijalizovan")
            except Exception as e:
                print(f"❌ Greška pri inicijalizaciji Supabase manager-a: {e}")
                self.supabase_manager = None
        else:
            self.supabase_manager = None
    
    async def test_supabase_connection(self) -> bool:
        """Test konekcije sa Supabase"""
        print("\n🔗 Testiranje Supabase konekcije...")
        
        if not self.supabase_manager:
            print("❌ Supabase manager nije dostupan")
            return False
        
        try:
            # Test osnovne konekcije
            is_connected = self.supabase_manager.test_connection()
            if is_connected:
                print("✅ Supabase konekcija uspešna")
                return True
            else:
                print("❌ Supabase konekcija neuspešna")
                return False
        except Exception as e:
            print(f"❌ Greška pri testiranju konekcije: {e}")
            return False
    
    async def test_chat_history(self) -> bool:
        """Test chat istorije"""
        print("\n💬 Testiranje chat istorije...")
        
        if not self.supabase_manager:
            print("❌ Supabase manager nije dostupan")
            return False
        
        try:
            # Test čuvanja poruka
            user_message = "Test korisnička poruka"
            ai_message = "Test AI odgovor"
            
            # Sačuvaj korisničku poruku
            self.supabase_manager.save_chat_message(
                session_id=self.test_session_id,
                user_message=user_message,
                assistant_message=ai_message
            )
            print("✅ Korisnička poruka sačuvana")
            
            # Dohvati chat istoriju
            history = self.supabase_manager.get_chat_history(self.test_session_id, limit=10)
            print(f"✅ Dohvaćeno {len(history)} poruka iz istorije")
            
            # Proveri da li su poruke ispravno sačuvane
            if len(history) > 0:
                latest_message = history[0]
                if latest_message.get('user_message') == user_message:
                    print("✅ Poruke su ispravno sačuvane")
                    return True
                else:
                    print("❌ Poruke nisu ispravno sačuvane")
                    return False
            else:
                print("❌ Nema poruka u istoriji")
                return False
                
        except Exception as e:
            print(f"❌ Greška pri testiranju chat istorije: {e}")
            return False
    
    async def test_session_management(self) -> bool:
        """Test session management funkcionalnosti"""
        print("\n📋 Testiranje session management-a...")
        
        if not self.supabase_manager:
            print("❌ Supabase manager nije dostupan")
            return False
        
        try:
            # Test kreiranja session metadata
            session_name = "Test sesija"
            session_description = "Opis test sesije"
            
            # Kreiraj session metadata
            result = self.supabase_manager.client.rpc('ensure_session_metadata', {
                'session_id_param': self.test_session_id
            }).execute()
            print("✅ Session metadata kreiran")
            
            # Ažuriraj session metadata
            self.supabase_manager.client.table('session_metadata').update({
                'name': session_name,
                'description': session_description
            }).eq('session_id', self.test_session_id).execute()
            print("✅ Session metadata ažuriran")
            
            # Dohvati session metadata
            metadata_result = self.supabase_manager.client.table('session_metadata').select('*').eq('session_id', self.test_session_id).execute()
            if metadata_result.data:
                metadata = metadata_result.data[0]
                if metadata.get('name') == session_name:
                    print("✅ Session metadata ispravno dohvaćen")
                    return True
                else:
                    print("❌ Session metadata nije ispravno dohvaćen")
                    return False
            else:
                print("❌ Session metadata nije pronađen")
                return False
                
        except Exception as e:
            print(f"❌ Greška pri testiranju session management-a: {e}")
            return False
    
    async def test_document_operations(self) -> bool:
        """Test operacija sa dokumentima"""
        print("\n📄 Testiranje operacija sa dokumentima...")
        
        if not self.supabase_manager:
            print("❌ Supabase manager nije dostupan")
            return False
        
        try:
            # Test čuvanja dokumenta
            test_document = {
                'filename': 'test_document.txt',
                'file_path': '/test/path/document.txt',
                'file_type': 'text/plain',
                'file_size': 1024,
                'content': 'Test sadržaj dokumenta',
                'metadata': {
                    'total_pages': 1,
                    'chunks': [{'content': 'Test chunk', 'page': 1}],
                    'embedding_count': 1
                }
            }
            
            # Sačuvaj dokument
            doc_id = self.supabase_manager.insert_document(
                filename=test_document['filename'],
                file_path=test_document['file_path'],
                file_type=test_document['file_type'],
                file_size=test_document['file_size'],
                content=test_document['content'],
                metadata=test_document['metadata']
            )
            self.test_document_id = doc_id
            print(f"✅ Dokument sačuvan sa ID: {doc_id}")
            
            # Dohvati dokument
            documents = self.supabase_manager.get_all_documents()
            found_document = None
            for doc in documents:
                if doc['id'] == doc_id:
                    found_document = doc
                    break
            
            if found_document and found_document['filename'] == test_document['filename']:
                print("✅ Dokument ispravno dohvaćen")
                return True
            else:
                print("❌ Dokument nije ispravno dohvaćen")
                return False
                
        except Exception as e:
            print(f"❌ Greška pri testiranju operacija sa dokumentima: {e}")
            return False
    
    async def test_ocr_operations(self) -> bool:
        """Test OCR operacija"""
        print("\n🖼️ Testiranje OCR operacija...")
        
        if not self.supabase_manager:
            print("❌ Supabase manager nije dostupan")
            return False
        
        try:
            # Test čuvanja OCR slike
            test_ocr_data = {
                'original_filename': 'test_image.png',
                'original_path': '/test/path/image.png',
                'ocr_text': 'Test OCR tekst',
                'confidence_score': 95.5,
                'language': 'srp+eng'
            }
            
            # Sačuvaj OCR sliku
            ocr_id = self.supabase_manager.save_ocr_image(
                original_filename=test_ocr_data['original_filename'],
                original_path=test_ocr_data['original_path'],
                ocr_text=test_ocr_data['ocr_text'],
                confidence_score=test_ocr_data['confidence_score'],
                language=test_ocr_data['language']
            )
            self.test_ocr_image_id = ocr_id
            print(f"✅ OCR slika sačuvana sa ID: {ocr_id}")
            
            # Dohvati OCR slike
            ocr_images = self.supabase_manager.get_ocr_images()
            found_ocr = None
            for ocr in ocr_images:
                if ocr['id'] == ocr_id:
                    found_ocr = ocr
                    break
            
            if found_ocr and found_ocr['ocr_text'] == test_ocr_data['ocr_text']:
                print("✅ OCR slika ispravno dohvaćena")
                return True
            else:
                print("❌ OCR slika nije ispravno dohvaćena")
                return False
                
        except Exception as e:
            print(f"❌ Greška pri testiranju OCR operacija: {e}")
            return False
    
    async def test_vector_operations(self) -> bool:
        """Test vector store operacija"""
        print("\n🔍 Testiranje vector store operacija...")
        
        if not self.supabase_manager:
            print("❌ Supabase manager nije dostupan")
            return False
        
        try:
            # Test čuvanja vektora
            test_vectors = [
                {
                    'chunk_index': 0,
                    'chunk_text': 'Test chunk tekst',
                    'embedding': [0.1] * 1536,  # 1536-dimenzionalni embedding
                    'metadata': {
                        'page': 1,
                        'chunk_id': 'test_chunk_1'
                    }
                }
            ]
            
            if self.test_document_id:
                # Sačuvaj vektore
                self.supabase_manager.insert_document_vectors(self.test_document_id, test_vectors)
                print("✅ Vektori sačuvani")
                
                # Test pretrage vektora (dummy embedding)
                dummy_embedding = [0.1] * 1536
                search_results = self.supabase_manager.search_similar_vectors(dummy_embedding, match_threshold=0.7, match_count=5)
                print(f"✅ Pretraga vektora uspešna, pronađeno {len(search_results)} rezultata")
                return True
            else:
                print("⚠️ Preskačem test vektora jer nema test dokumenta")
                return True
                
        except Exception as e:
            print(f"❌ Greška pri testiranju vector operacija: {e}")
            return False
    
    async def test_retrieval_sessions(self) -> bool:
        """Test retrieval sesija"""
        print("\n🔎 Testiranje retrieval sesija...")
        
        if not self.supabase_manager:
            print("❌ Supabase manager nije dostupan")
            return False
        
        try:
            # Test čuvanja retrieval sesije
            retrieval_data = {
                'session_id': self.test_session_id,
                'query': 'Test upit',
                'steps': [{'step': 1, 'desc': 'Test step'}],
                'final_results': [{'result': 'rezultat1'}, {'result': 'rezultat2'}]
            }
            
            # Sačuvaj retrieval sesiju
            retrieval_id = self.supabase_manager.save_retrieval_session(
                session_id=retrieval_data['session_id'],
                query=retrieval_data['query'],
                steps=retrieval_data['steps'],
                final_results=retrieval_data['final_results']
            )
            print(f"✅ Retrieval sesija sačuvana sa ID: {retrieval_id}")
            
            # Dohvati retrieval sesije
            retrieval_sessions = self.supabase_manager.get_retrieval_sessions(self.test_session_id)
            if len(retrieval_sessions) > 0:
                latest_session = retrieval_sessions[0]
                if latest_session.get('query') == retrieval_data['query']:
                    print("✅ Retrieval sesija ispravno dohvaćena")
                    return True
                else:
                    print("❌ Retrieval sesija nije ispravno dohvaćena")
                    return False
            else:
                print("❌ Nema retrieval sesija")
                return False
                
        except Exception as e:
            print(f"❌ Greška pri testiranju retrieval sesija: {e}")
            return False
    
    async def test_session_categories(self) -> bool:
        """Test session kategorija"""
        print("\n🏷️ Testiranje session kategorija...")
        
        if not self.supabase_manager:
            print("❌ Supabase manager nije dostupan")
            return False
        
        try:
            # Test dodavanja kategorija
            test_categories = ['Test kategorija 1', 'Test kategorija 2']
            
            # Prvo obriši postojeće kategorije
            self.supabase_manager.client.table('session_categories').delete().eq('session_id', self.test_session_id).execute()
            
            # Dodaj nove kategorije
            for category_name in test_categories:
                self.supabase_manager.client.table('session_categories').insert({
                    'session_id': self.test_session_id,
                    'category_name': category_name,
                    'color': '#3B82F6'
                }).execute()
            
            print("✅ Kategorije dodane")
            
            # Dohvati kategorije
            result = self.supabase_manager.client.table('session_categories').select('*').eq('session_id', self.test_session_id).execute()
            if len(result.data) == len(test_categories):
                print("✅ Kategorije ispravno dohvaćene")
                return True
            else:
                print("❌ Kategorije nisu ispravno dohvaćene")
                return False
                
        except Exception as e:
            print(f"❌ Greška pri testiranju session kategorija: {e}")
            return False
    
    async def test_session_sharing(self) -> bool:
        """Test session deljenja"""
        print("\n🔗 Testiranje session deljenja...")
        
        if not self.supabase_manager:
            print("❌ Supabase manager nije dostupan")
            return False
        
        try:
            # Test kreiranja share link-a
            share_link = f"share_{self.test_session_id}_{int(time.time())}"
            expires_at = (datetime.now() + timedelta(days=7)).isoformat()
            
            # Kreiraj share link
            result = self.supabase_manager.client.table('session_sharing').insert({
                'session_id': self.test_session_id,
                'share_link': share_link,
                'permissions': 'read',
                'expires_at': expires_at,
                'is_active': True
            }).execute()
            
            if result.data:
                self.test_share_link_id = result.data[0]['id']
                print(f"✅ Share link kreiran sa ID: {self.test_share_link_id}")
                
                # Dohvati share linkove
                share_links = self.supabase_manager.client.table('session_sharing').select('*').eq('session_id', self.test_session_id).eq('is_active', True).execute()
                if len(share_links.data) > 0:
                    print("✅ Share linkovi ispravno dohvaćeni")
                    return True
                else:
                    print("❌ Share linkovi nisu ispravno dohvaćeni")
                    return False
            else:
                print("❌ Share link nije kreiran")
                return False
                
        except Exception as e:
            print(f"❌ Greška pri testiranju session deljenja: {e}")
            return False
    
    async def test_database_statistics(self) -> bool:
        """Test statistika baze"""
        print("\n📊 Testiranje statistika baze...")
        
        if not self.supabase_manager:
            print("❌ Supabase manager nije dostupan")
            return False
        
        try:
            # Dohvati statistike
            stats = self.supabase_manager.get_database_stats()
            
            if stats:
                print("✅ Statistike baze dohvaćene:")
                for key, value in stats.items():
                    print(f"   {key}: {value}")
                return True
            else:
                print("❌ Statistike baze nisu dohvaćene")
                return False
                
        except Exception as e:
            print(f"❌ Greška pri testiranju statistika baze: {e}")
            return False
    
    async def test_backend_endpoints(self) -> bool:
        """Test backend endpoint-a"""
        print("\n🌐 Testiranje backend endpoint-a...")
        
        try:
            async with aiohttp.ClientSession() as session:
                # Test health endpoint-a
                async with session.get(f"{self.backend_url}/supabase/health") as response:
                    if response.status == 200:
                        health_data = await response.json()
                        print("✅ Supabase health endpoint radi")
                        print(f"   Status: {health_data.get('status')}")
                    else:
                        print(f"❌ Supabase health endpoint greška: {response.status}")
                        return False
                
                # Test statistika endpoint-a
                async with session.get(f"{self.backend_url}/supabase/stats") as response:
                    if response.status == 200:
                        stats_data = await response.json()
                        print("✅ Supabase stats endpoint radi")
                    else:
                        print(f"❌ Supabase stats endpoint greška: {response.status}")
                        return False
                
                return True
                
        except Exception as e:
            print(f"❌ Greška pri testiranju backend endpoint-a: {e}")
            return False
    
    async def cleanup_test_data(self):
        """Čišćenje test podataka"""
        print("\n🧹 Čišćenje test podataka...")
        
        if not self.supabase_manager:
            return
        
        try:
            # Obriši chat poruke
            self.supabase_manager.client.table('chat_history').delete().eq('session_id', self.test_session_id).execute()
            
            # Obriši session metadata
            self.supabase_manager.client.table('session_metadata').delete().eq('session_id', self.test_session_id).execute()
            
            # Obriši session kategorije
            self.supabase_manager.client.table('session_categories').delete().eq('session_id', self.test_session_id).execute()
            
            # Obriši session sharing
            if self.test_share_link_id:
                self.supabase_manager.client.table('session_sharing').delete().eq('id', self.test_share_link_id).execute()
            
            # Obriši retrieval sesije
            self.supabase_manager.client.table('retrieval_sessions').delete().eq('session_id', self.test_session_id).execute()
            
            # Obriši dokument ako postoji
            if self.test_document_id:
                self.supabase_manager.client.table('document_vectors').delete().eq('document_id', self.test_document_id).execute()
                self.supabase_manager.client.table('documents').delete().eq('id', self.test_document_id).execute()
            
            # Obriši OCR sliku ako postoji
            if self.test_ocr_image_id:
                self.supabase_manager.client.table('ocr_images').delete().eq('id', self.test_ocr_image_id).execute()
            
            print("✅ Test podaci očišćeni")
            
        except Exception as e:
            print(f"⚠️ Greška pri čišćenju test podataka: {e}")
    
    async def run_all_tests(self):
        """Pokretanje svih testova"""
        print("🚀 Pokretanje sveobuhvatnog testa Supabase funkcionalnosti...")
        print("=" * 60)
        
        if not SUPABASE_AVAILABLE:
            print("❌ Supabase nije dostupan - test se ne može pokrenuti")
            return
        
        test_results = []
        
        # Lista svih testova
        tests = [
            ("Supabase konekcija", self.test_supabase_connection),
            ("Chat istorija", self.test_chat_history),
            ("Session management", self.test_session_management),
            ("Document operacije", self.test_document_operations),
            ("OCR operacije", self.test_ocr_operations),
            ("Vector operacije", self.test_vector_operations),
            ("Retrieval sesije", self.test_retrieval_sessions),
            ("Session kategorije", self.test_session_categories),
            ("Session deljenje", self.test_session_sharing),
            ("Statistike baze", self.test_database_statistics),
            ("Backend endpointi", self.test_backend_endpoints),
        ]
        
        # Pokretanje testova
        for test_name, test_func in tests:
            try:
                result = await test_func()
                test_results.append((test_name, result))
                if result:
                    print(f"✅ {test_name}: USPEŠNO")
                else:
                    print(f"❌ {test_name}: NEUSPEŠNO")
            except Exception as e:
                print(f"❌ {test_name}: GREŠKA - {e}")
                test_results.append((test_name, False))
        
        # Čišćenje test podataka
        await self.cleanup_test_data()
        
        # Rezultati
        print("\n" + "=" * 60)
        print("📋 REZULTATI TESTA:")
        print("=" * 60)
        
        successful_tests = sum(1 for _, result in test_results if result)
        total_tests = len(test_results)
        
        for test_name, result in test_results:
            status = "✅ USPEŠNO" if result else "❌ NEUSPEŠNO"
            print(f"{test_name}: {status}")
        
        print(f"\n📊 UKUPNO: {successful_tests}/{total_tests} testova uspešno")
        
        if successful_tests == total_tests:
            print("🎉 SVI TESTOVI SU PROŠLI USPEŠNO!")
        else:
            print("⚠️ NEKI TESTOVI SU NEUSPEŠNI - proveri konfiguraciju")

async def main():
    """Glavna funkcija"""
    tester = ComprehensiveSupabaseTest()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main()) 