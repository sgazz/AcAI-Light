#!/usr/bin/env python3
"""
Test skripta za Query Rewriter funkcionalnost

Ova skripta testira sve Query Rewriter endpoint-e i funkcionalnosti.
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
    "enhance": "/query/enhance",
    "expand": "/query/expand", 
    "analyze": "/query/analyze",
    "stats": "/query/stats",
    "test": "/query/test",
    "clear_cache": "/query/cache/clear"
}

class QueryRewriterTester:
    """Test klasa za Query Rewriter funkcionalnost"""
    
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
    
    async def test_query_enhancement(self) -> Dict:
        """Test query enhancement funkcionalnosti"""
        print("🧪 Testiranje Query Enhancement...")
        
        test_cases = [
            {
                "query": "kako da naučim programiranje",
                "context": "početnik u programiranju",
                "domain": "education",
                "description": "Edukativni upit"
            },
            {
                "query": "Python async await primer",
                "context": "web development",
                "domain": "technical", 
                "description": "Tehnički upit"
            },
            {
                "query": "šta je AI",
                "context": "",
                "domain": "general",
                "description": "Opšti upit"
            },
            {
                "query": "kako da rešim ovaj problem sa bazom podataka",
                "context": "PostgreSQL greška",
                "domain": "technical",
                "description": "Problem-solving upit"
            }
        ]
        
        results = []
        for i, test_case in enumerate(test_cases, 1):
            print(f"  {i}. Testiranje: {test_case['description']}")
            
            data = {
                "query": test_case["query"],
                "context": test_case["context"],
                "domain": test_case["domain"]
            }
            
            response = await self.make_request(API_ENDPOINTS["enhance"], "POST", data)
            
            if response.get("status") == "success":
                enhancement = response.get("enhancement", {})
                results.append({
                    "test_case": test_case["description"],
                    "original_query": test_case["query"],
                    "enhanced_query": enhancement.get("enhanced_query"),
                    "confidence": enhancement.get("confidence"),
                    "reasoning": enhancement.get("reasoning"),
                    "synonyms_count": len(enhancement.get("synonyms", [])),
                    "context_hints_count": len(enhancement.get("context_hints", [])),
                    "status": "success"
                })
                print(f"    ✅ Uspešno - Confidence: {enhancement.get('confidence', 0):.2f}")
            else:
                results.append({
                    "test_case": test_case["description"],
                    "original_query": test_case["query"],
                    "error": response.get("message"),
                    "status": "error"
                })
                print(f"    ❌ Greška: {response.get('message')}")
        
        return {
            "test_name": "Query Enhancement",
            "total_tests": len(test_cases),
            "successful": len([r for r in results if r["status"] == "success"]),
            "failed": len([r for r in results if r["status"] == "error"]),
            "results": results
        }
    
    async def test_query_expansion(self) -> Dict:
        """Test query expansion funkcionalnosti"""
        print("🧪 Testiranje Query Expansion...")
        
        test_cases = [
            {
                "query": "machine learning",
                "domain": "technical",
                "description": "Tehnički termin"
            },
            {
                "query": "kako da budem produktivniji",
                "domain": "general",
                "description": "Opšti upit"
            },
            {
                "query": "React hooks primer",
                "domain": "technical",
                "description": "Frontend upit"
            }
        ]
        
        results = []
        for i, test_case in enumerate(test_cases, 1):
            print(f"  {i}. Testiranje: {test_case['description']}")
            
            data = {
                "query": test_case["query"],
                "domain": test_case["domain"]
            }
            
            response = await self.make_request(API_ENDPOINTS["expand"], "POST", data)
            
            if response.get("status") == "success":
                results.append({
                    "test_case": test_case["description"],
                    "original_query": test_case["query"],
                    "expanded_count": response.get("count", 0),
                    "expanded_queries": response.get("expanded_queries", []),
                    "status": "success"
                })
                print(f"    ✅ Uspešno - {response.get('count', 0)} varijanti")
            else:
                results.append({
                    "test_case": test_case["description"],
                    "original_query": test_case["query"],
                    "error": response.get("message"),
                    "status": "error"
                })
                print(f"    ❌ Greška: {response.get('message')}")
        
        return {
            "test_name": "Query Expansion",
            "total_tests": len(test_cases),
            "successful": len([r for r in results if r["status"] == "success"]),
            "failed": len([r for r in results if r["status"] == "error"]),
            "results": results
        }
    
    async def test_query_analysis(self) -> Dict:
        """Test query analysis funkcionalnosti"""
        print("🧪 Testiranje Query Analysis...")
        
        test_cases = [
            {
                "query": "kako da implementiram REST API",
                "domain": "technical",
                "description": "Tehnički upit"
            },
            {
                "query": "šta je blockchain",
                "domain": "general",
                "description": "Konceptualni upit"
            },
            {
                "query": "najbolji način za učenje matematike",
                "domain": "education",
                "description": "Edukativni upit"
            }
        ]
        
        results = []
        for i, test_case in enumerate(test_cases, 1):
            print(f"  {i}. Testiranje: {test_case['description']}")
            
            data = {
                "query": test_case["query"],
                "domain": test_case["domain"]
            }
            
            response = await self.make_request(API_ENDPOINTS["analyze"], "POST", data)
            
            if response.get("status") == "success":
                analysis = response.get("analysis", {})
                results.append({
                    "test_case": test_case["description"],
                    "original_query": test_case["query"],
                    "intent": analysis.get("intent"),
                    "entities": analysis.get("entities", []),
                    "complexity": analysis.get("complexity"),
                    "domain": analysis.get("domain"),
                    "language": analysis.get("language"),
                    "status": "success"
                })
                print(f"    ✅ Uspešno - Intent: {analysis.get('intent')}, Complexity: {analysis.get('complexity')}")
            else:
                results.append({
                    "test_case": test_case["description"],
                    "original_query": test_case["query"],
                    "error": response.get("message"),
                    "status": "error"
                })
                print(f"    ❌ Greška: {response.get('message')}")
        
        return {
            "test_name": "Query Analysis",
            "total_tests": len(test_cases),
            "successful": len([r for r in results if r["status"] == "success"]),
            "failed": len([r for r in results if r["status"] == "error"]),
            "results": results
        }
    
    async def test_stats_endpoint(self) -> Dict:
        """Test stats endpoint-a"""
        print("🧪 Testiranje Stats Endpoint...")
        
        response = await self.make_request(API_ENDPOINTS["stats"])
        
        if response.get("status") == "success":
            stats = response.get("stats", {})
            print(f"    ✅ Uspešno - Total enhancements: {stats.get('total_enhancements', 0)}")
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
            results = response.get("results", [])
            successful = len([r for r in results if r.get("status") == "success"])
            failed = len([r for r in results if r.get("status") == "error"])
            
            print(f"    ✅ Uspešno - {successful} uspešnih, {failed} grešaka")
            return {
                "test_name": "Integrated Test",
                "status": "success",
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
        print("🚀 POKRETANJE QUERY REWRITER TESTOVA")
        print("=" * 50)
        
        self.start_time = time.time()
        
        # Pokreni sve testove
        tests = [
            await self.test_query_enhancement(),
            await self.test_query_expansion(),
            await self.test_query_analysis(),
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
    print("📊 QUERY REWRITER TEST REPORT")
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
    filename = f"query_rewriter_test_{timestamp}.json"
    
    with open(filename, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    print(f"\n💾 Report sačuvan u: {filename}")

async def main():
    """Glavna funkcija"""
    try:
        async with QueryRewriterTester() as tester:
            report = await tester.run_all_tests()
            print_report(report)
            
    except Exception as e:
        print(f"❌ Greška pri testiranju: {e}")

if __name__ == "__main__":
    asyncio.run(main()) 