#!/usr/bin/env python3
"""
Test skripta za RAG sistem
"""

import os
import sys
import tempfile
from pathlib import Path

# Dodaj backend direktorijum u Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.rag_service import RAGService

def create_test_document():
    """Kreira test dokument za testiranje"""
    test_content = """
    # Uvod u Mašinsko Učenje
    
    Mašinsko učenje je grana veštačke inteligencije koja omogućava računarima da uče i poboljšavaju se iz iskustva bez eksplicitnog programiranja.
    
    ## Tipovi Mašinskog Učenja
    
    ### 1. Supervizovano Učenje
    Supervizovano učenje koristi označene podatke za obuku modela. Model uči da mapira ulaze na izlaze na osnovu primera.
    
    ### 2. Nekontrolisano Učenje
    Nekontrolisano učenje koristi neoznačene podatke. Model pronalazi skrivene obrasce u podacima.
    
    ### 3. Polu-kontrolisano Učenje
    Kombinuje označene i neoznačene podatke za obuku modela.
    
    ## Algoritmi
    
    ### Linearna Regresija
    Linearna regresija je osnovni algoritam za predviđanje kontinuiranih vrednosti.
    
    ### Logistička Regresija
    Logistička regresija se koristi za klasifikaciju binarnih problema.
    
    ### Drvo Odlučivanja
    Drvo odlučivanja je algoritam koji koristi stablo za predstavljanje odluka i njihovih mogućih posledica.
    
    ## Aplikacije
    
    Mašinsko učenje se koristi u:
    - Prepoznavanju slika
    - Obradi prirodnog jezika
    - Preporučivanju proizvoda
    - Medicinskoj dijagnostici
    - Finansijskom modeliranju
    """
    
    # Kreiraj privremeni fajl
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8') as f:
        f.write(test_content)
        return f.name

def test_rag_system():
    """Testira RAG sistem"""
    print("🚀 Testiranje RAG sistema...")
    
    try:
        # Inicijalizuj RAG servis
        print("📦 Inicijalizacija RAG servisa...")
        rag_service = RAGService()
        
        # Test povezanosti
        print("🔗 Testiranje povezanosti sa AI servisom...")
        connection_test = rag_service.test_connection()
        print(f"   Status: {connection_test['status']}")
        print(f"   Poruka: {connection_test['message']}")
        
        # Kreiraj test dokument
        print("📄 Kreiranje test dokumenta...")
        test_file_path = create_test_document()
        
        # Učitaj test dokument
        print("📤 Upload test dokumenta...")
        with open(test_file_path, 'rb') as f:
            file_content = f.read()
        
        upload_result = rag_service.upload_document(file_content, "test_ml_dokument.txt")
        print(f"   Status: {upload_result['status']}")
        if upload_result['status'] == 'success':
            print(f"   Doc ID: {upload_result['doc_id']}")
            print(f"   Chunks: {upload_result['chunks_created']}")
        
        # Test pretrage
        print("🔍 Testiranje pretrage...")
        search_results = rag_service.search_documents("šta je mašinsko učenje", top_k=3)
        print(f"   Pronađeno rezultata: {len(search_results)}")
        for i, result in enumerate(search_results, 1):
            print(f"   {i}. {result['filename']} (stranica {result['page']}) - Score: {result['score']:.3f}")
        
        # Test RAG chat
        print("💬 Testiranje RAG chat-a...")
        rag_response = rag_service.generate_rag_response("Objasni mi šta je supervizovano učenje")
        print(f"   Status: {rag_response['status']}")
        if rag_response['status'] == 'success':
            print(f"   Koristi RAG: {rag_response['used_rag']}")
            print(f"   Broj izvora: {len(rag_response['sources'])}")
            print(f"   Odgovor: {rag_response['response'][:200]}...")
        
        # Test statistike
        print("📊 Statistike sistema...")
        stats = rag_service.get_stats()
        print(f"   Ukupno dokumenata: {stats['total_documents']}")
        print(f"   Ukupno embeddings: {stats['total_embeddings']}")
        print(f"   Dimenzija indeksa: {stats['index_dimension']}")
        
        # Test liste dokumenata
        print("📋 Lista dokumenata...")
        documents = rag_service.list_documents()
        for doc in documents:
            print(f"   - {doc['filename']} ({doc['file_type']}) - {doc['total_pages']} stranica")
        
        # Obriši test fajl
        os.unlink(test_file_path)
        
        print("✅ Svi testovi uspešno završeni!")
        
    except Exception as e:
        print(f"❌ Greška pri testiranju: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_rag_system() 