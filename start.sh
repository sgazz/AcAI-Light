#!/bin/bash

# AcAIA - Production Start Script
# Pokreće backend i frontend servise

set -e

echo "🚀 Pokretanje AcAIA aplikacije..."

# Kreiranje potrebnih direktorijuma
mkdir -p /app/logs /app/cache /app/temp /app/uploads

# Provera environment varijabli
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️  Upozorenje: DATABASE_URL nije postavljen"
fi

if [ -z "$SUPABASE_URL" ]; then
    echo "⚠️  Upozorenje: SUPABASE_URL nije postavljen"
fi

# Pokretanje backend-a u pozadini
echo "🔧 Pokretanje backend servisa..."
cd /app/backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8001 &

# Čekanje da backend pokrene
echo "⏳ Čekanje da backend pokrene..."
sleep 10

# Provera da li backend radi
for i in {1..30}; do
    if curl -f http://localhost:8001/health > /dev/null 2>&1; then
        echo "✅ Backend je uspešno pokrenut"
        break
    fi
    echo "⏳ Čekanje backend-a... ($i/30)"
    sleep 2
done

# Pokretanje frontend-a
echo "🎨 Pokretanje frontend servisa..."
cd /app/frontend
npm start &

# Čekanje da frontend pokrene
echo "⏳ Čekanje da frontend pokrene..."
sleep 15

# Provera da li frontend radi
for i in {1..30}; do
    if curl -f http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Frontend je uspešno pokrenut"
        break
    fi
    echo "⏳ Čekanje frontend-a... ($i/30)"
    sleep 2
done

echo "🎉 AcAIA aplikacija je uspešno pokrenuta!"
echo "📱 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8001"
echo "📊 Health check: http://localhost:8001/health"

# Čuvanje PID-ova za graceful shutdown
echo $$ > /app/app.pid
echo $! >> /app/app.pid

# Signal handler za graceful shutdown
trap 'echo "🛑 Zaustavljanje aplikacije..."; kill $(cat /app/app.pid) 2>/dev/null; exit 0' SIGTERM SIGINT

# Čekanje
wait 