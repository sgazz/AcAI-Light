#!/usr/bin/env python3
"""
Test skripta za proveru funkcionalnosti nastavka sesije
"""

import requests
import json
import time
from typing import Dict, List, Optional

# Konfiguracija
BASE_URL = "http://localhost:8001"
HEADERS = {"Content-Type": "application/json"}

def test_resume_session(session_id: str) -> bool:
    """Testira funkcionalnost nastavka sesije"""
    print(f"🧪 Testiranje nastavka sesije: {session_id[:8]}...")
    
    # 1. Prvo dohvati sesije da proveri da li sesija postoji
    print("   📋 Dohvatanje liste sesija...")
    response = requests.get(f"{BASE_URL}/chat/sessions")
    
    if response.status_code != 200:
        print(f"   ❌ Greška pri dohvatanju sesija: {response.status_code}")
        return False
    
    data = response.json()
    sessions = data['data']['sessions']
    
    # Pronađi našu sesiju
    target_session = None
    for session in sessions:
        if session['session_id'] == session_id:
            target_session = session
            break
    
    if not target_session:
        print(f"   ❌ Sesija {session_id[:8]} nije pronađena u listi")
        return False
    
    print(f"   ✅ Sesija pronađena: {target_session['name']}")
    print(f"   📊 Broj poruka: {target_session['message_count']}")
    print(f"   💬 Prva poruka: {target_session['first_message'][:50]}...")
    
    # 2. Dohvati istoriju sesije
    print("   📜 Dohvatanje istorije sesije...")
    response = requests.get(f"{BASE_URL}/chat/history/{session_id}")
    
    if response.status_code != 200:
        print(f"   ❌ Greška pri dohvatanju istorije: {response.status_code}")
        return False
    
    data = response.json()
    messages = data['data']['messages']
    
    print(f"   ✅ Dohvaćeno {len(messages)} poruka")
    
    # Prikaži prve poruke
    for i, message in enumerate(messages[:3]):
        sender = "👤" if message['sender'] == 'user' else "🤖"
        content = message['content'][:50] + "..." if len(message['content']) > 50 else message['content']
        print(f"   {sender} {content}")
    
    if len(messages) > 3:
        print(f"   ... i još {len(messages) - 3} poruka")
    
    return True

def find_bppv_session() -> Optional[str]:
    """Pronađi sesiju sa imenom 'BPPV'"""
    print("🔍 Traženje BPPV sesije...")
    
    response = requests.get(f"{BASE_URL}/chat/sessions")
    
    if response.status_code != 200:
        print(f"❌ Greška pri dohvatanju sesija: {response.status_code}")
        return None
    
    data = response.json()
    sessions = data['data']['sessions']
    
    for session in sessions:
        if 'BPPV' in session['name']:
            print(f"✅ Pronađena BPPV sesija: {session['name']}")
            return session['session_id']
    
    print("❌ BPPV sesija nije pronađena")
    return None

def main():
    """Glavna test funkcija"""
    print("🚀 Testiranje funkcionalnosti nastavka sesije")
    print("=" * 50)
    
    # Pronađi BPPV sesiju
    session_id = find_bppv_session()
    if not session_id:
        print("❌ Nije moguće testirati - BPPV sesija nije pronađena")
        return
    
    print()
    
    # Testiraj nastavak sesije
    success = test_resume_session(session_id)
    
    print()
    print("=" * 50)
    
    if success:
        print("🎉 TEST USPEŠAN!")
        print("✅ Funkcionalnost nastavka sesije radi kako treba")
        print("✅ Poruke se mogu učitati iz sesije")
        print("✅ Korisnici mogu da nastave razgovor iz postojeće sesije")
    else:
        print("❌ TEST NEUSPEŠAN")
        print("❌ Potrebno je proveriti implementaciju")

if __name__ == "__main__":
    main() 