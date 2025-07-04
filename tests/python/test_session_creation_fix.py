#!/usr/bin/env python3
"""
Test za proveru popravke kreiranja sesija
Testira: WelcomeScreen -> SessionSetupModal -> ChatBox flow sa stvarnim kreiranjem sesija
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

class SessionCreationFixTester:
    def __init__(self):
        self.base_url = "http://localhost:8001"
        self.test_results = []
        self.supabase_manager = None
        self.created_sessions = []
        
        if SUPABASE_AVAILABLE:
            try:
                self.supabase_manager = get_supabase_manager()
                print("✅ Supabase manager uspešno inicijalizovan")
            except Exception as e:
                print(f"❌ Greška pri inicijalizaciji Supabase: {e}")
    
    async def test_welcome_screen_flow(self):
        """Test 1: Simuliraj WelcomeScreen -> SessionSetupModal -> ChatBox flow"""
        print("\n🎭 TEST 1: WelcomeScreen -> SessionSetupModal -> ChatBox Flow")
        print("="*60)
        
        # Korak 1: Korisnik klikne "Započni sada" na WelcomeScreen-u
        print("👤 WelcomeScreen: Korisnik klikne 'Započni sada'")
        
        # Korak 2: Otvara se SessionSetupModal
        print("👤 SessionSetupModal: Modal se otvara")
        
        # Korak 3: Korisnik bira predmetnu sesiju
        print("👤 SessionSetupModal: Korisnik bira Matematika -> Algebra")
        
        # Korak 4: Simuliraj kreiranje sesije kako radi WelcomeScreen.handleStartSession
        session_id = await self.simulate_welcome_screen_session_creation("matematika", "Algebra", "subject")
        
        if session_id:
            print(f"✅ Sesija kreirana: {session_id}")
            
            # Korak 5: Simuliraj da se ChatBox učita sa tom sesijom
            print("👤 ChatBox: Komponenta se učita sa kreiranom sesijom")
            
            # Korak 6: Korisnik šalje poruku
            print("👤 ChatBox: Korisnik šalje poruku")
            await self.send_message(session_id, "Zdravo! Treba mi pomoć sa algebrom")
            
            # Proveri da li je poruka u odgovarajućoj sesiji
            await self.verify_session_messages(session_id, 1)
            
            self.test_results.append(("WelcomeScreen Flow", True, f"Sesija kreirana i poruka poslata: {session_id}"))
            return session_id
        else:
            self.test_results.append(("WelcomeScreen Flow", False, "Nije moguće kreirati sesiju"))
            return None
    
    async def test_multiple_sessions_flow(self):
        """Test 2: Testiraj kreiranje više sesija"""
        print("\n🎭 TEST 2: Kreiranje Više Sesija")
        print("="*60)
        
        # Korak 1: Kreiraj prvu sesiju (predmetnu)
        print("👤 Kreiranje prve sesije (Matematika)")
        session1_id = await self.simulate_welcome_screen_session_creation("matematika", "Geometrija", "subject")
        
        if session1_id:
            await self.send_message(session1_id, "Prva poruka u matematičkoj sesiji")
            
            # Korak 2: Kreiraj drugu sesiju (generalnu)
            print("👤 Kreiranje druge sesije (General)")
            session2_id = await self.simulate_welcome_screen_session_creation("general", "General Chat", "general")
            
            if session2_id:
                await self.send_message(session2_id, "Prva poruka u generalnoj sesiji")
                
                # Korak 3: Vrati se na prvu sesiju
                print("👤 Povratak na prvu sesiju")
                await self.send_message(session1_id, "Druga poruka u matematičkoj sesiji")
                
                # Proveri da li su sesije različite
                if session1_id != session2_id:
                    print("✅ Sesije su različite - problem rešen!")
                    self.test_results.append(("Multiple Sessions", True, f"2 različite sesije: {session1_id}, {session2_id}"))
                    return [session1_id, session2_id]
                else:
                    print("❌ Sesije su iste - problem nije rešen")
                    self.test_results.append(("Multiple Sessions", False, "Sesije su iste"))
                    return None
            else:
                self.test_results.append(("Multiple Sessions", False, "Nije moguće kreirati drugu sesiju"))
                return None
        else:
            self.test_results.append(("Multiple Sessions", False, "Nije moguće kreirati prvu sesiju"))
            return None
    
    async def test_session_metadata_creation(self):
        """Test 3: Proveri da li se metadata kreira ispravno"""
        print("\n🎭 TEST 3: Session Metadata Kreiranje")
        print("="*60)
        
        # Kreiraj sesiju sa specifičnim metadata
        session_id = await self.simulate_welcome_screen_session_creation("fizika", "Mehanika", "subject")
        
        if session_id:
            # Proveri da li se metadata kreira u Supabase
            if self.supabase_manager:
                try:
                    result = self.supabase_manager.client.table('session_metadata').select('*').eq('session_id', session_id).execute()
                    
                    if result.data:
                        metadata = result.data[0]
                        print(f"✅ Session metadata pronađena:")
                        print(f"   - Name: {metadata.get('name', 'N/A')}")
                        print(f"   - Description: {metadata.get('description', 'N/A')}")
                        
                        # Proveri da li ima očekivane informacije
                        if "Fizika - Mehanika" in metadata.get('name', ''):
                            print("✅ Metadata sadrži očekivane informacije")
                            self.test_results.append(("Session Metadata", True, f"Metadata kreiran: {metadata.get('name')}"))
                            return session_id
                        else:
                            print("❌ Metadata ne sadrži očekivane informacije")
                            self.test_results.append(("Session Metadata", False, "Metadata ne sadrži očekivane informacije"))
                            return None
                    else:
                        print("❌ Session metadata nije pronađena")
                        self.test_results.append(("Session Metadata", False, "Metadata nije pronađen"))
                        return None
                except Exception as e:
                    print(f"❌ Greška pri proveri metadata: {e}")
                    self.test_results.append(("Session Metadata", False, str(e)))
                    return None
            else:
                print("⚠️ Supabase nije dostupan - preskačem test")
                self.test_results.append(("Session Metadata", False, "Supabase nije dostupan"))
                return None
        else:
            self.test_results.append(("Session Metadata", False, "Nije moguće kreirati sesiju"))
            return None
    
    async def simulate_welcome_screen_session_creation(self, subject: str, topic: str, sessionType: str) -> Optional[str]:
        """Simuliraj kako WelcomeScreen kreira sesiju"""
        try:
            # Korak 1: Kreiraj sesiju (kao što radi WelcomeScreen.handleStartSession)
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.base_url}/chat/new-session") as response:
                    if response.status == 200:
                        data = await response.json()
                        session_id = data.get('session_id')
                        
                        if session_id:
                            self.created_sessions.append(session_id)
                            
                            # Korak 2: Kreiraj session metadata
                            session_title = 'General Chat' if sessionType == 'general' else f"{subject.capitalize()} - {topic}"
                            
                            metadata_data = {
                                "session_id": session_id,
                                "name": session_title,
                                "description": f"{sessionType.capitalize()} sesija za {'opšta pitanja' if sessionType == 'general' else f'{subject.capitalize()} - {topic}'}"
                            }
                            
                            async with session.post(
                                f"{self.base_url}/session/metadata",
                                params=metadata_data
                            ) as metadata_response:
                                if metadata_response.status == 200:
                                    print(f"✅ Session metadata kreiran za: {session_title}")
                                else:
                                    print(f"⚠️ Greška pri kreiranju metadata: {metadata_response.status}")
                            
                            return session_id
        except Exception as e:
            print(f"❌ Greška pri simulaciji WelcomeScreen-a: {e}")
        return None
    
    async def send_message(self, session_id: str, content: str):
        """Pošalji poruku u sesiju"""
        try:
            message_data = {
                "message": content,
                "session_id": session_id
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/chat",
                    json=message_data
                ) as response:
                    if response.status == 200:
                        print(f"✅ Poruka poslata: {content[:30]}...")
                        return True
                    else:
                        print(f"❌ Greška pri slanju poruke: {response.status}")
                        return False
        except Exception as e:
            print(f"❌ Greška pri slanju poruke: {e}")
            return False
    
    async def verify_session_messages(self, session_id: str, expected_count: int):
        """Proveri da li su poruke u odgovarajućoj sesiji"""
        if not self.supabase_manager:
            print("⚠️ Supabase nije dostupan - preskačem verifikaciju")
            return
        
        try:
            result = self.supabase_manager.client.table('chat_history').select('*').eq('session_id', session_id).execute()
            actual_count = len(result.data) if result.data else 0
            
            if actual_count >= expected_count:
                print(f"✅ Sesija {session_id} ima {actual_count} poruka (očekivano: {expected_count})")
            else:
                print(f"❌ Sesija {session_id} ima {actual_count} poruka (očekivano: {expected_count})")
                
        except Exception as e:
            print(f"❌ Greška pri verifikaciji poruka: {e}")
    
    async def cleanup_test_sessions(self):
        """Očisti test sesije"""
        print("\n🧹 Čišćenje Test Sesija")
        
        if not self.supabase_manager or not self.created_sessions:
            print("ℹ️ Nema sesija za čišćenje")
            return
        
        try:
            for session_id in self.created_sessions:
                print(f"🗑️ Brisanje sesije: {session_id}")
                
                # Obriši iz chat_history
                try:
                    self.supabase_manager.client.table('chat_history').delete().eq('session_id', session_id).execute()
                    print(f"✅ Chat history obrisana za {session_id}")
                except Exception as e:
                    print(f"⚠️ Greška pri brisanju chat history: {e}")
                
                # Obriši iz session_metadata
                try:
                    self.supabase_manager.client.table('session_metadata').delete().eq('session_id', session_id).execute()
                    print(f"✅ Session metadata obrisana za {session_id}")
                except Exception as e:
                    print(f"⚠️ Greška pri brisanju metadata: {e}")
            
            print(f"✅ Očišćeno {len(self.created_sessions)} test sesija")
            
        except Exception as e:
            print(f"❌ Greška pri čišćenju: {e}")
    
    def print_summary(self):
        """Prikaži rezultate testova"""
        print("\n" + "="*60)
        print("📊 REZULTATI TESTOVA POPRAVKE")
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
            print("\n🎉 PROBLEM REŠEN! SVE SESIJE SE KREIRAJU ISPRAVNO!")
        else:
            print(f"\n⚠️ {failed} test(ova) nije prošlo - problem nije potpuno rešen")
    
    async def run_all_tests(self):
        """Pokreni sve testove"""
        print("🚀 POKRETANJE TESTOVA POPRAVKE KREIRANJA SESIJA")
        print("="*60)
        
        try:
            # Test 1: WelcomeScreen flow
            await self.test_welcome_screen_flow()
            
            # Test 2: Multiple sessions
            await self.test_multiple_sessions_flow()
            
            # Test 3: Session metadata
            await self.test_session_metadata_creation()
            
            # Prikaži rezultate
            self.print_summary()
            
        except Exception as e:
            print(f"❌ Greška pri pokretanju testova: {e}")
        finally:
            # Očisti test sesije
            await self.cleanup_test_sessions()

async def main():
    """Glavna funkcija"""
    tester = SessionCreationFixTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())
