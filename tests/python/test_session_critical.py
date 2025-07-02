#!/usr/bin/env python3
"""
KRITIČKI TEST SESIJA - Rigorozna provera funkcionalnosti
Testira: stvarno čuvanje, konzistentnost, validaciju, error handling, performance
"""

import asyncio
import aiohttp
import json
import uuid
import time
from datetime import datetime, timedelta
import sys
import os
from typing import Dict, List, Any

# Dodaj backend direktorijum u path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

try:
    from supabase_client import get_supabase_manager, get_async_supabase_manager
    SUPABASE_AVAILABLE = True
except ImportError as e:
    print(f"❌ Supabase nije dostupan: {e}")
    SUPABASE_AVAILABLE = False

class CriticalSessionTester:
    def __init__(self):
        self.base_url = "http://localhost:8001"
        self.test_results = []
        self.supabase_manager = None
        self.session_ids = []
        self.critical_errors = []
        
        if SUPABASE_AVAILABLE:
            try:
                self.supabase_manager = get_supabase_manager()
                print("✅ Supabase manager inicijalizovan")
            except Exception as e:
                print(f"❌ Greška pri inicijalizaciji Supabase: {e}")
                self.critical_errors.append(f"Supabase init error: {e}")
    
    def add_critical_error(self, test_name: str, error: str, severity: str = "HIGH"):
        """Dodaj kritičku grešku"""
        self.critical_errors.append(f"[{severity}] {test_name}: {error}")
        self.test_results.append((test_name, False, f"KRITIČKA GREŠKA: {error}"))
    
    async def test_data_persistence(self):
        """KRITIČKI TEST 1: Proveri da li se podaci stvarno čuvaju u bazi"""
        print("\n🔴 KRITIČKI TEST 1: PERSISTENCE VALIDATION")
        
        # Kreiraj sesiju
        session_id = await self._create_session()
        if not session_id:
            self.add_critical_error("Data Persistence", "Nije moguće kreirati sesiju")
            return
        
        # Kreiraj metadata
        metadata_name = f"CRITICAL_TEST_{int(time.time())}"
        await self._create_metadata(session_id, metadata_name, "Kritički test")
        
        # Proveri direktno u Supabase
        if self.supabase_manager:
            try:
                # Direktan upit u bazu
                result = self.supabase_manager.client.table('session_metadata').select('*').eq('session_id', session_id).execute()
                
                if not result.data:
                    self.add_critical_error("Data Persistence", f"Sesija {session_id} nije pronađena u bazi")
                    return
                
                stored_data = result.data[0]
                if stored_data.get('name') != metadata_name:
                    self.add_critical_error("Data Persistence", f"Name mismatch: expected '{metadata_name}', got '{stored_data.get('name')}'")
                    return
                
                print(f"✅ Data persistence validiran: {stored_data.get('name')}")
                self.test_results.append(("Data Persistence", True, f"Stored: {stored_data.get('name')}"))
                
            except Exception as e:
                self.add_critical_error("Data Persistence", f"Database query failed: {e}")
        else:
            self.add_critical_error("Data Persistence", "Supabase nije dostupan")
    
    async def test_data_consistency(self):
        """KRITIČKI TEST 2: Proveri konzistentnost između različitih endpoint-a"""
        print("\n🔴 KRITIČKI TEST 2: DATA CONSISTENCY")
        
        session_id = await self._create_session()
        if not session_id:
            self.add_critical_error("Data Consistency", "Nije moguće kreirati sesiju")
            return
        
        # Kreiraj metadata
        test_name = f"CONSISTENCY_TEST_{int(time.time())}"
        await self._create_metadata(session_id, test_name, "Test konzistentnosti")
        
        # Dohvati podatke iz različitih endpoint-a
        endpoints_data = {}
        
        # Endpoint 1: /session/metadata/{session_id}
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/session/metadata/{session_id}") as response:
                    if response.status == 200:
                        data = await response.json()
                        endpoints_data['single'] = data.get('metadata', {})
                    else:
                        self.add_critical_error("Data Consistency", f"Single endpoint failed: {response.status}")
                        return
        except Exception as e:
            self.add_critical_error("Data Consistency", f"Single endpoint error: {e}")
            return
        
        # Endpoint 2: /sessions/metadata (lista svih)
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/sessions/metadata") as response:
                    if response.status == 200:
                        data = await response.json()
                        sessions = data.get('sessions', [])
                        # Pronađi našu sesiju u listi
                        our_session = next((s for s in sessions if s.get('session_id') == session_id), None)
                        if our_session:
                            endpoints_data['list'] = our_session
                        else:
                            self.add_critical_error("Data Consistency", "Sesija nije pronađena u listi")
                            return
                    else:
                        self.add_critical_error("Data Consistency", f"List endpoint failed: {response.status}")
                        return
        except Exception as e:
            self.add_critical_error("Data Consistency", f"List endpoint error: {e}")
            return
        
        # Endpoint 3: Direktan Supabase upit
        if self.supabase_manager:
            try:
                result = self.supabase_manager.client.table('session_metadata').select('*').eq('session_id', session_id).execute()
                if result.data:
                    endpoints_data['direct'] = result.data[0]
                else:
                    self.add_critical_error("Data Consistency", "Direktan upit nije vratio podatke")
                    return
            except Exception as e:
                self.add_critical_error("Data Consistency", f"Direct query error: {e}")
                return
        
        # Uporedi podatke
        if len(endpoints_data) >= 2:
            keys_to_compare = ['session_id', 'name', 'description']
            inconsistencies = []
            
            for key in keys_to_compare:
                values = set()
                for source, data in endpoints_data.items():
                    if data and key in data:
                        values.add(str(data[key]))
                
                if len(values) > 1:
                    inconsistencies.append(f"{key}: {values}")
            
            if inconsistencies:
                self.add_critical_error("Data Consistency", f"Inconsistencies found: {inconsistencies}")
                return
            
            print(f"✅ Data consistency validiran između {len(endpoints_data)} izvora")
            self.test_results.append(("Data Consistency", True, f"Consistent across {len(endpoints_data)} sources"))
        else:
            self.add_critical_error("Data Consistency", "Nedovoljno izvora za poređenje")
    
    async def test_concurrent_sessions(self):
        """KRITIČKI TEST 3: Testiraj concurrent kreiranje sesija"""
        print("\n🔴 KRITIČKI TEST 3: CONCURRENT SESSIONS")
        
        # Kreiraj 5 sesija istovremeno
        tasks = []
        for i in range(5):
            task = asyncio.create_task(self._create_session_with_metadata(f"CONCURRENT_{i}_{int(time.time())}"))
            tasks.append(task)
        
        try:
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            successful_sessions = []
            failed_sessions = []
            
            for i, result in enumerate(results):
                if isinstance(result, Exception):
                    failed_sessions.append(f"Session {i}: {result}")
                elif result:
                    successful_sessions.append(result)
                else:
                    failed_sessions.append(f"Session {i}: No result")
            
            if len(failed_sessions) > 0:
                self.add_critical_error("Concurrent Sessions", f"Failed sessions: {failed_sessions}")
                return
            
            if len(successful_sessions) != 5:
                self.add_critical_error("Concurrent Sessions", f"Expected 5 sessions, got {len(successful_sessions)}")
                return
            
            # Proveri da li su sve sesije jedinstvene
            unique_sessions = set(successful_sessions)
            if len(unique_sessions) != 5:
                self.add_critical_error("Concurrent Sessions", f"Duplicate sessions found: {len(successful_sessions)} vs {len(unique_sessions)} unique")
                return
            
            print(f"✅ Concurrent sessions validiran: {len(successful_sessions)} unique sessions")
            self.test_results.append(("Concurrent Sessions", True, f"{len(successful_sessions)} unique sessions"))
            
        except Exception as e:
            self.add_critical_error("Concurrent Sessions", f"Concurrent test failed: {e}")
    
    async def test_error_handling(self):
        """KRITIČKI TEST 4: Testiraj error handling"""
        print("\n🔴 KRITIČKI TEST 4: ERROR HANDLING")
        
        # Test 1: Nevažeći session_id format
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/session/metadata/invalid-uuid") as response:
                    if response.status == 200:
                        self.add_critical_error("Error Handling", "Invalid UUID should return error, got 200")
                        return
                    elif response.status in [400, 422, 404]:
                        print(f"✅ Invalid UUID properly rejected: {response.status}")
                    else:
                        self.add_critical_error("Error Handling", f"Unexpected status for invalid UUID: {response.status}")
                        return
        except Exception as e:
            self.add_critical_error("Error Handling", f"Invalid UUID test failed: {e}")
            return
        
        # Test 2: Nevažeći JSON u POST zahtevu
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.base_url}/session/metadata",
                    data="invalid json",
                    headers={'Content-Type': 'application/json'}
                ) as response:
                    if response.status == 200:
                        self.add_critical_error("Error Handling", "Invalid JSON should return error, got 200")
                        return
                    elif response.status in [400, 422]:
                        print(f"✅ Invalid JSON properly rejected: {response.status}")
                    else:
                        self.add_critical_error("Error Handling", f"Unexpected status for invalid JSON: {response.status}")
                        return
        except Exception as e:
            self.add_critical_error("Error Handling", f"Invalid JSON test failed: {e}")
            return
        
        # Test 3: Nevažeći session_id u metadata kreiranju
        try:
            async with aiohttp.ClientSession() as session:
                params = {
                    "session_id": "invalid-uuid",
                    "name": "Test",
                    "description": "Test"
                }
                async with session.post(f"{self.base_url}/session/metadata", params=params) as response:
                    if response.status == 200:
                        self.add_critical_error("Error Handling", "Invalid session_id should return error, got 200")
                        return
                    elif response.status in [400, 422, 404]:
                        print(f"✅ Invalid session_id properly rejected: {response.status}")
                    else:
                        self.add_critical_error("Error Handling", f"Unexpected status for invalid session_id: {response.status}")
                        return
        except Exception as e:
            self.add_critical_error("Error Handling", f"Invalid session_id test failed: {e}")
            return
        
        self.test_results.append(("Error Handling", True, "All error cases properly handled"))
    
    async def test_performance(self):
        """KRITIČKI TEST 5: Testiraj performance"""
        print("\n🔴 KRITIČKI TEST 5: PERFORMANCE")
        
        # Test 1: Vreme kreiranja sesije
        start_time = time.time()
        session_id = await self._create_session()
        creation_time = time.time() - start_time
        
        if not session_id:
            self.add_critical_error("Performance", "Nije moguće kreirati sesiju za performance test")
            return
        
        if creation_time > 2.0:  # Više od 2 sekunde
            self.add_critical_error("Performance", f"Session creation too slow: {creation_time:.2f}s")
            return
        
        # Test 2: Vreme kreiranja metadata
        start_time = time.time()
        await self._create_metadata(session_id, f"PERF_TEST_{int(time.time())}", "Performance test")
        metadata_time = time.time() - start_time
        
        if metadata_time > 1.0:  # Više od 1 sekunde
            self.add_critical_error("Performance", f"Metadata creation too slow: {metadata_time:.2f}s")
            return
        
        # Test 3: Vreme dohvatanja metadata
        start_time = time.time()
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{self.base_url}/session/metadata/{session_id}") as response:
                await response.json()
        fetch_time = time.time() - start_time
        
        if fetch_time > 1.0:  # Više od 1 sekunde
            self.add_critical_error("Performance", f"Metadata fetch too slow: {fetch_time:.2f}s")
            return
        
        print(f"✅ Performance validiran: creation={creation_time:.2f}s, metadata={metadata_time:.2f}s, fetch={fetch_time:.2f}s")
        self.test_results.append(("Performance", True, f"Creation: {creation_time:.2f}s, Metadata: {metadata_time:.2f}s, Fetch: {fetch_time:.2f}s"))
    
    async def test_data_validation(self):
        """KRITIČKI TEST 6: Validacija podataka"""
        print("\n🔴 KRITIČKI TEST 6: DATA VALIDATION")
        
        session_id = await self._create_session()
        if not session_id:
            self.add_critical_error("Data Validation", "Nije moguće kreirati sesiju")
            return
        
        # Kreiraj metadata sa specifičnim podacima
        test_name = "VALIDATION_TEST"
        test_description = "Test validacije podataka"
        await self._create_metadata(session_id, test_name, test_description)
        
        # Dohvati podatke i validiraj
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(f"{self.base_url}/session/metadata/{session_id}") as response:
                    if response.status == 200:
                        data = await response.json()
                        metadata = data.get('metadata', {})
                        
                        # Validiraj obavezna polja
                        required_fields = ['id', 'session_id', 'name', 'description', 'created_at']
                        missing_fields = []
                        
                        for field in required_fields:
                            if field not in metadata or metadata[field] is None:
                                missing_fields.append(field)
                        
                        if missing_fields:
                            self.add_critical_error("Data Validation", f"Missing required fields: {missing_fields}")
                            return
                        
                        # Validiraj tipove podataka
                        if not isinstance(metadata['session_id'], str):
                            self.add_critical_error("Data Validation", f"session_id should be string, got {type(metadata['session_id'])}")
                            return
                        
                        if not isinstance(metadata['name'], str):
                            self.add_critical_error("Data Validation", f"name should be string, got {type(metadata['name'])}")
                            return
                        
                        # Validiraj UUID format
                        try:
                            uuid.UUID(metadata['session_id'])
                        except ValueError:
                            self.add_critical_error("Data Validation", f"Invalid UUID format: {metadata['session_id']}")
                            return
                        
                        # Validiraj da li se podaci poklapaju
                        if metadata['name'] != test_name:
                            self.add_critical_error("Data Validation", f"Name mismatch: expected '{test_name}', got '{metadata['name']}'")
                            return
                        
                        if metadata['description'] != test_description:
                            self.add_critical_error("Data Validation", f"Description mismatch: expected '{test_description}', got '{metadata['description']}'")
                            return
                        
                        print(f"✅ Data validation passed: {metadata['name']}")
                        self.test_results.append(("Data Validation", True, f"Validated: {metadata['name']}"))
                        
                    else:
                        self.add_critical_error("Data Validation", f"Failed to fetch metadata: {response.status}")
                        return
                        
        except Exception as e:
            self.add_critical_error("Data Validation", f"Validation test failed: {e}")
    
    # Helper metode
    async def _create_session(self) -> str:
        """Kreira sesiju i vrati session_id"""
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.base_url}/chat/new-session") as response:
                    if response.status == 200:
                        data = await response.json()
                        session_id = data.get('session_id')
                        if session_id:
                            self.session_ids.append(session_id)
                            return session_id
        except Exception as e:
            print(f"Greška pri kreiranju sesije: {e}")
        return None
    
    async def _create_session_with_metadata(self, name: str) -> str:
        """Kreira sesiju sa metadata"""
        session_id = await self._create_session()
        if session_id:
            await self._create_metadata(session_id, name, f"Description for {name}")
        return session_id
    
    async def _create_metadata(self, session_id: str, name: str, description: str) -> bool:
        """Kreira metadata za sesiju"""
        try:
            params = {
                "session_id": session_id,
                "name": name,
                "description": description
            }
            
            async with aiohttp.ClientSession() as session:
                async with session.post(f"{self.base_url}/session/metadata", params=params) as response:
                    return response.status == 200
        except Exception as e:
            print(f"Greška pri kreiranju metadata: {e}")
            return False
    
    def print_critical_summary(self):
        """Prikaži kritičke rezultate"""
        print("\n" + "="*80)
        print("🔴 KRITIČKI REZULTATI TESTOVA SESIJA")
        print("="*80)
        
        passed = 0
        total = len(self.test_results)
        
        for test_name, success, details in self.test_results:
            status = "✅ PASS" if success else "❌ FAIL"
            print(f"{status} {test_name}: {details}")
            if success:
                passed += 1
        
        print("\n" + "-"*80)
        print(f"📊 UKUPNO: {passed}/{total} testova prošlo")
        print(f"📈 USPEŠNOST: {(passed/total)*100:.1f}%")
        
        if self.critical_errors:
            print("\n🚨 KRITIČKE GREŠKE:")
            for error in self.critical_errors:
                print(f"   • {error}")
        
        if passed == total and not self.critical_errors:
            print("\n🎉 SVI KRITIČKI TESTOVI PROŠLI - Kod je robustan!")
        else:
            print(f"\n⚠️ {len(self.critical_errors)} KRITIČKIH GREŠAKA PRONAĐENO!")
            print("   Potrebno je ispraviti kod pre produkcije!")
        
        print("="*80)
    
    async def run_critical_tests(self):
        """Pokreni sve kritičke testove"""
        print("🔴 POKRETANJE KRITIČKIH TESTOVA SESIJA")
        print("="*80)
        
        await self.test_data_persistence()
        await self.test_data_consistency()
        await self.test_concurrent_sessions()
        await self.test_error_handling()
        await self.test_performance()
        await self.test_data_validation()
        
        self.print_critical_summary()

async def main():
    """Glavna funkcija"""
    tester = CriticalSessionTester()
    await tester.run_critical_tests()

if __name__ == "__main__":
    asyncio.run(main()) 