#!/bin/bash

# TestFactChecker.command
# Skripta za pokretanje Fact Checker testova

echo "🔍 POKRETANJE FACT CHECKER TESTOVA"
echo "=================================="

# Proveri da li je backend pokrenut
echo "📡 Proveravam da li je backend pokrenut..."
if curl -s http://localhost:8001/ > /dev/null; then
    echo "✅ Backend je pokrenut na portu 8001"
else
    echo "❌ Backend nije pokrenut na portu 8001"
    echo "🔄 Pokretam backend..."
    cd backend
    source venv/bin/activate
    uvicorn app.main:app --host 0.0.0.0 --port 8001 &
    BACKEND_PID=$!
    echo "⏳ Čekam da se backend pokrene..."
    sleep 5
    cd ..
fi

# Pokreni testove
echo "🧪 Pokretam Fact Checker testove..."
cd backend
source venv/bin/activate

# Pokreni testove i sačuvaj izlaz
python test_fact_checker.py 2>&1 | tee ../fact_checker_test_run.log

# Proveri rezultat
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Fact Checker testovi uspešno završeni!"
    echo "📄 Pogledaj rezultate u: fact_checker_test_run.log"
else
    echo ""
    echo "❌ Fact Checker testovi imaju greške!"
    echo "📄 Pogledaj detalje u: fact_checker_test_run.log"
fi

# Zaustavi backend ako smo ga pokrenuli
if [ ! -z "$BACKEND_PID" ]; then
    echo "🛑 Zaustavljam backend..."
    kill $BACKEND_PID
fi

cd ..
echo ""
echo "🏁 Završeno!" 