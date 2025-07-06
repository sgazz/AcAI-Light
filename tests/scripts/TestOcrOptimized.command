#!/bin/bash

# Test OCR Optimization
echo "🧪 OCR Optimization Test Suite"
echo "=============================="

# Navigate to project root
cd "$(dirname "$0")/../.."

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 nije pronađen. Instalirajte Python3."
    exit 1
fi

# Check if required packages are installed
echo "📦 Proveravanje potrebnih paketa..."

# Try to import required packages
python3 -c "
import sys
try:
    import cv2
    import numpy as np
    import pytesseract
    from PIL import Image
    print('✅ Svi potrebni paketi su instalirani')
except ImportError as e:
    print(f'❌ Nedostaje paket: {e}')
    sys.exit(1)
"

if [ $? -ne 0 ]; then
    echo "❌ Instalirajte potrebne pakete:"
    echo "   pip3 install opencv-python numpy pytesseract pillow"
    exit 1
fi

# Check if Tesseract is installed
if ! command -v tesseract &> /dev/null; then
    echo "⚠️  Tesseract nije pronađen. OCR možda neće raditi."
    echo "   Instalirajte Tesseract:"
    echo "   macOS: brew install tesseract"
    echo "   Ubuntu: sudo apt-get install tesseract-ocr"
fi

# Run the test
echo ""
echo "🚀 Pokretanje OCR optimization testova..."
echo ""

# Run the test script
python3 tests/python/test_ocr_optimized.py

# Check if test was successful
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ OCR optimization testovi uspešno završeni!"
    echo ""
    echo "📊 Rezultati su sačuvani u: ocr_optimization_report.json"
    echo ""
    echo "🔍 Za detaljnu analizu pogledajte:"
    echo "   - docs/OCR_OPTIMIZATION.md"
    echo "   - tests/python/test_ocr_optimized.py"
else
    echo ""
    echo "❌ OCR optimization testovi nisu uspešno završeni."
    echo "   Proverite greške iznad."
    exit 1
fi

echo ""
echo "🎯 Ključne metrike za optimizaciju:"
echo "   - Cache Hit Rate: >80%"
echo "   - Average Processing Time: <2s"
echo "   - Accuracy Improvement: >15%"
echo ""

echo "📈 Za performance monitoring:"
echo "   curl http://localhost:8001/ocr/performance/stats"
echo ""

echo "🧹 Za cache management:"
echo "   curl http://localhost:8001/ocr/cache/stats"
echo "   curl -X DELETE http://localhost:8001/ocr/cache/clear"
echo ""

echo "✨ OCR optimization implementacija završena!" 