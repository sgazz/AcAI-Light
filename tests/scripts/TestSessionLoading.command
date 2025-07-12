#!/bin/bash

# Test Session Loading Functionality
# Ova skripta testira funkcionalnost učitavanja sesija u chat interfejsu

echo "🚀 Testiranje funkcionalnosti učitavanja sesija"
echo "=============================================="

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
python3 test_session_loading.py

# Proveri rezultat
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 Testiranje završeno uspešno!"
    echo "✅ Funkcionalnost učitavanja sesija radi kako treba"
    echo ""
    echo "📋 Šta je testirano:"
    echo "   • Kreiranje nove sesije"
    echo "   • Slanje poruka u sesiju"
    echo "   • Dohvatanje liste sesija sa first_message"
    echo "   • Dohvatanje istorije sesije"
    echo "   • Funkcionalnost nastavka sesije"
    echo ""
    echo "🎯 Korisnici sada mogu da:"
    echo "   • Vide sve postojeće sesije sa prvim porukama"
    echo "   • Nastave razgovor iz bilo koje sesije"
    echo "   • Pregledaju istoriju pre nastavka"
else
    echo ""
    echo "❌ Testiranje nije uspešno"
    echo "   Proverite logove za detalje"
    exit 1
fi 