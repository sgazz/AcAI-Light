#!/usr/bin/env python3
"""
Test skripta za OCR funkcionalnost
"""

import os
import sys
from PIL import Image, ImageDraw, ImageFont
import numpy as np

def create_test_image():
    """Kreira test sliku sa tekstom"""
    
    # Kreiraj sliku
    width, height = 800, 400
    image = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(image)
    
    # Pokušaj da učitamo font
    try:
        # Pokušaj da nađemo font
        font_size = 24
        try:
            font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", font_size)
        except:
            try:
                font = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", font_size)
            except:
                font = ImageFont.load_default()
    except:
        font = ImageFont.load_default()
    
    # Dodaj tekst
    text_lines = [
        "OCR Test Slika",
        "Ovo je test slika za OCR funkcionalnost",
        "AcAIA RAG System",
        "Serbian and English text",
        "1234567890",
        "Test brojevi i slova"
    ]
    
    y_position = 50
    for line in text_lines:
        draw.text((50, y_position), line, fill='black', font=font)
        y_position += 40
    
    # Dodaj neki geometrijski oblik
    draw.rectangle([50, 300, 200, 350], outline='blue', width=2)
    draw.text((60, 310), "Box", fill='blue', font=font)
    
    # Sačuvaj sliku
    test_image_path = "test_ocr_image.png"
    image.save(test_image_path)
    
    print(f"Test slika kreirana: {test_image_path}")
    return test_image_path

def test_ocr_service():
    """Testira OCR service"""
    
    # Import OCR service
    sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))
    from ocr_service import OCRService
    
    # Kreiraj OCR service
    ocr = OCRService()
    
    # Testiraj info
    print("=== OCR Info ===")
    info = ocr.get_ocr_info()
    print(f"Status: {info['status']}")
    print(f"Tesseract Version: {info['tesseract_version']}")
    print(f"Tesseract Path: {info['tesseract_path']}")
    print(f"Supported Formats: {info['supported_formats']}")
    print(f"Supported Languages: {info['supported_languages']}")
    
    # Kreiraj test sliku
    print("\n=== Kreiranje Test Slike ===")
    test_image_path = create_test_image()
    
    # Testiraj OCR
    print("\n=== OCR Test ===")
    result = ocr.extract_text(test_image_path)
    
    print(f"Status: {result['status']}")
    if result['status'] == 'success':
        print(f"Confidence: {result['confidence']:.2f}%")
        print(f"Languages: {result['languages']}")
        print(f"Image Size: {result['image_size']}")
        print("\nExtracted Text:")
        print("-" * 50)
        print(result['text'])
        print("-" * 50)
    else:
        print(f"Error: {result['message']}")
    
    # Obriši test sliku
    if os.path.exists(test_image_path):
        os.remove(test_image_path)
        print(f"\nTest slika obrisana: {test_image_path}")

if __name__ == "__main__":
    test_ocr_service() 