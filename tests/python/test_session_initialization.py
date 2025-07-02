#!/usr/bin/env python3
"""
Test skripta za proveru inicijalizacije sesija u AcAIA aplikaciji
Testira: kreiranje sesije, čuvanje u Supabase, dohvatanje metadata
"""

import asyncio
import aiohttp
import json
import uuid
from datetime import datetime
import sys
import os

# Dodaj backend direktorijum u path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

try:
    from supabase_client import get_supabase_manager, get_async_supabase_manager
    SUPABASE_AVAILABLE = True
except ImportError as e:
    print(f"❌ Supabase nije dostupan: {e}")
    SUPABASE_AVAILABLE = False

class SessionInitializationTester:
    def __init__(self):
        self.base_url = "http://localhost:8001"
        self.test_results = []
        self.supabase_manager = None
        self.async_supabase_manager = None
        
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
    
    async def test_create_new_session(self):
        """Test 2: Kreiraj novu sesiju"""
        print("\n🔍 Test 2: Kreiranje Nove Sesije")
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.base_url}/chat/new-session") as response:
                    if response.status == 200:
                        data = await response.json()
                        session_id = data.get('session_id')
                        if session_id:
                            print(f"✅ Nova sesija kreirana: {session_id}")
                            self.test_results.append(("Create Session", True, f"Session ID: {session_id}"))
                            return session_id
                        else:
                            print("❌ Session ID nije vraćen")
                            self.test_results.append(("Create Session", False, "Session ID nije vraćen"))
                            return None
                    else:
                        print(f"❌ Greška pri kreiranju sesije: {response.status}")
                        self.test_results.append(("Create Session", False, f"Status: {response.status}"))
                        return None
        except Exception as e:
            print(f"❌ Greška pri kreiranju sesije: {e}")
            self.test_results.append(("Create Session", False, str(e)))
            return None
    
    async def test_session_metadata_creation(self, session_id: str):
        """Test 3: Kreiraj session metadata"""
        print(f"\n🔍 Test 3: Kreiranje Session Metadata za {session_id}")
        try:
            # Koristi query parametre umesto JSON body
            params = {
                "session_id": session_id,
                "name": f"Test Sesija {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                "description": "Automatski kreirana test sesija"
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/session/metadata",
                    params=params
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Session metadata kreirana: {data.get('message', 'N/A')}")
                        self.test_results.append(("Session Metadata", True, f"Message: {data.get('message', 'N/A')}"))
                        return True
                    else:
                        print(f"❌ Greška pri kreiranju metadata: {response.status}")
                        error_text = await response.text()
                        print(f"   Detalji greške: {error_text}")
                        self.test_results.append(("Session Metadata", False, f"Status: {response.status}"))
                        return False
        except Exception as e:
            print(f"❌ Greška pri kreiranju metadata: {e}")
            self.test_results.append(("Session Metadata", False, str(e)))
            return False
    
    async def test_get_session_metadata(self, session_id: str):
        """Test 4: Dohvati session metadata"""
        print(f"\n🔍 Test 4: Dohvatanje Session Metadata za {session_id}")
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/session/metadata/{session_id}") as response:
                    if response.status == 200:
                        data = await response.json()
                        print(f"✅ Session metadata dohvaćena:")
                        print(f"   - Name: {data.get('name', 'N/A')}")
                        print(f"   - Description: {data.get('description', 'N/A')}")
                        print(f"   - Created: {data.get('created_at', 'N/A')}")
                        self.test_results.append(("Get Metadata", True, f"Name: {data.get('name', 'N/A')}"))
                        return True
                    else:
                        print(f"❌ Greška pri dohvatanju metadata: {response.status}")
                        self.test_results.append(("Get Metadata", False, f"Status: {response.status}"))
                        return False
        except Exception as e:
            print(f"❌ Greška pri dohvatanju metadata: {e}")
            self.test_results.append(("Get Metadata", False, str(e)))
            return False
    
    async def test_supabase_session_storage(self, session_id: str):
        """Test 5: Proveri čuvanje u Supabase"""
        print(f"\n🔍 Test 5: Provera Supabase Čuvanja za {session_id}")
        if not self.supabase_manager:
            print("⚠️ Supabase nije dostupan - preskačem test")
            self.test_results.append(("Supabase Storage", False, "Supabase nije dostupan"))
            return False
        
        try:
            # Proveri da li sesija postoji u Supabase
            metadata = self.supabase_manager.get_session_metadata(session_id)
            if metadata:
                print(f"✅ Sesija pronađena u Supabase:")
                print(f"   - ID: {metadata.get('id', 'N/A')}")
                print(f"   - Name: {metadata.get('name', 'N/A')}")
                print(f"   - Created: {metadata.get('created_at', 'N/A')}")
                self.test_results.append(("Supabase Storage", True, f"Found: {metadata.get('name', 'N/A')}"))
                return True
            else:
                print("❌ Sesija nije pronađena u Supabase")
                self.test_results.append(("Supabase Storage", False, "Sesija nije pronađena"))
                return False
        except Exception as e:
            print(f"❌ Greška pri proveri Supabase: {e}")
            self.test_results.append(("Supabase Storage", False, str(e)))
            return False
    
    async def test_session_listing(self):
        """Test 6: Lista svih sesija"""
        print("\n🔍 Test 6: Lista Svih Sesija")
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/sessions/metadata") as response:
                    if response.status == 200:
                        data = await response.json()
                        sessions = data.get('sessions', [])
                        print(f"✅ Pronađeno {len(sessions)} sesija:")
                        for session in sessions[:3]:  # Prikaži prve 3
                            print(f"   - {session.get('name', 'N/A')} ({session.get('id', 'N/A')})")
                        self.test_results.append(("Session Listing", True, f"Found {len(sessions)} sessions"))
                        return True
                    else:
                        print(f"❌ Greška pri listanju sesija: {response.status}")
                        self.test_results.append(("Session Listing", False, f"Status: {response.status}"))
                        return False
        except Exception as e:
            print(f"❌ Greška pri listanju sesija: {e}")
            self.test_results.append(("Session Listing", False, str(e)))
            return False
    
    async def test_session_validation(self, session_id: str):
        """Test 7: Validacija session ID formata"""
        print(f"\n🔍 Test 7: Validacija Session ID Formata")
        try:
            # Proveri da li je session_id validan UUID
            uuid.UUID(session_id)
            print(f"✅ Session ID je validan UUID: {session_id}")
            self.test_results.append(("Session Validation", True, "Valid UUID format"))
            return True
        except ValueError:
            print(f"❌ Session ID nije validan UUID: {session_id}")
            self.test_results.append(("Session Validation", False, "Invalid UUID format"))
            return False
    
    def print_summary(self):
        """Prikaži rezultate testova"""
        print("\n" + "="*60)
        print("📊 REZULTATI TESTOVA INICIJALIZACIJE SESIJE")
        print("="*60)
        
        passed = 0
        total = len(self.test_results)
        
        for test_name, success, details in self.test_results:
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"{status} {test_name}: {details}")
            if success:
                passed += 1
        
        print("\n" + "-"*60)
        print(f"📈 UKUPNO: {passed}/{total} testova prošlo")
        print(f"📊 USPEŠNOST: {(passed/total)*100:.1f}%")
        
        if passed == total:
            print("🎉 SVI TESTOVI PROŠLI - Inicijalizacija sesija funkcioniše ispravno!")
        else:
            print("⚠️ NEKI TESTOVI NISU PROŠLI - Potrebno je proveriti greške")
        
        print("="*60)
    
    async def run_all_tests(self):
        """Pokreni sve testove"""
        print("🚀 POKRETANJE TESTOVA INICIJALIZACIJE SESIJE")
        print("="*60)
        
        # Test 1: Backend health
        if not await self.test_backend_health():
            print("❌ Backend nije dostupan - prekidam testove")
            return
        
        # Test 2: Kreiraj sesiju
        session_id = await self.test_create_new_session()
        if not session_id:
            print("❌ Nije moguće kreirati sesiju - prekidam testove")
            return
        
        # Test 7: Validacija session ID
        await self.test_session_validation(session_id)
        
        # Test 3: Kreiraj metadata
        await self.test_session_metadata_creation(session_id)
        
        # Test 4: Dohvati metadata
        await self.test_get_session_metadata(session_id)
        
        # Test 5: Proveri Supabase
        await self.test_supabase_session_storage(session_id)
        
        # Test 6: Lista sesija
        await self.test_session_listing()
        
        # Prikaži rezultate
        self.print_summary()

async def main():
    """Glavna funkcija"""
    tester = SessionInitializationTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main()) 