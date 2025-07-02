#!/usr/bin/env python3
"""
Test skripta za Exam Simulation funkcionalnost
Testira kreiranje, listanje, pokretanje i završavanje ispita
"""

import asyncio
import aiohttp
import json
import sys
import os
from datetime import datetime, timezone

# Dodaj backend direktorijum u Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

BASE_URL = "http://localhost:8001"

async def test_exam_creation():
    """Testiraj kreiranje ispita"""
    print("🧪 Testiranje kreiranja ispita...")
    
    exam_data = {
        "title": "Test Ispit - Matematika",
        "description": "Test ispit za proveru matematike",
        "subject": "Matematika",
        "duration_minutes": 30,
        "total_points": 100,
        "passing_score": 70,
        "questions": [
            {
                "question_text": "Koliko je 2 + 2?",
                "question_type": "multiple_choice",
                "options": ["3", "4", "5", "6"],
                "correct_answer": "4",
                "explanation": "2 + 2 = 4",
                "points": 10,
                "difficulty": "easy"
            },
            {
                "question_text": "Koliko je 5 * 6?",
                "question_type": "multiple_choice",
                "options": ["25", "30", "35", "40"],
                "correct_answer": "30",
                "explanation": "5 * 6 = 30",
                "points": 10,
                "difficulty": "easy"
            }
        ],
        "status": "active",
        "created_by": "test_user",
        "is_public": True,
        "allow_retakes": True,
        "max_attempts": 3
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{BASE_URL}/exam/create", json=exam_data) as response:
            result = await response.json()
            print(f"📝 Rezultat kreiranja: {result}")
            
            if result.get("status") == "success":
                print("✅ Ispit uspešno kreiran")
                return result["exam"]["exam_id"]
            else:
                print("❌ Greška pri kreiranju ispita")
                return None

async def test_exam_listing():
    """Testiraj listanje ispita"""
    print("\n🧪 Testiranje listanja ispita...")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{BASE_URL}/exams") as response:
            result = await response.json()
            print(f"📋 Rezultat listanja: {result}")
            
            if result.get("status") == "success":
                print(f"✅ Pronađeno {len(result.get('exams', []))} ispita")
                return result.get("exams", [])
            else:
                print("❌ Greška pri listanju ispita")
                return []

async def test_exam_start(exam_id):
    """Testiraj pokretanje ispita"""
    print(f"\n🧪 Testiranje pokretanja ispita {exam_id}...")
    
    start_data = {
        "user_id": "test_user",
        "username": "Test Korisnik"
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{BASE_URL}/exam/{exam_id}/start", json=start_data) as response:
            result = await response.json()
            print(f"🚀 Rezultat pokretanja: {result}")
            
            if result.get("status") == "success":
                print("✅ Ispit uspešno pokrenut")
                return result["attempt"]["attempt_id"]
            else:
                print("❌ Greška pri pokretanju ispita")
                return None

async def test_submit_answers(attempt_id, exam_id):
    """Testiraj slanje odgovora"""
    print(f"\n🧪 Testiranje slanja odgovora za pokušaj {attempt_id}...")
    
    answers = [
        {"question_id": "0", "answer": "4"},
        {"question_id": "1", "answer": "30"}
    ]
    
    async with aiohttp.ClientSession() as session:
        for answer in answers:
            submit_data = {
                "question_id": answer["question_id"],
                "answer": answer["answer"]
            }
            
            async with session.post(f"{BASE_URL}/exam/attempt/{attempt_id}/answer", json=submit_data) as response:
                result = await response.json()
                print(f"📝 Rezultat slanja odgovora: {result}")
                
                if result.get("status") == "success":
                    print(f"✅ Odgovor {answer['question_id']} uspešno poslat")
                else:
                    print(f"❌ Greška pri slanju odgovora {answer['question_id']}")

async def test_finish_exam(attempt_id):
    """Testiraj završavanje ispita"""
    print(f"\n🧪 Testiranje završavanja ispita za pokušaj {attempt_id}...")
    
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{BASE_URL}/exam/attempt/{attempt_id}/finish") as response:
            result = await response.json()
            print(f"🏁 Rezultat završavanja: {result}")
            
            if result.get("status") == "success":
                print("✅ Ispit uspešno završen")
                attempt = result["attempt"]
                print(f"📊 Rezultat: {attempt['score']}/{attempt['total_points']} bodova")
                print(f"⏱️ Vreme: {attempt['time_taken_minutes']} minuta")
                print(f"📈 Procent: {attempt['percentage']}%")
                print(f"✅ Položeno: {attempt['passed']}")
                return True
            else:
                print("❌ Greška pri završavanju ispita")
                return False

async def test_get_attempts(exam_id, user_id):
    """Testiraj dohvatanje pokušaja"""
    print(f"\n🧪 Testiranje dohvatanja pokušaja za ispit {exam_id}...")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{BASE_URL}/exam/{exam_id}/attempts?user_id={user_id}") as response:
            result = await response.json()
            print(f"📋 Rezultat dohvatanja pokušaja: {result}")
            
            if result.get("status") == "success":
                print(f"✅ Pronađeno {len(result.get('attempts', []))} pokušaja")
                return result.get("attempts", [])
            else:
                print("❌ Greška pri dohvatanju pokušaja")
                return []

async def test_ai_question_generation():
    """Testiraj AI generisanje pitanja"""
    print("\n🧪 Testiranje AI generisanja pitanja...")
    
    generation_data = {
        "subject": "Matematika",
        "topic": "Algebra",
        "count": 3,
        "difficulty": "medium"
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{BASE_URL}/exam/generate-questions", json=generation_data) as response:
            result = await response.json()
            print(f"🤖 Rezultat generisanja: {result}")
            
            if result.get("status") == "success":
                print(f"✅ Generisano {len(result.get('questions', []))} pitanja")
                return result.get("questions", [])
            else:
                print("❌ Greška pri generisanju pitanja")
                return []

async def main():
    """Glavna test funkcija"""
    print("🚀 Započinjem testiranje Exam Simulation funkcionalnosti...")
    print(f"🌐 Backend URL: {BASE_URL}")
    
    try:
        # Test 1: Kreiranje ispita
        exam_id = await test_exam_creation()
        if not exam_id:
            print("❌ Testiranje prekinuto - nije moguće kreirati ispit")
            return
        
        # Test 2: Listanje ispita
        await test_exam_listing()
        
        # Test 3: AI generisanje pitanja
        await test_ai_question_generation()
        
        # Test 4: Pokretanje ispita
        attempt_id = await test_exam_start(exam_id)
        if not attempt_id:
            print("❌ Testiranje prekinuto - nije moguće pokrenuti ispit")
            return
        
        # Test 5: Slanje odgovora
        await test_submit_answers(attempt_id, exam_id)
        
        # Test 6: Završavanje ispita
        success = await test_finish_exam(attempt_id)
        if not success:
            print("❌ Testiranje prekinuto - nije moguće završiti ispit")
            return
        
        # Test 7: Dohvatanje pokušaja
        await test_get_attempts(exam_id, "test_user")
        
        print("\n🎉 Svi testovi uspešno završeni!")
        
    except Exception as e:
        print(f"❌ Greška tokom testiranja: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main()) 