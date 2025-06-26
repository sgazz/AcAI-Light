#!/usr/bin/env python3
"""
Test skripta za multi-step retrieval funkcionalnost
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.multi_step_retrieval import MultiStepRetrieval
from app.rag_service import RAGService
import json

def test_multi_step_retrieval():
    """Testira multi-step retrieval funkcionalnost"""
    print("=== Testiranje Multi-Step Retrieval funkcionalnosti ===\n")
    
    # Inicijalizuj RAG servis
    print("1. Inicijalizacija RAG servisa...")
    rag_service = RAGService()
    
    # Test upiti
    test_queries = [
        "Šta je veštačka inteligencija?",
        "Uporedi mašinsko učenje i deep learning",
        "Kako funkcioniše RAG sistem i zašto je koristan?",
        "Objasni razliku između bi-encoder i cross-encoder modela",
        "Koji su koraci u procesu obrade dokumenata i kako se koriste embeddings?"
    ]
    
    print("2. Testiranje analitike upita...")
    for i, query in enumerate(test_queries, 1):
        analytics = rag_service.get_query_analytics(query)
        print(f"   Upit {i}: {query}")
        print(f"   Složen: {analytics['is_complex']}")
        print(f"   Reči: {analytics['word_count']}")
        print(f"   Skor složenosti: {analytics['complexity_score']:.2f}")
        print(f"   Koncepti: {analytics['concepts']}")
        print()
    
    print("3. Testiranje multi-step search-a...")
    complex_query = "Uporedi mašinsko učenje i deep learning, objasni razlike i sličnosti"
    
    result = rag_service.multi_step_retrieval.multi_step_search(
        complex_query, top_k=3, use_rerank=True
    )
    
    print(f"   Upit: {complex_query}")
    print(f"   Status: {result['status']}")
    print(f"   Tip upita: {result['query_type']}")
    print(f"   Koraci korišćeni: {result['steps_used']}")
    print(f"   Sub-queries: {result['sub_queries']}")
    print(f"   Koncepti: {result['concepts']}")
    print(f"   Ukupno kandidata: {result['total_candidates']}")
    print(f"   Jedinstveni kandidati: {result['unique_candidates']}")
    print(f"   Rezultati: {len(result['results'])}")
    
    if result['results']:
        print("\n   Prvi rezultat:")
        first_result = result['results'][0]
        print(f"   Fajl: {first_result.get('filename', 'N/A')}")
        print(f"   Stranica: {first_result.get('page', 'N/A')}")
        print(f"   Score: {first_result.get('combined_score', first_result.get('score', 0)):.3f}")
        print(f"   Sub-query: {first_result.get('sub_query', 'N/A')}")
        print(f"   Korak: {first_result.get('step', 'N/A')}")
        print(f"   Sadržaj: {first_result.get('content', '')[:100]}...")
    
    return True

def test_multi_step_rag():
    """Testira multi-step RAG odgovor"""
    print("\n=== Testiranje Multi-Step RAG odgovora ===\n")
    
    # Inicijalizuj RAG servis
    print("1. Inicijalizacija RAG servisa...")
    rag_service = RAGService()
    
    # Test upit
    complex_query = "Objasni kako funkcioniše RAG sistem i zašto je koristan za učenje"
    
    print("2. Generisanje multi-step RAG odgovora...")
    rag_response = rag_service.generate_multi_step_rag_response(
        complex_query, 
        context="", 
        max_results=3, 
        use_rerank=True
    )
    
    if rag_response["status"] == "success":
        print("   ✅ Multi-step RAG odgovor uspešno generisan")
        print(f"   Odgovor: {rag_response['response'][:200]}...")
        print(f"   Koristi RAG: {rag_response.get('used_rag', False)}")
        print(f"   Re-ranking primenjen: {rag_response.get('reranking_applied', False)}")
        print(f"   Broj izvora: {len(rag_response.get('sources', []))}")
        
        # Multi-step informacije
        multi_step_info = rag_response.get('multi_step_info', {})
        if multi_step_info:
            print(f"   Tip upita: {multi_step_info.get('query_type', 'N/A')}")
            print(f"   Koraci korišćeni: {multi_step_info.get('steps_used', 0)}")
            print(f"   Sub-queries: {multi_step_info.get('sub_queries', [])}")
            print(f"   Koncepti: {multi_step_info.get('concepts', [])}")
        
        # Prikaži izvore
        sources = rag_response.get('sources', [])
        if sources:
            print("\n   Izvori:")
            for i, source in enumerate(sources[:2], 1):
                print(f"   {i}. {source.get('filename', 'N/A')} (stranica {source.get('page', 'N/A')})")
                print(f"      Score: {source.get('score', 0):.3f}")
                if 'sub_query' in source:
                    print(f"      Sub-query: {source['sub_query']}")
                if 'step' in source:
                    print(f"      Korak: {source['step']}")
    else:
        print("   ❌ Greška pri generisanju multi-step RAG odgovora")
        print(f"   Poruka: {rag_response.get('message', 'Nepoznata greška')}")

def main():
    """Glavna funkcija za testiranje"""
    print("🚀 Početak testiranja multi-step retrieval funkcionalnosti\n")
    
    # Test multi-step retrieval
    retrieval_success = test_multi_step_retrieval()
    
    if retrieval_success:
        # Test multi-step RAG
        test_multi_step_rag()
        
        print("\n✅ Svi testovi završeni uspešno!")
        print("\n📝 Napomene:")
        print("- Multi-step retrieval poboljšava kvalitet za složene upite")
        print("- Automatska detekcija složenosti upita")
        print("- Razbijanje na sub-queries i iterativna pretraga")
        print("- Kombinovanje sa re-ranking funkcionalnost")
    else:
        print("\n❌ Testiranje multi-step retrieval-a nije uspelo!")

if __name__ == "__main__":
    main()
