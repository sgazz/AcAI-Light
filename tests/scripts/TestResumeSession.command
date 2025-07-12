#!/bin/bash

# Test Resume Session Functionality
# Ova skripta testira funkcionalnost nastavka sesije

echo "🚀 Testiranje funkcionalnosti nastavka sesije"
echo "============================================="

# Proveri da li je backend pokrenut
echo "🔍 Proveravanje da li je backend pokrenut..."
if curl -s http://localhost:8001/health > /dev/null; then
    echo "✅ Backend je pokrenut na portu 8001"
else
    echo "❌ Backend nije pokrenut na portu 8001"
    echo "   Pokrenite backend sa: cd backend && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
    exit 1
fi

echo ""
echo "🧪 Pokretanje test skripte..."

# Pokreni test skriptu
cd "$(dirname "$0")/../python"
python3 test_resume_session.py

# Proveri rezultat
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Testiranje završeno uspešno!"
    echo "✅ Funkcionalnost nastavka sesije radi kako treba"
    echo ""
    echo "📋 Šta je testirano:"
    echo "   • Pronalaženje BPPV sesije"
    echo "   • Dohvatanje liste sesija"
    echo "   • Dohvatanje istorije sesije"
    echo "   • Učitavanje poruka iz sesije"
    echo ""
    echo "🎯 Korisnici sada mogu da:"
    echo "   • Kliknu na ▶️ dugme za nastavak sesije"
    echo "   • Vide sve poruke iz sesije"
    echo "   • Nastave razgovor iz postojeće sesije"
    echo ""
    echo "💡 Ako dugme ▶️ i dalje ne radi u frontend-u:"
    echo "   • Proverite browser console za greške"
    echo "   • Osvežite stranicu (Ctrl+F5)"
    echo "   • Proverite da li je frontend pokrenut na portu 3001"
else
    echo ""
    echo "❌ Testiranje nije uspešno"
    echo "   Proverite logove za detalje"
    exit 1
fi 