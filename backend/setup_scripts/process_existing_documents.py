#!/usr/bin/env python3
"""
Skripta za procesiranje postojećih dokumenata iz uploads direktorijuma
Dodaje ih u Supabase i kreira vektore za RAG
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path

# Dodaj backend direktorijum u Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from supabase_client import get_supabase_manager, init_supabase
    from app.rag_service import RAGService
    from app.document_processor import DocumentProcessor
except ImportError as e:
    print(f"❌ Greška pri import-u: {e}")
    sys.exit(1)

def get_uploaded_files():
    """Dohvata listu fajlova iz uploads direktorijuma"""
    uploads_dir = Path("../uploads")
    if not uploads_dir.exists():
        print("❌ Uploads direktorijum ne postoji")
        return []
    
    files = []
    for file_path in uploads_dir.iterdir():
        if file_path.is_file():
            files.append({
                'path': str(file_path),
                'name': file_path.name,
                'size': file_path.stat().st_size,
                'extension': file_path.suffix.lower()
            })
    
    return files

def process_document(file_info, rag_service):
    """Procesira jedan dokument"""
    try:
        print(f"📄 Procesiranje: {file_info['name']}")
        
        # Pročitaj fajl
        with open(file_info['path'], 'rb') as f:
            file_content = f.read()
        
        # Procesiraj dokument
        result = rag_service.upload_document(
            file_content=file_content,
            filename=file_info['name'],
            use_ocr=True if file_info['extension'] in ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif'] else False
        )
        
        if result['status'] == 'success':
            print(f"✅ Uspešno procesiran: {file_info['name']}")
            print(f"   - Chunkova kreirano: {result['chunks_created']}")
            return True
        else:
            print(f"❌ Greška pri procesiranju: {file_info['name']}")
            return False
            
    except Exception as e:
        print(f"❌ Greška pri procesiranju {file_info['name']}: {e}")
        return False

def main():
    """Glavna funkcija"""
    print("🔄 Procesiranje postojećih dokumenata")
    print("=" * 50)
    
    try:
        # Inicijalizuj Supabase
        if not init_supabase():
            print("❌ Ne mogu da se povežem sa Supabase")
            return
        
        # Inicijalizuj RAG servis
        rag_service = RAGService()
        
        # Dohvati listu fajlova
        files = get_uploaded_files()
        if not files:
            print("❌ Nema fajlova za procesiranje")
            return
        
        print(f"📁 Pronađeno {len(files)} fajlova za procesiranje")
        
        # Procesiraj svaki fajl
        successful = 0
        failed = 0
        
        for i, file_info in enumerate(files, 1):
            print(f"\n[{i}/{len(files)}] ", end="")
            
            if process_document(file_info, rag_service):
                successful += 1
            else:
                failed += 1
        
        # Prikaži rezultate
        print("\n" + "=" * 50)
        print("📊 Rezultati procesiranja:")
        print(f"✅ Uspešno procesirano: {successful}")
        print(f"❌ Neuspešno: {failed}")
        print(f"📄 Ukupno fajlova: {len(files)}")
        
        if successful > 0:
            print("\n🎉 Dokumenti su uspešno dodani u RAG sistem!")
            print("Sada možete koristiti chat sa RAG funkcionalnost.")
        
    except Exception as e:
        print(f"❌ Greška: {e}")

if __name__ == "__main__":
    main() 