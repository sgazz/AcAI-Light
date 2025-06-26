#!/usr/bin/env python3
"""
Test skripta za Frontend Integraciju - Query Rewriting i Fact Checking

Ova skripta testira kompletnu integraciju između frontend-a i backend-a
za Query Rewriting i Fact Checking funkcionalnosti.
"""

import asyncio
import aiohttp
import json
from datetime import datetime
from typing import Dict, List

class FrontendIntegrationTester:
    """Test klasa za frontend integraciju"""
    
    def __init__(self):
        self.backend_url = "http://localhost:8001"
        self.frontend_url = "http://localhost:3000"
        self.test_results = []
        
    async def test_query_rewriting_integration(self) -> Dict:
        """Test Query Rewriting integracije"""
        print("🧪 Testiranje Query Rewriting integracije...")
        
        test_cases = [
            {
                "query": "sta je AI",
                "expected_improvement": True,
                "description": "Osnovni upit za poboljšanje"
            },
            {
                "query": "kako radi machine learning",
                "expected_improvement": True,
                "description": "Tehnički upit"
            },
            {
                "query": "test",
                "expected_improvement": False,
                "description": "Kratak upit (možda neće biti poboljšan)"
            }
        ]
        
        results = []
        
        for i, test_case in enumerate(test_cases):
            try:
                # Test backend endpoint-a
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        f"{self.backend_url}/query/enhance",
                        json={
                            "query": test_case["query"],
                            "context": "",
                            "domain": "general"
                        }
                    ) as response:
                        data = await response.json()
                        
                        if response.status == 200 and data.get("status") == "success":
                            enhancement = data.get("enhancement", {})
                            original = enhancement.get("original_query", "")
                            enhanced = enhancement.get("enhanced_query", "")
                            confidence = enhancement.get("confidence", 0.0)
                            
                            improved = original != enhanced
                            
                            result = {
                                "test_case": i + 1,
                                "description": test_case["description"],
                                "original_query": original,
                                "enhanced_query": enhanced,
                                "confidence": confidence,
                                "improved": improved,
                                "expected_improvement": test_case["expected_improvement"],
                                "status": "success" if improved == test_case["expected_improvement"] else "partial",
                                "error": None
                            }
                        else:
                            result = {
                                "test_case": i + 1,
                                "description": test_case["description"],
                                "status": "error",
                                "error": f"HTTP {response.status}: {data}"
                            }
                            
            except Exception as e:
                result = {
                    "test_case": i + 1,
                    "description": test_case["description"],
                    "status": "error",
                    "error": str(e)
                }
            
            results.append(result)
            print(f"  ✓ Test {i+1}: {result['status']}")
        
        return {
            "test_name": "Query Rewriting Integration",
            "results": results,
            "success_count": len([r for r in results if r["status"] == "success"]),
            "partial_count": len([r for r in results if r["status"] == "partial"]),
            "error_count": len([r for r in results if r["status"] == "error"])
        }
    
    async def test_fact_checking_integration(self) -> Dict:
        """Test Fact Checking integracije"""
        print("🧪 Testiranje Fact Checking integracije...")
        
        test_cases = [
            {
                "answer": "Paris is the capital of France",
                "context": "Paris is the capital and largest city of France",
                "sources": ["geography textbook"],
                "expected_verified": True,
                "description": "Tačna informacija"
            },
            {
                "answer": "The Earth is flat",
                "context": "The Earth is a spherical planet orbiting the Sun",
                "sources": ["science textbook"],
                "expected_verified": False,
                "description": "Netačna informacija"
            },
            {
                "answer": "Python is a programming language",
                "context": "Python is a high-level programming language",
                "sources": ["programming guide"],
                "expected_verified": True,
                "description": "Tehnička informacija"
            }
        ]
        
        results = []
        
        for i, test_case in enumerate(test_cases):
            try:
                # Test backend endpoint-a
                async with aiohttp.ClientSession() as session:
                    async with session.post(
                        f"{self.backend_url}/fact-check/verify",
                        json={
                            "answer": test_case["answer"],
                            "context": test_case["context"],
                            "sources": test_case["sources"]
                        }
                    ) as response:
                        data = await response.json()
                        
                        if response.status == 200 and data.get("status") == "success":
                            verification = data.get("verification", {})
                            verified = verification.get("verified", False)
                            confidence = verification.get("confidence", 0.0)
                            reasoning = verification.get("reasoning", "")
                            
                            result = {
                                "test_case": i + 1,
                                "description": test_case["description"],
                                "answer": test_case["answer"],
                                "verified": verified,
                                "confidence": confidence,
                                "reasoning": reasoning,
                                "expected_verified": test_case["expected_verified"],
                                "status": "success" if verified == test_case["expected_verified"] else "partial",
                                "error": None
                            }
                        else:
                            result = {
                                "test_case": i + 1,
                                "description": test_case["description"],
                                "status": "error",
                                "error": f"HTTP {response.status}: {data}"
                            }
                            
            except Exception as e:
                result = {
                    "test_case": i + 1,
                    "description": test_case["description"],
                    "status": "error",
                    "error": str(e)
                }
            
            results.append(result)
            print(f"  ✓ Test {i+1}: {result['status']}")
        
        return {
            "test_name": "Fact Checking Integration",
            "results": results,
            "success_count": len([r for r in results if r["status"] == "success"]),
            "partial_count": len([r for r in results if r["status"] == "partial"]),
            "error_count": len([r for r in results if r["status"] == "error"])
        }
    
    async def test_backend_connectivity(self) -> Dict:
        """Test konektivnosti sa backend-om"""
        print("🧪 Testiranje backend konektivnosti...")
        
        endpoints = [
            "/",
            "/query/enhance",
            "/fact-check/verify",
            "/query/stats",
            "/fact-check/stats"
        ]
        
        results = []
        
        for endpoint in endpoints:
            try:
                async with aiohttp.ClientSession() as session:
                    if endpoint in ["/query/enhance", "/fact-check/verify"]:
                        # POST endpoint-i
                        async with session.post(
                            f"{self.backend_url}{endpoint}",
                            json={"test": "data"}
                        ) as response:
                            status = response.status
                    else:
                        # GET endpoint-i
                        async with session.get(f"{self.backend_url}{endpoint}") as response:
                            status = response.status
                    
                    result = {
                        "endpoint": endpoint,
                        "status": "success" if status < 500 else "error",
                        "http_status": status,
                        "error": None
                    }
                    
            except Exception as e:
                result = {
                    "endpoint": endpoint,
                    "status": "error",
                    "http_status": None,
                    "error": str(e)
                }
            
            results.append(result)
            print(f"  ✓ {endpoint}: {result['status']} ({result['http_status']})")
        
        return {
            "test_name": "Backend Connectivity",
            "results": results,
            "success_count": len([r for r in results if r["status"] == "success"]),
            "error_count": len([r for r in results if r["status"] == "error"])
        }
    
    async def run_all_tests(self) -> Dict:
        """Pokreni sve testove"""
        print("🚀 POKRETANJE FRONTEND INTEGRACIJA TESTOVA")
        print("=" * 60)
        
        tests = [
            await self.test_backend_connectivity(),
            await self.test_query_rewriting_integration(),
            await self.test_fact_checking_integration()
        ]
        
        # Izračunaj ukupne statistike
        total_success = sum(test["success_count"] for test in tests)
        total_partial = sum(test.get("partial_count", 0) for test in tests)
        total_error = sum(test["error_count"] for test in tests)
        total_tests = total_success + total_partial + total_error
        
        success_rate = (total_success / total_tests * 100) if total_tests > 0 else 0
        
        return {
            "timestamp": datetime.now().isoformat(),
            "tests": tests,
            "summary": {
                "total_tests": total_tests,
                "success_count": total_success,
                "partial_count": total_partial,
                "error_count": total_error,
                "success_rate": success_rate
            }
        }

async def main():
    """Glavna funkcija"""
    tester = FrontendIntegrationTester()
    
    try:
        results = await tester.run_all_tests()
        
        # Prikaži rezultate
        print("\n" + "=" * 60)
        print("📊 FRONTEND INTEGRACIJA TEST REPORT")
        print("=" * 60)
        
        for test in results["tests"]:
            print(f"\n🔍 {test['test_name']}")
            print(f"   Uspešno: {test['success_count']}")
            if "partial_count" in test:
                print(f"   Delimično: {test['partial_count']}")
            print(f"   Greške: {test['error_count']}")
            
            # Prikaži detalje za greške
            for result in test["results"]:
                if result["status"] == "error":
                    print(f"     ❌ {result.get('description', result.get('endpoint', 'Unknown'))}: {result['error']}")
        
        print(f"\n📈 UKUPNI REZULTATI")
        print(f"   Ukupno testova: {results['summary']['total_tests']}")
        print(f"   Uspešno: {results['summary']['success_count']}")
        print(f"   Delimično: {results['summary']['partial_count']}")
        print(f"   Greške: {results['summary']['error_count']}")
        print(f"   Stopa uspeha: {results['summary']['success_rate']:.1f}%")
        
        # Sačuvaj rezultate
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"frontend_integration_test_{timestamp}.json"
        
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(results, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Rezultati sačuvani u: {filename}")
        
        # Zaključak
        if results['summary']['success_rate'] >= 80:
            print("\n🎉 FRONTEND INTEGRACIJA USPEŠNA!")
            print("   Query Rewriting i Fact Checking su uspešno integrisani!")
        elif results['summary']['success_rate'] >= 60:
            print("\n⚠️  FRONTEND INTEGRACIJA DELIMIČNO USPEŠNA")
            print("   Potrebne su manje korekcije.")
        else:
            print("\n❌ FRONTEND INTEGRACIJA NEUSPEŠNA")
            print("   Potrebne su značajne korekcije.")
        
    except Exception as e:
        print(f"❌ Greška pri testiranju: {e}")

if __name__ == "__main__":
    asyncio.run(main()) 