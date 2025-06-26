#!/bin/bash

# TestErrorHandling.command
# Skripta za pokretanje error handling testova

echo "🔧 Error Handling Test Suite"
echo "============================"
echo ""

# Proveri da li je backend pokrenut
echo "🔍 Proveravam da li je backend pokrenut..."
if curl -s http://localhost:8001/ > /dev/null; then
    echo "✅ Backend je pokrenut na portu 8001"
else
    echo "❌ Backend nije pokrenut na portu 8001"
    echo "Pokrenite backend sa: cd backend && python -m uvicorn app.main:app --reload --port 8001"
    exit 1
fi

echo ""
echo "🚀 Pokretanje error handling testova..."
echo ""

# Pređi u backend direktorijum
cd "$(dirname "$0")/backend"

# Aktiviraj virtual environment ako postoji
if [ -d "venv" ]; then
    echo "🐍 Aktiviranje virtual environment-a..."
    source venv/bin/activate
fi

# Pokreni testove
echo "🧪 Pokretanje test skripte..."
python test_error_handling.py

# Proveri rezultat
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Testovi su završeni uspešno!"
else
    echo ""
    echo "❌ Greška pri pokretanju testova!"
fi

echo ""
echo "📁 Rezultati su sačuvani u backend/ direktorijumu"
echo ""

# Pause da korisnik može da vidi rezultate
read -p "Pritisnite Enter za izlaz..." 