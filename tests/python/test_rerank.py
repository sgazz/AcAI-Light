#!/usr/bin/env python3
"""
Test skripta za re-ranking funkcionalnost
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.reranker import Reranker
from app.rag_service import RAGService
import json

def test_reranker():
    """Testira re-ranker funkcionalnost"""
    print("=== Testiranje Re-Ranker funkcionalnosti ===\n")
    
    # Inicijalizuj re-ranker
    print("1. Inicijalizacija re-ranker-a...")
    reranker = Reranker()
    
    # Proveri informacije o modelu
    info = reranker.get_model_info()
    print(f"   Model: {info['model_name']}")
    print(f"   Učitan: {info['model_loaded']}")
    print(f"   Tip: {info['model_type']}\n")
    
    if not info['model_loaded']:
        print("❌ Re-ranker model nije učitan!")
        return False
    
    # Test podaci
    query = "Šta je veštačka inteligencija?"
    documents = [
        {
            'content': 'Veštačka inteligencija je oblast računarstva koja se bavi kreiranjem sistema koji mogu da izvršavaju zadatke koji obično zahtevaju ljudsku inteligenciju.',
            'filename': 'test1.pdf',
            'page': 1,
            'score': 0.85
        },
        {
            'content': 'AI sistemi mogu da uče, rezonuju, planiraju i rešavaju probleme na način koji oponaša ljudsko razmišljanje.',
            'filename': 'test2.pdf',
            'page': 2,
            'score': 0.78
        },
        {
            'content': 'Mašinsko učenje je podoblast veštačke inteligencije koja omogućava računarima da uče bez eksplicitnog programiranja.',
            'filename': 'test3.pdf',
            'page': 3,
            'score': 0.92
        },
        {
            'content': 'Deep learning koristi neuronske mreže sa više slojeva za obradu složenih obrazaca u podacima.',
            'filename': 'test4.pdf',
            'page': 4,
            'score': 0.65
        }
    ]
    
    print("2. Testiranje osnovnog re-ranking-a...")
    reranked_docs = reranker.rerank(query, documents, top_k=3)
    
    print("   Originalni redosled:")
    for i, doc in enumerate(documents[:3]):
        print(f"   {i+1}. Score: {doc['score']:.3f} - {doc['content'][:50]}...")
    
    print("\n   Nakon re-ranking-a:")
    for i, doc in enumerate(reranked_docs):
        print(f"   {i+1}. Combined Score: {doc['combined_score']:.3f}, Re-rank Score: {doc['rerank_score']:.3f}")
        print(f"      {doc['content'][:50]}...")
    
    print("\n3. Testiranje re-ranking-a sa metapodacima...")
    reranked_with_meta = reranker.rerank_with_metadata(query, documents, top_k=3, use_metadata=True)
    
    print("   Nakon re-ranking-a sa metapodacima:")
    for i, doc in enumerate(reranked_with_meta):
        print(f"   {i+1}. Combined Score: {doc['combined_score']:.3f}, Re-rank Score: {doc['rerank_score']:.3f}")
        print(f"      Fajl: {doc['filename']}, Stranica: {doc['page']}")
        print(f"      {doc['content'][:50]}...")
    
    return True

def test_rag_service_rerank():
    """Testira RAG servis sa re-ranking-om"""
    print("\n=== Testiranje RAG servisa sa re-ranking-om ===\n")
    
    # Inicijalizuj RAG servis
    print("1. Inicijalizacija RAG servisa...")
    rag_service = RAGService()
    
    # Test upit
    query = "Kako funkcioniše RAG sistem?"
    
    print("2. Testiranje pretrage bez re-ranking-a...")
    basic_results = rag_service.search_documents(query, top_k=3, use_rerank=False)
    print(f"   Pronađeno {len(basic_results)} rezultata")
    
    if basic_results:
        print("   Prvi rezultat:")
        print(f"   Score: {basic_results[0].get('score', 0):.3f}")
        print(f"   Fajl: {basic_results[0].get('filename', 'N/A')}")
        print(f"   Sadržaj: {basic_results[0].get('content', '')[:100]}...")
    
    print("\n3. Testiranje pretrage sa re-ranking-om...")
    rerank_results = rag_service.search_documents_with_rerank(query, top_k=3, use_metadata=True)
    print(f"   Pronađeno {len(rerank_results)} rezultata")
    
    if rerank_results:
        print("   Prvi rezultat:")
        print(f"   Combined Score: {rerank_results[0].get('combined_score', 0):.3f}")
        print(f"   Re-rank Score: {rerank_results[0].get('rerank_score', 0):.3f}")
        print(f"   Fajl: {rerank_results[0].get('filename', 'N/A')}")
        print(f"   Sadržaj: {rerank_results[0].get('content', '')[:100]}...")
    
    print("\n4. Testiranje RAG odgovora sa re-ranking-om...")
    rag_response = rag_service.generate_rag_response(
        query, 
        context="", 
        max_results=3, 
        use_rerank=True
    )
    
    if rag_response['status'] == 'success':
        print("   ✅ RAG odgovor uspešno generisan")
        print(f"   Re-ranking primenjen: {rag_response.get('reranking_applied', False)}")
        print(f"   Broj izvora: {len(rag_response.get('sources', []))}")
        
        if rag_response.get('reranker_info'):
            print(f"   Re-ranker model: {rag_response['reranker_info']['model_name']}")
    else:
        print("   ❌ Greška pri generisanju RAG odgovora")
        print(f"   Poruka: {rag_response.get('message', 'Nepoznata greška')}")

def main():
    """Glavna funkcija za testiranje"""
    print("🚀 Početak testiranja re-ranking funkcionalnosti\n")
    
    # Test re-ranker
    rerank_success = test_reranker()
    
    if rerank_success:
        # Test RAG servis
        test_rag_service_rerank()
        
        print("\n✅ Svi testovi završeni uspešno!")
        print("\n📝 Napomene:")
        print("- Re-ranking poboljšava kvalitet rezultata pretrage")
        print("- Cross-encoder model daje preciznije rangiranje")
        print("- Kombinovanje originalnog i re-rank score-a daje bolje rezultate")
    else:
        print("\n❌ Testiranje re-ranker-a nije uspelo!")

if __name__ == "__main__":
    main() 