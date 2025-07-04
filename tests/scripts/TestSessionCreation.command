#!/bin/bash

# Test Session Creation Comprehensive
echo "🚀 POKRETANJE SVEOBUHVATNOG TESTA KREIRANJA SESIJA"
echo "=================================================="

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
python python/test_session_creation_comprehensive.py

echo ""
echo "🏁 Test završen"
