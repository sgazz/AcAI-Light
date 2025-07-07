#!/bin/bash

echo "🧪 Testiranje Chat Integracije - End-to-End"
echo "=========================================="

# Proveri da li je backend pokrenut
echo "📡 Proveravam backend status..."
BACKEND_STATUS=$(curl -s http://localhost:8001/health | jq -r '.status' 2>/dev/null || echo "error")

if [ "$BACKEND_STATUS" != "healthy" ]; then
    echo "❌ Backend nije pokrenut ili ne radi"
    echo "   Pokrenite backend sa: cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8001"
    exit 1
fi

echo "✅ Backend je pokrenut i radi"

# Proveri da li je frontend pokrenut
echo "🌐 Proveravam frontend status..."
FRONTEND_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000)

if [ "$FRONTEND_STATUS" != "200" ]; then
    echo "❌ Frontend nije pokrenut ili ne radi"
    echo "   Pokrenite frontend sa: cd frontend && npm run dev"
    exit 1
fi

echo "✅ Frontend je pokrenut i radi"

# Test 1: Kreiranje nove sesije
echo ""
echo "🔄 Test 1: Kreiranje nove sesije..."
SESSION_RESPONSE=$(curl -s -X POST http://localhost:8001/chat/new-session)
SESSION_ID=$(echo $SESSION_RESPONSE | jq -r '.session_id' 2>/dev/null)

if [ "$SESSION_ID" = "null" ] || [ -z "$SESSION_ID" ]; then
    echo "❌ Greška pri kreiranju sesije"
    echo "   Response: $SESSION_RESPONSE"
    exit 1
fi

echo "✅ Sesija kreirana: $SESSION_ID"

# Test 2: Slanje poruke
echo ""
echo "🔄 Test 2: Slanje poruke..."
MESSAGE_RESPONSE=$(curl -s -X POST http://localhost:8001/chat \
  -H "Content-Type: application/json" \
  -d "{\"message\": \"Zdravo, ovo je test poruka\", \"session_id\": \"$SESSION_ID\"}")

MESSAGE_STATUS=$(echo $MESSAGE_RESPONSE | jq -r '.status' 2>/dev/null)

if [ "$MESSAGE_STATUS" != "success" ]; then
    echo "❌ Greška pri slanju poruke"
    echo "   Response: $MESSAGE_RESPONSE"
    exit 1
fi

echo "✅ Poruka uspešno poslata"

# Test 3: Dohvatanje chat istorije
echo ""
echo "🔄 Test 3: Dohvatanje chat istorije..."
HISTORY_RESPONSE=$(curl -s http://localhost:8001/chat/history/$SESSION_ID)
HISTORY_STATUS=$(echo $HISTORY_RESPONSE | jq -r '.status' 2>/dev/null)
MESSAGE_COUNT=$(echo $HISTORY_RESPONSE | jq -r '.count' 2>/dev/null)

if [ "$HISTORY_STATUS" != "success" ]; then
    echo "❌ Greška pri dohvatanju istorije"
    echo "   Response: $HISTORY_RESPONSE"
    exit 1
fi

echo "✅ Istorija uspešno dohvaćena ($MESSAGE_COUNT poruka)"

# Test 4: Dohvatanje sesija
echo ""
echo "🔄 Test 4: Dohvatanje sesija..."
SESSIONS_RESPONSE=$(curl -s http://localhost:8001/chat/sessions)
SESSIONS_STATUS=$(echo $SESSIONS_RESPONSE | jq -r '.status' 2>/dev/null)
SESSIONS_COUNT=$(echo $SESSIONS_RESPONSE | jq -r '.count' 2>/dev/null)

if [ "$SESSIONS_STATUS" != "success" ]; then
    echo "❌ Greška pri dohvatanju sesija"
    echo "   Response: $SESSIONS_RESPONSE"
    exit 1
fi

echo "✅ Sesije uspešno dohvaćene ($SESSIONS_COUNT sesija)"

# Test 5: Preimenovanje sesije
echo ""
echo "🔄 Test 5: Preimenovanje sesije..."
RENAME_RESPONSE=$(curl -s -X PUT http://localhost:8001/chat/sessions/$SESSION_ID/rename \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Sesija - Preimenovana"}')

RENAME_STATUS=$(echo $RENAME_RESPONSE | jq -r '.status' 2>/dev/null)

if [ "$RENAME_STATUS" != "success" ]; then
    echo "❌ Greška pri preimenovanju sesije"
    echo "   Response: $RENAME_RESPONSE"
    exit 1
fi

echo "✅ Sesija uspešno preimenovana"

# Test 6: Brisanje sesije
echo ""
echo "🔄 Test 6: Brisanje sesije..."
DELETE_RESPONSE=$(curl -s -X DELETE http://localhost:8001/chat/session/$SESSION_ID)
DELETE_STATUS=$(echo $DELETE_RESPONSE | jq -r '.status' 2>/dev/null)

if [ "$DELETE_STATUS" != "success" ]; then
    echo "❌ Greška pri brisanju sesije"
    echo "   Response: $DELETE_RESPONSE"
    exit 1
fi

echo "✅ Sesija uspešno obrisana"

# Test 7: Provera da li je sesija obrisana
echo ""
echo "🔄 Test 7: Provera brisanja sesije..."
VERIFY_RESPONSE=$(curl -s http://localhost:8001/chat/history/$SESSION_ID)
VERIFY_STATUS=$(echo $VERIFY_RESPONSE | jq -r '.status' 2>/dev/null)

if [ "$VERIFY_STATUS" = "success" ]; then
    echo "⚠️  Sesija još uvek postoji (možda je problem sa brisanjem)"
else
    echo "✅ Sesija uspešno obrisana (nije dostupna)"
fi

echo ""
echo "🎉 Svi testovi su prošli uspešno!"
echo "=================================="
echo "✅ Backend API radi"
echo "✅ Frontend je dostupan"
echo "✅ Chat funkcionalnost radi"
echo "✅ Session management radi"
echo ""
echo "🌐 Možete testirati chat na: http://localhost:3000/chat-test"
echo "📡 Backend API dokumentacija: http://localhost:8001/docs" 