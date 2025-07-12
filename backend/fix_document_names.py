#!/usr/bin/env python3
"""
Skripta za ispravku imena postojećih dokumenata u Supabase bazi
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

def fix_document_names():
    """Ispravlja imena dokumenata u Supabase bazi"""
    try:
        supabase_manager = get_supabase_manager()
        
        print("=== ISPRAVKA IMENA DOKUMENATA ===")
        
        # Dohvati sve dokumente
        documents = supabase_manager.get_all_documents()
        
        print(f"Ukupno dokumenata: {len(documents)}")
        
        # Pronađi dokumente sa privremenim imenima
        temp_docs = [doc for doc in documents if doc.get('filename', '').startswith('tmp')]
        
        if not temp_docs:
            print("✅ Nema dokumenata sa privremenim imenima za ispravku")
            return
        
        print(f"Pronađeno {len(temp_docs)} dokumenata sa privremenim imenima:")
        
        for doc in temp_docs:
            print(f"ID: {doc.get('id')}")
            print(f"Trenutno ime: {doc.get('filename')}")
            print(f"File Type: {doc.get('file_type')}")
            
            # Pokušaj da izvedeš originalno ime iz metapodataka
            metadata = doc.get('metadata', {})
            original_name = None
            
            # Proveri različite moguće lokacije originalnog imena
            if 'filename' in metadata:
                original_name = metadata['filename']
            elif 'original_filename' in metadata:
                original_name = metadata['original_filename']
            elif 'ocr_info' in metadata and metadata['ocr_info'].get('original_filename'):
                original_name = metadata['ocr_info']['original_filename']
            
            if original_name and not original_name.startswith('tmp'):
                print(f"✅ Originalno ime pronađeno: {original_name}")
                
                # Ažuriraj dokument u bazi
                try:
                    # Ažuriraj filename polje
                    supabase_manager.client.table('documents').update({
                        'filename': original_name
                    }).eq('id', doc['id']).execute()
                    
                    print(f"✅ Dokument ažuriran: {doc.get('filename')} -> {original_name}")
                    
                except Exception as e:
                    print(f"❌ Greška pri ažuriranju dokumenta {doc['id']}: {e}")
            else:
                print(f"⚠️  Nije moguće pronaći originalno ime za: {doc.get('filename')}")
                
                # Ako je PDF, možemo da generišemo smisleno ime
                if doc.get('file_type') == 'pdf':
                    # Kreiraj ime na osnovu sadržaja ili datuma
                    import datetime
                    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                    new_name = f"document_{timestamp}.pdf"
                    
                    try:
                        supabase_manager.client.table('documents').update({
                            'filename': new_name
                        }).eq('id', doc['id']).execute()
                        
                        print(f"✅ Dokument preimenovan: {doc.get('filename')} -> {new_name}")
                        
                    except Exception as e:
                        print(f"❌ Greška pri preimenovanju dokumenta {doc['id']}: {e}")
            
            print("-" * 50)
            
    except Exception as e:
        print(f"Greška pri ispravci imena dokumenata: {e}")

def check_ocr_images():
    """Proverava OCR slike za originalna imena"""
    try:
        supabase_manager = get_supabase_manager()
        
        print("\n=== PROVERA OCR SLIKA ===")
        
        ocr_images = supabase_manager.get_ocr_images()
        
        print(f"Ukupno OCR slika: {len(ocr_images)}")
        
        for ocr in ocr_images:
            print(f"ID: {ocr.get('id')}")
            print(f"Original Filename: {ocr.get('original_filename')}")
            print(f"Processed Filename: {ocr.get('processed_filename')}")
            
            # Ako OCR slika ima originalno ime, možemo da ažuriramo odgovarajući dokument
            original_filename = ocr.get('original_filename')
            if original_filename and not original_filename.startswith('tmp'):
                print(f"✅ OCR slika ima originalno ime: {ocr.get('original_filename')}")
                
                # Pokušaj da nađeš dokument sa processed_filename i ažuriraj ga
                if ocr.get('processed_filename'):
                    try:
                        # Ažuriraj dokument koji ima processed_filename kao filename
                        result = supabase_manager.client.table('documents').update({
                            'filename': ocr.get('original_filename')
                        }).eq('filename', ocr.get('processed_filename')).execute()
                        
                        if result.data:
                            print(f"✅ Dokument ažuriran iz OCR podataka: {ocr.get('processed_filename')} -> {ocr.get('original_filename')}")
                        else:
                            print(f"⚠️  Dokument sa imenom {ocr.get('processed_filename')} nije pronađen")
                            
                    except Exception as e:
                        print(f"❌ Greška pri ažuriranju dokumenta iz OCR podataka: {e}")
            
            print("-" * 30)
            
    except Exception as e:
        print(f"Greška pri proveri OCR slika: {e}")

def verify_fixes():
    """Proverava da li su ispravke uspešno primenjene"""
    try:
        supabase_manager = get_supabase_manager()
        
        print("\n=== VERIFIKACIJA ISPRAVKI ===")
        
        documents = supabase_manager.get_all_documents()
        
        temp_docs_after = [doc for doc in documents if doc.get('filename', '').startswith('tmp')]
        
        if temp_docs_after:
            print(f"⚠️  Još uvek postoje {len(temp_docs_after)} dokumenata sa privremenim imenima:")
            for doc in temp_docs_after:
                print(f"  - {doc.get('filename')} (ID: {doc.get('id')})")
        else:
            print("✅ Svi dokumenti sada imaju smislena imena!")
            
    except Exception as e:
        print(f"Greška pri verifikaciji: {e}")

if __name__ == "__main__":
    print("🔧 ISPRAVKA IMENA DOKUMENATA U SUPABASE")
    print("=" * 60)
    
    fix_document_names()
    check_ocr_images()
    verify_fixes()
    
    print("\n✅ Proces završen!") 