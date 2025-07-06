#!/usr/bin/env python3
"""
Test skripta za RAG unapređenja
"""

import os
import sys
import time
import asyncio
from pathlib import Path

# Dodaj backend direktorijum u Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'app'))

from rag_service import RAGService
from query_rewriter import QueryRewriter
from fact_checker import FactChecker
from rag_analytics import RAGAnalytics, QueryMetrics, QueryType

def test_query_rewriter():
    """Testira query rewriter"""
    print("🔍 Testiranje Query Rewriter-a...")
    
    try:
        rewriter = QueryRewriter()
        
        # Test query analize
        test_queries = [
            "šta je mašinsko učenje",
            "uporedi supervizovano i nekontrolisano učenje",
            "kako radi algoritam drva odlučivanja",
            "primer linearne regresije",
            "zašto je veštačka inteligencija važna"
        ]
        
        for query in test_queries:
            print(f"\n📝 Analiza upita: '{query}'")
            analysis = rewriter.analyze_query(query)
            print(f"   Tip: {analysis.get('query_type', 'unknown')}")
            print(f"   Složenost: {analysis.get('complexity_score', 0):.2f}")
            print(f"   Ključne reči: {analysis.get('keywords', [])[:3]}")
            
            # Test rewriting
            rewrite_result = rewriter.rewrite_query(query)
            print(f"   Strategija: {rewrite_result.get('strategy_used', 'unknown')}")
            print(f"   Confidence: {rewrite_result.get('confidence', 0):.2f}")
            print(f"   Rewritten queries: {len(rewrite_result.get('rewritten_queries', []))}")
        
        print("✅ Query Rewriter testovi uspešni!")
        
    except Exception as e:
        print(f"❌ Greška pri testiranju Query Rewriter-a: {e}")
        import traceback
        traceback.print_exc()

def test_fact_checker():
    """Testira fact checker"""
    print("\n🔍 Testiranje Fact Checker-a...")
    
    try:
        checker = FactChecker()
        
        # Test fact checking
        test_texts = [
            "Mašinsko učenje je grana veštačke inteligencije koja omogućava računarima da uče iz podataka.",
            "Prema studiji iz 2023. godine, 85% kompanija koristi AI u svojim procesima.",
            "Možda je mašinsko učenje korisno za neke aplikacije, ali nisam siguran.",
            "Linearna regresija je algoritam koji koristi 2+2=5 za predviđanje vrednosti."
        ]
        
        for text in test_texts:
            print(f"\n📄 Fact checking: '{text[:50]}...'")
            result = asyncio.run(checker.check_facts(text))
            print(f"   Factual: {result.is_factual}")
            print(f"   Confidence: {result.confidence:.2f}")
            print(f"   Verified claims: {len(result.verified_claims)}")
            print(f"   Unverified claims: {len(result.unverified_claims)}")
            print(f"   Contradictions: {len(result.contradictions)}")
        
        print("✅ Fact Checker testovi uspešni!")
        
    except Exception as e:
        print(f"❌ Greška pri testiranju Fact Checker-a: {e}")
        import traceback
        traceback.print_exc()

def test_rag_analytics():
    """Testira RAG analytics"""
    print("\n📊 Testiranje RAG Analytics-a...")
    
    try:
        analytics = RAGAnalytics()
        
        # Simuliraj neke query metrike
        test_queries = [
            ("šta je AI", "definition", 0.8),
            ("uporedi ML i DL", "comparison", 0.9),
            ("kako radi CNN", "process", 0.7),
            ("primer neural network", "example", 0.6)
        ]
        
        for i, (query, query_type, quality) in enumerate(test_queries):
            metrics = QueryMetrics(
                query_id=f"test_{i}",
                query_text=query,
                query_type=QueryType(query_type),
                query_length=len(query),
                word_count=len(query.split()),
                processing_time=1.2 + i * 0.1,
                cache_hit=i % 2 == 0,
                sources_count=2 + i,
                response_length=150 + i * 50,
                quality_score=quality
            )
            analytics.track_query(metrics)
        
        # Test session tracking
        analytics.track_session_start("test_session_1")
        analytics.track_session_end("test_session_1", "Odličan sistem!")
        
        # Test analytics
        performance = analytics.get_performance_analytics("1h")
        user_behavior = analytics.get_user_behavior_analytics("1h")
        quality = analytics.get_quality_analytics("1h")
        
        print(f"📈 Performance Analytics:")
        print(f"   Total queries: {performance.get('total_queries', 0)}")
        print(f"   Avg response time: {performance.get('avg_response_time', 0):.2f}s")
        print(f"   Cache hit rate: {performance.get('cache_hit_rate', 0):.2%}")
        
        print(f"👥 User Behavior Analytics:")
        print(f"   Total sessions: {user_behavior.get('total_sessions', 0)}")
        print(f"   Avg session duration: {user_behavior.get('avg_session_duration', 0):.2f}s")
        print(f"   Avg queries per session: {user_behavior.get('avg_queries_per_session', 0):.2f}")
        
        print(f"🎯 Quality Analytics:")
        print(f"   Total rated queries: {quality.get('total_rated_queries', 0)}")
        print(f"   Avg quality score: {quality.get('avg_quality_score', 0):.2f}")
        
        print("✅ RAG Analytics testovi uspešni!")
        
    except Exception as e:
        print(f"❌ Greška pri testiranju RAG Analytics-a: {e}")
        import traceback
        traceback.print_exc()

async def test_optimized_rag():
    """Testira optimizovani RAG"""
    print("\n⚡ Testiranje Optimizovanog RAG-a...")
    
    try:
        rag_service = RAGService()
        
        # Test optimizovane metode
        test_queries = [
            "šta je mašinsko učenje",
            "kako radi algoritam drva odlučivanja",
            "uporedi supervizovano i nekontrolisano učenje"
        ]
        
        for query in test_queries:
            print(f"\n🔍 Optimizovani RAG za: '{query}'")
            start_time = time.time()
            
            result = await rag_service.generate_rag_response_optimized(
                query=query,
                context="",
                max_results=3,
                use_rerank=True,
                session_id="test_session"
            )
            
            response_time = time.time() - start_time
            
            print(f"   Status: {result.get('status', 'unknown')}")
            print(f"   Response time: {response_time:.2f}s")
            print(f"   Cached: {result.get('cached', False)}")
            print(f"   Sources: {len(result.get('sources', []))}")
            print(f"   Response length: {len(result.get('response', ''))}")
        
        # Test performance metrike
        metrics = rag_service.get_performance_metrics()
        print(f"\n📊 Performance Metrike:")
        print(f"   Memory usage: {metrics.get('memory_usage_percent', 0):.1f}%")
        print(f"   CPU usage: {metrics.get('cpu_usage_percent', 0):.1f}%")
        print(f"   Active threads: {metrics.get('active_threads', 0)}")
        
        print("✅ Optimizovani RAG testovi uspešni!")
        
    except Exception as e:
        print(f"❌ Greška pri testiranju Optimizovanog RAG-a: {e}")
        import traceback
        traceback.print_exc()

def test_batch_operations():
    """Testira batch operacije"""
    print("\n🔄 Testiranje Batch Operacija...")
    
    try:
        rewriter = QueryRewriter()
        checker = FactChecker()
        
        # Test batch query rewriting
        queries = [
            "šta je AI",
            "kako radi ML",
            "primer neural network",
            "uporedi algoritme"
        ]
        
        print("📝 Batch Query Rewriting...")
        rewrite_results = asyncio.run(rewriter.batch_rewrite_queries(queries))
        print(f"   Processed {len(rewrite_results)} queries")
        
        # Test batch fact checking
        texts = [
            "AI je grana računarstva.",
            "ML koristi algoritme za učenje.",
            "Neural networks su inspirisani mozgom."
        ]
        
        print("🔍 Batch Fact Checking...")
        fact_results = asyncio.run(checker.batch_fact_check(texts))
        print(f"   Processed {len(fact_results)} texts")
        
        print("✅ Batch operacije testovi uspešni!")
        
    except Exception as e:
        print(f"❌ Greška pri testiranju batch operacija: {e}")
        import traceback
        traceback.print_exc()

def main():
    """Glavna test funkcija"""
    print("🚀 Testiranje RAG Unapređenja")
    print("=" * 50)
    
    # Test pojedinačne komponente
    test_query_rewriter()
    test_fact_checker()
    test_rag_analytics()
    
    # Test async operacije
    asyncio.run(test_optimized_rag())
    test_batch_operations()
    
    print("\n" + "=" * 50)
    print("✅ Svi testovi završeni!")

if __name__ == "__main__":
    main() 