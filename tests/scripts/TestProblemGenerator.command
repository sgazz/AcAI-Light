#!/bin/bash

# Test Problem Generator funkcionalnosti
echo "🚀 Pokretanje testa Problem Generator funkcionalnosti..."

# Proveri da li je backend pokrenut
echo "🔍 Proveravam da li je backend pokrenut..."
if ! curl -s http://localhost:8001/health > /dev/null; then
    echo "❌ Backend nije pokrenut na portu 8001"
    echo "💡 Pokrenite backend sa: cd backend && python -m uvicorn app.main:app --reload --port 8001"
    exit 1
fi

echo "✅ Backend je pokrenut"

# Pokreni test
echo "🧪 Pokretanje testa..."
cd "$(dirname "$0")/.."
python python/test_problem_generator.py

echo "✅ Test završen!" 