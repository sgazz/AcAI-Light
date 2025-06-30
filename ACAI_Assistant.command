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

# Provera da li je frontend direktorijum dostupan
if [ ! -d "frontend" ]; then
    echo "Greška: frontend direktorijum nije pronađen!"
    echo "Molimo proverite da li ste u pravom direktorijumu."
    read -p "Pritisnite Enter za izlaz..."
    exit 1
fi

echo "Pokrećem ACAI Assistant..."
echo "Pritisnite Ctrl+C za zaustavljanje."

# Pokretanje backend-a u pozadini
echo "Pokrećem backend server..."
cd backend

# Učitavanje .env fajla za Supabase kredencijale
if [ -f ".env" ]; then
    echo "Učitavam .env fajl sa Supabase kredencijalima..."
    # Učitavanje .env fajla bez komentara i pravilno obrađivanje vrednosti
    while IFS= read -r line; do
        # Preskači prazne linije i komentare
        if [[ ! -z "$line" && ! "$line" =~ ^[[:space:]]*# ]]; then
            # Ukloni komentare sa kraja linije
            line=$(echo "$line" | sed 's/[[:space:]]*#.*$//')
            # Exportuj varijablu samo ako nije prazna
            if [[ ! -z "$line" ]]; then
                export "$line"
            fi
        fi
    done < .env
else
    echo "Upozorenje: .env fajl nije pronađen. Supabase možda neće raditi."
fi

source venv/bin/activate
uvicorn app.main:app --reload --port 8001 &
BACKEND_PID=$!

# Vraćanje u root direktorijum
cd ..

# Pokretanje frontend-a u pozadini
echo "Pokrećem frontend server..."
cd frontend
npm run dev &
FRONTEND_PID=$!

# Čekanje 5 sekundi pa otvaranje Safari-a
echo "Otvaram Safari browser..."
sleep 5
# Pokušaj da otvoriš na različitim portovima
open -a Safari http://localhost:3000 || open -a Safari http://localhost:3001 || open -a Safari http://localhost:3002

# Čekanje da se procesi završe
echo "Servisi su pokrenuti. Pritisnite Ctrl+C za zaustavljanje."
wait $BACKEND_PID $FRONTEND_PID 