#!/usr/bin/env python3
"""
Test skripta za fizika pitanja endpoint
"""

import asyncio
import aiohttp
import json
import sys
import os

# Dodaj backend direktorijum u Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

BASE_URL = "http://localhost:8001"

async def test_get_physics_questions():
    """Testiraj dohvatanje pitanja iz fizike"""
    print("🧪 Testiranje dohvatanja pitanja iz fizike...")
    
    async with aiohttp.ClientSession() as session:
        # Test 1: Dohvati 5 pitanja
        async with session.get(f"{BASE_URL}/questions/physics?count=5") as response:
            result = await response.json()
            print(f"📝 Rezultat (5 pitanja): {result}")
            
            if result.get("status") == "success":
                print(f"✅ Dohvaćeno {len(result.get('questions', []))} pitanja")
            else:
                print("❌ Greška pri dohvatanju pitanja")
        
        # Test 2: Dohvati laka pitanja
        async with session.get(f"{BASE_URL}/questions/physics?difficulty=easy") as response:
            result = await response.json()
            print(f"📝 Rezultat (laka pitanja): {result}")
            
            if result.get("status") == "success":
                print(f"✅ Dohvaćeno {len(result.get('questions', []))} lakih pitanja")
            else:
                print("❌ Greška pri dohvatanju lakih pitanja")

async def test_create_physics_exam():
    """Testiraj kreiranje ispita iz fizike"""
    print("\n🧪 Testiranje kreiranja ispita iz fizike...")
    
    exam_data = {
        "title": "Test Ispit iz Fizike",
        "count": 5
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{BASE_URL}/exam/physics/create", json=exam_data) as response:
            result = await response.json()
            print(f"📝 Rezultat kreiranja: {result}")
            
            if result.get("status") == "success":
                print("✅ Ispit iz fizike uspešno kreiran")
                return result["exam"]["exam_id"]
            else:
                print("❌ Greška pri kreiranju ispita iz fizike")
                return None

async def test_physics_exam_workflow():
    """Testiraj kompletan workflow sa ispitom iz fizike"""
    print("\n🧪 Testiranje kompletnog workflow-a sa ispitom iz fizike...")
    
    # 1. Kreiraj ispit
    exam_id = await test_create_physics_exam()
    if not exam_id:
        print("❌ Testiranje prekinuto - nije moguće kreirati ispit")
        return
    
    # 2. Pokreni ispit
    start_data = {
        "user_id": "test_user",
        "username": "Test Korisnik"
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{BASE_URL}/exam/{exam_id}/start", json=start_data) as response:
            result = await response.json()
            print(f"🚀 Rezultat pokretanja: {result}")
            
            if result.get("status") == "success":
                attempt_id = result["attempt"]["attempt_id"]
                print("✅ Ispit uspešno pokrenut")
                
                # 3. Pošalji nekoliko odgovora
                exam = result["exam"]
                questions = exam.get("questions", [])
                
                for i, question in enumerate(questions[:3]):  # Prva 3 pitanja
                    answer_data = {
                        "question_id": str(i),
                        "answer": question.get("correct_answer", "N/A")
                    }
                    
                    async with session.post(f"{BASE_URL}/exam/attempt/{attempt_id}/answer", json=answer_data) as response:
                        answer_result = await response.json()
                        print(f"📝 Odgovor {i}: {answer_result}")
                
                # 4. Završi ispit
                async with session.post(f"{BASE_URL}/exam/attempt/{attempt_id}/finish") as response:
                    finish_result = await response.json()
                    print(f"🏁 Rezultat završavanja: {finish_result}")
                    
                    if finish_result.get("status") == "success":
                        attempt = finish_result["attempt"]
                        print(f"📊 Konačan rezultat: {attempt['score']}/{attempt['total_points']} bodova")
                        print(f"📈 Procent: {attempt['percentage']}%")
                        print(f"✅ Položeno: {attempt['passed']}")
                    else:
                        print("❌ Greška pri završavanju ispita")
            else:
                print("❌ Greška pri pokretanju ispita")

async def main():
    """Glavna test funkcija"""
    print("🚀 Započinjem testiranje fizika pitanja...")
    print(f"🌐 Backend URL: {BASE_URL}")
    
    try:
        # Test 1: Dohvati pitanja
        await test_get_physics_questions()
        
        # Test 2: Kompletan workflow
        await test_physics_exam_workflow()
        
        print("\n🎉 Svi testovi uspešno završeni!")
        
    except Exception as e:
        print(f"❌ Greška tokom testiranja: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main()) 