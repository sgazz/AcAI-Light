#!/usr/bin/env python3
"""
Test skripta za optimizovani OCR sa performance i accuracy testovima
"""

import os
import sys
import time
import asyncio
import json
from PIL import Image, ImageDraw, ImageFont
import numpy as np

def create_test_images():
    """Kreira različite test slike za testiranje"""
    
    test_images = []
    
    # 1. Standardna test slika
    width, height = 800, 400
    image = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(image)
    
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Arial.ttf", 24)
    except:
        font = ImageFont.load_default()
    
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
    
    test_images.append(("test_standard.png", image))
    
    # 2. Slika sa šumom
    noisy_image = image.copy()
    noisy_array = np.array(noisy_image)
    
    # Dodaj šum
    noise = np.random.normal(0, 25, noisy_array.shape).astype(np.uint8)
    noisy_array = np.clip(noisy_array + noise, 0, 255)
    noisy_image = Image.fromarray(noisy_array)
    
    test_images.append(("test_noisy.png", noisy_image))
    
    # 3. Slika sa niskim kontrastom
    low_contrast_image = image.copy()
    low_contrast_array = np.array(low_contrast_image)
    
    # Smanji kontrast
    low_contrast_array = low_contrast_array * 0.3 + 128
    low_contrast_array = np.clip(low_contrast_array, 0, 255).astype(np.uint8)
    low_contrast_image = Image.fromarray(low_contrast_array)
    
    test_images.append(("test_low_contrast.png", low_contrast_image))
    
    # 4. Slika sa nagnutim tekstom
    skewed_image = image.copy()
    skewed_image = skewed_image.rotate(15, fillcolor='white')
    test_images.append(("test_skewed.png", skewed_image))
    
    # 5. Velika slika za performance test
    large_image = Image.new('RGB', (2000, 1500), color='white')
    draw_large = ImageDraw.Draw(large_image)
    
    for i in range(20):
        y_pos = i * 70
        draw_large.text((50, y_pos), f"Linija {i+1}: Test velike slike za performance", fill='black', font=font)
    
    test_images.append(("test_large.png", large_image))
    
    return test_images

def save_test_images(test_images):
    """Čuva test slike"""
    saved_paths = []
    
    for filename, image in test_images:
        image.save(filename)
        saved_paths.append(filename)
        print(f"Test slika kreirana: {filename}")
    
    return saved_paths

def test_ocr_service():
    """Testira osnovni OCR service"""
    
    # Import OCR service
    sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))
    from app.ocr_service import OCRService
    
    # Kreiraj OCR service
    ocr = OCRService()
    
    # Testiraj info
    print("=== OCR Info ===")
    info = ocr.get_ocr_info()
    print(f"Status: {info['status']}")
    print(f"Tesseract Version: {info['tesseract_version']}")
    print(f"Tesseract Path: {info['tesseract_path']}")
    
    return ocr

def test_performance(ocr, test_images):
    """Testira performance optimizacije"""
    
    print("\n=== Performance Test ===")
    
    # Test 1: Cache funkcionalnost
    print("\n1. Cache Test:")
    start_time = time.time()
    result1 = ocr.extract_text(test_images[0])
    first_time = time.time() - start_time
    
    start_time = time.time()
    result2 = ocr.extract_text(test_images[0])  # Trebalo bi da koristi cache
    second_time = time.time() - start_time
    
    print(f"   Prvi put: {first_time:.3f}s")
    print(f"   Drugi put: {second_time:.3f}s")
    print(f"   Ubrzanje: {first_time/second_time:.2f}x")
    
    # Test 2: Batch processing
    print("\n2. Batch Processing Test:")
    start_time = time.time()
    batch_results = ocr.extract_text_batch(test_images)
    batch_time = time.time() - start_time
    
    print(f"   Batch processing: {batch_time:.3f}s")
    print(f"   Prosečno po slici: {batch_time/len(test_images):.3f}s")
    
    # Test 3: Image compression
    print("\n3. Image Compression Test:")
    large_image = test_images[4]  # Velika slika
    
    start_time = time.time()
    result_large = ocr.extract_text(large_image)
    large_time = time.time() - start_time
    
    print(f"   Velika slika: {large_time:.3f}s")
    print(f"   Confidence: {result_large.get('confidence', 0):.1f}%")
    
    return {
        'cache_speedup': first_time/second_time,
        'batch_time': batch_time,
        'large_image_time': large_time
    }

def test_accuracy(ocr, test_images):
    """Testira accuracy poboljšanja"""
    
    print("\n=== Accuracy Test ===")
    
    accuracy_results = {}
    
    for i, image_path in enumerate(test_images):
        print(f"\n{i+1}. Test slika: {os.path.basename(image_path)}")
        
        # Standardni OCR
        start_time = time.time()
        result_standard = ocr.extract_text(image_path)
        standard_time = time.time() - start_time
        
        # Advanced OCR sa adaptive preprocessing
        start_time = time.time()
        result_advanced = ocr.extract_text_with_preprocessing_options(
            image_path, 
            preprocessing_options={
                'grayscale': True,
                'denoise': True,
                'adaptive_threshold': True,
                'morphology': True,
                'deskew': True,
                'resize': True
            }
        )
        advanced_time = time.time() - start_time
        
        print(f"   Standardni OCR:")
        print(f"     Vreme: {standard_time:.3f}s")
        print(f"     Confidence: {result_standard.get('confidence', 0):.1f}%")
        print(f"     Tekst: {result_standard.get('text', '')[:50]}...")
        
        print(f"   Advanced OCR:")
        print(f"     Vreme: {advanced_time:.3f}s")
        print(f"     Confidence: {result_advanced.get('confidence', 0):.1f}%")
        print(f"     Tekst: {result_advanced.get('text', '')[:50]}...")
        
        accuracy_results[os.path.basename(image_path)] = {
            'standard': {
                'time': standard_time,
                'confidence': result_standard.get('confidence', 0),
                'text_length': len(result_standard.get('text', ''))
            },
            'advanced': {
                'time': advanced_time,
                'confidence': result_advanced.get('confidence', 0),
                'text_length': len(result_advanced.get('text', ''))
            }
        }
    
    return accuracy_results

async def test_async_ocr(ocr, test_images):
    """Testira async OCR funkcionalnost"""
    
    print("\n=== Async OCR Test ===")
    
    # Test async processing
    start_time = time.time()
    
    tasks = []
    for image_path in test_images:
        # Simuliraj file bytes
        with open(image_path, 'rb') as f:
            image_bytes = f.read()
        
        task = ocr.extract_text_async(image_bytes, os.path.basename(image_path))
        tasks.append(task)
    
    results = await asyncio.gather(*tasks)
    async_time = time.time() - start_time
    
    print(f"Async processing vreme: {async_time:.3f}s")
    print(f"Prosečno po slici: {async_time/len(test_images):.3f}s")
    
    successful = sum(1 for r in results if r.get('status') == 'success')
    print(f"Uspešno obrađeno: {successful}/{len(test_images)}")
    
    return {
        'async_time': async_time,
        'successful': successful,
        'results': results
    }

def test_cache_management(ocr):
    """Testira cache management funkcionalnost"""
    
    print("\n=== Cache Management Test ===")
    
    # Test cache statistike
    cache_stats = ocr.get_cache_stats()
    print(f"Cache veličina: {cache_stats.get('cache_size_mb', 0):.2f} MB")
    print(f"Cache fajlova: {cache_stats.get('cache_count', 0)}")
    print(f"Cache hit rate: {cache_stats.get('hit_rate', 0)*100:.1f}%")
    
    # Test cache clearing
    cleared_count = ocr.clear_cache(older_than_hours=1)
    print(f"Obrisano cache fajlova: {cleared_count}")
    
    return cache_stats

def generate_report(performance_results, accuracy_results, async_results, cache_stats):
    """Generiše izveštaj o testovima"""
    
    print("\n" + "="*60)
    print("OCR OPTIMIZATION TEST REPORT")
    print("="*60)
    
    print(f"\nPERFORMANCE REZULTATI:")
    print(f"  Cache ubrzanje: {performance_results['cache_speedup']:.2f}x")
    print(f"  Batch processing: {performance_results['batch_time']:.3f}s")
    print(f"  Velika slika: {performance_results['large_image_time']:.3f}s")
    print(f"  Async processing: {async_results['async_time']:.3f}s")
    
    print(f"\nACCURACY REZULTATI:")
    total_standard_confidence = 0
    total_advanced_confidence = 0
    count = 0
    
    for image_name, results in accuracy_results.items():
        standard_conf = results['standard']['confidence']
        advanced_conf = results['advanced']['confidence']
        total_standard_confidence += standard_conf
        total_advanced_confidence += advanced_conf
        count += 1
        
        improvement = advanced_conf - standard_conf
        print(f"  {image_name}: {improvement:+.1f}% improvement")
    
    if count > 0:
        avg_standard = total_standard_confidence / count
        avg_advanced = total_advanced_confidence / count
        print(f"  Prosečno poboljšanje: {avg_advanced - avg_standard:+.1f}%")
    
    print(f"\nCACHE STATISTIKE:")
    print(f"  Cache hit rate: {cache_stats.get('hit_rate', 0)*100:.1f}%")
    print(f"  Cache veličina: {cache_stats.get('cache_size_mb', 0):.2f} MB")
    print(f"  Cache fajlova: {cache_stats.get('cache_count', 0)}")
    
    # Sačuvaj izveštaj
    report = {
        'timestamp': time.strftime('%Y-%m-%d %H:%M:%S'),
        'performance': performance_results,
        'accuracy': accuracy_results,
        'async': async_results,
        'cache': cache_stats
    }
    
    with open('ocr_optimization_report.json', 'w') as f:
        json.dump(report, f, indent=2)
    
    print(f"\nIzveštaj sačuvan u: ocr_optimization_report.json")

async def main():
    """Glavna funkcija za testiranje"""
    
    print("OCR Optimization Test Suite")
    print("="*40)
    
    # Kreiraj test slike
    print("Kreiranje test slika...")
    test_images_data = create_test_images()
    test_image_paths = save_test_images(test_images_data)
    
    try:
        # Testiraj OCR service
        ocr = test_ocr_service()
        
        # Performance testovi
        performance_results = test_performance(ocr, test_image_paths)
        
        # Accuracy testovi
        accuracy_results = test_accuracy(ocr, test_image_paths)
        
        # Async testovi
        async_results = await test_async_ocr(ocr, test_image_paths)
        
        # Cache management testovi
        cache_stats = test_cache_management(ocr)
        
        # Generiši izveštaj
        generate_report(performance_results, accuracy_results, async_results, cache_stats)
        
    except Exception as e:
        print(f"Greška pri testiranju: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        # Obriši test slike
        print("\nBrisanje test slika...")
        for image_path in test_image_paths:
            if os.path.exists(image_path):
                os.remove(image_path)
                print(f"Obrisana: {image_path}")

if __name__ == "__main__":
    asyncio.run(main()) 