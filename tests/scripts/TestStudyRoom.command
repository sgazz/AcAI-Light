#!/bin/bash

echo "🧪 Testiranje Study Room funkcionalnosti..."
echo "=========================================="

# Proveri da li je backend pokrenut
echo "📡 Proveravam backend status..."
BACKEND_STATUS=$(curl -s http://localhost:8001/health)
if [[ $? -eq 0 ]]; then
    echo "✅ Backend je pokrenut"
else
    echo "❌ Backend nije pokrenut"
    exit 1
fi

# Proveri da li je frontend pokrenut
echo "🌐 Proveravam frontend status..."
FRONTEND_STATUS=$(curl -s http://localhost:3000/api/test-backend)
if [[ $? -eq 0 ]]; then
    echo "✅ Frontend je pokrenut"
else
    echo "❌ Frontend nije pokrenut"
    exit 1
fi

# Testiraj kreiranje sobe
echo "🏠 Testiram kreiranje sobe..."
ROOM_CREATE_RESPONSE=$(curl -s -X POST http://localhost:8001/study-room/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Soba",
    "description": "Test opis",
    "subject": "Test predmet",
    "max_participants": 5,
    "admin_user_id": "test_user"
  }')

echo "📝 Odgovor kreiranja sobe: $ROOM_CREATE_RESPONSE"

# Testiraj listanje soba
echo "📋 Testiram listanje soba..."
ROOM_LIST_RESPONSE=$(curl -s "http://localhost:8001/study-room/list?user_id=test_user")
echo "📝 Odgovor listanja soba: $ROOM_LIST_RESPONSE"

# Testiraj WebSocket konekciju
echo "🔌 Testiram WebSocket konekciju..."
WEBSOCKET_TEST=$(curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: x3JJHMbDL1EzLkh9GBhXDw==" http://localhost:8001/ws/study-room/test-room 2>&1 | head -10)
echo "📝 WebSocket test odgovor: $WEBSOCKET_TEST"

echo "✅ Testiranje završeno!"
echo "🌐 Otvorite http://localhost:3000 i kliknite na 'Study Room' u meniju" 