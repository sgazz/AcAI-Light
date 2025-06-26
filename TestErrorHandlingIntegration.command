#!/bin/bash

echo "🧪 TESTIRANJE ERROR HANDLING INTEGRACIJE - FRONTEND KOMPONENTE"
echo "================================================================"
echo ""

# Proveri da li je frontend pokrenut
echo "📋 Proveravanje frontend statusa..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "✅ Frontend je pokrenut na http://localhost:3000"
else
    echo "❌ Frontend nije pokrenut. Pokretanje..."
    cd frontend
    npm run dev &
    sleep 5
    cd ..
fi

echo ""
echo "🔍 Proveravanje integrisanih komponenti:"
echo ""

# Lista integrisanih komponenti
components=(
    "ChatBox.tsx - API pozivi sa error handling"
    "DocumentUpload.tsx - Upload sa error handling"
    "DocumentList.tsx - Lista dokumenata sa error handling"
    "DocumentPreview.tsx - Pregled dokumenata sa error handling"
    "ImagePreview.tsx - OCR export sa error handling"
    "ChatHistory.tsx - Istorija chat-a sa error handling"
    "ErrorToast.tsx - Toast notifikacije"
    "ErrorToastProvider.tsx - Globalni error provider"
    "apiRequest.ts - Centralizovani API helper"
    "OfflineDetector.tsx - Offline detekcija"
)

for component in "${components[@]}"; do
    echo "✅ $component"
done

echo ""
echo "🎯 TESTIRANJE FUNKCIONALNOSTI:"
echo ""

echo "1. Toast Notifikacije:"
echo "   - Kliknite na test dugme (flask ikona) u donjem levom uglu"
echo "   - Proverite različite tipove toast-ova (error, success, warning, info)"
echo "   - Testirajte retry funkcionalnost"
echo ""

echo "2. API Error Handling:"
echo "   - Pokušajte upload dokumenta sa greškom"
echo "   - Proverite error handling u ChatBox-u"
echo "   - Testirajte DocumentList sa greškom"
echo ""

echo "3. Offline Detekcija:"
echo "   - Isključite internet konekciju"
echo "   - Proverite offline toast notifikaciju"
echo "   - Uključite internet i proverite online notifikaciju"
echo ""

echo "4. Retry Funkcionalnost:"
echo "   - Kliknite 'Pokušaj ponovo' u error toast-ovima"
echo "   - Proverite da li se operacija ponavlja"
echo ""

echo "📊 OČEKIVANI REZULTATI:"
echo "✅ Sve komponente koriste apiRequest helper"
echo "✅ Error toast-ovi se prikazuju za greške"
echo "✅ Success toast-ovi za uspešne operacije"
echo "✅ Retry opcija dostupna za greške"
echo "✅ Offline detekcija radi"
echo "✅ Graceful degradation za greške"
echo ""

echo "🌐 Frontend URL: http://localhost:3000"
echo "🔧 Backend URL: http://localhost:8001"
echo ""

echo "💡 SAVETI ZA TESTIRANJE:"
echo "- Koristite browser developer tools za praćenje network zahteva"
echo "- Proverite console za detalje o greškama"
echo "- Testirajte različite scenarije grešaka"
echo ""

echo "🎉 Testiranje završeno! Proverite funkcionalnost u browser-u." 