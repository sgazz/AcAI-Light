#!/bin/bash

# Navigacija do direktorijuma projekta
cd "/Volumes/External2TB/VS Projects/AcAIA"

# Provera da li je backend direktorijum dostupan
if [ ! -d "backend" ]; then
    echo "Greška: backend direktorijum nije pronađen!"
    echo "Molimo proverite da li ste u pravom direktorijumu."
    read -p "Pritisnite Enter za izlaz..."
    exit 1
fi

echo "=== ACAI Assistant - Testiranje Ollama Modela ==="
echo ""

# Pokretanje testiranja Ollama modela
echo "Testiram Ollama modele..."
cd backend
source venv/bin/activate
python3 test_ollama.py

echo ""
echo "Pritisnite Enter za izlaz..."
read 