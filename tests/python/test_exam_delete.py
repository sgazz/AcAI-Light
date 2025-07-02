#!/usr/bin/env python3
"""
Test za funkcionalnost brisanja ispita
Testira backend DELETE endpoint i frontend integraciju
"""

import asyncio
import aiohttp
import json
import sys
import os
from datetime import datetime

# Dodaj backend direktorijum u Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

async def test_backend_delete_endpoint():
    """Testira backend DELETE endpoint za brisanje ispita"""
    print("🧪 Testiranje backend DELETE endpoint-a...")
    
    async with aiohttp.ClientSession() as session:
        # 1. Prvo kreiraj test ispit
        create_data = {
            "title": "Test Ispit za Brisanje",
            "description": "Ispit koji će biti obrisan",
            "subject": "Test",
            "duration_minutes": 30,
            "total_points": 50,
            "passing_score": 60,
            "questions": [],
            "created_by": "test_user",
            "is_public": True,
            "allow_retakes": True,
            "max_attempts": 3
        }
        
        async with session.post(
            'http://localhost:8001/exam/create',
            json=create_data
        ) as response:
            create_result = await response.json()
            
            if create_result.get('status') != 'success':
                print(f"❌ Greška pri kreiranju test ispita: {create_result}")
                return False
            
            exam_id = create_result.get('exam', {}).get('exam_id')
            print(f"✅ Test ispit kreiran: {exam_id}")
        
        # 2. Proveri da li ispit postoji
        async with session.get(f'http://localhost:8001/exam/{exam_id}') as response:
            get_result = await response.json()
            
            if get_result.get('status') != 'success':
                print(f"❌ Greška pri dohvatanju ispita: {get_result}")
                return False
            
            print(f"✅ Ispit pronađen: {get_result.get('exam', {}).get('title')}")
        
        # 3. Obriši ispit
        async with session.delete(f'http://localhost:8001/exam/{exam_id}') as response:
            delete_result = await response.json()
            
            if delete_result.get('status') != 'success':
                print(f"❌ Greška pri brisanju ispita: {delete_result}")
                return False
            
            print(f"✅ Ispit uspešno obrisan")
        
        # 4. Proveri da li ispit više ne postoji
        async with session.get(f'http://localhost:8001/exam/{exam_id}') as response:
            get_result = await response.json()
            
            if get_result.get('status') == 'success':
                print(f"❌ Ispit i dalje postoji nakon brisanja: {get_result}")
                return False
            
            print(f"✅ Ispit više ne postoji nakon brisanja")
        
        return True

async def test_delete_nonexistent_exam():
    """Testira brisanje nepostojećeg ispita"""
    print("\n🧪 Testiranje brisanja nepostojećeg ispita...")
    
    async with aiohttp.ClientSession() as session:
        fake_exam_id = "nonexistent_exam_123"
        
        async with session.delete(f'http://localhost:8001/exam/{fake_exam_id}') as response:
            delete_result = await response.json()
            
            if delete_result.get('status') == 'success':
                print(f"❌ Greška: Uspesno obrisan nepostojeći ispit")
                return False
            
            print(f"✅ Pravilno vraćena greška za nepostojeći ispit: {delete_result.get('message')}")
            return True

async def test_frontend_delete_integration():
    """Testira frontend integraciju za brisanje"""
    print("\n🧪 Testiranje frontend integracije...")
    
    async with aiohttp.ClientSession() as session:
        # 1. Kreiraj ispit za testiranje frontend-a
        create_data = {
            "title": "Frontend Test Ispit",
            "description": "Ispit za testiranje frontend brisanja",
            "subject": "Frontend Test",
            "duration_minutes": 45,
            "total_points": 75,
            "passing_score": 70,
            "questions": [],
            "created_by": "frontend_test_user",
            "is_public": True,
            "allow_retakes": True,
            "max_attempts": 2
        }
        
        async with session.post(
            'http://localhost:8001/exam/create',
            json=create_data
        ) as response:
            create_result = await response.json()
            
            if create_result.get('status') != 'success':
                print(f"❌ Greška pri kreiranju frontend test ispita: {create_result}")
                return False
            
            exam_id = create_result.get('exam', {}).get('exam_id')
            print(f"✅ Frontend test ispit kreiran: {exam_id}")
        
        # 2. Proveri da li se ispit prikazuje u listi
        async with session.get('http://localhost:8001/exams') as response:
            list_result = await response.json()
            
            if list_result.get('status') != 'success':
                print(f"❌ Greška pri listanju ispita: {list_result}")
                return False
            
            exams = list_result.get('exams', [])
            exam_in_list = any(exam.get('exam_id') == exam_id for exam in exams)
            
            if not exam_in_list:
                print(f"❌ Ispit se ne prikazuje u listi")
                return False
            
            print(f"✅ Ispit se prikazuje u listi")
        
        # 3. Obriši ispit
        async with session.delete(f'http://localhost:8001/exam/{exam_id}') as response:
            delete_result = await response.json()
            
            if delete_result.get('status') != 'success':
                print(f"❌ Greška pri brisanju frontend test ispita: {delete_result}")
                return False
            
            print(f"✅ Frontend test ispit obrisan")
        
        # 4. Proveri da li se ispit više ne prikazuje u listi
        async with session.get('http://localhost:8001/exams') as response:
            list_result = await response.json()
            
            if list_result.get('status') != 'success':
                print(f"❌ Greška pri listanju ispita nakon brisanja: {list_result}")
                return False
            
            exams = list_result.get('exams', [])
            exam_in_list = any(exam.get('exam_id') == exam_id for exam in exams)
            
            if exam_in_list:
                print(f"❌ Ispit se i dalje prikazuje u listi nakon brisanja")
                return False
            
            print(f"✅ Ispit se više ne prikazuje u listi nakon brisanja")
        
        return True

async def test_physics_exam_delete():
    """Testira brisanje ispita iz fizike"""
    print("\n🧪 Testiranje brisanja ispita iz fizike...")
    
    async with aiohttp.ClientSession() as session:
        # 1. Kreiraj ispit iz fizike
        physics_data = {
            "title": "Test Fizika Ispit",
            "count": 5
        }
        
        async with session.post(
            'http://localhost:8001/exam/physics/create',
            json=physics_data
        ) as response:
            create_result = await response.json()
            
            if create_result.get('status') != 'success':
                print(f"❌ Greška pri kreiranju fizika ispita: {create_result}")
                return False
            
            exam_id = create_result.get('exam', {}).get('exam_id')
            print(f"✅ Fizika ispit kreiran: {exam_id}")
        
        # 2. Proveri da li ispit ima pitanja
        async with session.get(f'http://localhost:8001/exam/{exam_id}') as response:
            get_result = await response.json()
            
            if get_result.get('status') != 'success':
                print(f"❌ Greška pri dohvatanju fizika ispita: {get_result}")
                return False
            
            exam = get_result.get('exam', {})
            questions_count = len(exam.get('questions', []))
            print(f"✅ Fizika ispit ima {questions_count} pitanja")
        
        # 3. Obriši ispit
        async with session.delete(f'http://localhost:8001/exam/{exam_id}') as response:
            delete_result = await response.json()
            
            if delete_result.get('status') != 'success':
                print(f"❌ Greška pri brisanju fizika ispita: {delete_result}")
                return False
            
            print(f"✅ Fizika ispit uspešno obrisan")
        
        return True

async def main():
    """Glavna test funkcija"""
    print("🚀 Započinjem testiranje funkcionalnosti brisanja ispita...")
    print("=" * 60)
    
    tests = [
        ("Backend DELETE endpoint", test_backend_delete_endpoint),
        ("Brisanje nepostojećeg ispita", test_delete_nonexistent_exam),
        ("Frontend integracija", test_frontend_delete_integration),
        ("Brisanje fizika ispita", test_physics_exam_delete),
    ]
    
    results = []
    
    for test_name, test_func in tests:
        try:
            result = await test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ Greška u testu {test_name}: {e}")
            results.append((test_name, False))
    
    print("\n" + "=" * 60)
    print("📊 REZULTATI TESTIRANJA:")
    print("=" * 60)
    
    passed = 0
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PROŠAO" if result else "❌ PAO"
        print(f"{test_name}: {status}")
        if result:
            passed += 1
    
    print(f"\nUkupno: {passed}/{total} testova prošlo")
    
    if passed == total:
        print("🎉 Svi testovi uspešno prošli!")
        return True
    else:
        print("⚠️  Neki testovi nisu prošli")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1) 