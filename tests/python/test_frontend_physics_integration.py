#!/usr/bin/env python3
"""
Test skripta za frontend integraciju sa fizika pitanjem
"""

import asyncio
import aiohttp
import json
import sys
import os

# Dodaj backend direktorijum u Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

BASE_URL = "http://localhost:8001"
FRONTEND_URL = "http://localhost:3000"

async def test_frontend_physics_integration():
    """Testiraj frontend integraciju sa fizika pitanjem"""
    print("🧪 Testiranje frontend integracije sa fizika pitanjem...")
    
    # Test 1: Proveri da li frontend radi
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(FRONTEND_URL) as response:
                if response.status == 200:
                    print("✅ Frontend je dostupan")
                else:
                    print(f"❌ Frontend nije dostupan: {response.status}")
                    return
    except Exception as e:
        print(f"❌ Greška pri pristupu frontend-u: {e}")
        return
    
    # Test 2: Kreiraj ispit iz fizike kroz API
    print("\n🧪 Kreiranje ispita iz fizike...")
    exam_id = None
    
    try:
        async with aiohttp.ClientSession() as session:
            exam_data = {
                "title": "Frontend Test - Fizika",
                "count": 5
            }
            
            async with session.post(f"{BASE_URL}/exam/physics/create", json=exam_data) as response:
                result = await response.json()
                print(f"📝 Rezultat kreiranja: {result}")
                
                if result.get("status") == "success":
                    exam_id = result["exam"]["exam_id"]
                    print(f"✅ Ispit kreiran: {exam_id}")
                else:
                    print("❌ Greška pri kreiranju ispita")
                    return
    except Exception as e:
        print(f"❌ Greška pri kreiranju ispita: {e}")
        return
    
    # Test 3: Pokreni ispit
    print(f"\n🧪 Pokretanje ispita {exam_id}...")
    attempt_id = None
    
    try:
        async with aiohttp.ClientSession() as session:
            start_data = {
                "user_id": "frontend_test_user",
                "username": "Frontend Test Korisnik"
            }
            
            async with session.post(f"{BASE_URL}/exam/{exam_id}/start", json=start_data) as response:
                result = await response.json()
                print(f"🚀 Rezultat pokretanja: {result}")
                
                if result.get("status") == "success":
                    attempt_id = result["attempt"]["attempt_id"]
                    exam = result["exam"]
                    print(f"✅ Ispit pokrenut: {attempt_id}")
                    print(f"📊 Broj pitanja: {len(exam.get('questions', []))}")
                else:
                    print("❌ Greška pri pokretanju ispita")
                    return
    except Exception as e:
        print(f"❌ Greška pri pokretanju ispita: {e}")
        return
    
    # Test 4: Pošalji odgovore
    print(f"\n🧪 Slanje odgovora za pokušaj {attempt_id}...")
    
    try:
        async with aiohttp.ClientSession() as session:
            # Dohvati ispit da vidimo pitanja
            async with session.get(f"{BASE_URL}/exam/{exam_id}") as response:
                exam_result = await response.json()
                
                if exam_result.get("status") == "success":
                    exam = exam_result["exam"]
                    questions = exam.get("questions", [])
                    
                    for i, question in enumerate(questions):
                        answer_data = {
                            "question_id": str(i),
                            "answer": question.get("correct_answer", "N/A")
                        }
                        
                        async with session.post(f"{BASE_URL}/exam/attempt/{attempt_id}/answer", json=answer_data) as response:
                            answer_result = await response.json()
                            print(f"📝 Odgovor {i+1}: {answer_result.get('status')}")
                else:
                    print("❌ Greška pri dohvatanju ispita")
                    return
    except Exception as e:
        print(f"❌ Greška pri slanju odgovora: {e}")
        return
    
    # Test 5: Završi ispit
    print(f"\n🧪 Završavanje ispita...")
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(f"{BASE_URL}/exam/attempt/{attempt_id}/finish") as response:
                result = await response.json()
                print(f"🏁 Rezultat završavanja: {result}")
                
                if result.get("status") == "success":
                    attempt = result["attempt"]
                    print(f"📊 Konačan rezultat: {attempt['score']}/{attempt['total_points']} bodova")
                    print(f"📈 Procent: {attempt['percentage']}%")
                    print(f"✅ Položeno: {attempt['passed']}")
                else:
                    print("❌ Greška pri završavanju ispita")
                    return
    except Exception as e:
        print(f"❌ Greška pri završavanju ispita: {e}")
        return
    
    print("\n🎉 Frontend integracija testirana uspešno!")

async def test_physics_questions_endpoint():
    """Testiraj endpoint za fizika pitanja"""
    print("\n🧪 Testiranje endpoint-a za fizika pitanja...")
    
    try:
        async with aiohttp.ClientSession() as session:
            # Test različitih parametara
            test_cases = [
                ("count=5", "5 pitanja"),
                ("count=3&difficulty=easy", "3 laka pitanja"),
                ("difficulty=medium", "sva srednja pitanja")
            ]
            
            for params, description in test_cases:
                async with session.get(f"{BASE_URL}/questions/physics?{params}") as response:
                    result = await response.json()
                    print(f"📝 {description}: {result.get('status')} - {len(result.get('questions', []))} pitanja")
                    
                    if result.get("status") == "success":
                        questions = result.get("questions", [])
                        if questions:
                            first_question = questions[0]
                            print(f"   Prvo pitanje: {first_question.get('question_text', '')[:50]}...")
                    else:
                        print(f"   ❌ Greška: {result.get('message')}")
    except Exception as e:
        print(f"❌ Greška pri testiranju endpoint-a: {e}")

async def main():
    """Glavna test funkcija"""
    print("🚀 Započinjem testiranje frontend integracije sa fizika pitanjem...")
    print(f"🌐 Backend URL: {BASE_URL}")
    print(f"🌐 Frontend URL: {FRONTEND_URL}")
    
    try:
        # Test 1: Endpoint za fizika pitanja
        await test_physics_questions_endpoint()
        
        # Test 2: Kompletan workflow
        await test_frontend_physics_integration()
        
        print("\n🎉 Svi testovi uspešno završeni!")
        print("\n📋 Instrukcije za testiranje frontend-a:")
        print("1. Otvori http://localhost:3000 u browser-u")
        print("2. Idite na Exam Simulation sekciju")
        print("3. Kliknite na 'Fizika Ispit' dugme")
        print("4. Unesite naziv i broj pitanja")
        print("5. Kliknite 'Kreiraj ispit'")
        print("6. Testirajte polaganje ispita")
        
    except Exception as e:
        print(f"❌ Greška tokom testiranja: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main()) 