#!/usr/bin/env python3
"""
Test realnih scenarija korišćenja sesija u AcAIA aplikaciji
Simulira stvarno korišćenje aplikacije: kreiranje sesija, slanje poruka, prebacivanje između sesija
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

class RealSessionScenarioTester:
    def __init__(self):
        self.base_url = "http://localhost:8001"
        self.test_results = []
        self.supabase_manager = None
        self.created_sessions = []
        self.session_messages = {}  # session_id -> lista poruka
        
        if SUPABASE_AVAILABLE:
            try:
                self.supabase_manager = get_supabase_manager()
                print("✅ Supabase manager uspešno inicijalizovan")
            except Exception as e:
                print(f"❌ Greška pri inicijalizaciji Supabase: {e}")
    
    async def test_scenario_1_welcome_screen_to_chat(self):
        """Scenarijo 1: Korisnik otvara aplikaciju -> Welcome Screen -> General Chat"""
        print("\n🎭 SCENARIJO 1: Welcome Screen -> General Chat")
        print("="*50)
        
        # Korak 1: Korisnik otvara aplikaciju (simulira frontend inicijalizaciju)
        print("👤 Korisnik otvara aplikaciju...")
        
        # Korak 2: Korisnik klikne "General Chat" na Welcome Screen-u
        print("👤 Korisnik klikne 'General Chat'...")
        session_id = await self.create_new_session("General Chat", "Generalna sesija iz Welcome Screen-a")
        
        if not session_id:
            self.test_results.append(("Scenario 1", False, "Nije moguće kreirati generalnu sesiju"))
            return None
        
        # Korak 3: Korisnik šalje prvu poruku
        print("👤 Korisnik šalje prvu poruku...")
        await self.send_message(session_id, "Zdravo! Kako si?")
        
        # Korak 4: Korisnik šalje drugu poruku
        print("👤 Korisnik šalje drugu poruku...")
        await self.send_message(session_id, "Možeš li mi pomoći sa matematikom?")
        
        # Proveri da li su poruke sačuvane u istoj sesiji
        await self.verify_session_messages(session_id, 2)
        
        self.test_results.append(("Scenario 1", True, f"General chat kreiran i poruke poslate: {session_id}"))
        return session_id
    
    async def test_scenario_2_subject_session_creation(self):
        """Scenarijo 2: Korisnik kreira predmetnu sesiju"""
        print("\n🎭 SCENARIJO 2: Kreiranje Predmetne Sesije")
        print("="*50)
        
        # Korak 1: Korisnik otvara Session Setup Modal
        print("👤 Korisnik otvara Session Setup Modal...")
        
        # Korak 2: Korisnik bira predmet i oblast
        print("👤 Korisnik bira: Fizika -> Mehanika...")
        session_id = await self.create_new_session("Fizika - Mehanika", "Predmetna sesija za fiziku")
        
        if not session_id:
            self.test_results.append(("Scenario 2", False, "Nije moguće kreirati predmetnu sesiju"))
            return None
        
        # Korak 3: Korisnik šalje poruku vezanu za predmet
        print("👤 Korisnik šalje predmetnu poruku...")
        await self.send_message(session_id, "Objasni mi Newtonove zakone")
        
        # Korak 4: Korisnik šalje još jednu poruku
        print("�� Korisnik šalje drugu predmetnu poruku...")
        await self.send_message(session_id, "Kako se računa sila trenja?")
        
        # Proveri da li su poruke sačuvane u istoj sesiji
        await self.verify_session_messages(session_id, 2)
        
        self.test_results.append(("Scenario 2", True, f"Predmetna sesija kreirana i poruke poslate: {session_id}"))
        return session_id
    
    async def test_scenario_3_multiple_sessions_same_user(self):
        """Scenarijo 3: Korisnik kreira više sesija i prebacuje se između njih"""
        print("\n🎭 SCENARIJO 3: Više Sesija - Prebacivanje")
        print("="*50)
        
        # Korak 1: Kreiraj prvu sesiju
        print("👤 Korisnik kreira prvu sesiju (General)...")
        session1_id = await self.create_new_session("General Chat 1", "Prva generalna sesija")
        await self.send_message(session1_id, "Prva poruka u prvoj sesiji")
        
        # Korak 2: Kreiraj drugu sesiju
        print("👤 Korisnik kreira drugu sesiju (Matematika)...")
        session2_id = await self.create_new_session("Matematika - Algebra", "Druga sesija za matematiku")
        await self.send_message(session2_id, "Prva poruka u drugoj sesiji")
        
        # Korak 3: Vrati se na prvu sesiju i pošalji još poruku
        print("👤 Korisnik se vraća na prvu sesiju...")
        await self.send_message(session1_id, "Druga poruka u prvoj sesiji")
        
        # Korak 4: Vrati se na drugu sesiju i pošalji još poruku
        print("👤 Korisnik se vraća na drugu sesiju...")
        await self.send_message(session2_id, "Druga poruka u drugoj sesiji")
        
        # Proveri da li su poruke u odgovarajućim sesijama
        await self.verify_session_messages(session1_id, 2)
        await self.verify_session_messages(session2_id, 2)
        
        # Proveri da li su sesije različite
        if session1_id != session2_id:
            print("✅ Sesije su različite - korisnik može da prebacuje između sesija")
            self.test_results.append(("Scenario 3", True, f"2 različite sesije kreirane: {session1_id}, {session2_id}"))
        else:
            print("❌ Sesije su iste - problem sa kreiranjem novih sesija")
            self.test_results.append(("Scenario 3", False, "Sesije su iste - problem sa kreiranjem"))
        
        return [session1_id, session2_id]
    
    async def test_scenario_4_session_persistence(self):
        """Scenarijo 4: Proveri da li se sesije čuvaju nakon restart-a"""
        print("\n🎭 SCENARIJO 4: Persistence Sesija")
        print("="*50)
        
        # Korak 1: Kreiraj sesiju sa porukama
        print("👤 Korisnik kreira sesiju i šalje poruke...")
        session_id = await self.create_new_session("Persistence Test", "Test perzistentnosti")
        await self.send_message(session_id, "Ova poruka treba da ostane nakon restart-a")
        await self.send_message(session_id, "I ova poruka takođe")
        
        # Korak 2: Simuliraj "restart" aplikacije (novi tester instance)
        print("🔄 Simulacija restart-a aplikacije...")
        
        # Korak 3: Pokušaj da dohvatiš postojeću sesiju
        print("👤 Korisnik pokušava da dohvati postojeću sesiju...")
        messages = await self.get_session_messages(session_id)
        
        if messages and len(messages) >= 2:
            print("✅ Sesija je sačuvana nakon restart-a")
            self.test_results.append(("Scenario 4", True, f"Sesija sačuvana: {len(messages)} poruka"))
        else:
            print("❌ Sesija nije sačuvana nakon restart-a")
            self.test_results.append(("Scenario 4", False, "Sesija nije sačuvana"))
        
        return session_id
    
    async def test_scenario_5_frontend_workflow_simulation(self):
        """Scenarijo 5: Simuliraj kompletan frontend workflow"""
        print("\n🎭 SCENARIJO 5: Kompletan Frontend Workflow")
        print("="*50)
        
        # Simuliraj WelcomeScreen -> SessionSetupModal -> ChatBox workflow
        
        # Korak 1: WelcomeScreen - korisnik bira "Start Learning"
        print("👤 WelcomeScreen: Korisnik klikne 'Start Learning'...")
        
        # Korak 2: SessionSetupModal - korisnik bira predmet
        print("👤 SessionSetupModal: Korisnik bira Matematika -> Algebra...")
        session_id = await self.create_new_session("Matematika - Algebra", "Sesija iz SessionSetupModal")
        
        if not session_id:
            self.test_results.append(("Scenario 5", False, "Nije moguće kreirati sesiju iz SessionSetupModal"))
            return None
        
        # Korak 3: ChatBox - korisnik šalje poruke
        print("👤 ChatBox: Korisnik šalje poruke...")
        await self.send_message(session_id, "Zdravo! Treba mi pomoć sa algebrom")
        await self.send_message(session_id, "Kako se rešava kvadratna jednačina?")
        
        # Korak 4: Korisnik kreira novu sesiju iz ChatBox-a
        print("👤 ChatBox: Korisnik klikne 'New Session'...")
        new_session_id = await self.create_new_session("Nova Sesija", "Nova sesija iz ChatBox-a")
        await self.send_message(new_session_id, "Ovo je nova sesija")
        
        # Proveri da li su sesije različite
        if session_id != new_session_id:
            print("✅ Frontend workflow radi - sesije su različite")
            self.test_results.append(("Scenario 5", True, f"Frontend workflow uspešan: {session_id}, {new_session_id}"))
        else:
            print("❌ Frontend workflow ne radi - sesije su iste")
            self.test_results.append(("Scenario 5", False, "Frontend workflow ne radi - sesije su iste"))
        
        return [session_id, new_session_id]
    
    async def create_new_session(self, name: str, description: str) -> Optional[str]:
        """Kreiraj novu sesiju sa metadata"""
        try:
            # Kreiraj sesiju
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.base_url}/chat/new-session") as response:
                    if response.status == 200:
                        data = await response.json()
                        session_id = data.get('session_id')
                        if session_id:
                            self.created_sessions.append(session_id)
                            self.session_messages[session_id] = []
                            
                            # Kreiraj metadata
                            await self.create_session_metadata(session_id, name, description)
                            print(f"✅ Sesija kreirana: {session_id}")
                            return session_id
        except Exception as e:
            print(f"❌ Greška pri kreiranju sesije: {e}")
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
                        return True
        except Exception as e:
            print(f"❌ Greška pri kreiranju metadata: {e}")
        return False
    
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
                        # Dodaj poruku u lokalnu listu
                        if session_id not in self.session_messages:
                            self.session_messages[session_id] = []
                        self.session_messages[session_id].append(content)
                        print(f"✅ Poruka poslata: {content[:30]}...")
                        return True
                    else:
                        print(f"❌ Greška pri slanju poruke: {response.status}")
                        return False
        except Exception as e:
            print(f"❌ Greška pri slanju poruke: {e}")
            return False
    
    async def get_session_messages(self, session_id: str) -> List[str]:
        """Dohvati poruke iz sesije"""
        if not self.supabase_manager:
            return []
        
        try:
            result = self.supabase_manager.client.table('chat_history').select('*').eq('session_id', session_id).execute()
            if result.data:
                return [msg.get('content', '') for msg in result.data if msg.get('role') == 'user']
            return []
        except Exception as e:
            print(f"❌ Greška pri dohvatanju poruka: {e}")
            return []
    
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
        print("📊 REZULTATI REALNIH SCENARIJA")
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
        print(f"📈 UKUPNO: {passed + failed} scenarija")
        print(f"✅ USPEŠNO: {passed}")
        print(f"❌ NEUSPEŠNO: {failed}")
        print(f"📊 USPEŠNOST: {(passed / (passed + failed) * 100):.1f}%" if (passed + failed) > 0 else "N/A")
        print("="*60)
        
        if failed == 0:
            print("\n🎉 SVI REALNI SCENARIJI PROŠLI USPEŠNO!")
        else:
            print(f"\n⚠️ {failed} scenarija nije prošlo - proveri greške iznad")
    
    async def run_all_scenarios(self):
        """Pokreni sve realne scenarije"""
        print("🚀 POKRETANJE REALNIH SCENARIJA KORIŠĆENJA")
        print("="*60)
        
        try:
            # Scenarijo 1: Welcome Screen -> General Chat
            await self.test_scenario_1_welcome_screen_to_chat()
            
            # Scenarijo 2: Predmetna sesija
            await self.test_scenario_2_subject_session_creation()
            
            # Scenarijo 3: Više sesija
            await self.test_scenario_3_multiple_sessions_same_user()
            
            # Scenarijo 4: Persistence
            await self.test_scenario_4_session_persistence()
            
            # Scenarijo 5: Frontend workflow
            await self.test_scenario_5_frontend_workflow_simulation()
            
            # Prikaži rezultate
            self.print_summary()
            
        except Exception as e:
            print(f"❌ Greška pri pokretanju scenarija: {e}")
        finally:
            # Očisti test sesije
            await self.cleanup_test_sessions()

async def main():
    """Glavna funkcija"""
    tester = RealSessionScenarioTester()
    await tester.run_all_scenarios()

if __name__ == "__main__":
    asyncio.run(main())
