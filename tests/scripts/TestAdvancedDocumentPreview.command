#!/bin/bash

echo "🧪 Testiranje AdvancedDocumentPreview komponente"
echo "================================================"

# Proveri da li je frontend pokrenut
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Frontend nije pokrenut na portu 3000"
    echo "Pokrenite frontend sa: cd frontend && npm run dev"
    exit 1
fi

# Proveri da li je backend pokrenut
if ! curl -s http://localhost:8001/health > /dev/null; then
    echo "❌ Backend nije pokrenut na portu 8001"
    echo "Pokrenite backend sa: cd backend && python -m uvicorn app.main:app --reload --port 8001"
    exit 1
fi

echo "✅ Frontend i backend su pokrenuti"

# Test 1: Proveri da li se komponenta učitava
echo ""
echo "🔍 Test 1: Učitavanje komponente"
if curl -s http://localhost:3000 | grep -q "AdvancedDocumentPreview"; then
    echo "✅ Komponenta se učitava"
else
    echo "⚠️  Komponenta možda nije učitana (normalno ako nije prikazana)"
fi

# Test 2: Proveri da li postoje test fajlovi
echo ""
echo "🔍 Test 2: Proveri test fajlove"
if [ -f "tests/data/documents/test_doc.txt" ]; then
    echo "✅ Test dokument postoji"
    TEST_DOC="tests/data/documents/test_doc.txt"
else
    echo "⚠️  Test dokument ne postoji, kreiraj ga"
    mkdir -p tests/data/documents
    echo "Ovo je test dokument za AdvancedDocumentPreview komponentu.
    
Linija 1: Test sadržaj
Linija 2: Još test sadržaja
Linija 3: Više test sadržaja
Linija 4: I još više test sadržaja
Linija 5: Poslednja linija test sadržaja" > tests/data/documents/test_doc.txt
    TEST_DOC="tests/data/documents/test_doc.txt"
    echo "✅ Test dokument kreiran"
fi

# Test 3: Upload test dokumenta
echo ""
echo "🔍 Test 3: Upload test dokumenta"
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:8001/documents/upload \
  -F "file=@$TEST_DOC" \
  -H "Content-Type: multipart/form-data")

if echo "$UPLOAD_RESPONSE" | grep -q "success"; then
    echo "✅ Test dokument uspešno uploadovan"
    DOC_ID=$(echo "$UPLOAD_RESPONSE" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    echo "📄 Document ID: $DOC_ID"
else
    echo "❌ Greška pri upload-u test dokumenta"
    echo "Response: $UPLOAD_RESPONSE"
    exit 1
fi

# Test 4: Proveri da li se dokument može dohvatiti
echo ""
echo "🔍 Test 4: Dohvatanje dokumenta"
if [ ! -z "$DOC_ID" ]; then
    DOC_RESPONSE=$(curl -s http://localhost:8001/documents/$DOC_ID/content)
    if echo "$DOC_RESPONSE" | grep -q "success"; then
        echo "✅ Dokument uspešno dohvaćen"
    else
        echo "❌ Greška pri dohvatanju dokumenta"
        echo "Response: $DOC_RESPONSE"
    fi
fi

# Test 5: Proveri da li se dokument prikazuje u listi
echo ""
echo "🔍 Test 5: Dokument u listi"
DOCS_RESPONSE=$(curl -s http://localhost:8001/documents)
if echo "$DOCS_RESPONSE" | grep -q "test_doc.txt"; then
    echo "✅ Dokument se prikazuje u listi"
else
    echo "❌ Dokument se ne prikazuje u listi"
fi

echo ""
echo "🎉 Testiranje završeno!"
echo ""
echo "📋 Instrukcije za testiranje:"
echo "1. Otvorite http://localhost:3000 u browser-u"
echo "2. Idite na DocumentList komponentu"
echo "3. Kliknite na 'Preview' dugme pored test_doc.txt"
echo "4. Testirajte funkcionalnosti:"
echo "   - Zoom in/out (Ctrl+=, Ctrl+-)"
echo "   - Rotacija (Ctrl+R)"
echo "   - Search (Ctrl+F)"
echo "   - Bookmark-ovi (Ctrl+B)"
echo "   - Fullscreen (F)"
echo "   - Navigacija (strelice)"
echo "   - Download"
echo ""
echo "🔧 Napredne funkcionalnosti:"
echo "- Text selection i copy"
echo "- Theme switching (light/dark/sepia)"
echo "- Font size kontrola"
echo "- Line spacing kontrola"
echo "- History (undo/redo)"
echo "- Keyboard shortcuts" 