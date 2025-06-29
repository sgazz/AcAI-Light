#!/bin/bash

echo "🚀 Pokretanje File Handling Test Suite..."
echo "=========================================="

# Provera da li je frontend pokrenut
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Frontend nije pokrenut na portu 3000"
    echo "Pokrenite frontend sa: cd frontend && npm run dev"
    exit 1
fi

echo "✅ Frontend je pokrenut"

# Provera da li je backend pokrenut
if ! curl -s http://localhost:8001 > /dev/null; then
    echo "❌ Backend nije pokrenut na portu 8001"
    echo "Pokrenite backend sa: cd backend && python -m uvicorn app.main:app --reload --port 8001"
    exit 1
fi

echo "✅ Backend je pokrenut"

# Otvaranje test stranice
echo "🌐 Otvaranje File Handling test stranice..."
open "http://localhost:3000/test-file-handling"

echo ""
echo "📋 File Handling Test Suite je pokrenut!"
echo ""
echo "🧪 Testirane funkcionalnosti:"
echo "  • File Upload (Drag & Drop)"
echo "  • Image Preview sa Zoom"
echo "  • Document Preview sa Search"
echo "  • File Download"
echo "  • Error Handling"
echo ""
echo "📁 Podržani formati:"
echo "  • Slike (JPG, PNG, GIF, WebP)"
echo "  • Dokumenti (PDF, TXT, DOC)"
echo "  • Ostali fajlovi"
echo ""
echo "⌨️  Keyboard shortcuts:"
echo "  • ESC - Zatvori preview"
echo "  • Scroll - Zoom in/out"
echo "  • Arrow keys - Navigacija"
echo "  • F - Fullscreen"
echo ""
echo "🎯 Sledeći koraci:"
echo "  1. Testirajte drag & drop upload"
echo "  2. Pregledajte slike sa zoom funkcionalnostima"
echo "  3. Testirajte document preview sa search"
echo "  4. Preuzmite fajlove"
echo "  5. Proverite error handling"
echo ""
echo "📊 Rezultati testova će biti prikazani u realnom vremenu"
echo ""
echo "🔗 Test stranica: http://localhost:3000/test-file-handling"
echo ""
echo "✨ File Handling Test Suite je spreman za testiranje!" 