#!/bin/bash

# Test skripta za re-ranking funkcionalnost
echo "🚀 Testiranje re-ranking funkcionalnosti..."

# Idemo u backend direktorijum
cd "$(dirname "$0")/backend"

# Aktiviraj virtualno okruženje
source venv/bin/activate

# Instaliraj nove zavisnosti ako je potrebno
echo "📦 Proveravanje zavisnosti..."
pip install -r requirements.txt

# Pokreni test re-ranking funkcionalnosti
echo "🧪 Pokretanje testova re-ranking funkcionalnosti..."
python test_rerank.py

echo "✅ Testiranje završeno!"
echo ""
echo "📝 Napomene:"
echo "- Re-ranking poboljšava kvalitet rezultata pretrage"
echo "- Cross-encoder model daje preciznije rangiranje"
echo "- Kombinovanje originalnog i re-rank score-a daje bolje rezultate"
echo ""
echo "🌐 Za testiranje kroz web interfejs, pokrenite:"
echo "   Backend: cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8001"
echo "   Frontend: cd frontend && npm run dev" 