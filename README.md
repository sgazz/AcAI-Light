# AcAIA - AI Learning Assistant

AcAIA (Academy AI Assistant) je moderan AI asistent za učenje koji koristi RAG (Retrieval-Augmented Generation) tehnologiju za pružanje personalizovanog iskustva učenja.

## 🚀 Funkcionalnosti

- **Inteligentni Chat**: Interaktivni chat sa AI modelom (Ollama/Mistral)
- **RAG Sistem**: Napredna tehnologija za precizne i kontekstualne odgovore iz dokumenata
- **Upload Dokumenata**: Podrška za PDF, DOCX i TXT fajlove
- **Semantička Pretraga**: Brza pretraga kroz sadržaj dokumenata
- **Istorija Razgovora**: Automatsko čuvanje i upravljanje istorijom razgovora
- **Moderno UI**: Elegantan i intuitivan interfejs inspirisan popularnim AI alatima
- **SQLite Baza**: Sigurno čuvanje podataka o razgovorima

## 🛠️ Tehnologije

### Frontend
- **Next.js 14** - React framework sa App Router
- **TypeScript** - Tipizovan JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Lucide React** - Moderna ikonografija

### Backend
- **FastAPI** - Brzi Python web framework
- **SQLite** - Lagana baza podataka
- **Ollama** - Lokalni AI modeli
- **Mistral** - Napredni AI model

### RAG Sistem
- **FAISS** - Brza vector pretraga
- **Sentence Transformers** - Embedding modeli
- **PyPDF2** - PDF procesiranje
- **python-docx** - Word dokumenti
- **Vector Store** - Čuvanje embeddings-a

## 📁 Struktura Projekta

```
AcAIA/
├── frontend/          # Next.js aplikacija
│   ├── src/
│   │   ├── app/      # App Router stranice
│   │   └── components/ # React komponente
├── backend/           # FastAPI server
│   ├── app/          # API aplikacija
│   │   ├── document_processor.py  # Procesiranje dokumenata
│   │   ├── vector_store.py        # FAISS vector store
│   │   └── rag_service.py         # RAG servis
│   ├── data/         # RAG indeksi i podaci
│   └── requirements.txt
├── ACAI_Assistant.command  # Script za pokretanje
├── TestRAG.command         # Script za testiranje RAG-a
└── README.md
```

## 🚀 Pokretanje

### Preduslovi
- Node.js 18+
- Python 3.8+
- Ollama (za AI modele)

### Instalacija

1. **Klonirajte repozitorijum**
```bash
git clone https://github.com/sgazz/AcAI-Light.git
cd AcAI-Light
```

2. **Pokrenite backend**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Na Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

3. **Pokrenite frontend**
```bash
cd frontend
npm install
npm run dev
```

4. **Ili koristite komandni script**
```bash
./ACAI_Assistant.command
```

### Testiranje RAG Sistema
```bash
./TestRAG.command
```

## 🔧 Konfiguracija

### AI Modeli
Projekat koristi Ollama za lokalno izvršavanje AI modela. Instalirajte i pokrenite željeni model:

```bash
# Instalacija Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Preuzimanje modela
ollama pull mistral
ollama pull llama2
```

### Baza Podataka
SQLite baza se automatski kreira u `backend/chat_history.db`. Za resetovanje baze, jednostavno obrišite fajl.

#### Tabele
- **chat_messages** - Istorija razgovora sa AI asistentom
- **documents** - Informacije o upload-ovanim dokumentima za RAG sistem

#### Migracija Baze
```bash
cd backend
python migrate_db.py
```

### RAG Sistem
RAG sistem automatski:
- Kreira FAISS indeks u `backend/data/vector_index/`
- Učitava sentence transformer model (all-MiniLM-L6-v2)
- Procesira i čuva embeddings dokumenata
- Čuva metapodatke o dokumentima u SQL bazi

## 📚 API Endpoints

### Chat Endpoints
- `GET /` - Health check
- `POST /chat` - Običan chat sa AI modelom
- `POST /chat/rag` - RAG chat sa kontekstom iz dokumenata
- `POST /chat/new-session` - Kreiranje nove sesije
- `GET /chat/history/{session_id}` - Dohvatanje istorije sesije

### Document Endpoints
- `POST /documents/upload` - Upload dokumenata (PDF, DOCX, TXT)
- `GET /documents` - Lista svih dokumenata
- `GET /documents/{doc_id}` - Informacije o dokumentu
- `DELETE /documents/{doc_id}` - Brisanje dokumenta

### RAG Endpoints
- `GET /rag/stats` - Statistike RAG sistema
- `GET /rag/test` - Test RAG povezanosti

## 🎨 UI Komponente

- **Sidebar**: Navigacija i upravljanje sesijama
- **ChatBox**: Interaktivni chat interfejs
- **Document Upload**: Upload i upravljanje dokumentima
- **RAG Chat**: Chat sa kontekstom iz dokumenata

## 🔒 Sigurnost

- Lokalno izvršavanje AI modela
- Sigurno čuvanje podataka u SQLite bazi
- Bez eksternih API poziva
- Privatnost dokumenata

## 🧪 Testiranje

### RAG Test
```bash
./TestRAG.command
```

Test skripta proverava:
- Povezanost sa Ollama
- Upload dokumenata
- Semantičku pretragu
- RAG chat funkcionalnost
- Statistike sistema

## 🤝 Doprinosi

Doprinosi su dobrodošli! Molimo vas da:

1. Fork-ujte repozitorijum
2. Kreirajte feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit-ujte promene (`git commit -m 'Add some AmazingFeature'`)
4. Push-ujte na branch (`git push origin feature/AmazingFeature`)
5. Otvorite Pull Request

## 📄 Licenca

Ovaj projekat je licenciran pod MIT licencom - pogledajte [LICENSE](LICENSE) fajl za detalje.

## 📞 Kontakt

Stefan Gazzara - [@sgazz](https://github.com/sgazz)

Link projekta: [https://github.com/sgazz/AcAI-Light](https://github.com/sgazz/AcAI-Light)

---

⭐ Ako vam se sviđa ovaj projekat, ostavite zvezdicu! 