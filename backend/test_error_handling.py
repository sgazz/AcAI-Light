#!/usr/bin/env python3
"""
Test skripta za error handling funkcionalnost
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime

# Konfiguracija
BASE_URL = "http://localhost:8001"
TEST_ENDPOINTS = [
    "/errors/stats",
    "/errors/recent",
    "/errors/category/general",
    "/errors/test"
]

class ErrorHandlingTester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = None
        self.results = []
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def test_endpoint(self, endpoint: str, method: str = "GET", data: dict = None) -> dict:
        """Testiraj specifičan endpoint"""
        url = f"{self.base_url}{endpoint}"
        
        try:
            if method == "GET":
                async with self.session.get(url) as response:
                    result = await response.json()
                    return {
                        "endpoint": endpoint,
                        "method": method,
                        "status_code": response.status,
                        "success": response.status == 200,
                        "response": result,
                        "error": None
                    }
            elif method == "POST":
                async with self.session.post(url, json=data) as response:
                    result = await response.json()
                    return {
                        "endpoint": endpoint,
                        "method": method,
                        "status_code": response.status,
                        "success": response.status == 200,
                        "response": result,
                        "error": None
                    }
            elif method == "DELETE":
                async with self.session.delete(url) as response:
                    result = await response.json()
                    return {
                        "endpoint": endpoint,
                        "method": method,
                        "status_code": response.status,
                        "success": response.status == 200,
                        "response": result,
                        "error": None
                    }
                    
        except Exception as e:
            return {
                "endpoint": endpoint,
                "method": method,
                "status_code": None,
                "success": False,
                "response": None,
                "error": str(e)
            }
    
    async def test_error_stats(self) -> dict:
        """Testiraj error statistike"""
        print("🔍 Testiranje error statistika...")
        return await self.test_endpoint("/errors/stats")
    
    async def test_recent_errors(self) -> dict:
        """Testiraj dohvatanje poslednjih grešaka"""
        print("📋 Testiranje dohvatanja poslednjih grešaka...")
        return await self.test_endpoint("/errors/recent?limit=5")
    
    async def test_errors_by_category(self) -> dict:
        """Testiraj dohvatanje grešaka po kategoriji"""
        print("📂 Testiranje dohvatanja grešaka po kategoriji...")
        return await self.test_endpoint("/errors/category/general?limit=10")
    
    async def test_error_handling(self) -> dict:
        """Testiraj error handling funkcionalnost"""
        print("🧪 Testiranje error handling funkcionalnosti...")
        return await self.test_endpoint("/errors/test", method="POST")
    
    async def test_clear_error_log(self) -> dict:
        """Testiraj brisanje error log-a"""
        print("🗑️ Testiranje brisanja error log-a...")
        return await self.test_endpoint("/errors/clear", method="DELETE")
    
    async def test_invalid_endpoints(self) -> list:
        """Testiraj nevažeće endpoint-e da proveri error handling"""
        print("❌ Testiranje nevažećih endpoint-a...")
        
        invalid_endpoints = [
            "/errors/nonexistent",
            "/errors/category/invalid",
            "/errors/recent?limit=invalid"
        ]
        
        results = []
        for endpoint in invalid_endpoints:
            result = await self.test_endpoint(endpoint)
            results.append(result)
        
        return results
    
    async def test_error_response_structure(self) -> dict:
        """Testiraj strukturu error response-a"""
        print("🏗️ Testiranje strukture error response-a...")
        
        # Testiraj nevažeći endpoint da dobiješ error response
        result = await self.test_endpoint("/errors/nonexistent")
        
        if result["success"]:
            return {
                "test": "error_response_structure",
                "success": False,
                "error": "Očekivao sam error response, ali dobio sam success"
            }
        
        # Proveri strukturu error response-a
        response = result.get("response", {})
        
        expected_fields = ["status", "error"]
        error_fields = ["code", "message", "category", "severity", "timestamp"]
        
        missing_fields = []
        for field in expected_fields:
            if field not in response:
                missing_fields.append(field)
        
        if "error" in response:
            for field in error_fields:
                if field not in response["error"]:
                    missing_fields.append(f"error.{field}")
        
        if missing_fields:
            return {
                "test": "error_response_structure",
                "success": False,
                "error": f"Nedostaju polja u error response-u: {missing_fields}",
                "response": response
            }
        
        return {
            "test": "error_response_structure",
            "success": True,
            "message": "Error response struktura je ispravna",
            "response": response
        }
    
    async def run_all_tests(self) -> dict:
        """Pokreni sve testove"""
        print("🚀 Pokretanje error handling testova...")
        print(f"📍 Server: {self.base_url}")
        print(f"⏰ Vreme: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("-" * 60)
        
        start_time = time.time()
        
        # Osnovni testovi
        tests = [
            ("error_stats", self.test_error_stats),
            ("recent_errors", self.test_recent_errors),
            ("errors_by_category", self.test_errors_by_category),
            ("error_handling", self.test_error_handling),
            ("error_response_structure", self.test_error_response_structure),
            ("invalid_endpoints", self.test_invalid_endpoints),
            ("clear_error_log", self.test_clear_error_log)
        ]
        
        results = {}
        for test_name, test_func in tests:
            try:
                if test_name == "invalid_endpoints":
                    result = await test_func()
                    results[test_name] = {
                        "success": True,
                        "results": result
                    }
                else:
                    result = await test_func()
                    results[test_name] = result
            except Exception as e:
                results[test_name] = {
                    "success": False,
                    "error": str(e)
                }
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Izračunaj statistike
        total_tests = len(results)
        successful_tests = sum(1 for r in results.values() if r.get("success", False))
        failed_tests = total_tests - successful_tests
        
        return {
            "summary": {
                "total_tests": total_tests,
                "successful_tests": successful_tests,
                "failed_tests": failed_tests,
                "success_rate": (successful_tests / total_tests * 100) if total_tests > 0 else 0,
                "duration_seconds": round(duration, 2)
            },
            "results": results,
            "timestamp": datetime.now().isoformat()
        }

def print_results(results: dict):
    """Ispiši rezultate testova"""
    print("\n" + "=" * 60)
    print("📊 REZULTATI ERROR HANDLING TESTOVA")
    print("=" * 60)
    
    summary = results["summary"]
    print(f"📈 Ukupno testova: {summary['total_tests']}")
    print(f"✅ Uspešnih: {summary['successful_tests']}")
    print(f"❌ Neuspešnih: {summary['failed_tests']}")
    print(f"📊 Stopa uspeha: {summary['success_rate']:.1f}%")
    print(f"⏱️ Trajanje: {summary['duration_seconds']}s")
    
    print("\n" + "-" * 60)
    print("🔍 DETALJNI REZULTATI")
    print("-" * 60)
    
    for test_name, result in results["results"].items():
        status = "✅" if result.get("success", False) else "❌"
        print(f"{status} {test_name}")
        
        if not result.get("success", False):
            error = result.get("error", "Nepoznata greška")
            print(f"   Greška: {error}")
        
        # Prikaži detalje za specifične testove
        if test_name == "error_handling" and result.get("success"):
            response = result.get("response", {})
            if "results" in response:
                print(f"   Testirane greške: {len(response['results'])}")
                for test_result in response["results"]:
                    print(f"     - {test_result['error_type']}: {test_result['status_code']}")
        
        elif test_name == "invalid_endpoints" and result.get("success"):
            invalid_results = result.get("results", [])
            print(f"   Testirano nevažećih endpoint-a: {len(invalid_results)}")
            for invalid_result in invalid_results:
                if not invalid_result.get("success", False):
                    print(f"     ✅ Očekivana greška: {invalid_result['endpoint']}")
    
    print("\n" + "=" * 60)
    
    if summary['success_rate'] == 100:
        print("🎉 SVI TESTOVI SU PROŠLI USPEŠNO!")
    elif summary['success_rate'] >= 80:
        print("👍 Većina testova je prošla uspešno!")
    else:
        print("⚠️ Potrebno je proveriti greške!")

async def main():
    """Glavna funkcija"""
    print("🔧 Error Handling Test Suite")
    print("=" * 60)
    
    async with ErrorHandlingTester(BASE_URL) as tester:
        try:
            results = await tester.run_all_tests()
            print_results(results)
            
            # Sačuvaj rezultate u fajl
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"error_handling_test_{timestamp}.json"
            
            with open(filename, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
            
            print(f"\n💾 Rezultati sačuvani u: {filename}")
            
        except Exception as e:
            print(f"❌ Greška pri pokretanju testova: {e}")

if __name__ == "__main__":
    asyncio.run(main()) 