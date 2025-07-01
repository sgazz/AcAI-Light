#!/bin/bash

# Test Session Management Integration
# Testira sve endpoint-e u real režimu: Frontend -> Backend -> Supabase

echo "🚀 POKRETANJE SVEOBUHVATNOG TESTA SESSION MANAGEMENT-A"
echo "=================================================="

# Proveri da li je backend pokrenut
echo "🔍 Proveravam da li je backend pokrenut..."
if ! curl -s http://localhost:8001/health > /dev/null; then
    echo "❌ Backend nije pokrenut na portu 8001"
    echo "💡 Pokrenite backend sa: cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload"
    exit 1
fi

echo "✅ Backend je pokrenut"

# Proveri da li je Supabase dostupan
echo "🔍 Proveravam Supabase konekciju..."
HEALTH_RESPONSE=$(curl -s http://localhost:8001/health)
if echo "$HEALTH_RESPONSE" | grep -q '"supabase_connected":true'; then
    echo "✅ Supabase je dostupan"
else
    echo "❌ Supabase nije dostupan"
    echo "💡 Proverite Supabase konfiguraciju"
    exit 1
fi

# Kreiraj results direktorijum ako ne postoji
mkdir -p tests/data/results

# Pokreni test
echo "🧪 Pokrećem sveobuhvatan test..."
cd "$(dirname "$0")/.."
python python/test_session_management_integration.py

# Proveri rezultat
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 SVI TESTOVI SU PROŠLI!"
    echo "Session Management je potpuno funkcionalan!"
else
    echo ""
    echo "⚠️ NEKI TESTOVI NISU PROŠLI!"
    echo "Proverite rezultate u tests/data/results/"
fi

echo ""
echo "📋 Rezultati testa su sačuvani u tests/data/results/"
echo "==================================================" 