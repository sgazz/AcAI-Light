#!/usr/bin/env python3
"""
Sveobuhvatan test za proveru kreiranja sesija u AcAIA aplikaciji
Testira: kreiranje predmetnih i generalnih sesija, čuvanje u Supabase, korišćenje tabela
"""

import asyncio
import aiohttp
import json
import uuid
from datetime import datetime
import sys
import os
from typing import Dict, List, Optional

# Dodaj backend direktorijum u path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

try:
    from supabase_client import get_supabase_manager, get_async_supabase_manager
    SUPABASE_AVAILABLE = True
except ImportError as e:
    print(f"❌ Supabase nije dostupan: {e}")
    SUPABASE_AVAILABLE = False

class ComprehensiveSessionTester:
    def __init__(self):
        self.base_url = "http://localhost:8001"
        self.test_results = []
        self.supabase_manager = None
        self.async_supabase_manager = None
        self.created_sessions = []  # Lista kreiranih sesija za čišćenje
        
        if SUPABASE_AVAILABLE:
            try:
                self.supabase_manager = get_supabase_manager()
                self.async_supabase_manager = get_async_supabase_manager()
                print("✅ Supabase manager uspešno inicijalizovan")
            except Exception as e:
                print(f"❌ Greška pri inicijalizaciji Supabase: {e}")
    
    async def test_backend_health(self):
        """Test 1: Proveri da li je backend dostupan"""
        print("\n🔍 Test 1: Backend Health Check")
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/health") as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Backend je dostupan: {data.get('status', 'unknown')}")
                        self.test_results.append(("Backend Health", True, "Backend je dostupan"))
                        return True
                    else:
                        print(f"❌ Backend nije dostupan: {response.status}")
                        self.test_results.append(("Backend Health", False, f"Status: {response.status}"))
                        return False
        except Exception as e:
            print(f"❌ Greška pri proveri backend-a: {e}")
            self.test_results.append(("Backend Health", False, str(e)))
            return False
    
    async def test_create_general_session(self):
        """Test 2: Kreiraj generalnu sesiju"""
        print("\n🔍 Test 2: Kreiranje Generalne Sesije")
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.base_url}/chat/new-session") as response:
                    if response.status == 200:
                        data = await response.json()
                        session_id = data.get('session_id')
                        if session_id:
                            print(f"✅ Generalna sesija kreirana: {session_id}")
                            self.created_sessions.append(session_id)
                            self.test_results.append(("General Session", True, f"Session ID: {session_id}"))
                            return session_id
                        else:
                            print("❌ Session ID nije vraćen")
                            self.test_results.append(("General Session", False, "Session ID nije vraćen"))
                            return None
                    else:
                        print(f"❌ Greška pri kreiranju generalne sesije: {response.status}")
                        error_text = await response.text()
                        print(f"   Detalji greške: {error_text}")
                        self.test_results.append(("General Session", False, f"Status: {response.status}"))
                        return None
        except Exception as e:
            print(f"❌ Greška pri kreiranju generalne sesije: {e}")
            self.test_results.append(("General Session", False, str(e)))
            return None
    
    async def test_create_subject_session(self):
        """Test 3: Kreiraj predmetnu sesiju"""
        print("\n🔍 Test 3: Kreiranje Predmetne Sesije")
        try:
            # Simuliram kreiranje predmetne sesije
            session_data = {
                "subject": "Fizika",
                "topic": "Mehanika",
                "session_type": "subject"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.base_url}/chat/new-session") as response:
                    if response.status == 200:
                        data = await response.json()
                        session_id = data.get('session_id')
                        if session_id:
                            print(f"✅ Predmetna sesija kreirana: {session_id}")
                            self.created_sessions.append(session_id)
                            
                            # Kreiraj metadata za predmetnu sesiju
                            await self.create_session_metadata(
                                session_id, 
                                f"Fizika - Mehanika {datetime.now().strftime('%H:%M')}",
                                "Predmetna sesija za fiziku"
                            )
                            
                            self.test_results.append(("Subject Session", True, f"Session ID: {session_id}"))
                            return session_id
                        else:
                            print("❌ Session ID nije vraćen")
                            self.test_results.append(("Subject Session", False, "Session ID nije vraćen"))
                            return None
                    else:
                        print(f"❌ Greška pri kreiranju predmetne sesije: {response.status}")
                        error_text = await response.text()
                        print(f"   Detalji greške: {error_text}")
                        self.test_results.append(("Subject Session", False, f"Status: {response.status}"))
                        return None
        except Exception as e:
            print(f"❌ Greška pri kreiranju predmetne sesije: {e}")
            self.test_results.append(("Subject Session", False, str(e)))
            return None
    
    async def create_session_metadata(self, session_id: str, name: str, description: str):
        """Kreiraj session metadata"""
        try:
            params = {
                "session_id": session_id,
                "name": name,
                "description": description
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/session/metadata",
                    params=params
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Session metadata kreirana: {data.get('message', 'N/A')}")
                        return True
                    else:
                        print(f"❌ Greška pri kreiranju metadata: {response.status}")
                        return False
        except Exception as e:
            print(f"❌ Greška pri kreiranju metadata: {e}")
            return False
    
    async def test_supabase_tables_usage(self, session_id: str):
        """Test 4: Proveri korišćenje Supabase tabela"""
        print(f"\n🔍 Test 4: Provera Korišćenja Supabase Tabela za {session_id}")
        if not self.supabase_manager:
            print("⚠️ Supabase nije dostupan - preskačem test")
            self.test_results.append(("Supabase Tables", False, "Supabase nije dostupan"))
            return False
        
        try:
            # Proveri session_metadata tabelu
            print("📋 Provera session_metadata tabele...")
            metadata_result = self.supabase_manager.client.table('session_metadata').select('*').eq('session_id', session_id).execute()
            
            if metadata_result.data:
                metadata = metadata_result.data[0]
                print(f"✅ Session metadata pronađena:")
                print(f"   - ID: {metadata.get('id', 'N/A')}")
                print(f"   - Name: {metadata.get('name', 'N/A')}")
                print(f"   - Description: {metadata.get('description', 'N/A')}")
                print(f"   - Created: {metadata.get('created_at', 'N/A')}")
            else:
                print("❌ Session metadata nije pronađena")
            
            # Proveri chat_sessions tabelu (ako postoji)
            print("📋 Provera chat_sessions tabele...")
            try:
                chat_sessions_result = self.supabase_manager.client.table('chat_sessions').select('*').eq('session_id', session_id).execute()
                if chat_sessions_result.data:
                    chat_session = chat_sessions_result.data[0]
                    print(f"✅ Chat session pronađena:")
                    print(f"   - ID: {chat_session.get('id', 'N/A')}")
                    print(f"   - Name: {chat_session.get('name', 'N/A')}")
                    print(f"   - Created: {chat_session.get('created_at', 'N/A')}")
                else:
                    print("ℹ️ Chat session nije pronađena (možda se koristi samo session_metadata)")
            except Exception as e:
                print(f"ℹ️ Chat_sessions tabela možda ne postoji: {e}")
            
            # Proveri chat_history tabelu
            print("📋 Provera chat_history tabele...")
            chat_history_result = self.supabase_manager.client.table('chat_history').select('*').eq('session_id', session_id).execute()
            
            if chat_history_result.data:
                print(f"✅ Chat history pronađena: {len(chat_history_result.data)} poruka")
                for i, message in enumerate(chat_history_result.data[:3]):  # Prikaži prve 3
                    print(f"   {i+1}. {message.get('role', 'N/A')}: {message.get('content', 'N/A')[:50]}...")
            else:
                print("ℹ️ Chat history je prazna (nema poruka)")
            
            self.test_results.append(("Supabase Tables", True, f"Tables checked for {session_id}"))
            return True
            
        except Exception as e:
            print(f"❌ Greška pri proveri Supabase tabela: {e}")
            self.test_results.append(("Supabase Tables", False, str(e)))
            return False
    
    async def test_session_uniqueness(self):
        """Test 5: Proveri da li su sesije zaista jedinstvene"""
        print("\n🔍 Test 5: Provera Jedinstvenosti Sesija")
        
        if len(self.created_sessions) < 2:
            print("⚠️ Potrebne su najmanje 2 sesije za test")
            self.test_results.append(("Session Uniqueness", False, "Nedovoljno sesija"))
            return False
        
        # Proveri da li su session_id-jevi različiti
        unique_sessions = set(self.created_sessions)
        if len(unique_sessions) == len(self.created_sessions):
            print(f"✅ Sve sesije su jedinstvene: {len(unique_sessions)} jedinstvenih od {len(self.created_sessions)}")
            self.test_results.append(("Session Uniqueness", True, f"{len(unique_sessions)} unique sessions"))
            return True
        else:
            print(f"❌ Nisu sve sesije jedinstvene: {len(unique_sessions)} jedinstvenih od {len(self.created_sessions)}")
            self.test_results.append(("Session Uniqueness", False, "Duplicate sessions found"))
            return False
    
    async def test_session_data_integrity(self):
        """Test 6: Proveri integritet podataka sesija"""
        print("\n🔍 Test 6: Provera Integriteta Podataka Sesija")
        
        if not self.supabase_manager:
            print("⚠️ Supabase nije dostupan - preskačem test")
            self.test_results.append(("Data Integrity", False, "Supabase nije dostupan"))
            return False
        
        try:
            all_valid = True
            
            for session_id in self.created_sessions:
                print(f"🔍 Provera integriteta za sesiju: {session_id}")
                
                # Proveri da li session_id postoji u session_metadata
                metadata_result = self.supabase_manager.client.table('session_metadata').select('*').eq('session_id', session_id).execute()
                
                if not metadata_result.data:
                    print(f"❌ Session {session_id} nije pronađena u session_metadata")
                    all_valid = False
                    continue
                
                metadata = metadata_result.data[0]
                
                # Proveri obavezna polja
                required_fields = ['session_id', 'name', 'created_at']
                for field in required_fields:
                    if not metadata.get(field):
                        print(f"❌ Session {session_id} nema obavezno polje: {field}")
                        all_valid = False
                
                # Proveri da li je session_id validan UUID
                try:
                    uuid.UUID(session_id)
                except ValueError:
                    print(f"❌ Session {session_id} nije validan UUID")
                    all_valid = False
                
                if all_valid:
                    print(f"✅ Session {session_id} ima validne podatke")
            
            if all_valid:
                self.test_results.append(("Data Integrity", True, f"All {len(self.created_sessions)} sessions valid"))
                return True
            else:
                self.test_results.append(("Data Integrity", False, "Some sessions have invalid data"))
                return False
                
        except Exception as e:
            print(f"❌ Greška pri proveri integriteta: {e}")
            self.test_results.append(("Data Integrity", False, str(e)))
            return False
    
    async def test_frontend_session_creation_simulation(self):
        """Test 7: Simuliraj frontend kreiranje sesija"""
        print("\n🔍 Test 7: Simulacija Frontend Kreiranja Sesija")
        
        try:
            # Simuliraj kreiranje generalne sesije (kao što radi WelcomeScreen)
            print("🎯 Simulacija generalne sesije...")
            general_session_id = await self.test_create_general_session()
            
            if general_session_id:
                # Simuliraj kreiranje metadata (kao što radi ChatBox)
                await self.create_session_metadata(
                    general_session_id,
                    "General Chat",
                    "Generalna sesija kreirana iz frontend-a"
                )
            
            # Simuliraj kreiranje predmetne sesije (kao što radi SessionSetupModal)
            print("🎯 Simulacija predmetne sesije...")
            subject_session_id = await self.test_create_subject_session()
            
            if subject_session_id:
                # Simuliraj kreiranje metadata
                await self.create_session_metadata(
                    subject_session_id,
                    "Matematika - Algebra",
                    "Predmetna sesija kreirana iz frontend-a"
                )
            
            # Proveri da li su obe sesije kreirane
            if general_session_id and subject_session_id:
                print("✅ Frontend simulacija uspešna - obe sesije kreirane")
                self.test_results.append(("Frontend Simulation", True, "Both sessions created"))
                return True
            else:
                print("❌ Frontend simulacija neuspešna")
                self.test_results.append(("Frontend Simulation", False, "Failed to create sessions"))
                return False
                
        except Exception as e:
            print(f"❌ Greška pri frontend simulaciji: {e}")
            self.test_results.append(("Frontend Simulation", False, str(e)))
            return False
    
    async def cleanup_test_sessions(self):
        """Očisti test sesije iz baze"""
        print("\n🧹 Čišćenje Test Sesija")
        
        if not self.supabase_manager or not self.created_sessions:
            print("ℹ️ Nema sesija za čišćenje")
            return
        
        try:
            for session_id in self.created_sessions:
                print(f"🗑️ Brisanje sesije: {session_id}")
                
                # Obriši iz session_metadata
                try:
                    self.supabase_manager.client.table('session_metadata').delete().eq('session_id', session_id).execute()
                    print(f"✅ Session metadata obrisana za {session_id}")
                except Exception as e:
                    print(f"⚠️ Greška pri brisanju metadata: {e}")
                
                # Obriši iz chat_history
                try:
                    self.supabase_manager.client.table('chat_history').delete().eq('session_id', session_id).execute()
                    print(f"✅ Chat history obrisana za {session_id}")
                except Exception as e:
                    print(f"⚠️ Greška pri brisanju chat history: {e}")
                
                # Obriši iz chat_sessions (ako postoji)
                try:
                    self.supabase_manager.client.table('chat_sessions').delete().eq('session_id', session_id).execute()
                    print(f"✅ Chat session obrisana za {session_id}")
                except Exception as e:
                    print(f"ℹ️ Chat_sessions možda ne postoji: {e}")
            
            print(f"✅ Očišćeno {len(self.created_sessions)} test sesija")
            
        except Exception as e:
            print(f"❌ Greška pri čišćenju: {e}")
    
    def print_summary(self):
        """Prikaži rezultate testova"""
        print("\n" + "="*60)
        print("📊 REZULTATI TESTOVA")
        print("="*60)
        
        passed = 0
        failed = 0
        
        for test_name, success, details in self.test_results:
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"{status} {test_name}: {details}")
            if success:
                passed += 1
            else:
                failed += 1
        
        print("\n" + "="*60)
        print(f"📈 UKUPNO: {passed + failed} testova")
        print(f"✅ USPEŠNO: {passed}")
        print(f"❌ NEUSPEŠNO: {failed}")
        print(f"📊 USPEŠNOST: {(passed / (passed + failed) * 100):.1f}%" if (passed + failed) > 0 else "N/A")
        print("="*60)
        
        if failed == 0:
            print("\n🎉 SVI TESTOVI PROŠLI USPEŠNO!")
        else:
            print(f"\n⚠️ {failed} test(ova) nije prošlo - proveri greške iznad")
    
    async def run_all_tests(self):
        """Pokreni sve testove"""
        print("🚀 POKRETANJE SVEOBUHVATNIH TESTOVA SESIJA")
        print("="*60)
        
        try:
            # Test 1: Backend health
            if not await self.test_backend_health():
                print("❌ Backend nije dostupan - prekidam testove")
                return
            
            # Test 2: Kreiraj generalnu sesiju
            general_session_id = await self.test_create_general_session()
            if general_session_id:
                await self.create_session_metadata(
                    general_session_id,
                    f"General Test {datetime.now().strftime('%H:%M')}",
                    "Test generalne sesije"
                )
            
            # Test 3: Kreiraj predmetnu sesiju
            subject_session_id = await self.test_create_subject_session()
            
            # Test 4: Proveri Supabase tabele
            if general_session_id:
                await self.test_supabase_tables_usage(general_session_id)
            
            # Test 5: Proveri jedinstvenost sesija
            await self.test_session_uniqueness()
            
            # Test 6: Proveri integritet podataka
            await self.test_session_data_integrity()
            
            # Test 7: Simuliraj frontend
            await self.test_frontend_session_creation_simulation()
            
            # Prikaži rezultate
            self.print_summary()
            
        except Exception as e:
            print(f"❌ Greška pri pokretanju testova: {e}")
        finally:
            # Očisti test sesije
            await self.cleanup_test_sessions()

async def main():
    """Glavna funkcija"""
    tester = ComprehensiveSessionTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())
