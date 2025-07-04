#!/usr/bin/env python3
"""
Skripta za proveru podataka u Supabase tabelama
"""

import os
import sys
from dotenv import load_dotenv

# Učitaj .env fajl
load_dotenv()

# Dodaj backend direktorijum u path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from supabase_client import get_supabase_manager
except ImportError:
    print("Greška: Ne mogu da importujem supabase_client")
    sys.exit(1)

def check_documents_table():
    """Proverava podatke u tabeli documents"""
    try:
        supabase_manager = get_supabase_manager()
        
        print("=== PROVERA TABELE 'documents' ===")
        
        # Dohvati sve dokumente
        documents = supabase_manager.get_all_documents()
        
        print(f"Ukupno dokumenata: {len(documents)}")
        print()
        
        # Traži specifični dokument
        target_filename = "tmppb3od69m.pdf"
        found_doc = None
        
        for doc in documents:
            print(f"ID: {doc.get('id')}")
            print(f"Filename: {doc.get('filename')}")
            print(f"File Type: {doc.get('file_type')}")
            print(f"File Size: {doc.get('file_size')}")
            print(f"Created At: {doc.get('created_at')}")
            print(f"Metadata: {doc.get('metadata')}")
            print("-" * 50)
            
            if doc.get('filename') == target_filename:
                found_doc = doc
        
        if found_doc:
            print(f"\n✅ PRONAĐEN DOKUMENT: {target_filename}")
            print(f"ID: {found_doc.get('id')}")
            print(f"Original Filename: {found_doc.get('filename')}")
            print(f"Metadata: {found_doc.get('metadata')}")
        else:
            print(f"\n❌ DOKUMENT NIJE PRONAĐEN: {target_filename}")
            
    except Exception as e:
        print(f"Greška pri proveri documents tabele: {e}")

def check_ocr_images_table():
    """Proverava podatke u tabeli ocr_images"""
    try:
        supabase_manager = get_supabase_manager()
        
        print("\n=== PROVERA TABELE 'ocr_images' ===")
        
        # Dohvati sve OCR slike
        ocr_images = supabase_manager.get_ocr_images()
        
        print(f"Ukupno OCR slika: {len(ocr_images)}")
        print()
        
        # Traži specifični fajl
        target_filename = "tmp910z6hnj.txt"
        found_ocr = None
        
        for ocr in ocr_images:
            print(f"ID: {ocr.get('id')}")
            print(f"Original Filename: {ocr.get('original_filename')}")
            print(f"Processed Filename: {ocr.get('processed_filename')}")
            print(f"Original Path: {ocr.get('original_path')}")
            print(f"Processed Path: {ocr.get('processed_path')}")
            print(f"Confidence Score: {ocr.get('confidence_score')}")
            print(f"Language: {ocr.get('language')}")
            print(f"OCR Text Length: {len(ocr.get('ocr_text', ''))}")
            print("-" * 50)
            
            if (ocr.get('original_filename') == target_filename or 
                ocr.get('processed_filename') == target_filename):
                found_ocr = ocr
        
        if found_ocr:
            print(f"\n✅ PRONAĐENA OCR SLIKA: {target_filename}")
            print(f"ID: {found_ocr.get('id')}")
            print(f"Original Filename: {found_ocr.get('original_filename')}")
            print(f"Processed Filename: {found_ocr.get('processed_filename')}")
            print(f"OCR Text Preview: {found_ocr.get('ocr_text', '')[:200]}...")
        else:
            print(f"\n❌ OCR SLIKA NIJE PRONAĐENA: {target_filename}")
            
    except Exception as e:
        print(f"Greška pri proveri ocr_images tabele: {e}")

def check_specific_document_by_id():
    """Proverava specifičan dokument po ID-u"""
    try:
        supabase_manager = get_supabase_manager()
        
        print("\n=== PROVERA SPECIFIČNOG DOKUMENTA PO ID ===")
        
        # Pokušaj da nađeš dokument sa privremenim imenom
        documents = supabase_manager.get_all_documents()
        
        temp_docs = [doc for doc in documents if doc.get('filename', '').startswith('tmp')]
        
        if temp_docs:
            print(f"Pronađeno {len(temp_docs)} dokumenata sa privremenim imenima:")
            for doc in temp_docs:
                print(f"ID: {doc.get('id')}")
                print(f"Filename: {doc.get('filename')}")
                print(f"File Type: {doc.get('file_type')}")
                print(f"Metadata: {doc.get('metadata')}")
                print("-" * 30)
        else:
            print("Nema dokumenata sa privremenim imenima")
            
    except Exception as e:
        print(f"Greška pri proveri specifičnog dokumenta: {e}")

if __name__ == "__main__":
    print("🔍 PROVERA SUPABASE PODATAKA")
    print("=" * 50)
    
    check_documents_table()
    check_ocr_images_table()
    check_specific_document_by_id()
    
    print("\n✅ Provera završena!") 