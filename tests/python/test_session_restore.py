#!/usr/bin/env python3
"""
Test za proveru povratka sesija iz istorije
Testira: ChatHistorySidebar -> ChatBox flow za povratak ranijih sesija
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

class SessionRestoreTester:
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
    
    async def test_session_restore_flow(self):
        """Test 1: Simuliraj povratak sesije iz istorije"""
        print("\n🎭 TEST 1: Povratak Sesije iz Istorije")
        print("="*60)
        
        # Korak 1: Kreiraj sesiju sa porukama
        print("👤 Kreiranje test sesije sa porukama")
        session_id = await self.create_test_session_with_messages()
        
        if not session_id:
            self.test_results.append(("Session Restore Flow", False, "Nije moguće kreirati test sesiju"))
            return
        
        # Korak 2: Simuliraj da korisnik otvara istoriju
        print("👤 Korisnik otvara istoriju razgovora")
        
        # Korak 3: Simuliraj da korisnik klikne "Povrati sesiju"
        print("👤 Korisnik klikne 'Povrati sesiju'")
        restored_messages = await self.simulate_session_restore(session_id)
        
        if restored_messages:
            print(f"✅ Sesija povraćena sa {len(restored_messages)} poruka")
            
            # Korak 4: Proveri da li su poruke ispravno učitane
            if len(restored_messages) == 3:  # Očekujemo 3 poruke
                print("✅ Sve poruke su povraćene")
                self.test_results.append(("Session Restore Flow", True, f"Sesija povraćena sa {len(restored_messages)} poruka"))
            else:
                print(f"❌ Očekivano 3 poruke, dobijeno {len(restored_messages)}")
                self.test_results.append(("Session Restore Flow", False, f"Pogrešan broj poruka: {len(restored_messages)}"))
        else:
            self.test_results.append(("Session Restore Flow", False, "Nije moguće povratiti sesiju"))
    
    async def test_multiple_sessions_restore(self):
        """Test 2: Testiraj povratak više sesija"""
        print("\n🎭 TEST 2: Povratak Više Sesija")
        print("="*60)
        
        # Kreiraj dve sesije
        session1_id = await self.create_test_session_with_messages("Sesija 1")
        session2_id = await self.create_test_session_with_messages("Sesija 2")
        
        if session1_id and session2_id:
            # Povrati prvu sesiju
            print("👤 Povratak prve sesije")
            messages1 = await self.simulate_session_restore(session1_id)
            
            # Povrati drugu sesiju
            print("👤 Povratak druge sesije")
            messages2 = await self.simulate_session_restore(session2_id)
            
            if messages1 and messages2:
                print(f"✅ Prva sesija: {len(messages1)} poruka")
                print(f"✅ Druga sesija: {len(messages2)} poruka")
                
                # Proveri da li su sesije različite
                if session1_id != session2_id:
                    print("✅ Sesije su različite")
                    self.test_results.append(("Multiple Sessions Restore", True, f"2 sesije povraćene: {len(messages1)} i {len(messages2)} poruka"))
                else:
                    print("❌ Sesije su iste")
                    self.test_results.append(("Multiple Sessions Restore", False, "Sesije su iste"))
            else:
                self.test_results.append(("Multiple Sessions Restore", False, "Nije moguće povratiti obe sesije"))
        else:
            self.test_results.append(("Multiple Sessions Restore", False, "Nije moguće kreirati test sesije"))
    
    async def test_session_data_integrity(self):
        """Test 3: Proveri integritet podataka pri povratku"""
        print("\n🎭 TEST 3: Integritet Podataka")
        print("="*60)
        
        # Kreiraj sesiju sa specifičnim podacima
        session_id = await self.create_test_session_with_messages("Test Integritet")
        
        if session_id:
            # Povrati sesiju
            messages = await self.simulate_session_restore(session_id)
            
            if messages:
                # Proveri da li su poruke ispravne
                user_messages = [msg for msg in messages if msg.get('sender') == 'user']
                ai_messages = [msg for msg in messages if msg.get('sender') == 'ai']
                
                if len(user_messages) == 2 and len(ai_messages) == 1:
                    print("✅ Broj poruka je ispravan")
                    
                    # Proveri sadržaj prve poruke
                    first_message = user_messages[0]
                    if "Prva poruka" in first_message.get('content', ''):
                        print("✅ Sadržaj poruka je ispravan")
                        self.test_results.append(("Data Integrity", True, "Podaci su očuvani"))
                    else:
                        print("❌ Sadržaj poruka nije ispravan")
                        self.test_results.append(("Data Integrity", False, "Sadržaj poruka nije ispravan"))
                else:
                    print(f"❌ Pogrešan broj poruka: {len(user_messages)} user, {len(ai_messages)} AI")
                    self.test_results.append(("Data Integrity", False, f"Pogrešan broj poruka: {len(user_messages)}/{len(ai_messages)}"))
            else:
                self.test_results.append(("Data Integrity", False, "Nije moguće povratiti sesiju"))
        else:
            self.test_results.append(("Data Integrity", False, "Nije moguće kreirati test sesiju"))
    
    async def create_test_session_with_messages(self, session_name: str = "Test Session") -> Optional[str]:
        """Kreira test sesiju sa porukama"""
        try:
            # Kreiraj sesiju
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.base_url}/chat/new-session") as response:
                    if response.status == 200:
                        data = await response.json()
                        session_id = data.get('session_id')
                        
                        if session_id:
                            self.created_sessions.append(session_id)
                            
                            # Kreiraj session metadata
                            metadata_data = {
                                "session_id": session_id,
                                "name": session_name,
                                "description": f"Test sesija: {session_name}"
                            }
                            
                            async with session.post(
                                f"{self.base_url}/session/metadata",
                                params=metadata_data
                            ) as metadata_response:
                                if metadata_response.status == 200:
                                    print(f"✅ Session metadata kreiran za: {session_name}")
                            
                            # Pošalji poruke
                            messages = [
                                "Prva poruka u test sesiji",
                                "Druga poruka sa pitanjem",
                                "Treća poruka za test"
                            ]
                            
                            for i, message in enumerate(messages):
                                message_data = {
                                    "message": message,
                                    "session_id": session_id
                                }
                                
                                async with session.post(
                                    f"{self.base_url}/chat",
                                    json=message_data
                                ) as msg_response:
                                    if msg_response.status == 200:
                                        print(f"✅ Poruka {i+1} poslata")
                                    else:
                                        print(f"⚠️ Greška pri slanju poruke {i+1}: {msg_response.status}")
                            
                            return session_id
        except Exception as e:
            print(f"❌ Greška pri kreiranju test sesije: {e}")
        return None
    
    async def simulate_session_restore(self, session_id: str) -> Optional[List[Dict]]:
        """Simuliraj povratak sesije iz istorije"""
        try:
            async with aiohttp.ClientSession() as session:
                # Učitaj poruke iz sesije (kao što radi ChatHistorySidebar)
                async with session.get(f"{self.base_url}/chat/history/{session_id}") as response:
                    if response.status == 200:
                        data = await response.json()
                        if data.get('status') == 'success':
                            messages = data.get('messages', [])
                            print(f"✅ Učitano {len(messages)} poruka iz sesije {session_id}")
                            return messages
                        else:
                            print(f"❌ Greška pri učitavanju poruka: {data.get('message')}")
                    else:
                        print(f"❌ Greška pri učitavanju poruka: {response.status}")
        except Exception as e:
            print(f"❌ Greška pri simulaciji povratka: {e}")
        return None
    
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
        print("📊 REZULTATI TESTOVA POVRATKA SESIJA")
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
            print("\n🎉 POVRATAK SESIJA RADI ISPRAVNO!")
        else:
            print(f"\n⚠️ {failed} test(ova) nije prošlo - problem sa povratkom sesija")
    
    async def run_all_tests(self):
        """Pokreni sve testove"""
        print("🚀 POKRETANJE TESTOVA POVRATKA SESIJA")
        print("="*60)
        
        try:
            # Test 1: Session restore flow
            await self.test_session_restore_flow()
            
            # Test 2: Multiple sessions restore
            await self.test_multiple_sessions_restore()
            
            # Test 3: Data integrity
            await self.test_session_data_integrity()
            
            # Prikaži rezultate
            self.print_summary()
            
        except Exception as e:
            print(f"❌ Greška pri pokretanju testova: {e}")
        finally:
            # Očisti test sesije
            await self.cleanup_test_sessions()

async def main():
    """Glavna funkcija"""
    tester = SessionRestoreTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main())
