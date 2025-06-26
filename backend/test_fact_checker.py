#!/usr/bin/env python3
"""
Test skripta za Fact Checker funkcionalnost

Ova skripta testira sve Fact Checker endpoint-e i funkcionalnosti.
"""

import asyncio
import aiohttp
import json
import time
from datetime import datetime
from typing import Dict, List, Any

# Konfiguracija
BASE_URL = "http://localhost:8001"
API_ENDPOINTS = {
    "verify": "/fact-check/verify",
    "verify_multiple": "/fact-check/verify-multiple",
    "stats": "/fact-check/stats",
    "test": "/fact-check/test",
    "clear_cache": "/fact-check/cache/clear"
}

class FactCheckerTester:
    """Test klasa za Fact Checker funkcionalnost"""
    
    def __init__(self):
        self.session = None
        self.results = []
        self.start_time = None
        
    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def make_request(self, endpoint: str, method: str = "GET", data: Dict = None) -> Dict:
        """Napravi HTTP zahtev"""
        try:
            url = f"{BASE_URL}{endpoint}"
            headers = {"Content-Type": "application/json"}
            
            if method == "GET":
                async with self.session.get(url) as response:
                    return await response.json()
            elif method == "POST":
                async with self.session.post(url, json=data, headers=headers) as response:
                    return await response.json()
            elif method == "DELETE":
                async with self.session.delete(url) as response:
                    return await response.json()
                    
        except Exception as e:
            return {"status": "error", "message": str(e)}
    
    async def test_single_verification(self) -> Dict:
        """Test pojedinačne verifikacije odgovora"""
        print("🧪 Testiranje Single Verification...")
        
        test_cases = [
            {
                "answer": "Python je programski jezik",
                "context": "Python je visokonivojski programski jezik koji je lako čitljiv i ima čistu sintaksu",
                "sources": ["Python dokumentacija", "Programski jezici"],
                "description": "Tačna informacija o Python-u"
            },
            {
                "answer": "Zemlja je ravna",
                "context": "Zemlja je sferična planeta u Sunčevom sistemu, treća planeta od Sunca",
                "sources": ["Astronomska literatura", "Naučne publikacije"],
                "description": "Protivrečna informacija"
            },
            {
                "answer": "AI je veštačka inteligencija",
                "context": "AI se odnosi na simulaciju ljudske inteligencije u mašinama",
                "sources": ["AI literatura", "Tehnička dokumentacija"],
                "description": "Definicija AI-ja"
            },
            {
                "answer": "React je frontend framework",
                "context": "React je JavaScript biblioteka za kreiranje korisničkih interfejsa",
                "sources": ["React dokumentacija", "Web development"],
                "description": "Informacija o React-u"
            }
        ]
        
        results = []
        for i, test_case in enumerate(test_cases, 1):
            print(f"  {i}. Testiranje: {test_case['description']}")
            
            data = {
                "answer": test_case["answer"],
                "context": test_case["context"],
                "sources": test_case["sources"]
            }
            
            response = await self.make_request(API_ENDPOINTS["verify"], "POST", data)
            
            if response.get("status") == "success":
                verification = response.get("verification", {})
                results.append({
                    "test_case": test_case["description"],
                    "answer": test_case["answer"],
                    "verified": verification.get("verified"),
                    "confidence": verification.get("confidence"),
                    "status": verification.get("status"),
                    "reasoning": verification.get("reasoning"),
                    "contradictions_count": len(verification.get("contradictions", [])),
                    "missing_info_count": len(verification.get("missing_info", [])),
                    "status": "success"
                })
                print(f"    ✅ Uspešno - Verified: {verification.get('verified')}, Confidence: {verification.get('confidence', 0):.2f}")
            else:
                results.append({
                    "test_case": test_case["description"],
                    "answer": test_case["answer"],
                    "error": response.get("message"),
                    "status": "error"
                })
                print(f"    ❌ Greška: {response.get('message')}")
        
        return {
            "test_name": "Single Verification",
            "total_tests": len(test_cases),
            "successful": len([r for r in results if r["status"] == "success"]),
            "failed": len([r for r in results if r["status"] == "error"]),
            "results": results
        }
    
    async def test_multiple_verification(self) -> Dict:
        """Test verifikacije više odgovora odjednom"""
        print("🧪 Testiranje Multiple Verification...")
        
        test_data = {
            "answers": [
                {
                    "answer": "JavaScript je programski jezik",
                    "context": "JavaScript je programski jezik koji se koristi za web development",
                    "sources": ["MDN Web Docs", "JavaScript dokumentacija"]
                },
                {
                    "answer": "MongoDB je SQL baza podataka",
                    "context": "MongoDB je NoSQL baza podataka koja koristi JSON-like dokumente",
                    "sources": ["MongoDB dokumentacija", "Database literature"]
                },
                {
                    "answer": "Git je sistem za kontrolu verzija",
                    "context": "Git je distribuirani sistem za kontrolu verzija softvera",
                    "sources": ["Git dokumentacija", "Version control systems"]
                }
            ]
        }
        
        response = await self.make_request(API_ENDPOINTS["verify_multiple"], "POST", test_data)
        
        if response.get("status") == "success":
            verifications = response.get("verifications", [])
            total_checked = response.get("total_checked", 0)
            
            results = []
            for verification in verifications:
                results.append({
                    "index": verification.get("index"),
                    "verified": verification.get("verified"),
                    "confidence": verification.get("confidence"),
                    "status": verification.get("status"),
                    "contradictions_count": len(verification.get("contradictions", [])),
                    "missing_info_count": len(verification.get("missing_info", []))
                })
            
            print(f"    ✅ Uspešno - {total_checked} odgovora provereno")
            return {
                "test_name": "Multiple Verification",
                "status": "success",
                "total_checked": total_checked,
                "results": results
            }
        else:
            print(f"    ❌ Greška: {response.get('message')}")
            return {
                "test_name": "Multiple Verification",
                "status": "error",
                "error": response.get("message")
            }
    
    async def test_stats_endpoint(self) -> Dict:
        """Test stats endpoint-a"""
        print("🧪 Testiranje Stats Endpoint...")
        
        response = await self.make_request(API_ENDPOINTS["stats"])
        
        if response.get("status") == "success":
            stats = response.get("stats", {})
            print(f"    ✅ Uspešno - Total checks: {stats.get('total_checks', 0)}")
            return {
                "test_name": "Stats Endpoint",
                "status": "success",
                "stats": stats
            }
        else:
            print(f"    ❌ Greška: {response.get('message')}")
            return {
                "test_name": "Stats Endpoint",
                "status": "error",
                "error": response.get("message")
            }
    
    async def test_cache_clear(self) -> Dict:
        """Test cache clear funkcionalnosti"""
        print("🧪 Testiranje Cache Clear...")
        
        response = await self.make_request(API_ENDPOINTS["clear_cache"], "DELETE")
        
        if response.get("status") == "success":
            print(f"    ✅ Uspešno - Cache očišćen")
            return {
                "test_name": "Cache Clear",
                "status": "success"
            }
        else:
            print(f"    ❌ Greška: {response.get('message')}")
            return {
                "test_name": "Cache Clear",
                "status": "error",
                "error": response.get("message")
            }
    
    async def test_integrated_test(self) -> Dict:
        """Test integrisanog test endpoint-a"""
        print("🧪 Testiranje Integrated Test...")
        
        response = await self.make_request(API_ENDPOINTS["test"], "POST")
        
        if response.get("status") == "success":
            connection_test = response.get("connection_test", {})
            results = response.get("results", [])
            successful = len([r for r in results if r.get("status") == "success"])
            failed = len([r for r in results if r.get("status") == "error"])
            
            print(f"    ✅ Uspešno - {successful} uspešnih, {failed} grešaka")
            return {
                "test_name": "Integrated Test",
                "status": "success",
                "connection_test": connection_test,
                "total_tests": len(results),
                "successful": successful,
                "failed": failed,
                "results": results
            }
        else:
            print(f"    ❌ Greška: {response.get('message')}")
            return {
                "test_name": "Integrated Test",
                "status": "error",
                "error": response.get("message")
            }
    
    async def run_all_tests(self) -> Dict:
        """Pokreni sve testove"""
        print("🚀 POKRETANJE FACT CHECKER TESTOVA")
        print("=" * 50)
        
        self.start_time = time.time()
        
        # Pokreni sve testove
        tests = [
            await self.test_single_verification(),
            await self.test_multiple_verification(),
            await self.test_stats_endpoint(),
            await self.test_cache_clear(),
            await self.test_integrated_test()
        ]
        
        # Izračunaj ukupne rezultate
        total_tests = sum(test.get("total_tests", 1) for test in tests)
        total_successful = sum(test.get("successful", 1) if test.get("status") == "success" else 0 for test in tests)
        total_failed = sum(test.get("failed", 0) for test in tests)
        
        end_time = time.time()
        duration = end_time - self.start_time
        
        # Kreiraj finalni report
        report = {
            "timestamp": datetime.now().isoformat(),
            "duration": round(duration, 2),
            "total_tests": total_tests,
            "successful": total_successful,
            "failed": total_failed,
            "success_rate": round((total_successful / total_tests) * 100, 2) if total_tests > 0 else 0,
            "tests": tests
        }
        
        return report

def print_report(report: Dict):
    """Ispiši test report"""
    print("\n" + "=" * 50)
    print("📊 FACT CHECKER TEST REPORT")
    print("=" * 50)
    
    print(f"⏱️  Vreme izvršavanja: {report['duration']}s")
    print(f"📈 Ukupno testova: {report['total_tests']}")
    print(f"✅ Uspešnih: {report['successful']}")
    print(f"❌ Grešaka: {report['failed']}")
    print(f"📊 Stopa uspeha: {report['success_rate']}%")
    
    print("\n📋 Detaljni rezultati:")
    print("-" * 30)
    
    for test in report["tests"]:
        test_name = test.get("test_name", "Unknown")
        status = test.get("status", "unknown")
        
        if status == "success":
            successful = test.get("successful", 0)
            failed = test.get("failed", 0)
            print(f"✅ {test_name}: {successful}/{successful + failed} uspešnih")
        else:
            print(f"❌ {test_name}: Greška")
    
    # Sačuvaj report u fajl
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"fact_checker_test_{timestamp}.json"
    
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Report sačuvan u: {filename}")

async def main():
    """Glavna funkcija"""
    try:
        async with FactCheckerTester() as tester:
            report = await tester.run_all_tests()
            print_report(report)
            
    except Exception as e:
        print(f"❌ Greška pri testiranju: {e}")

if __name__ == "__main__":
    asyncio.run(main()) 