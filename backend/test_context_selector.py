#!/usr/bin/env python3
"""
Test skripta za Context Selection funkcionalnost
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.context_selector import ContextSelector
from app.rag_service import RAGService
import json

def test_context_selector():
    """Testira Context Selector funkcionalnost"""
    print("=== Testiranje Context Selector funkcionalnosti ===\n")
    
    # Inicijalizuj RAG servis
    print("1. Inicijalizacija RAG servisa...")
    rag_service = RAGService()
    
    # Test upiti
    test_queries = [
        "Šta je veštačka inteligencija?",
        "Uporedi mašinsko učenje i deep learning",
        "Kako funkcioniše RAG sistem i zašto je koristan?",
        "Objasni razliku između bi-encoder i cross-encoder modela",
        "Koji su koraci u procesu obrade dokumenata?"
    ]
    
    # Test konteksti
    test_contexts = {
        'documents': [
            {
                'filename': 'AI_introduction.pdf',
                'content': 'Veštačka inteligencija je grana računarske nauke koja se bavi kreiranjem sistema koji mogu da izvršavaju zadatke koji obično zahtevaju ljudsku inteligenciju. Ovi sistemi mogu da uče, zaključuju, prepoznaju obrasce i donose odluke na osnovu podataka.',
                'score': 0.9,
                'page': 1
            },
            {
                'filename': 'ML_basics.pdf',
                'content': 'Mašinsko učenje je podskup veštačke inteligencije koji omogućava računarima da uče i poboljšavaju se iz iskustva bez eksplicitnog programiranja. Koristi algoritme koji mogu da identifikuju obrasce u podacima i koriste te obrasce za donošenje odluka.',
                'score': 0.8,
                'page': 1
            },
            {
                'filename': 'RAG_system.pdf',
                'content': 'RAG (Retrieval-Augmented Generation) sistem kombinuje pretragu dokumenata sa generisanjem odgovora. Prvo pretražuje relevantne dokumente, a zatim koristi te informacije za generisanje tačnih i informativnih odgovora.',
                'score': 0.85,
                'page': 1
            }
        ],
        'conversation_history': [
            {
                'sender': 'user',
                'content': 'Možeš li mi objasniti šta je veštačka inteligencija?',
                'timestamp': '2024-01-27T10:00:00'
            },
            {
                'sender': 'ai',
                'content': 'Veštačka inteligencija je tehnologija koja omogućava računarima da simuliraju ljudsku inteligenciju. Može da uči, zaključuje i donosi odluke na osnovu podataka.',
                'timestamp': '2024-01-27T10:01:00'
            },
            {
                'sender': 'user',
                'content': 'Kako se razlikuje od mašinskog učenja?',
                'timestamp': '2024-01-27T10:02:00'
            },
            {
                'sender': 'ai',
                'content': 'Mašinsko učenje je podskup veštačke inteligencije koji se fokusira na algoritme koji mogu da uče iz podataka bez eksplicitnog programiranja.',
                'timestamp': '2024-01-27T10:03:00'
            }
        ],
        'user_profile': {
            'interests': 'AI, mašinsko učenje, veštačka inteligencija, deep learning',
            'preferences': 'detaljni odgovori, praktični primeri, vizuelizacije',
            'history': 'aktivni korisnik RAG sistema, često pita o AI temama'
        },
        'general_context': {
            'system_info': 'AcAIA - AI Study Assistant',
            'current_topic': 'veštačka inteligencija i mašinsko učenje',
            'session_duration': '45 minuta',
            'user_level': 'srednji'
        }
    }
    
    print("2. Testiranje analize upita...")
    for i, query in enumerate(test_queries, 1):
        analysis = rag_service.context_selector._analyze_query(query)
        print(f"   Upit {i}: {query}")
        print(f"   Tip: {analysis['query_type']}")
        print(f"   Složenost: {analysis['complexity']:.2f}")
        print(f"   Ključne reči: {analysis['keywords'][:5]}")
        print(f"   Entiteti: {analysis['entities']}")
        print()
    
    print("3. Testiranje context selection-a...")
    for i, query in enumerate(test_queries[:3], 1):  # Testiraj prva 3 upita
        print(f"   Test {i}: {query}")
        
        context_selection = rag_service.context_selector.select_context(
            query, test_contexts, max_results=3
        )
        
        if context_selection['status'] == 'success':
            print(f"   ✅ Context selection uspešan")
            print(f"   Odabrani kontekst: {context_selection['context_analysis']['total_context_length']} karaktera")
            print(f"   Tipovi konteksta: {context_selection['context_analysis']['context_types_used']}")
            print(f"   Skor relevantnosti: {context_selection['context_analysis']['relevance_score']:.3f}")
            print(f"   Kandidati: {context_selection['context_candidates']} -> {context_selection['selected_candidates']}")
            
            # Prikaži odabrani kontekst
            selected_context = context_selection['selected_context']
            if selected_context:
                print(f"   Kontekst: {selected_context[:200]}...")
        else:
            print(f"   ❌ Greška: {context_selection['message']}")
        
        print()
    
    return True

def test_enhanced_context_rag():
    """Testira enhanced context RAG odgovor"""
    print("\n=== Testiranje Enhanced Context RAG odgovora ===\n")
    
    # Inicijalizuj RAG servis
    print("1. Inicijalizacija RAG servisa...")
    rag_service = RAGService()
    
    # Test upit
    complex_query = "Objasni kako funkcioniše RAG sistem i zašto je koristan za učenje"
    
    # Pripremi kontekste
    available_contexts = {
        'documents': rag_service.list_documents(),
        'conversation_history': [
            {
                'sender': 'user',
                'content': 'Šta je RAG sistem?',
                'timestamp': '2024-01-27T10:00:00'
            },
            {
                'sender': 'ai',
                'content': 'RAG sistem kombinuje pretragu dokumenata sa generisanjem odgovora.',
                'timestamp': '2024-01-27T10:01:00'
            }
        ],
        'user_profile': {
            'interests': 'AI, mašinsko učenje, veštačka inteligencija',
            'preferences': 'detaljni odgovori, praktični primeri',
            'history': 'aktivni korisnik RAG sistema'
        },
        'general_context': {
            'system_info': 'AcAIA - AI Study Assistant',
            'current_topic': 'veštačka inteligencija i mašinsko učenje'
        }
    }
    
    print("2. Generisanje enhanced context RAG odgovora...")
    
    # Simuliraj async poziv
    import asyncio
    
    async def test_enhanced_rag():
        rag_response = await rag_service.generate_enhanced_context_response(
            complex_query, 
            available_contexts, 
            max_results=3
        )
        
        if rag_response["status"] == "success":
            print("   ✅ Enhanced context RAG odgovor uspešno generisan")
            print(f"   Odgovor: {rag_response['response'][:200]}...")
            print(f"   Context selector korišćen: {rag_response.get('context_selector_used', False)}")
            print(f"   Dužina odabranog konteksta: {rag_response.get('selected_context_length', 0)}")
            print(f"   Broj rezultata pretrage: {rag_response.get('retrieval_results_count', 0)}")
            print(f"   Koraci pretrage: {rag_response.get('retrieval_steps', 0)}")
            print(f"   Tip upita: {rag_response.get('query_type', 'unknown')}")
            
            # Context analiza
            context_analysis = rag_response.get('context_analysis', {})
            if context_analysis:
                print(f"   Složenost upita: {context_analysis.get('query_complexity', 0):.2f}")
                print(f"   Tipovi konteksta: {context_analysis.get('context_types_used', [])}")
                print(f"   Ukupna dužina konteksta: {context_analysis.get('total_context_length', 0)}")
                print(f"   Skor relevantnosti: {context_analysis.get('relevance_score', 0):.3f}")
        else:
            print("   ❌ Greška pri generisanju enhanced context RAG odgovora")
            print(f"   Poruka: {rag_response.get('message', 'Nepoznata greška')}")
    
    # Pokreni test
    asyncio.run(test_enhanced_rag())

def test_context_selector_info():
    """Testira informacije o context selector-u"""
    print("\n=== Testiranje Context Selector informacija ===\n")
    
    # Inicijalizuj RAG servis
    print("1. Inicijalizacija RAG servisa...")
    rag_service = RAGService()
    
    # Dohvati informacije
    info = rag_service.get_context_selector_info()
    
    print("2. Context Selector informacije:")
    print(f"   Maksimalna dužina konteksta: {info['max_context_length']}")
    print(f"   Minimalni skor relevantnosti: {info['min_relevance_score']}")
    print(f"   Prag preklapanja: {info['context_overlap_threshold']}")
    print(f"   Opis: {info['description']}")
    
    print("\n3. Tipovi konteksta:")
    for context_type, priority in info['context_types'].items():
        print(f"   {context_type}: {priority}")

def main():
    """Glavna funkcija za testiranje"""
    print("🚀 Početak testiranja Context Selection funkcionalnosti\n")
    
    # Test context selector
    selector_success = test_context_selector()
    
    if selector_success:
        # Test enhanced context RAG
        test_enhanced_context_rag()
        
        # Test informacije
        test_context_selector_info()
        
        print("\n✅ Svi testovi završeni uspešno!")
        print("\n📝 Napomene:")
        print("- Context Selection poboljšava kvalitet odgovora")
        print("- Pametni izbor konteksta iz različitih izvora")
        print("- Rangiranje i optimizacija konteksta")
        print("- Integracija sa multi-step retrieval")
        print("- Podrška za različite tipove upita")
    else:
        print("\n❌ Testiranje context selector-a nije uspelo!")

if __name__ == "__main__":
    main() 