#!/usr/bin/env python3
"""
Test skripta za chat unapređenja
Testira streaming, suggestions, analytics i druge nove funkcionalnosti
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime

# Konfiguracija
BASE_URL = "http://localhost:8001"
TEST_SESSION_ID = "test-session-enhancements"

async def test_streaming_chat():
    """Testira streaming chat funkcionalnost"""
    print("🧪 Testiranje streaming chat-a...")
    
    async with aiohttp.ClientSession() as session:
        # Kreiraj test sesiju
        session_data = {
            "session_id": TEST_SESSION_ID,
            "user_id": "test_user"
        }
        
        # Test streaming chat
        streaming_data = {
            "content": "Objasni mi kako radi streaming u chat aplikacijama",
            "session_id": TEST_SESSION_ID,
            "user_id": "test_user"
        }
        
        try:
            async with session.post(
                f"{BASE_URL}/chat/stream",
                json=streaming_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status == 200:
                    print("✅ Streaming chat radi")
                    
                    # Čitaj streaming response
                    async for line in response.content:
                        line_str = line.decode('utf-8').strip()
                        if line_str.startswith('data: '):
                            try:
                                data = json.loads(line_str[6:])
                                if data.get('type') == 'chunk':
                                    print(f"📝 Chunk: {data.get('content', '')[:50]}...")
                                elif data.get('type') == 'end':
                                    print("✅ Streaming završen")
                                    break
                            except json.JSONDecodeError:
                                continue
                else:
                    print(f"❌ Streaming chat greška: {response.status}")
                    
        except Exception as e:
            print(f"❌ Streaming chat exception: {e}")

async def test_message_suggestions():
    """Testira message suggestions funkcionalnost"""
    print("\n🧪 Testiranje message suggestions...")
    
    async with aiohttp.ClientSession() as session:
        # Kreiraj kontekst za suggestions
        context_data = {
            "history": [
                {"sender": "user", "content": "Kako mogu da naučim programiranje?"},
                {"sender": "ai", "content": "Programiranje možete naučiti kroz praksu i projekte."},
                {"sender": "user", "content": "Koji jezik da počnem?"}
            ],
            "topic": "programiranje",
            "user_style": "formal"
        }
        
        try:
            async with session.post(
                f"{BASE_URL}/chat/suggestions",
                json=context_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    if data.get('status') == 'success':
                        suggestions = data.get('data', {}).get('suggestions', [])
                        print(f"✅ Suggestions generisani: {len(suggestions)} predloga")
                        for i, suggestion in enumerate(suggestions[:3], 1):
                            print(f"   {i}. {suggestion}")
                    else:
                        print(f"❌ Suggestions greška: {data}")
                else:
                    print(f"❌ Suggestions HTTP greška: {response.status}")
                    
        except Exception as e:
            print(f"❌ Suggestions exception: {e}")

async def test_chat_analytics():
    """Testira chat analytics funkcionalnost"""
    print("\n🧪 Testiranje chat analytics...")
    
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(f"{BASE_URL}/chat/analytics/{TEST_SESSION_ID}") as response:
                
                if response.status == 200:
                    data = await response.json()
                    if data.get('status') == 'success':
                        analytics = data.get('data', {}).get('analytics', {})
                        print("✅ Analytics dohvaćeni:")
                        print(f"   - Ukupno poruka: {analytics.get('total_messages', 0)}")
                        print(f"   - Korisničke poruke: {analytics.get('user_messages', 0)}")
                        print(f"   - AI poruke: {analytics.get('ai_messages', 0)}")
                        print(f"   - Engagement score: {analytics.get('engagement_score', 0)}")
                        print(f"   - Sentiment: {analytics.get('sentiment', 'unknown')}")
                    else:
                        print(f"❌ Analytics greška: {data}")
                else:
                    print(f"❌ Analytics HTTP greška: {response.status}")
                    
        except Exception as e:
            print(f"❌ Analytics exception: {e}")

async def test_enhanced_chat_features():
    """Testira sve unapređene chat funkcionalnosti"""
    print("\n🧪 Testiranje svih chat unapređenja...")
    
    async with aiohttp.ClientSession() as session:
        # Test 1: Standardni chat
        print("\n📝 Test 1: Standardni chat")
        chat_data = {
            "content": "Test poruka za proveru funkcionalnosti",
            "session_id": TEST_SESSION_ID,
            "user_id": "test_user"
        }
        
        try:
            async with session.post(
                f"{BASE_URL}/chat",
                json=chat_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    if data.get('status') == 'success':
                        print("✅ Standardni chat radi")
                        print(f"   - Response: {data.get('data', {}).get('response', '')[:100]}...")
                    else:
                        print(f"❌ Standardni chat greška: {data}")
                else:
                    print(f"❌ Standardni chat HTTP greška: {response.status}")
                    
        except Exception as e:
            print(f"❌ Standardni chat exception: {e}")
        
        # Test 2: RAG chat
        print("\n🔍 Test 2: RAG chat")
        rag_data = {
            "query": "Test RAG funkcionalnosti",
            "session_id": TEST_SESSION_ID,
            "use_rerank": True,
            "use_query_rewriting": False,
            "use_fact_checking": False
        }
        
        try:
            async with session.post(
                f"{BASE_URL}/chat/rag",
                json=rag_data,
                headers={"Content-Type": "application/json"}
            ) as response:
                
                if response.status == 200:
                    data = await response.json()
                    if data.get('status') == 'success':
                        print("✅ RAG chat radi")
                        sources = data.get('data', {}).get('sources', [])
                        print(f"   - Sources: {len(sources)}")
                    else:
                        print(f"❌ RAG chat greška: {data}")
                else:
                    print(f"❌ RAG chat HTTP greška: {response.status}")
                    
        except Exception as e:
            print(f"❌ RAG chat exception: {e}")

async def main():
    """Glavna test funkcija"""
    print("🚀 Početak testiranja chat unapređenja")
    print("=" * 50)
    
    # Testiraj sve funkcionalnosti
    await test_enhanced_chat_features()
    await test_streaming_chat()
    await test_message_suggestions()
    await test_chat_analytics()
    
    print("\n" + "=" * 50)
    print("✅ Testiranje chat unapređenja završeno")

if __name__ == "__main__":
    asyncio.run(main()) 