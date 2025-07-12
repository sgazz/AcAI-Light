#!/bin/bash

# AcAIA - Development Start Script
# Pokreće backend i frontend servise sa hot reload

set -e

echo "🚀 Pokretanje AcAIA development aplikacije..."

# Kreiranje potrebnih direktorijuma
mkdir -p /app/logs /app/cache /app/temp /app/uploads

# Provera environment varijabli
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  Upozorenje: DATABASE_URL nije postavljen"
fi

if [ -z "$SUPABASE_URL" ]; then
    echo "⚠️  Upozorenje: SUPABASE_URL nije postavljen"
fi

# Pokretanje backend-a sa hot reload
echo "🔧 Pokretanje backend servisa (development mode)..."
cd /app/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload &

# Čekanje da backend pokrene
echo "⏳ Čekanje da backend pokrene..."
sleep 5

# Provera da li backend radi
for i in {1..15}; do
    if curl -f http://localhost:8001/health > /dev/null 2>&1; then
        echo "✅ Backend je uspešno pokrenut (development mode)"
        break
    fi
    echo "⏳ Čekanje backend-a... ($i/15)"
    sleep 2
done

# Pokretanje frontend-a sa hot reload
echo "🎨 Pokretanje frontend servisa (development mode)..."
cd /app/frontend
npm run dev &

# Čekanje da frontend pokrene
echo "⏳ Čekanje da frontend pokrene..."
sleep 10

# Provera da li frontend radi
for i in {1..15}; do
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Frontend je uspešno pokrenut (development mode)"
        break
    fi
    echo "⏳ Čekanje frontend-a... ($i/15)"
    sleep 2
done

echo "🎉 AcAIA development aplikacija je uspešno pokrenuta!"
echo "📱 Frontend: http://localhost:3000 (hot reload enabled)"
echo "🔧 Backend API: http://localhost:8001 (hot reload enabled)"
echo "📊 Health check: http://localhost:8001/health"
echo "🔄 Hot reload je aktivan - promene će se automatski reflektovati"

# Čuvanje PID-ova za graceful shutdown
echo $$ > /app/app.pid
echo $! >> /app/app.pid

# Signal handler za graceful shutdown
trap 'echo "🛑 Zaustavljanje development aplikacije..."; kill $(cat /app/app.pid) 2>/dev/null; exit 0' SIGTERM SIGINT

# Čekanje
wait 