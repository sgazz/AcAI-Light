# 🧪 Organizacija Test Fajlova - AcAIA

## 📊 Trenutno Stanje Analiza

### **🔍 Identifikovani Test Fajlovi:**

#### **Root Directory:**
```
Test*.command (12 fajlova) - Shell skripte za testiranje
test_*.py (1 fajl) - Python test skripte
test_*.txt (2 fajlova) - Test dokumenti
test_*.png (1 fajl) - Test slike
test_*.json (1 fajl) - Test rezultati
test_*.log (3 fajlova) - Test logovi
```

#### **Backend Directory:**
```
test_*.py (12 fajlova) - Python test skripte
test_*.json (6 fajlova) - Test rezultati
test_*.txt (2 fajlova) - Test dokumenti
test_*.png (1 fajl) - Test slike
test_*.log (3 fajlova) - Test logovi
```

#### **Debug Directory:**
```
test_*.png (1 fajl) - Debug slike
```

---

## 🎯 Predlozi za Organizaciju

### **Opcija 1: Kreiranje `tests/` Direktorijuma** ✅ **PREPORUČENO**

#### **Struktura:**
```
tests/
├── scripts/                    # Shell skripte za testiranje
│   ├── TestRAG.command
│   ├── TestOCR.command
│   ├── TestWebSocket.command
│   ├── TestErrorHandling.command
│   ├── TestFactChecker.command
│   ├── TestQueryRewriter.command
│   ├── TestAsyncPerformance.command
│   ├── TestFrontendIntegration.command
│   ├── TestFileHandling.command
│   ├── TestRerank.command
│   ├── TestOllama.command
│   └── ChatHistory.command
├── python/                     # Python test skripte
│   ├── test_rag.py
│   ├── test_ocr.py
│   ├── test_websocket.py
│   ├── test_error_handling.py
│   ├── test_fact_checker.py
│   ├── test_query_rewriter.py
│   ├── test_async_performance.py
│   ├── test_frontend_integration.py
│   ├── test_cache.py
│   ├── test_context_selector.py
│   ├── test_supabase.py
│   ├── test_multistep.py
│   ├── test_rerank.py
│   └── test_ollama.py
├── data/                       # Test podaci
│   ├── documents/
│   │   ├── test_document.txt
│   │   ├── test_rag_doc.txt
│   │   └── test_rag_new.txt
│   ├── images/
│   │   ├── test_image.png
│   │   ├── test_image_2.png
│   │   └── test_ocr_image_processed.png
│   └── results/                # Test rezultati
│       ├── async_performance_test_20250626_213351.json
│       ├── error_handling_test_20250626_215936.json
│       ├── error_handling_test_20250626_220006.json
│       ├── error_handling_test_20250626_220050.json
│       ├── fact_checker_test_20250626_231014.json
│       ├── frontend_integration_test_20250626_233932.json
│       └── query_rewriter_test_20250626_230213.json
├── logs/                       # Test logovi
│   ├── test_query_rewriter_run.log
│   ├── test_query_rewriter.log
│   └── fact_checker_test_run.log
└── README.md                   # Test dokumentacija
```

### **Opcija 2: Zadržavanje Trenutne Strukture sa Cleanup-om**

#### **Prednosti:**
- Manje izmena u postojećem kodu
- Lakše pronalaženje test fajlova
- Bolja organizacija

#### **Nedostaci:**
- Više fajlova za premeštanje
- Potrebno ažuriranje putanja

---

## 🗂️ Detaljna Analiza Fajlova

### **📁 Shell Skripte (.command) - 12 fajlova**
```
✅ TestRAG.command - RAG testiranje
✅ TestOCR.command - OCR testiranje
✅ TestWebSocket.command - WebSocket testiranje
✅ TestErrorHandling.command - Error handling testiranje
✅ TestFactChecker.command - Fact checker testiranje
✅ TestQueryRewriter.command - Query rewriter testiranje
✅ TestAsyncPerformance.command - Performance testiranje
✅ TestFrontendIntegration.command - Frontend integracija
✅ TestFileHandling.command - File handling testiranje
✅ TestRerank.command - Re-ranking testiranje
✅ TestOllama.command - Ollama testiranje
✅ ChatHistory.command - Chat history testiranje
```

### **🐍 Python Test Skripte (.py) - 13 fajlova**
```
✅ test_rag.py - RAG funkcionalnost
✅ test_ocr.py - OCR funkcionalnost
✅ test_websocket.py - WebSocket funkcionalnost
✅ test_error_handling.py - Error handling
✅ test_fact_checker.py - Fact checker
✅ test_query_rewriter.py - Query rewriter
✅ test_async_performance.py - Performance testiranje
✅ test_frontend_integration.py - Frontend integracija
✅ test_cache.py - Cache funkcionalnost
✅ test_context_selector.py - Context selector
✅ test_supabase.py - Supabase integracija
✅ test_multistep.py - Multi-step retrieval
✅ test_rerank.py - Re-ranking funkcionalnost
✅ test_ollama.py - Ollama integracija
```

### **📄 Test Dokumenti (.txt) - 4 fajlova**
```
✅ test_document.txt - Glavni test dokument
✅ test_rag_doc.txt - RAG test dokument
✅ test_rag_new.txt - Novi RAG test dokument
✅ test_image.txt - Test image metadata
```

### **🖼️ Test Slike (.png) - 3 fajlova**
```
✅ test_image.png - Glavna test slika
✅ test_image_2.png - Dodatna test slika
✅ test_ocr_image_processed.png - OCR procesirana slika
```

### **📊 Test Rezultati (.json) - 7 fajlova**
```
✅ async_performance_test_20250626_213351.json
✅ error_handling_test_20250626_215936.json
✅ error_handling_test_20250626_220006.json
✅ error_handling_test_20250626_220050.json
✅ fact_checker_test_20250626_231014.json
✅ frontend_integration_test_20250626_233932.json
✅ query_rewriter_test_20250626_230213.json
```

### **📝 Test Logovi (.log) - 6 fajlova**
```
✅ test_query_rewriter_run.log
✅ test_query_rewriter.log
✅ fact_checker_test_run.log
✅ backend.log
✅ frontend.log
```

---

## 🗑️ Fajlovi za Brisanje

### **❌ Može se obrisati:**
```
❌ .DS_Store (macOS sistem fajl)
❌ backend.log (može se regenerisati)
❌ frontend.log (može se regenerisati)
❌ fact_checker_test_run.log (prazan fajl)
❌ test_image.txt (samo metadata)
```

### **⚠️ Može se prebaciti u tests/:**
```
⚠️ Svi Test*.command fajlovi
⚠️ Svi test_*.py fajlovi
⚠️ Svi test_*.json fajlovi
⚠️ Svi test_*.txt fajlovi (osim test_image.txt)
⚠️ Svi test_*.png fajlovi
⚠️ Svi test_*.log fajlovi
```

---

## 🚀 Implementacioni Plan

### **Faza 1: Kreiranje Strukture**
```bash
mkdir -p tests/{scripts,python,data/{documents,images,results},logs}
```

### **Faza 2: Premeštanje Fajlova**
```bash
# Shell skripte
mv Test*.command tests/scripts/

# Python skripte
mv backend/test_*.py tests/python/

# Test podaci
mv test_*.txt tests/data/documents/
mv test_*.png tests/data/images/
mv backend/test_*.png tests/data/images/

# Test rezultati
mv *.json tests/data/results/
mv backend/*.json tests/data/results/

# Test logovi
mv *.log tests/logs/
mv backend/*.log tests/logs/
```

### **Faza 3: Ažuriranje Putanja**
- Ažuriranje putanja u shell skriptama
- Ažuriranje import putanja u Python skriptama
- Ažuriranje dokumentacije

### **Faza 4: Kreiranje Test README**
- Dokumentacija za sve testove
- Instrukcije za pokretanje
- Opis test rezultata

---

## 📋 Prednosti Reorganizacije

### **✅ Organizacija:**
- **Jasna struktura** test fajlova
- **Lakše pronalaženje** specifičnih testova
- **Bolja održivost** koda

### **✅ Čistoća:**
- **Čistiji root directory**
- **Organizovani backend**
- **Separacija** test i produkcijskog koda

### **✅ Dokumentacija:**
- **Centralizovana test dokumentacija**
- **Jasne instrukcije** za pokretanje
- **Opis test rezultata**

---

## 🎯 Preporučeni Koraci

### **1. Kreiranje `tests/` Direktorijuma** ✅
- Organizovati sve test fajlove
- Kreirati jasnu strukturu
- Dodati dokumentaciju

### **2. Brisanje Nepotrebnih Fajlova** ✅
- Obrisati sistem fajlove (.DS_Store)
- Obrisati prazne log fajlove
- Obrisati privremene fajlove

### **3. Ažuriranje Dokumentacije** ✅
- Ažurirati putanje u dokumentaciji
- Dodati instrukcije za testiranje
- Kreirati test README

### **4. Git Organizacija** ✅
- Commit-ovati izmene
- Ažurirati .gitignore
- Kreirati tag za test organizaciju

---

*Plan kreiran: ${new Date().toLocaleDateString('sr-RS')}*
*Status: Spreman za implementaciju* 