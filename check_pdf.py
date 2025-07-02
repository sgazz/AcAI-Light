import sys
from PyPDF2 import PdfReader

def check_pdf_validity(pdf_path):
    try:
        reader = PdfReader(pdf_path)
        num_pages = len(reader.pages)
        print(f"✅ PDF je ispravan! Broj stranica: {num_pages}")
        print("--- Sadržaj po stranicama ---")
        for i, page in enumerate(reader.pages):
            text = page.extract_text()
            print(f"\n--- Stranica {i+1} ---")
            if text and text.strip():
                print(text[:500])  # Prvih 500 karaktera
            else:
                print("[Nema teksta na ovoj stranici]")
    except Exception as e:
        print(f"❌ PDF NIJE ispravan! Greška: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Koristi: python check_pdf.py putanja/do/fajla.pdf")
    else:
        check_pdf_validity(sys.argv[1]) 