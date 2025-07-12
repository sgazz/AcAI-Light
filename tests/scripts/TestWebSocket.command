#!/bin/bash

# AcAIA WebSocket Test
# Testira real-time chat, typing indicators i AI odgovore

echo "🚀 AcAIA WebSocket Test"
echo "======================="
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

# TODO: Proveri OpenAI API key kada bude implementiran
echo "🔍 OpenAI API key provera..."
echo "⚠️ OpenAI integracija je u toku - preskačem proveru"

echo ""

# Instaliraj potrebne dependencije ako nisu instalirane
echo "📦 Proveravam dependencije..."
cd backend
if ! python -c "import websockets" 2>/dev/null; then
    echo "📥 Instaliram websockets..."
    pip install websockets==12.0
fi
cd ..

echo ""

# Pokreni testove
echo "🧪 Pokretanje WebSocket testova..."
echo ""

cd backend
python test_websocket.py

echo ""
echo "✅ Testovi završeni!"
echo ""

echo "🔗 Korisni linkovi:"
echo "  - WebSocket endpoint: ws://localhost:8001/ws/chat"
echo "  - WebSocket stats: http://localhost:8001/websocket/stats"
echo "  - WebSocket sessions: http://localhost:8001/websocket/sessions"
echo ""

cd .. 