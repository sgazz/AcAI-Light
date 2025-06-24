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

echo "=== ACAI Assistant - Chat Istorija ==="
echo ""

# Pokretanje pregleda baze
echo "Pregledavam SQLite bazu podataka..."
cd backend
source venv/bin/activate
python3 view_database.py

echo ""
echo "Pritisnite Enter za izlaz..."
read 