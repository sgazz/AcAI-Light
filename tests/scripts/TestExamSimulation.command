#!/bin/bash

echo "🧪 Testiranje Exam Simulation funkcionalnosti..."
echo "================================================"

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

# Testiraj kreiranje ispita
echo "📝 Testiram kreiranje ispita..."
EXAM_CREATE_RESPONSE=$(curl -s -X POST http://localhost:8001/exam/create \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test Ispit",
    "description": "Test ispit za proveru funkcionalnosti",
    "subject": "Test predmet",
    "duration_minutes": 30,
    "total_points": 50,
    "passing_score": 70,
    "questions": [],
    "created_by": "test_user",
    "is_public": true
  }')

echo "📝 Odgovor kreiranja ispita: $EXAM_CREATE_RESPONSE"

# Testiraj listanje ispita
echo "📋 Testiram listanje ispita..."
EXAM_LIST_RESPONSE=$(curl -s "http://localhost:8001/exams?user_id=test_user")
echo "📝 Odgovor listanja ispita: $EXAM_LIST_RESPONSE"

# Testiraj dohvatanje ispita
echo "🔍 Testiram dohvatanje ispita..."
# Prvo dohvati listu ispita da nađemo exam_id
EXAM_LIST=$(curl -s "http://localhost:8001/exams?user_id=test_user")
EXAM_ID=$(echo $EXAM_LIST | grep -o '"exam_id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [[ -n "$EXAM_ID" ]]; then
    EXAM_GET_RESPONSE=$(curl -s "http://localhost:8001/exam/$EXAM_ID")
    echo "📝 Odgovor dohvatanja ispita: $EXAM_GET_RESPONSE"
else
    echo "⚠️ Nema ispita za testiranje"
fi

# Testiraj AI generisanje pitanja
echo "🤖 Testiram AI generisanje pitanja..."
AI_QUESTIONS_RESPONSE=$(curl -s -X POST http://localhost:8001/exam/generate-questions \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Matematika",
    "topic": "Osnovne operacije",
    "count": 5,
    "difficulty": "easy"
  }')

echo "📝 Odgovor AI generisanja pitanja: $AI_QUESTIONS_RESPONSE"

echo "✅ Testiranje završeno!"
echo "🌐 Otvorite http://localhost:3000 i kliknite na 'Exam Simulation' u meniju" 