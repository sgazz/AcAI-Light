#!/usr/bin/env python3
"""
Test skripta za Redis cache funkcionalnost
"""

import asyncio
import sys
import os
import time

# Dodaj backend direktorijum u path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.cache_manager import CacheManager, cache_manager

async def test_basic_cache_operations():
    """Test osnovnih cache operacija"""
    print("🧪 Testiranje osnovnih cache operacija...")
    
    # Test pisanja
    test_data = {"message": "Test podatak", "timestamp": time.time()}
    success = await cache_manager.set("test_key", test_data, 60)
    print(f"✅ Pisanje u cache: {'USPEŠNO' if success else 'NEUSPEŠNO'}")
    
    # Test čitanja
    retrieved_data = await cache_manager.get("test_key")
    print(f"✅ Čitanje iz cache-a: {'USPEŠNO' if retrieved_data else 'NEUSPEŠNO'}")
    if retrieved_data:
        print(f"   Podatak: {retrieved_data}")
    
    # Test brisanja
    delete_success = await cache_manager.delete("test_key")
    print(f"✅ Brisanje iz cache-a: {'USPEŠNO' if delete_success else 'NEUSPEŠNO'}")
    
    # Test čitanja nakon brisanja
    deleted_data = await cache_manager.get("test_key")
    print(f"✅ Čitanje nakon brisanja: {'PRAVILNO' if deleted_data is None else 'GREŠKA'}")
    
    print()

async def test_rag_cache():
    """Test RAG cache funkcionalnosti"""
    print("🧪 Testiranje RAG cache funkcionalnosti...")
    
    # Test RAG rezultata
    test_query = "Šta je RAG?"
    test_context = "test_context"
    test_result = {
        "status": "success",
        "response": "RAG je Retrieval-Augmented Generation tehnologija.",
        "sources": [{"filename": "test.pdf", "content": "RAG je...", "score": 0.95}],
        "query": test_query,
        "model": "mistral",
        "context_length": 100
    }
    
    # Sačuvaj RAG rezultat
    success = await cache_manager.set_rag_result(test_query, test_result, test_context)
    print(f"✅ Čuvanje RAG rezultata: {'USPEŠNO' if success else 'NEUSPEŠNO'}")
    
    # Dohvati RAG rezultat
    retrieved_result = await cache_manager.get_rag_result(test_query, test_context)
    print(f"✅ Dohvatanje RAG rezultata: {'USPEŠNO' if retrieved_result else 'NEUSPEŠNO'}")
    if retrieved_result:
        print(f"   Response: {retrieved_result.get('response', 'N/A')[:50]}...")
    
    # Obriši test podatke
    await cache_manager.delete("rag:test_query:test_context")
    print()

async def test_session_cache():
    """Test session cache funkcionalnosti"""
    print("🧪 Testiranje session cache funkcionalnosti...")
    
    # Test session podataka
    session_id = "test_session_123"
    session_data = {
        "user_id": "user_123",
        "preferences": {"theme": "dark", "language": "sr"},
        "last_activity": time.time(),
        "message_count": 5
    }
    
    # Sačuvaj session podatke
    success = await cache_manager.set_session_data(session_id, session_data)
    print(f"✅ Čuvanje session podataka: {'USPEŠNO' if success else 'NEUSPEŠNO'}")
    
    # Dohvati session podatke
    retrieved_session = await cache_manager.get_session_data(session_id)
    print(f"✅ Dohvatanje session podataka: {'USPEŠNO' if retrieved_session else 'NEUSPEŠNO'}")
    if retrieved_session:
        print(f"   User ID: {retrieved_session.get('user_id', 'N/A')}")
        print(f"   Message count: {retrieved_session.get('message_count', 'N/A')}")
    
    # Obriši test podatke
    await cache_manager.delete("session:test_session_123")
    print()

async def test_cache_stats():
    """Test cache statistika"""
    print("🧪 Testiranje cache statistika...")
    
    # Dohvati statistike
    stats = await cache_manager.get_stats()
    print(f"✅ Dohvatanje statistika: {'USPEŠNO' if 'error' not in stats else 'NEUSPEŠNO'}")
    
    if 'error' not in stats:
        print(f"   Connected clients: {stats.get('connected_clients', 'N/A')}")
        print(f"   Used memory: {stats.get('used_memory_human', 'N/A')}")
        print(f"   Total commands: {stats.get('total_commands_processed', 'N/A')}")
        print(f"   Keyspace hits: {stats.get('keyspace_hits', 'N/A')}")
        print(f"   Keyspace misses: {stats.get('keyspace_misses', 'N/A')}")
        print(f"   Uptime: {stats.get('uptime_in_seconds', 'N/A')} sekundi")
    
    print()

async def test_cache_health():
    """Test cache health check"""
    print("🧪 Testiranje cache health check...")
    
    # Health check
    health = await cache_manager.health_check()
    print(f"✅ Health check: {health.get('status', 'UNKNOWN')}")
    print(f"   Message: {health.get('message', 'N/A')}")
    
    if health.get('status') == 'healthy':
        print("   🟢 Cache je zdrav i radi normalno")
    elif health.get('status') == 'warning':
        print("   🟡 Cache radi ali ima problema")
    else:
        print("   🔴 Cache nije dostupan")
    
    print()

async def test_cache_performance():
    """Test cache performansi"""
    print("🧪 Testiranje cache performansi...")
    
    # Test brzine pisanja
    start_time = time.time()
    for i in range(100):
        await cache_manager.set(f"perf_test_{i}", {"data": f"test_data_{i}"}, 60)
    write_time = time.time() - start_time
    print(f"✅ 100 write operacija: {write_time:.3f} sekundi ({100/write_time:.1f} ops/sec)")
    
    # Test brzine čitanja
    start_time = time.time()
    for i in range(100):
        await cache_manager.get(f"perf_test_{i}")
    read_time = time.time() - start_time
    print(f"✅ 100 read operacija: {read_time:.3f} sekundi ({100/read_time:.1f} ops/sec)")
    
    # Obriši test podatke
    for i in range(100):
        await cache_manager.delete(f"perf_test_{i}")
    
    print()

async def test_cache_clear():
    """Test brisanja cache-a"""
    print("🧪 Testiranje brisanja cache-a...")
    
    # Dodaj nekoliko test ključeva
    test_keys = ["test1", "test2", "test3", "rag:test", "session:test"]
    for key in test_keys:
        await cache_manager.set(key, {"data": "test"}, 60)
    
    # Obriši sve ključeve koji počinju sa "test"
    deleted_count = await cache_manager.clear_cache("test*")
    print(f"✅ Obrisano {deleted_count} ključeva sa pattern 'test*'")
    
    # Proveri da li su obrisani
    remaining_keys = []
    for key in test_keys:
        if await cache_manager.exists(key):
            remaining_keys.append(key)
    
    if not remaining_keys:
        print("✅ Svi test ključevi su uspešno obrisani")
    else:
        print(f"⚠️  Preostali ključevi: {remaining_keys}")
    
    print()

async def main():
    """Glavna test funkcija"""
    print("🚀 POKRETANJE CACHE TESTOVA")
    print("=" * 50)
    
    try:
        # Test osnovnih operacija
        await test_basic_cache_operations()
        
        # Test RAG cache
        await test_rag_cache()
        
        # Test session cache
        await test_session_cache()
        
        # Test statistika
        await test_cache_stats()
        
        # Test health check
        await test_cache_health()
        
        # Test performansi
        await test_cache_performance()
        
        # Test brisanja
        await test_cache_clear()
        
        print("🎉 SVI TESTOVI ZAVRŠENI!")
        print("=" * 50)
        
    except Exception as e:
        print(f"❌ Greška pri testiranju: {e}")
        return False
    
    return True

if __name__ == "__main__":
    # Pokreni testove
    success = asyncio.run(main())
    
    if success:
        print("✅ Cache testovi su uspešno završeni!")
        sys.exit(0)
    else:
        print("❌ Cache testovi su neuspešni!")
        sys.exit(1) 