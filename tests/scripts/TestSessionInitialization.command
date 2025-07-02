#!/bin/bash

# Test Session Initialization Command
# Pokreće testove za proveru inicijalizacije sesija u AcAIA aplikaciji

echo "🚀 POKRETANJE TESTOVA INICIJALIZACIJE SESIJE"
echo "=========================================="

# Proveri da li je backend pokrenut
echo "🔍 Proveravam da li je backend pokrenut..."
if curl -s http://localhost:8001/health > /dev/null; then
    echo "✅ Backend je pokrenut na portu 8001"
else
    echo "❌ Backend nije pokrenut na portu 8001"
    echo "   Pokrenite backend sa: cd backend && python -m uvicorn app.main:app --reload --port 8001"
    exit 1
fi

# Pređi u direktorijum sa testovima
cd "$(dirname "$0")/.."

# Proveri da li postoji Python environment
if [ ! -d "../../backend/venv" ]; then
    echo "⚠️ Python virtual environment nije pronađen"
    echo "   Kreirajte ga sa: cd backend && python -m venv venv && source venv/bin/activate && pip install -r requirements.txt"
fi

# Aktiviraj virtual environment ako postoji
if [ -d "../../backend/venv" ]; then
    echo "🔧 Aktiviranje virtual environment-a..."
    source ../../backend/venv/bin/activate
fi

# Proveri da li su potrebne biblioteke instalirane
echo "📦 Proveravam potrebne biblioteke..."
python -c "import aiohttp, asyncio" 2>/dev/null || {
    echo "❌ Potrebne biblioteke nisu instalirane"
    echo "   Instalirajte sa: pip install aiohttp"
    exit 1
}

# Pokreni testove
echo "🧪 Pokretanje testova..."
python python/test_session_initialization.py

# Proveri rezultat
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Testovi su uspešno završeni"
else
    echo ""
    echo "❌ Testovi su završeni sa greškama"
    exit 1
fi 