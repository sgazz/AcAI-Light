#!/usr/bin/env python3
"""
Test skripta za proveru da li se fizika ispiti prikazuju u frontend-u
"""

import asyncio
import aiohttp
import json
import sys
import os

# Dodaj backend direktorijum u Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

BASE_URL = "http://localhost:8001"

async def test_physics_exams_display():
    """Testiraj da li se fizika ispiti prikazuju"""
    print("🧪 Testiranje prikazivanja fizika ispita...")
    
    try:
        async with aiohttp.ClientSession() as session:
            # Test 1: Dohvati sve ispite
            async with session.get(f"{BASE_URL}/exams") as response:
                result = await response.json()
                
                if result.get("status") == "success":
                    all_exams = result.get("exams", [])
                    print(f"📊 Ukupno ispita: {len(all_exams)}")
                    
                    # Filtriraj fizika ispite
                    physics_exams = [exam for exam in all_exams if exam.get("subject") == "Fizika"]
                    print(f"📚 Fizika ispita: {len(physics_exams)}")
                    
                    # Prikaži detalje fizika ispita
                    for i, exam in enumerate(physics_exams):
                        print(f"  {i+1}. {exam.get('title')} - {exam.get('is_public')} - {exam.get('created_by')}")
                        print(f"     Pitanja: {len(exam.get('questions', []))}")
                        print(f"     Status: {exam.get('status')}")
                    
                    # Proveri da li su javni
                    public_physics_exams = [exam for exam in physics_exams if exam.get("is_public")]
                    print(f"🌐 Javnih fizika ispita: {len(public_physics_exams)}")
                    
                    if public_physics_exams:
                        print("✅ Fizika ispiti su javni i trebalo bi da se prikazuju u frontend-u")
                    else:
                        print("❌ Nema javnih fizika ispita")
                        
                else:
                    print(f"❌ Greška pri dohvatanju ispita: {result.get('message')}")
                    
    except Exception as e:
        print(f"❌ Greška pri testiranju: {e}")

async def test_create_and_display_physics_exam():
    """Testiraj kreiranje i prikazivanje novog fizika ispita"""
    print("\n🧪 Testiranje kreiranja i prikazivanja novog fizika ispita...")
    
    try:
        async with aiohttp.ClientSession() as session:
            # Kreiraj novi ispit
            exam_data = {
                "title": "Test Prikaz - Fizika",
                "count": 3
            }
            
            async with session.post(f"{BASE_URL}/exam/physics/create", json=exam_data) as response:
                result = await response.json()
                
                if result.get("status") == "success":
                    exam_id = result["exam"]["exam_id"]
                    print(f"✅ Ispit kreiran: {exam_id}")
                    
                    # Proveri da li se prikazuje u listi
                    async with session.get(f"{BASE_URL}/exams") as response:
                        list_result = await response.json()
                        
                        if list_result.get("status") == "success":
                            all_exams = list_result.get("exams", [])
                            new_exam = next((exam for exam in all_exams if exam.get("exam_id") == exam_id), None)
                            
                            if new_exam:
                                print(f"✅ Ispit se prikazuje u listi")
                                print(f"   Naslov: {new_exam.get('title')}")
                                print(f"   Javni: {new_exam.get('is_public')}")
                                print(f"   Pitanja: {len(new_exam.get('questions', []))}")
                            else:
                                print("❌ Ispit se ne prikazuje u listi")
                        else:
                            print(f"❌ Greška pri dohvatanju liste: {list_result.get('message')}")
                else:
                    print(f"❌ Greška pri kreiranju: {result.get('message')}")
                    
    except Exception as e:
        print(f"❌ Greška pri testiranju: {e}")

async def main():
    """Glavna test funkcija"""
    print("🚀 Započinjem testiranje prikazivanja fizika ispita...")
    print(f"🌐 Backend URL: {BASE_URL}")
    
    try:
        # Test 1: Proveri postojeće fizika ispite
        await test_physics_exams_display()
        
        # Test 2: Kreiraj i proveri novi ispit
        await test_create_and_display_physics_exam()
        
        print("\n🎉 Testiranje završeno!")
        print("\n📋 Instrukcije za proveru u frontend-u:")
        print("1. Otvori http://localhost:3000 u browser-u")
        print("2. Idite na Exam Simulation sekciju")
        print("3. Trebalo bi da vidite fizika ispite u listi")
        print("4. Kliknite 'Fizika Ispit' da kreirate novi")
        print("5. Novi ispit trebalo bi da se pojavi u listi")
        
    except Exception as e:
        print(f"❌ Greška tokom testiranja: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main()) 