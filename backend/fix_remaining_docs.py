#!/usr/bin/env python3
"""
Skripta za ispravku preostalih dokumenata sa OCR tekstom
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

def fix_ocr_documents():
    """Ispravlja dokumente koji sadrže OCR tekst sa slika"""
    try:
        supabase_manager = get_supabase_manager()
        
        print("=== ISPRAVKA OCR DOKUMENATA ===")
        
        # Dohvati sve dokumente
        documents = supabase_manager.get_all_documents()
        
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
            
            # Proveri da li dokument sadrži OCR tekst
            metadata = doc.get('metadata', {})
            ocr_info = metadata.get('ocr_info', {})
            
            if ocr_info.get('text'):
                print(f"✅ Dokument sadrži OCR tekst: {ocr_info['text'][:100]}...")
                
                # Pokušaj da nađeš odgovarajuću OCR sliku
                ocr_images = supabase_manager.get_ocr_images()
                
                for ocr in ocr_images:
                    if ocr.get('ocr_text') and ocr.get('ocr_text') in ocr_info.get('text', ''):
                        print(f"✅ Pronađena odgovarajuća OCR slika: {ocr.get('original_filename')}")
                        
                        # Ažuriraj dokument sa originalnim imenom slike
                        try:
                            supabase_manager.client.table('documents').update({
                                'filename': ocr.get('original_filename')
                            }).eq('id', doc['id']).execute()
                            
                            print(f"✅ Dokument ažuriran: {doc.get('filename')} -> {ocr.get('original_filename')}")
                            break
                            
                        except Exception as e:
                            print(f"❌ Greška pri ažuriranju dokumenta {doc['id']}: {e}")
                else:
                    print(f"⚠️  Nije pronađena odgovarajuća OCR slika za dokument {doc['id']}")
                    
                    # Ako je tekstualni fajl sa OCR sadržajem, preimenuj ga u smisleno ime
                    if doc.get('file_type') == 'txt':
                        import datetime
                        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
                        new_name = f"ocr_text_{timestamp}.txt"
                        
                        try:
                            supabase_manager.client.table('documents').update({
                                'filename': new_name
                            }).eq('id', doc['id']).execute()
                            
                            print(f"✅ Dokument preimenovan: {doc.get('filename')} -> {new_name}")
                            
                        except Exception as e:
                            print(f"❌ Greška pri preimenovanju dokumenta {doc['id']}: {e}")
            else:
                print(f"⚠️  Dokument ne sadrži OCR tekst")
            
            print("-" * 50)
            
    except Exception as e:
        print(f"Greška pri ispravci OCR dokumenata: {e}")

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
            
        # Prikaži sve dokumente sa njihovim imenima
        print("\n=== SVI DOKUMENTI ===")
        for doc in documents:
            print(f"ID: {doc.get('id')}")
            print(f"Filename: {doc.get('filename')}")
            print(f"File Type: {doc.get('file_type')}")
            print(f"File Size: {doc.get('file_size')}")
            print("-" * 30)
            
    except Exception as e:
        print(f"Greška pri verifikaciji: {e}")

if __name__ == "__main__":
    print("🔧 ISPRAVKA OCR DOKUMENATA U SUPABASE")
    print("=" * 60)
    
    fix_ocr_documents()
    verify_fixes()
    
    print("\n✅ Proces završen!") 