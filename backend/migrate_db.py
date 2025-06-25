#!/usr/bin/env python3
"""
Skripta za migraciju baze podataka
"""

import os
import sys
from pathlib import Path

# Dodaj backend direktorijum u Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.models import Base, engine

def migrate_database():
    """Kreira nove tabele u bazi podataka"""
    print("🔄 Migracija baze podataka...")
    
    try:
        # Kreiraj sve tabele
        Base.metadata.create_all(bind=engine)
        print("✅ Baza podataka uspešno migrirana!")
        print("📋 Kreirane tabele:")
        print("   - chat_messages (postojeća)")
        print("   - documents (nova)")
        
    except Exception as e:
        print(f"❌ Greška pri migraciji: {e}")
        return False
    
    return True

if __name__ == "__main__":
    migrate_database() 