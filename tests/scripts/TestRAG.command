#!/bin/bash

# Test RAG Sistema - AcAIA
echo "🧪 Testiranje RAG sistema..."

# Idemo u backend direktorijum
cd "$(dirname "$0")/backend"

# Aktiviraj virtual environment
echo "🔧 Aktiviranje virtual environment-a..."
source venv/bin/activate

# Instaliraj potrebne biblioteke
echo "📦 Instalacija potrebnih biblioteka..."
pip install -r requirements.txt

# Pokreni test RAG sistema
echo "🚀 Pokretanje RAG testova..."
python test_rag.py

echo "✅ Testiranje završeno!" 