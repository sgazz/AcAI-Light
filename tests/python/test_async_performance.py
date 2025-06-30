#!/usr/bin/env python3
"""
Test skripta za async performance optimizacije
- Background Tasks
- Connection Pooling
- Performance Monitoring
"""

import asyncio
import aiohttp
import time
import json
from datetime import datetime

# Konfiguracija
BASE_URL = "http://localhost:8001"
TEST_ENDPOINTS = {
    "background_tasks": [
        "/tasks/add",
        "/tasks/stats",
        "/tasks",
        "/performance/overview"
    ],
    "connection_pool": [
        "/connections/health",
        "/connections/stats",
        "/connections/health/supabase",
        "/connections/health/ollama"
    ],
    "cache": [
        "/cache/health",
        "/cache/stats",
        "/cache/test"
    ]
}

class AsyncPerformanceTester:
    def __init__(self, base_url: str = BASE_URL):
        self.base_url = base_url
        self.session = None
        self.results = {
            "background_tasks": [],
            "connection_pool": [],
            "cache": [],
            "performance": []
        }
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def make_request(self, method: str, endpoint: str, data: dict = None) -> dict:
        """Napravi HTTP zahtev"""
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()
        
        try:
            if method.upper() == "GET":
                async with self.session.get(url) as response:
                    response_data = await response.json()
            elif method.upper() == "POST":
                async with self.session.post(url, json=data) as response:
                    response_data = await response.json()
            elif method.upper() == "DELETE":
                async with self.session.delete(url) as response:
                    response_data = await response.json()
            
            response_time = time.time() - start_time
            
            return {
                "endpoint": endpoint,
                "method": method,
                "status_code": response.status,
                "response_time": response_time,
                "success": response.status < 400,
                "data": response_data
            }
            
        except Exception as e:
            response_time = time.time() - start_time
            return {
                "endpoint": endpoint,
                "method": method,
                "status_code": 0,
                "response_time": response_time,
                "success": False,
                "error": str(e)
            }
    
    async def test_background_tasks(self):
        """Test background tasks funkcionalnosti"""
        print("🔧 Testiranje Background Tasks...")
        
        # 1. Kreiraj test task
        task_data = {
            "type": "test",
            "priority": "normal",
            "data": {
                "function": "test_task",
                "priority": 2,
                "description": "Test task za performance testiranje"
            }
        }
        
        result = await self.make_request("POST", "/tasks/add", task_data)
        self.results["background_tasks"].append(result)
        
        if result.get("status") == "success" and result.get("data") and result["data"].get("task_id"):
            task_id = result["data"]["task_id"]
            print(f"✅ Task kreiran: {task_id}")
            
            # 2. Proveri status taska
            await asyncio.sleep(1)
            status_result = await self.make_request("GET", f"/tasks/{task_id}")
            self.results["background_tasks"].append(status_result)
            
            # 3. Dohvati statistike
            stats_result = await self.make_request("GET", "/tasks/stats")
            self.results["background_tasks"].append(stats_result)
            
            # 4. Dohvati sve taskove
            all_tasks_result = await self.make_request("GET", "/tasks")
            self.results["background_tasks"].append(all_tasks_result)
            
            # 5. Otkaži task (ako još uvek radi)
            if status_result.get("status") == "success" and status_result["data"]["task_status"]["status"] in ["pending", "running"]:
                cancel_result = await self.make_request("DELETE", f"/tasks/{task_id}")
                self.results["background_tasks"].append(cancel_result)
        else:
            print(f"❌ Greška pri kreiranju taska: {result.get('message', 'Nepoznata greška')}")
    
    async def test_connection_pool(self):
        """Test connection pooling funkcionalnosti"""
        print("🌐 Testiranje Connection Pool...")
        
        # 1. Proveri zdravlje svih konekcija
        health_result = await self.make_request("GET", "/connections/health")
        self.results["connection_pool"].append(health_result)
        
        if health_result["success"]:
            print("✅ Connection health check uspešan")
            
            # 2. Proveri specifične konekcije
            for conn_type in ["supabase", "ollama"]:
                specific_health = await self.make_request("GET", f"/connections/health/{conn_type}")
                self.results["connection_pool"].append(specific_health)
                
                if specific_health["success"]:
                    status = specific_health["data"]["health"]["status"]
                    print(f"✅ {conn_type}: {status}")
                else:
                    print(f"❌ {conn_type}: Greška")
        
        # 3. Dohvati statistike konekcija
        stats_result = await self.make_request("GET", "/connections/stats")
        self.results["connection_pool"].append(stats_result)
        
        if stats_result["success"]:
            print("✅ Connection stats uspešno dohvaćeni")
    
    async def test_cache(self):
        """Test cache funkcionalnosti"""
        print("💾 Testiranje Cache...")
        
        # 1. Proveri zdravlje cache-a
        health_result = await self.make_request("GET", "/cache/health")
        self.results["cache"].append(health_result)
        
        if health_result["success"]:
            print("✅ Cache health check uspešan")
        
        # 2. Test cache funkcionalnosti
        test_result = await self.make_request("GET", "/cache/test")
        self.results["cache"].append(test_result)
        
        if test_result["success"]:
            print("✅ Cache test uspešan")
        
        # 3. Dohvati statistike cache-a
        stats_result = await self.make_request("GET", "/cache/stats")
        self.results["cache"].append(stats_result)
        
        if stats_result["success"]:
            print("✅ Cache stats uspešno dohvaćeni")
    
    async def test_performance_overview(self):
        """Test performance overview endpoint-a"""
        print("📊 Testiranje Performance Overview...")
        
        result = await self.make_request("GET", "/performance/overview")
        self.results["performance"].append(result)
        
        if result["success"]:
            print("✅ Performance overview uspešno dohvaćen")
            
            # Ispravljen pristup podacima - koristi result["data"] umesto result["data"]["performance"]
            performance_data = result["data"].get("performance", {})
            
            print("\n📈 Ključne metrike:")
            print(f"  Cache hit rate: {performance_data.get('cache', {}).get('hit_rate', 'N/A')}%")
            print(f"  Active tasks: {performance_data.get('background_tasks', {}).get('running_tasks', 'N/A')}")
            avg_time = performance_data.get('background_tasks', {}).get('avg_execution_time', 'N/A')
            if isinstance(avg_time, (float, int)):
                print(f"  Avg task time: {avg_time:.2f}s")
            else:
                print(f"  Avg task time: {avg_time}")
        else:
            print(f"❌ Greška pri dohvatanju performance overview: {result.get('error', 'Nepoznata greška')}")
    
    async def run_concurrent_tests(self):
        """Pokreni sve testove konkurentno"""
        print("🚀 Pokretanje concurrent testova...")
        
        # Pokreni sve testove paralelno
        await asyncio.gather(
            self.test_background_tasks(),
            self.test_connection_pool(),
            self.test_cache(),
            self.test_performance_overview()
        )
    
    def print_summary(self):
        """Prikaži rezime testova"""
        print("\n" + "="*60)
        print("📋 REZIME TESTOVA")
        print("="*60)
        
        total_tests = 0
        successful_tests = 0
        
        for category, results in self.results.items():
            print(f"\n🔍 {category.upper()}:")
            category_success = 0
            
            for result in results:
                total_tests += 1
                if result["success"]:
                    successful_tests += 1
                    category_success += 1
                
                status = "✅" if result["success"] else "❌"
                print(f"  {status} {result['method']} {result['endpoint']} - {result['response_time']:.3f}s")
            
            print(f"  Uspešnost: {category_success}/{len(results)} ({category_success/len(results)*100:.1f}%)")
        
        print(f"\n🎯 UKUPNO: {successful_tests}/{total_tests} ({successful_tests/total_tests*100:.1f}%)")
        
        # Prikaži najsporije endpointe
        print("\n🐌 Najsporiji endpointi:")
        all_results = []
        for results in self.results.values():
            all_results.extend(results)
        
        slowest = sorted(all_results, key=lambda x: x["response_time"], reverse=True)[:5]
        for result in slowest:
            print(f"  {result['response_time']:.3f}s - {result['method']} {result['endpoint']}")
    
    def save_results(self, filename: str = None):
        """Sačuvaj rezultate u JSON fajl"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"async_performance_test_{timestamp}.json"
        
        results_data = {
            "timestamp": datetime.now().isoformat(),
            "base_url": self.base_url,
            "results": self.results
        }
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(results_data, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Rezultati sačuvani u: {filename}")

async def main():
    """Glavna funkcija"""
    print("🚀 AcAIA Async Performance Test")
    print("="*50)
    print(f"🎯 Target: {BASE_URL}")
    print(f"⏰ Vreme: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    async with AsyncPerformanceTester() as tester:
        # Pokreni testove
        await tester.run_concurrent_tests()
        
        # Prikaži rezime
        tester.print_summary()
        
        # Sačuvaj rezultate
        tester.save_results()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⏹️ Test prekinut od strane korisnika")
    except Exception as e:
        print(f"\n💥 Greška pri testiranju: {e}")
        import traceback
        traceback.print_exc() 