# 🖼️ Napredne OCR Funkcionalnosti - AcAIA

## 📋 Pregled

AcAIA sada podržava napredne OCR (Optical Character Recognition) funkcionalnosti za ekstrakciju teksta iz slika i integraciju u RAG sistem.

## 🚀 Implementirane Funkcionalnosti

### 1. **Modularni OCR Service**
- **Lokacija**: `backend/app/ocr_service.py`
- **Funkcionalnosti**:
  - Tesseract OCR integracija
  - Podrška za srpski i engleski jezik
  - Napredni preprocessing slika
  - Confidence scoring
  - Batch processing
  - Custom preprocessing opcije

### 2. **Napredne OCR Opcije u UI**
- **Lokacija**: `frontend/src/components/DocumentUpload.tsx`
- **Funkcionalnosti**:
  - Izbor jezika (srp, eng, srp+eng)
  - Minimalni confidence score (0-100%)
  - Preprocessing opcije:
    - Grayscale konverzija
    - Noise reduction
    - Adaptive thresholding
    - Morphological operations
    - Deskew (rotacija)
    - Image resize

### 3. **Batch Upload**
- **Funkcionalnosti**:
  - Upload više slika odjednom
  - Automatska detekcija tipa fajla
  - Razdvojen processing za slike i dokumente
  - Progres tracking

### 4. **Vizuelizacija Bounding Boxova**
- **Lokacija**: `frontend/src/components/ImagePreview.tsx`
- **Funkcionalnosti**:
  - Prikaz slike sa overlay bounding boxovima
  - Zoom in/out funkcionalnost
  - Toggle za prikaz/sakrivanje boxova
  - Bojno kodiranje prema confidence score-u
  - Tooltip sa prepoznatim tekstom

### 5. **Eksport Rezultata**
- **Podržani formati**:
  - **TXT**: Sirovi prepoznati tekst
  - **JSON**: Kompletni OCR rezultati sa metapodacima
  - **CSV**: Strukturirani podaci sa pozicijama i confidence score-ovima

## 🔧 Backend API Endpoints

### Osnovni OCR Endpoints
```bash
# OCR informacije
GET /ocr/info

# Podržani formati
GET /ocr/supported-formats

# Napredne statistike
GET /ocr/statistics

# Osnovna OCR ekstrakcija
POST /ocr/extract
```

### Napredni OCR Endpoints
```bash
# Napredna OCR ekstrakcija sa opcijama
POST /ocr/extract-advanced
Parameters:
- file: UploadFile
- min_confidence: float (default: 50.0)
- languages: str (default: "srp,eng")
- deskew: bool (default: false)
- resize: bool (default: false)

# Batch OCR ekstrakcija
POST /ocr/batch-extract
Parameters:
- files: List[UploadFile]
- languages: str (default: "srp,eng")
```

### Dokument Endpoints
```bash
# Upload dokumenta sa OCR podrškom
POST /documents/upload

# Dobavljanje sadržaja (uključujući slike)
GET /documents/{doc_id}/content
```

## 🎨 Frontend Komponente

### DocumentUpload.tsx
- **Napredne OCR opcije**: Toggle dugme za prikaz naprednih opcija
- **Batch upload**: Automatski se aktivira za više fajlova
- **OCR status**: Prikaz confidence score-a i jezika
- **Pregled slika**: Dugme za otvaranje ImagePreview modala

### ImagePreview.tsx
- **Vizuelizacija**: Canvas overlay sa bounding boxovima
- **Kontrole**: Zoom, toggle boxova, eksport
- **Eksport**: TXT, JSON, CSV formati
- **Responsive**: Prilagođava se veličini ekrana

## 📊 OCR Rezultati

### Struktura OCR rezultata
```json
{
  "status": "success",
  "text": "Prepoznati tekst...",
  "confidence": 92.48,
  "languages": ["srp", "eng"],
  "image_size": [400, 800, 3],
  "boxes": "Tesseract bounding box data",
  "preprocessing_applied": {
    "grayscale": true,
    "denoise": true,
    "adaptive_threshold": true,
    "morphology": true,
    "deskew": false,
    "resize": false
  }
}
```

### Confidence Score Interpretacija
- **90-100%**: Odličan prepoznavanje (zelena)
- **70-89%**: Dobro prepoznavanje (žuta)
- **50-69%**: Prihvatljivo prepoznavanje (narandžasta)
- **<50%**: Slabo prepoznavanje (crvena)

## 🛠️ Instalacija i Konfiguracija

### Backend Dependencies
```bash
pip install pytesseract Pillow opencv-python
```

### Tesseract Instalacija
```bash
# macOS
brew install tesseract tesseract-lang

# Linux
sudo apt-get install tesseract-ocr tesseract-ocr-srp

# Windows
# Preuzeti sa https://github.com/UB-Mannheim/tesseract/wiki
```

### Jezici
- **Srpski**: `srp`, `srp_latn`
- **Engleski**: `eng`
- **Kombinovano**: `srp+eng`

## 🧪 Testiranje

### Test Skripta
```bash
cd backend
python test_ocr.py
```

### API Testovi
```bash
# Test OCR info
curl -X GET "http://localhost:8001/ocr/info"

# Test napredne OCR
curl -X POST -F "file=@test_image.png" -F "min_confidence=80.0" \
  "http://localhost:8001/ocr/extract-advanced"
```

## 🔄 Integracija sa RAG

### Automatska Integracija
- Slike se automatski procesiraju kroz OCR
- Prepoznati tekst se dodaje u vector store
- Dostupan za pretragu kroz RAG sistem
- Metapodaci se čuvaju za referencu

### RAG Workflow
1. **Upload slike** → OCR processing
2. **Tekst ekstrakcija** → Chunking
3. **Vector embedding** → Storage
4. **RAG pretraga** → Rezultati sa izvorima

## 🎯 Korisnički Tok

### Osnovni Upload
1. Korisnik prevuče sliku u upload zonu
2. Sistem automatski detektuje da je slika
3. OCR se izvršava sa default opcijama
4. Rezultat se prikazuje sa confidence score-om

### Napredni Upload
1. Korisnik klikne "Prikaži napredne OCR opcije"
2. Podesi jezike, confidence, preprocessing
3. Upload slike sa custom opcijama
4. Rezultat sa detaljnim informacijama

### Pregled sa Bounding Boxovima
1. Klik na dugme "👁️" pored slike
2. Otvara se modal sa slikom
3. Prikazani su bounding boxovi
4. Mogućnost eksporta u različitim formatima

## 🔮 Buduće Poboljšanja

### Planirane Funkcionalnosti
- **Real-time OCR preview** pre upload-a
- **OCR model selection** (različiti Tesseract modeli)
- **Batch export** za više slika
- **OCR accuracy training** na korisničkim podacima
- **Advanced preprocessing** sa AI modelima

### Optimizacije
- **Caching** OCR rezultata
- **Parallel processing** za batch upload
- **Compression** slika pre OCR-a
- **Cloud OCR** integracija

## 📝 Napomene

- **Performance**: OCR može biti spor za velike slike
- **Accuracy**: Zavisi od kvaliteta slike i fonta
- **Memory**: Velike slike mogu zahtevati dosta memorije
- **Languages**: Dodatni jezici se mogu dodati kroz Tesseract

---

**Napredne OCR funkcionalnosti su uspešno implementirane i integrisane u AcAIA sistem!** 🎉 