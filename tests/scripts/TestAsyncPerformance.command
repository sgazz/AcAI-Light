#!/bin/bash

# AcAIA Async Performance Test
# Testira background tasks, connection pooling i performance monitoring

echo "🚀 AcAIA Async Performance Test"
echo "================================"
echo ""

# Proveri da li je backend pokrenut
echo "🔍 Proveravam da li je backend pokrenut..."
if curl -s http://localhost:8001/ > /dev/null; then
    echo "✅ Backend je pokrenut na portu 8001"
else
    echo "❌ Backend nije pokrenut na portu 8001"
    echo "   Pokrenite backend sa: cd backend && python -m uvicorn app.main:app --reload --port 8001"
    exit 1
fi

echo ""

# Proveri da li je Redis pokrenut
echo "🔍 Proveravam Redis..."
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis je pokrenut"
else
    echo "❌ Redis nije pokrenut"
    echo "   Pokrenite Redis sa: brew services start redis"
    exit 1
fi

echo ""

# TODO: Proveri OpenAI API key kada bude implementiran
echo "🔍 OpenAI API key provera..."
echo "⚠️ OpenAI integracija je u toku - preskačem proveru"

echo ""

# Instaliraj potrebne dependencije ako nisu instalirane
echo "📦 Proveravam dependencije..."
cd backend
if ! python -c "import aiohttp" 2>/dev/null; then
    echo "📥 Instaliram aiohttp..."
    pip install aiohttp==3.9.1
fi
cd ..

echo ""

# Pokreni testove
echo "🧪 Pokretanje async performance testova..."
echo ""

cd backend
python test_async_performance.py

echo ""
echo "✅ Testovi završeni!"
echo ""
echo "📊 Rezultati su sačuvani u JSON fajlu u backend direktorijumu"
echo ""

# Prikaži najnoviji rezultat
if [ -f async_performance_test_*.json ]; then
    latest_file=$(ls -t async_performance_test_*.json | head -1)
    echo "📄 Najnoviji rezultat: $latest_file"
    echo ""
    echo "📋 Kratak pregled:"
    echo "=================="
    
    # Prikaži ključne metrike iz JSON-a
    python3 -c "
import json
import sys
try:
    with open('$latest_file', 'r') as f:
        data = json.load(f)
    
    print('Timestamp:', data['timestamp'])
    print('')
    
    # Prikaži uspešnost po kategorijama
    for category, results in data['results'].items():
        if results:
            successful = sum(1 for r in results if r.get('success', False))
            total = len(results)
            success_rate = (successful / total * 100) if total > 0 else 0
            print(f'{category.upper()}: {successful}/{total} ({success_rate:.1f}%)')
            
            # Prikaži prosečno vreme odgovora
            avg_time = sum(r.get('response_time', 0) for r in results) / len(results)
            print(f'  Prosečno vreme: {avg_time:.3f}s')
    
    print('')
    print('🎯 Ukupna uspešnost: OK' if all(len(results) > 0 for results in data['results'].values()) else '❌ Neki testovi su neuspešni')
    
except Exception as e:
    print(f'Greška pri čitanju rezultata: {e}')
"
fi

echo ""
echo "🔗 Korisni linkovi:"
echo "  - Backend API: http://localhost:8001"
echo "  - Performance Overview: http://localhost:8001/performance/overview"
echo "  - Background Tasks: http://localhost:8001/tasks"
echo "  - Connection Health: http://localhost:8001/connections/health"
echo "  - Cache Stats: http://localhost:8001/cache/stats"
echo ""

cd .. 