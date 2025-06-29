#!/usr/bin/env python3
"""
Test skripta za WebSocket funkcionalnost
- Real-time chat
- Typing indicators
- AI odgovori
- Session management
"""

import asyncio
import websockets
import json
import time
from datetime import datetime
from typing import Dict, Any, List

# Konfiguracija
WS_URL = "ws://localhost:8001/ws/chat"
HTTP_BASE_URL = "http://localhost:8001"

class WebSocketTester:
    def __init__(self):
        self.connections: List[websockets.WebSocketServerProtocol] = []
        self.messages_received: List[Dict[str, Any]] = []
        self.test_results = {
            "connection": False,
            "chat": False,
            "typing": False,
            "ai_response": False,
            "session_management": False
        }
    
    async def connect_websocket(self, user_id: str = None, session_id: str = None) -> websockets.WebSocketServerProtocol:
        """Poveži se na WebSocket"""
        # Kreiraj URL sa parametrima
        url = WS_URL
        params = []
        if user_id:
            params.append(f"user_id={user_id}")
        if session_id:
            params.append(f"session_id={session_id}")
        
        if params:
            url += "?" + "&".join(params)
        
        print(f"🔌 Povezivanje na: {url}")
        
        websocket = await websockets.connect(url)
        self.connections.append(websocket)
        
        # Čekaj welcome poruku
        welcome_msg = await websocket.recv()
        welcome_data = json.loads(welcome_msg)
        
        if welcome_data["type"] == "system" and "Uspešno povezan" in welcome_data["content"]["message"]:
            print("✅ WebSocket konekcija uspešna")
            self.test_results["connection"] = True
            return websocket
        else:
            print("❌ WebSocket konekcija neuspešna")
            return None
    
    async def send_message(self, websocket: websockets.WebSocketServerProtocol, message_type: str, content: Dict[str, Any], sender: str = "test_user"):
        """Pošalji poruku kroz WebSocket"""
        message = {
            "message_id": f"test_{int(time.time())}",
            "type": message_type,
            "content": content,
            "sender": sender,
            "session_id": "test_session",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await websocket.send(json.dumps(message))
        print(f"📤 Poruka poslata: {message_type}")
    
    async def listen_for_messages(self, websocket: websockets.WebSocketServerProtocol, timeout: int = 10):
        """Slušaj poruke sa timeout-om"""
        try:
            start_time = time.time()
            while time.time() - start_time < timeout:
                try:
                    message = await asyncio.wait_for(websocket.recv(), timeout=1.0)
                    message_data = json.loads(message)
                    self.messages_received.append(message_data)
                    print(f"📥 Poruka primljena: {message_data['type']}")
                    
                    # Proveri tip poruke
                    if message_data["type"] == "chat":
                        self.test_results["chat"] = True
                    elif message_data["type"] == "typing":
                        self.test_results["typing"] = True
                    elif message_data["type"] == "system":
                        print(f"   System: {message_data['content']}")
                    
                except asyncio.TimeoutError:
                    continue
                except Exception as e:
                    print(f"Greška pri primanju poruke: {e}")
                    break
        except Exception as e:
            print(f"Greška pri slušanju poruka: {e}")
    
    async def test_basic_chat(self):
        """Test osnovne chat funkcionalnosti"""
        print("\n🧪 Testiranje osnovne chat funkcionalnosti...")
        
        # Poveži se
        websocket = await self.connect_websocket("test_user_1", "test_session_1")
        if not websocket:
            return False
        
        # Pošalji chat poruku
        await self.send_message(websocket, "chat", {
            "text": "Zdravo! Ovo je test poruka.",
            "to_ai": False
        })
        
        # Slušaj odgovore
        await self.listen_for_messages(websocket, timeout=5)
        
        return self.test_results["chat"]
    
    async def test_ai_chat(self):
        """Test chat sa AI-om"""
        print("\n🤖 Testiranje chat-a sa AI-om...")
        
        # Poveži se
        websocket = await self.connect_websocket("test_user_2", "test_session_2")
        if not websocket:
            return False
        
        # Pošalji poruku ka AI-u
        await self.send_message(websocket, "chat", {
            "text": "Kako si danas?",
            "to_ai": True
        })
        
        # Slušaj AI odgovor
        await self.listen_for_messages(websocket, timeout=15)
        
        # Proveri da li je AI odgovorio
        ai_messages = [msg for msg in self.messages_received if msg.get("sender") == "ai"]
        if ai_messages:
            print("✅ AI je odgovorio")
            self.test_results["ai_response"] = True
            return True
        else:
            print("❌ AI nije odgovorio")
            return False
    
    async def test_typing_indicators(self):
        """Test typing indicators"""
        print("\n⌨️ Testiranje typing indicators...")
        
        # Poveži se
        websocket = await self.connect_websocket("test_user_3", "test_session_3")
        if not websocket:
            return False
        
        # Pošalji typing indicator
        await self.send_message(websocket, "typing", {
            "is_typing": True
        })
        
        # Slušaj poruke
        await self.listen_for_messages(websocket, timeout=3)
        
        # Zaustavi typing
        await self.send_message(websocket, "typing", {
            "is_typing": False
        })
        
        await self.listen_for_messages(websocket, timeout=3)
        
        return self.test_results["typing"]
    
    async def test_session_management(self):
        """Test session management"""
        print("\n👥 Testiranje session management...")
        
        # Poveži dva korisnika u istu sesiju
        session_id = "group_session"
        
        websocket1 = await self.connect_websocket("user_1", session_id)
        websocket2 = await self.connect_websocket("user_2", session_id)
        
        if not websocket1 or not websocket2:
            return False
        
        # Pošalji poruku od prvog korisnika
        await self.send_message(websocket1, "chat", {
            "text": "Zdravo svima!",
            "to_ai": False
        }, "user_1")
        
        # Slušaj poruke na drugom konekciji
        await self.listen_for_messages(websocket2, timeout=5)
        
        # Proveri da li je poruka primljena
        received_messages = [msg for msg in self.messages_received if msg.get("sender") == "user_1"]
        if received_messages:
            print("✅ Poruka je primljena u grupi")
            self.test_results["session_management"] = True
            return True
        else:
            print("❌ Poruka nije primljena u grupi")
            return False
    
    async def test_websocket_stats(self):
        """Test WebSocket statistike"""
        print("\n📊 Testiranje WebSocket statistika...")
        
        import aiohttp
        
        async with aiohttp.ClientSession() as session:
            # Dohvati statistike
            async with session.get(f"{HTTP_BASE_URL}/websocket/stats") as response:
                if response.status == 200:
                    stats = await response.json()
                    print(f"✅ WebSocket statistike: {stats['stats']}")
                    return True
                else:
                    print(f"❌ Greška pri dohvatanju statistika: {response.status}")
                    return False
    
    async def run_all_tests(self):
        """Pokreni sve testove"""
        print("🚀 WebSocket Test Suite")
        print("=" * 50)
        
        try:
            # Test osnovne funkcionalnosti
            await self.test_basic_chat()
            
            # Test AI chat
            await self.test_ai_chat()
            
            # Test typing indicators
            await self.test_typing_indicators()
            
            # Test session management
            await self.test_session_management()
            
            # Test statistike
            await self.test_websocket_stats()
            
        finally:
            # Zatvori sve konekcije
            for websocket in self.connections:
                try:
                    await websocket.close()
                except:
                    pass
        
        # Prikaži rezultate
        self.print_results()
    
    def print_results(self):
        """Prikaži rezultate testova"""
        print("\n" + "=" * 50)
        print("📋 REZULTATI TESTOVA")
        print("=" * 50)
        
        total_tests = len(self.test_results)
        passed_tests = sum(self.test_results.values())
        
        for test_name, passed in self.test_results.items():
            status = "✅" if passed else "❌"
            print(f"{status} {test_name.upper()}: {'PASS' if passed else 'FAIL'}")
        
        print(f"\n🎯 UKUPNO: {passed_tests}/{total_tests} ({passed_tests/total_tests*100:.1f}%)")
        
        if passed_tests == total_tests:
            print("🎉 Svi testovi su prošli!")
        else:
            print("⚠️ Neki testovi su neuspešni")

async def main():
    """Glavna funkcija"""
    tester = WebSocketTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⏹️ Test prekinut od strane korisnika")
    except Exception as e:
        print(f"\n💥 Greška pri testiranju: {e}")
        import traceback
        traceback.print_exc() 