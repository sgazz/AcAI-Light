# 🧪 AcAIA Test Suite

## 📋 Pregled

Ovaj direktorijum sadrži sve test fajlove za AcAIA aplikaciju, organizovane u logične kategorije za lakše testiranje i održavanje.

## 📁 Struktura

```
tests/
├── scripts/                    # Shell skripte za testiranje
├── python/                     # Python test skripte
├── data/                       # Test podaci
│   ├── documents/             # Test dokumenti
│   ├── images/                # Test slike
│   └── results/               # Test rezultati
├── logs/                       # Test logovi
└── README.md                   # Ova dokumentacija
```

## 🚀 Pokretanje Testova

### **Shell Skripte (macOS/Linux)**
```bash
# RAG testiranje
./tests/scripts/TestRAG.command

# OCR testiranje
./tests/scripts/TestOCR.command

# WebSocket testiranje
./tests/scripts/TestWebSocket.command

# Error handling testiranje
./tests/scripts/TestErrorHandling.command

# Fact checker testiranje
./tests/scripts/TestFactChecker.command

# Query rewriter testiranje
./tests/scripts/TestQueryRewriter.command

# Performance testiranje
./tests/scripts/TestAsyncPerformance.command

# Frontend integracija
./tests/scripts/TestFrontendIntegration.command

# File handling testiranje
./tests/scripts/TestFileHandling.command

# Re-ranking testiranje
./tests/scripts/TestRerank.command

# Ollama testiranje
./tests/scripts/TestOllama.command

# Chat history testiranje
./tests/scripts/ChatHistory.command
```

### **Python Skripte**
```bash
cd backend

# RAG funkcionalnost
python ../tests/python/test_rag.py

# OCR funkcionalnost
python ../tests/python/test_ocr.py

# WebSocket funkcionalnost
python ../tests/python/test_websocket.py

# Error handling
python ../tests/python/test_error_handling.py

# Fact checker
python ../tests/python/test_fact_checker.py

# Query rewriter
python ../tests/python/test_query_rewriter.py

# Performance testiranje
python ../tests/python/test_async_performance.py

# Frontend integracija
python ../tests/python/test_frontend_integration.py

# Cache funkcionalnost
python ../tests/python/test_cache.py

# Context selector
python ../tests/python/test_context_selector.py

# Supabase integracija
python ../tests/python/test_supabase.py

# Multi-step retrieval
python ../tests/python/test_multistep.py

# Re-ranking funkcionalnost
python ../tests/python/test_rerank.py

# Ollama integracija
python ../tests/python/test_ollama.py
```

## 📊 Test Podaci

### **Dokumenti**
- `test_document.txt` - Glavni test dokument
- `test_rag_doc.txt` - RAG test dokument
- `test_rag_new.txt` - Novi RAG test dokument

### **Slike**
- `test_image.png` - Glavna test slika
- `test_image_2.png` - Dodatna test slika
- `test_ocr_image_processed.png` - OCR procesirana slika

### **Rezultati**
- `async_performance_test_*.json` - Performance test rezultati
- `error_handling_test_*.json` - Error handling test rezultati
- `fact_checker_test_*.json` - Fact checker test rezultati
- `frontend_integration_test_*.json` - Frontend integracija rezultati
- `query_rewriter_test_*.json` - Query rewriter test rezultati

## 📝 Test Logovi

- `test_query_rewriter_run.log` - Query rewriter test log
- `test_query_rewriter.log` - Query rewriter log
- `backend.log` - Backend log
- `frontend.log` - Frontend log

## 🎯 Test Kategorije

### **1. Core Functionality**
- **RAG Testiranje** - Retrieval-Augmented Generation
- **OCR Testiranje** - Optical Character Recognition
- **WebSocket Testiranje** - Real-time komunikacija

### **2. AI Features**
- **Fact Checker** - Provera tačnosti odgovora
- **Query Rewriter** - Poboljšanje upita
- **Context Selector** - Izbor relevantnog konteksta
- **Re-ranking** - Precizno rangiranje rezultata

### **3. Performance**
- **Async Performance** - Asinhrono procesiranje
- **Cache Testiranje** - Redis caching
- **Memory Management** - Upravljanje memorijom

### **4. Integration**
- **Frontend Integration** - Frontend-backend integracija
- **Supabase Integration** - Database integracija
- **Ollama Integration** - AI model integracija

### **5. Error Handling**
- **Error Handling** - Rukovanje greškama
- **Error Handling Integration** - Integrisano rukovanje greškama

### **6. File Handling**
- **File Handling** - Upload, preview, download
- **Multi-step Retrieval** - Napredni retrieval

## 🔧 Konfiguracija

### **Prerequisites**
```bash
# Backend dependencies
cd backend
pip install -r requirements.txt

# Frontend dependencies
cd frontend
npm install

# Redis (za caching)
brew install redis  # macOS
# sudo apt-get install redis-server  # Ubuntu
```

### **Environment Variables**
```bash
# Backend (.env)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
OLLAMA_BASE_URL=http://localhost:11434
REDIS_URL=redis://localhost:6379

# Frontend (.env.local)
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 📈 Test Rezultati

### **Performance Metrike**
- **Response Time**: < 1 sekunda
- **Cache Hit Rate**: > 80%
- **Memory Usage**: < 500MB
- **Concurrent Users**: > 100

### **Success Criteria**
- **Test Pass Rate**: 100%
- **Coverage**: > 85%
- **Error Rate**: < 1%

## 🚨 Troubleshooting

### **Common Issues**
1. **Redis Connection Error** - Proverite da li je Redis pokrenut
2. **Ollama Connection Error** - Proverite da li je Ollama pokrenut
3. **Supabase Connection Error** - Proverite environment variables
4. **Port Conflicts** - Proverite da li su portovi 8001 i 3000 slobodni

### **Debug Mode**
```bash
# Backend debug
cd backend
uvicorn app.main:app --reload --port 8001 --log-level debug

# Frontend debug
cd frontend
npm run dev
```

## 📋 Test Checklist

### **Pre Testiranja**
- [ ] Backend server pokrenut (port 8001)
- [ ] Frontend server pokrenut (port 3000)
- [ ] Redis server pokrenut
- [ ] Ollama server pokrenut
- [ ] Environment variables postavljeni

### **Nakon Testiranja**
- [ ] Svi testovi prošli
- [ ] Logovi pregledani
- [ ] Rezultati sačuvani
- [ ] Performance metrike proverene

## 🤝 Doprinos

### **Dodavanje Novih Testova**
1. Kreirajte test fajl u odgovarajućem direktorijumu
2. Dodajte dokumentaciju u ovaj README
3. Testirajte na različitim environment-ima
4. Commit-ujte izmene

### **Test Standards**
- **Naming**: `test_<feature>.py` ili `Test<Feature>.command`
- **Documentation**: Dodajte docstring i komentare
- **Error Handling**: Testirajte edge cases
- **Performance**: Merite response times

---

*Test Suite kreiran: ${new Date().toLocaleDateString('sr-RS')}*
*Status: Organizovano i dokumentovano* 