#!/bin/bash

echo "🧪 POKRETANJE FRONTEND INTEGRACIJA TESTOVA"
echo "=========================================="

# Proveri da li je backend pokrenut
echo "🔍 Proveravam backend konektivnost..."
if curl -s http://localhost:8001/ > /dev/null; then
    echo "✅ Backend je pokrenut na portu 8001"
else
    echo "❌ Backend nije pokrenut na portu 8001"
    echo "   Pokrenite backend sa: cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001"
    exit 1
fi

# Proveri da li je frontend pokrenut
echo "🔍 Proveravam frontend konektivnost..."
if curl -s http://localhost:3000/ > /dev/null; then
    echo "✅ Frontend je pokrenut na portu 3000"
else
    echo "❌ Frontend nije pokrenut na portu 3000"
    echo "   Pokrenite frontend sa: cd frontend && npm run dev"
    exit 1
fi

# Pokreni testove
echo ""
echo "🚀 Pokretanje testova..."
cd backend && source venv/bin/activate && cd .. && python test_frontend_integration.py

echo ""
echo "✅ Testovi završeni!"
echo "📊 Pogledajte rezultate iznad." 