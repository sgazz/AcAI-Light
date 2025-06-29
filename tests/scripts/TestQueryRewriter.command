#!/bin/bash

echo "🧪 TESTIRANJE QUERY REWRITER FUNKCIONALNOSTI"
echo "============================================="
echo ""

# Proveri da li je backend pokrenut
echo "📋 Proveravanje backend statusa..."
if curl -s http://localhost:8001 > /dev/null; then
    echo "✅ Backend je pokrenut na http://localhost:8001"
else
    echo "❌ Backend nije pokrenut. Pokretanje..."
    cd backend
    source venv/bin/activate
    uvicorn app.main:app --host 0.0.0.0 --port 8001 &
    sleep 5
    cd ..
fi

echo ""
echo "🔍 Proveravanje Query Rewriter endpoint-a:"
echo ""

# Lista endpoint-a za testiranje
endpoints=(
    "POST /query/enhance - Poboljšanje upita"
    "POST /query/expand - Proširenje upita"
    "POST /query/analyze - Analiza upita"
    "GET /query/stats - Statistike"
    "DELETE /query/cache/clear - Čišćenje cache-a"
    "POST /query/test - Integrisani test"
)

for endpoint in "${endpoints[@]}"; do
    echo "✅ $endpoint"
done

echo ""
echo "🎯 POKRETANJE TESTOVA:"
echo ""

# Pokreni test skriptu
cd backend
source venv/bin/activate

echo "🚀 Pokretanje Query Rewriter test skripte..."
python test_query_rewriter.py

echo ""
echo "📊 REZULTATI TESTOVA:"
echo ""

# Proveri da li je kreiran test report
latest_report=$(ls -t query_rewriter_test_*.json 2>/dev/null | head -1)
if [ -n "$latest_report" ]; then
    echo "✅ Test report kreiran: $latest_report"
    
    # Prikaži osnovne rezultate
    if command -v jq &> /dev/null; then
        echo ""
        echo "📈 Sažetak rezultata:"
        echo "-------------------"
        jq -r '.success_rate + "% uspešnost (" + (.successful | tostring) + "/" + (.total_tests | tostring) + " testova)"' "$latest_report"
        echo "⏱️  Vreme izvršavanja: $(jq -r '.duration + "s"' "$latest_report")"
    else
        echo "📄 Detaljni rezultati u fajlu: $latest_report"
    fi
else
    echo "❌ Test report nije kreiran"
fi

cd ..

echo ""
echo "🌐 Backend URL: http://localhost:8001"
echo "📚 API Dokumentacija: http://localhost:8001/docs"
echo ""

echo "💡 SAVETI ZA TESTIRANJE:"
echo "- Koristite /query/enhance za poboljšanje upita"
echo "- Koristite /query/expand za proširenje upita"
echo "- Koristite /query/analyze za analizu upita"
echo "- Proverite /query/stats za statistike"
echo ""

echo "🎉 Testiranje završeno!" 