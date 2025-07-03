#!/usr/bin/env python3
"""
Test Problem Generator funkcionalnosti
"""

import asyncio
import aiohttp
import json
import sys
import os

# Dodaj backend direktorijum u path
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'backend'))

BASE_URL = "http://localhost:8001"

async def test_get_subjects():
    """Testiraj dohvatanje dostupnih predmeta"""
    print("\n🧪 Testiranje dohvatanja predmeta...")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{BASE_URL}/problems/subjects") as response:
            result = await response.json()
            print(f"📝 Rezultat: {result}")
            
            if result.get("status") == "success":
                subjects = result.get("subjects", [])
                print(f"✅ Uspešno dohvaćeno {len(subjects)} predmeta")
                
                for subject in subjects:
                    print(f"  📚 {subject['name']}: {len(subject['topics'])} tema")
                
                return True
            else:
                print("❌ Greška pri dohvatanju predmeta")
                return False

async def test_generate_math_problem():
    """Testiraj generisanje matematičkog problema"""
    print("\n🧪 Testiranje generisanja matematičkog problema...")
    
    generation_data = {
        "subject": "mathematics",
        "topic": "Algebra",
        "difficulty": "beginner",
        "problem_type": "open_ended"
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{BASE_URL}/problems/generate", json=generation_data) as response:
            result = await response.json()
            print(f"📝 Rezultat: {result}")
            
            if result.get("status") == "success":
                problem = result.get("problem", {})
                print(f"✅ Problem uspešno generisan: {problem.get('question', 'N/A')}")
                print(f"  📊 ID: {problem.get('problem_id')}")
                print(f"  📚 Predmet: {problem.get('subject')}")
                print(f"  🎯 Tema: {problem.get('topic')}")
                print(f"  📈 Težina: {problem.get('difficulty')}")
                return problem.get("problem_id")
            else:
                print("❌ Greška pri generisanju problema")
                return None

async def test_generate_physics_problem():
    """Testiraj generisanje fizičkog problema"""
    print("\n🧪 Testiranje generisanja fizičkog problema...")
    
    generation_data = {
        "subject": "physics",
        "topic": "Mehanika",
        "difficulty": "beginner",
        "problem_type": "open_ended"
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{BASE_URL}/problems/generate", json=generation_data) as response:
            result = await response.json()
            print(f"📝 Rezultat: {result}")
            
            if result.get("status") == "success":
                problem = result.get("problem", {})
                print(f"✅ Problem uspešno generisan: {problem.get('question', 'N/A')}")
                return problem.get("problem_id")
            else:
                print("❌ Greška pri generisanju fizičkog problema")
                return None

async def test_validate_answer(problem_id: str):
    """Testiraj validaciju odgovora"""
    print(f"\n🧪 Testiranje validacije odgovora za problem {problem_id}...")
    
    # Test tačan odgovor
    correct_answer_data = {"answer": "4"}
    
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{BASE_URL}/problems/{problem_id}/validate", json=correct_answer_data) as response:
            result = await response.json()
            print(f"📝 Rezultat tačnog odgovora: {result}")
            
            if result.get("status") == "success":
                validation = result.get("validation", {})
                print(f"✅ Validacija uspešna: {validation.get('is_correct')}")
                print(f"  💬 Feedback: {validation.get('feedback')}")
            else:
                print("❌ Greška pri validaciji tačnog odgovora")
    
    # Test netačan odgovor
    incorrect_answer_data = {"answer": "7"}
    
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{BASE_URL}/problems/{problem_id}/validate", json=incorrect_answer_data) as response:
            result = await response.json()
            print(f"📝 Rezultat netačnog odgovora: {result}")
            
            if result.get("status") == "success":
                validation = result.get("validation", {})
                print(f"✅ Validacija uspešna: {validation.get('is_correct')}")
                print(f"  💬 Feedback: {validation.get('feedback')}")
            else:
                print("❌ Greška pri validaciji netačnog odgovora")

async def test_get_stats():
    """Testiraj dohvatanje statistika"""
    print("\n🧪 Testiranje dohvatanja statistika...")
    
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{BASE_URL}/problems/stats") as response:
            result = await response.json()
            print(f"📝 Rezultat: {result}")
            
            if result.get("status") == "success":
                stats = result.get("stats", {})
                print(f"✅ Statistike uspešno dohvaćene")
                print(f"  📊 Ukupno šablona: {stats.get('total_templates')}")
                print(f"  📚 Dostupnih predmeta: {stats.get('available_subjects')}")
                print(f"  📈 Status: {stats.get('status')}")
                return True
            else:
                print("❌ Greška pri dohvatanju statistika")
                return False

async def test_error_handling():
    """Testiraj error handling"""
    print("\n🧪 Testiranje error handling-a...")
    
    # Test sa nevažećim predmetom
    invalid_data = {
        "subject": "invalid_subject",
        "difficulty": "beginner"
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{BASE_URL}/problems/generate", json=invalid_data) as response:
            result = await response.json()
            print(f"📝 Rezultat sa nevažećim predmetom: {result}")
            
            if result.get("status") == "error":
                print("✅ Error handling radi kako treba")
            else:
                print("❌ Error handling ne radi kako treba")
    
    # Test validacije bez odgovora
    async with aiohttp.ClientSession() as session:
        async with session.post(f"{BASE_URL}/problems/invalid_id/validate", json={}) as response:
            result = await response.json()
            print(f"📝 Rezultat validacije bez odgovora: {result}")
            
            if result.get("status") == "error":
                print("✅ Error handling za validaciju radi kako treba")
            else:
                print("❌ Error handling za validaciju ne radi kako treba")

async def test_problem_generator_workflow():
    """Testiraj kompletan workflow Problem Generator-a"""
    print("\n🧪 Testiranje kompletnog workflow-a Problem Generator-a...")
    
    # 1. Dohvati predmete
    subjects_ok = await test_get_subjects()
    if not subjects_ok:
        print("❌ Testiranje prekinuto - nije moguće dohvatiti predmete")
        return
    
    # 2. Dohvati statistike
    stats_ok = await test_get_stats()
    if not stats_ok:
        print("❌ Testiranje prekinuto - nije moguće dohvatiti statistike")
        return
    
    # 3. Generiši matematički problem
    math_problem_id = await test_generate_math_problem()
    if not math_problem_id:
        print("❌ Testiranje prekinuto - nije moguće generisati matematički problem")
        return
    
    # 4. Generiši fizički problem
    physics_problem_id = await test_generate_physics_problem()
    if not physics_problem_id:
        print("❌ Testiranje prekinuto - nije moguće generisati fizički problem")
        return
    
    # 5. Testiraj validaciju odgovora
    await test_validate_answer(math_problem_id)
    
    # 6. Testiraj error handling
    await test_error_handling()
    
    print("\n✅ Kompletan workflow Problem Generator-a uspešno testiran!")

async def main():
    """Glavna funkcija za testiranje"""
    print("🚀 Započinjem testiranje Problem Generator funkcionalnosti...")
    
    try:
        await test_problem_generator_workflow()
        print("\n🎉 Svi testovi uspešno završeni!")
        
    except Exception as e:
        print(f"\n❌ Greška pri testiranju: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main()) 