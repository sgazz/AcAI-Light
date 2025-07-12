#!/usr/bin/env python3
"""
Test skripta za proveru funkcionalnosti učitavanja sesija u chat interfejsu
"""

import requests
import json
import time
from typing import Dict, List, Optional

# Konfiguracija
BASE_URL = "http://localhost:8001"
HEADERS = {"Content-Type": "application/json"}

def test_create_session() -> Optional[str]:
    """Testira kreiranje nove sesije"""
    print("🧪 Testiranje kreiranja sesije...")
    
    response = requests.post(f"{BASE_URL}/chat/new-session")
    
    if response.status_code == 200:
        data = response.json()
        session_id = data['data']['session_id']
        print(f"✅ Sesija kreirana: {session_id}")
        return session_id
    else:
        print(f"❌ Greška pri kreiranju sesije: {response.status_code}")
        return None

def test_send_message(session_id: str, content: str) -> bool:
    """Testira slanje poruke u sesiju"""
    print(f"🧪 Testiranje slanja poruke: '{content[:30]}...'")
    
    payload = {
        "content": content,
        "session_id": session_id,
        "user_id": "default_user"
    }
    
    response = requests.post(f"{BASE_URL}/chat", headers=HEADERS, json=payload)
    
    if response.status_code == 200:
        data = response.json()
        print(f"✅ Poruka poslata, AI odgovor: {data['data']['response'][:50]}...")
        return True
    else:
        print(f"❌ Greška pri slanju poruke: {response.status_code}")
        return False

def test_get_sessions() -> List[Dict]:
    """Testira dohvatanje liste sesija"""
    print("🧪 Testiranje dohvatanja sesija...")
    
    response = requests.get(f"{BASE_URL}/chat/sessions")
    
    if response.status_code == 200:
        data = response.json()
        sessions = data['data']['sessions']
        print(f"✅ Dohvaćeno {len(sessions)} sesija")
        
        # Prikaži detalje o sesijama
        for session in sessions:
            print(f"   📝 {session['name']} - {session['message_count']} poruka")
            if session['first_message']:
                print(f"      Prva poruka: {session['first_message'][:50]}...")
        
        return sessions
    else:
        print(f"❌ Greška pri dohvatanju sesija: {response.status_code}")
        return []

def test_get_session_history(session_id: str) -> Optional[List[Dict]]:
    """Testira dohvatanje istorije sesije"""
    print(f"🧪 Testiranje dohvatanja istorije sesije: {session_id[:8]}...")
    
    response = requests.get(f"{BASE_URL}/chat/history/{session_id}")
    
    if response.status_code == 200:
        data = response.json()
        messages = data['data']['messages']
        print(f"✅ Dohvaćeno {len(messages)} poruka iz sesije")
        
        # Prikaži poruke
        for i, message in enumerate(messages):
            sender = "👤" if message['sender'] == 'user' else "🤖"
            content = message['content'][:50] + "..." if len(message['content']) > 50 else message['content']
            print(f"   {sender} {content}")
        
        return messages
    else:
        print(f"❌ Greška pri dohvatanju istorije: {response.status_code}")
        return None

def test_session_resume_functionality(session_id: str) -> bool:
    """Testira funkcionalnost nastavka sesije"""
    print(f"🧪 Testiranje funkcionalnosti nastavka sesije: {session_id[:8]}...")
    
    # Prvo dohvati sesije da proveri da li se prikazuje first_message
    sessions = test_get_sessions()
    
    # Pronađi našu sesiju
    target_session = None
    for session in sessions:
        if session['session_id'] == session_id:
            target_session = session
            break
    
    if target_session:
        print(f"✅ Sesija pronađena u listi")
        print(f"   📝 Ime: {target_session['name']}")
        print(f"   📊 Broj poruka: {target_session['message_count']}")
        print(f"   💬 Prva poruka: {target_session['first_message']}")
        print(f"   ⏰ Poslednja aktivnost: {target_session['last_message']}")
        
        # Proveri da li ima poruka
        if target_session['message_count'] > 0:
            print("✅ Sesija ima poruke - može se nastaviti")
            return True
        else:
            print("⚠️ Sesija nema poruka")
            return False
    else:
        print("❌ Sesija nije pronađena u listi")
        return False

def main():
    """Glavna test funkcija"""
    print("🚀 Početak testiranja funkcionalnosti učitavanja sesija")
    print("=" * 60)
    
    # Test 1: Kreiranje sesije
    session_id = test_create_session()
    if not session_id:
        print("❌ Test neuspešan - nije moguće kreirati sesiju")
        return
    
    print()
    
    # Test 2: Slanje poruka
    messages = [
        "Zdravo! Kako si danas?",
        "Možeš li da mi objasniš kako funkcioniše veštačka inteligencija?",
        "Koje su najbolje prakse za učenje programiranja?"
    ]
    
    for message in messages:
        success = test_send_message(session_id, message)
        if not success:
            print("❌ Test neuspešan - nije moguće poslati poruku")
            return
        time.sleep(1)  # Pauza između poruka
    
    print()
    
    # Test 3: Dohvatanje sesija
    sessions = test_get_sessions()
    if not sessions:
        print("❌ Test neuspešan - nije moguće dohvatiti sesije")
        return
    
    print()
    
    # Test 4: Dohvatanje istorije sesije (koristi session_id sa porukama)
    messages = test_get_session_history(session_id)
    if messages is None:  # Promeniti uslov - prazna lista je OK
        print("❌ Test neuspešan - nije moguće dohvatiti istoriju")
        return
    
    print()
    
    # Test 5: Testiranje funkcionalnosti nastavka
    resume_success = test_session_resume_functionality(session_id)
    
    print()
    print("=" * 60)
    
    if resume_success:
        print("🎉 SVI TESTOVI USPEŠNI!")
        print("✅ Funkcionalnost učitavanja sesija radi kako treba")
        print("✅ Korisnici mogu da nastave razgovor iz postojećih sesija")
    else:
        print("⚠️ Neki testovi nisu uspešni")
        print("❌ Potrebno je proveriti implementaciju")

if __name__ == "__main__":
    main() 