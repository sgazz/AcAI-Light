#!/bin/bash

# Test Real Session Scenarios
echo "🚀 POKRETANJE TESTOVA REALNIH SCENARIJA"
echo "========================================"

# Proveri da li je backend pokrenut
echo "🔍 Provera backend-a..."
if ! curl -s http://localhost:8001/health > /dev/null; then
    echo "❌ Backend nije pokrenut na portu 8001"
    echo "   Pokreni backend sa: cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001"
    exit 1
fi

echo "✅ Backend je dostupan"

# Pokreni test
cd "$(dirname "$0")/.."
cd backend && source venv/bin/activate && cd ../tests
python python/test_real_session_scenarios.py

echo ""
echo "🏁 Test završen"
