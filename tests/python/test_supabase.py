#!/usr/bin/env python3
"""
Test skripta za Supabase integraciju
Testira povezivanje, kreiranje tabela i osnovne operacije
"""

import os
import sys
import json
from datetime import datetime

# Dodaj backend direktorijum u Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from supabase_client import get_supabase_manager, init_supabase

def test_supabase_connection():
    """Testira povezivanje sa Supabase"""
    print("🔌 Testiranje Supabase povezivanja...")
    
    try:
        # Učitaj environment varijable
        from dotenv import load_dotenv
        load_dotenv()
        
        # Inicijalizuj Supabase
        if init_supabase():
            print("✅ Supabase povezivanje uspešno!")
            return True
        else:
            print("❌ Greška pri povezivanju sa Supabase")
            return False
            
    except Exception as e:
        print(f"❌ Greška: {e}")
        return False

def test_database_operations():
    """Testira osnovne operacije sa bazom podataka"""
    print("\n📊 Testiranje operacija sa bazom podataka...")
    
    try:
        manager = get_supabase_manager()
        
        # Test 1: Dohvatanje statistika
        print("📈 Dohvatanje statistika baze...")
        stats = manager.get_database_stats()
        print(f"Statistike: {json.dumps(stats, indent=2, default=str)}")
        
        # Test 2: Ubacivanje test dokumenta
        print("\n📄 Testiranje ubacivanja dokumenta...")
        test_doc_id = manager.insert_document(
            filename="test_document.txt",
            file_path="/test/path/test_document.txt",
            file_type="text/plain",
            file_size=1024,
            content="Ovo je test dokument za AcAIA projekat.",
            metadata={"test": True, "created_by": "test_script"}
        )
        print(f"✅ Dokument ubacen sa ID: {test_doc_id}")
        
        # Test 3: Dohvatanje dokumenta
        print("\n🔍 Testiranje dohvatanja dokumenta...")
        doc = manager.get_document(test_doc_id)
        if doc:
            print(f"✅ Dokument dohvaćen: {doc['filename']}")
        else:
            print("❌ Dokument nije dohvaćen")
        
        # Test 4: Ubacivanje test vektora
        print("\n🧮 Testiranje ubacivanja vektora...")
        test_vectors = [
            {
                'chunk_index': 0,
                'chunk_text': 'Ovo je test chunk tekst.',
                'embedding': [0.1] * 1536,  # Test embedding
                'metadata': {'test': True}
            }
        ]
        
        if manager.insert_document_vectors(test_doc_id, test_vectors):
            print("✅ Vektori uspešno ubaceni")
        else:
            print("❌ Greška pri ubacivanju vektora")
        
        # Test 5: Chat istorija
        print("\n💬 Testiranje chat istorije...")
        session_id = f"test_session_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        chat_id = manager.save_chat_message(
            session_id=session_id,
            user_message="Zdravo, ovo je test poruka",
            assistant_message="Zdravo! Kako mogu da pomognem?",
            sources=[{"title": "Test dokument", "content": "Test sadržaj"}]
        )
        print(f"✅ Chat poruka sačuvana sa ID: {chat_id}")
        
        # Test 6: OCR slika
        print("\n🖼️ Testiranje OCR slike...")
        ocr_id = manager.save_ocr_image(
            original_filename="test_image.png",
            original_path="/test/path/test_image.png",
            processed_filename="test_image_processed.png",
            processed_path="/test/path/processed/test_image_processed.png",
            ocr_text="Ovo je test OCR tekst",
            confidence_score=0.95,
            language="srp+eng"
        )
        print(f"✅ OCR slika sačuvana sa ID: {ocr_id}")
        
        # Test 7: Retrieval sesija
        print("\n🔍 Testiranje retrieval sesije...")
        retrieval_id = manager.save_retrieval_session(
            session_id=session_id,
            query="Test upit za multi-step retrieval",
            steps=[{"step": 1, "action": "search", "results": 5}],
            final_results=[{"document": "test_doc", "score": 0.8}]
        )
        print(f"✅ Retrieval sesija sačuvana sa ID: {retrieval_id}")
        
        # Test 8: Dohvatanje chat istorije
        print("\n📜 Testiranje dohvatanja chat istorije...")
        chat_history = manager.get_chat_history(session_id)
        print(f"✅ Dohvaćeno {len(chat_history)} chat poruka")
        
        # Test 9: Dohvatanje OCR slika
        print("\n🖼️ Testiranje dohvatanja OCR slika...")
        ocr_images = manager.get_ocr_images()
        print(f"✅ Dohvaćeno {len(ocr_images)} OCR slika")
        
        # Test 10: Dohvatanje retrieval sesija
        print("\n🔍 Testiranje dohvatanja retrieval sesija...")
        retrieval_sessions = manager.get_retrieval_sessions(session_id)
        print(f"✅ Dohvaćeno {len(retrieval_sessions)} retrieval sesija")
        
        # Čišćenje test podataka
        print("\n🧹 Čišćenje test podataka...")
        if manager.delete_document(test_doc_id):
            print("✅ Test dokument obrisan")
        else:
            print("❌ Greška pri brisanju test dokumenta")
        
        return True
        
    except Exception as e:
        print(f"❌ Greška pri testiranju operacija: {e}")
        return False

def test_vector_search():
    """Testira pretragu vektora"""
    print("\n🔍 Testiranje pretrage vektora...")
    
    try:
        manager = get_supabase_manager()
        
        # Kreiraj test embedding
        test_embedding = [0.1] * 1536
        
        # Pokušaj pretragu
        results = manager.search_similar_vectors(
            query_embedding=test_embedding,
            match_threshold=0.5,
            match_count=5
        )
        
        print(f"✅ Pretraga vektora uspešna, pronađeno {len(results)} rezultata")
        return True
        
    except Exception as e:
        print(f"❌ Greška pri pretrazi vektora: {e}")
        return False

def main():
    """Glavna funkcija za testiranje"""
    print("🚀 Započinjanje testiranja Supabase integracije...")
    print("=" * 50)
    
    # Test 1: Povezivanje
    if not test_supabase_connection():
        print("\n❌ Testiranje prekinuto zbog greške pri povezivanju")
        return
    
    # Test 2: Operacije sa bazom
    if not test_database_operations():
        print("\n❌ Testiranje prekinuto zbog greške pri operacijama")
        return
    
    # Test 3: Pretraga vektora
    if not test_vector_search():
        print("\n❌ Testiranje prekinuto zbog greške pri pretrazi")
        return
    
    print("\n" + "=" * 50)
    print("🎉 Svi testovi uspešno završeni!")
    print("✅ Supabase integracija je spremna za korišćenje")

if __name__ == "__main__":
    main() 