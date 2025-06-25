# AcAI Assistant - Projektna Dokumentacija

## 1. Pregled Projekta

### 1.1 Opis
AcAI Assistant je napredni AI asistent za učenje koji koristi RAG (Retrieval Augmented Generation) tehnologiju za pružanje personalizovanog iskustva učenja kroz analizu dokumenata i slika. Aplikacija je razvijena kao full-stack web aplikacija sa modernim arhitekturom.

### 1.2 Glavne Funkcionalnosti
- 💬 **Chat Interfejs** - Interaktivna komunikacija sa AI asistentom
- 📚 **RAG Sistem** - Pretraga i analiza dokumenata i slika
- 🔄 **Re-ranking** - Napredno rangiranje rezultata pretrage koristeći cross-encoder modele
- 📄 **Upload Dokumenata i Slika** - Podrška za PDF, DOCX, JPG, BMP, GIF i druge formate
- 🔍 **Pretraga Dokumenata** - Semantička pretraga kroz sadržaj
- 👁️ **OCR Slika** - Prepoznavanje teksta iz slika i prepoznavanje sadržaja
- 💾 **Čuvanje Istorije** - Perzistencija razgovora i dokumenata
- 🤖 **AI Integracija** - Integracija sa Llama 2 i Mistral modelima preko Ollama

### 1.3 Arhitektura
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │   Database      │
│   (Next.js)     │◄──►│   (FastAPI)     │◄──►│   (Supabase)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React UI      │    │   RAG Service   │    │   PostgreSQL    │
│   Components    │    │   (FAISS)       │    │   + pgvector    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │
         │                       ▼
         │              ┌─────────────────┐
         └──────────────►│   Ollama        │
                        │   (AI Models)   │
                        └─────────────────┘
```

## 2. Tehnološki Stack

### 2.1 Frontend
- **Framework**: Next.js 15.3.3
- **UI Library**: React 19.0.0
- **Styling**: Tailwind CSS 4
- **Type Safety**: TypeScript 5
- **UI Components**: Material-UI (MUI) 7.1.1
- **State Management**: React Context API
- **File Upload**: React Dropzone
- **Markdown Rendering**: React Markdown
- **Syntax Highlighting**: React Syntax Highlighter
- **Animations**: Framer Motion
- **Notifications**: React Toastify

### 2.2 Backend
- **Framework**: FastAPI 0.104.1
- **Runtime**: Python 3.x
- **Server**: Uvicorn 0.24.0
- **Environment**: python-dotenv 1.0.0
- **HTTP Client**: httpx 0.26.0
- **File Processing**: python-multipart 0.0.6

### 2.3 AI i RAG
- **AI Models**: Ollama (Llama 2 + Mistral kombinacija)
- **Embeddings**: Sentence Transformers (all-MiniLM-L6-v2)
- **Re-ranking**: Cross-encoder (ms-marco-MiniLM-L-6-v2)
- **Vector Search**: FAISS 1.7.4
- **Document Processing**: PyPDF2, python-docx
- **Image Processing**: Pillow, OpenCV
- **OCR Processing**: Tesseract OCR
- **Numerical Computing**: NumPy 1.26.0

### 2.4 Baza Podataka
- **Platform**: Supabase
- **Database**: PostgreSQL
- **Vector Extension**: pgvector
- **Client**: Supabase Python Client 2.16.0

## 3. Struktura Projekta

### 3.1 Direktorijumska Struktura
```
acai-assistant/
├── ACAI_Assistant.command          # macOS desktop ikonica
├── start_servers.sh                # Skripta za pokretanje
├── README.md                       # Glavna dokumentacija
├── requirements.txt                # Root dependencies
├── docs/                           # Dokumentacija
│   ├── images/                     # Screenshot-ovi
│   ├── project_documentation.md    # Ova dokumentacija
│   ├── technologies.md             # Tehnološki detalji
│   └── workflow-timeline-business.md
└── src/
    ├── backend/                    # FastAPI backend
    │   ├── main.py                 # Glavni API endpoint
    │   ├── ollama_client.py        # Ollama integracija
    │   ├── supabase_client.py      # Supabase klijent
    │   ├── rag_client_simple.py    # RAG implementacija
    │   ├── rag/                    # RAG servisi
    │   │   ├── rag_service.py      # FAISS integracija
    │   │   ├── reranker.py         # Re-ranking funkcionalnost
    │   │   └── document_processor.py
    │   ├── data/                   # RAG indeksi
    │   │   └── rag_index/
    │   ├── supabase/               # Database schema
    │   │   └── schema.sql
    │   ├── requirements.txt        # Python dependencies
    │   └── venv/                   # Virtual environment
    └── frontend/                   # Next.js frontend
        ├── src/
        │   ├── app/                # Next.js app router
        │   ├── components/         # React komponente
        │   ├── context/            # React Context
        │   ├── lib/                # Utility funkcije
        │   └── types/              # TypeScript tipovi
        ├── public/                 # Static assets
        ├── package.json            # Node.js dependencies
        └── tsconfig.json           # TypeScript config
```

## 4. Backend Arhitektura

### 4.1 API Endpoints

#### 4.1.1 Health Check
- `GET /` - Root endpoint
- `GET /health` - Health check
- `GET /ollama/status` - Ollama status provera

#### 4.1.2 Chat Endpoints
- `GET /messages` - Dohvatanje poruka
- `POST /messages` - Čuvanje poruke
- `POST /chat` - AI chat odgovor

#### 4.1.3 Document Endpoints
- `GET /documents` - Lista dokumenata
- `POST /documents/upload` - Upload dokumenta
- `GET /documents/{id}/pages` - Stranice dokumenta
- `GET /documents/search` - Pretraga dokumenata
- `DELETE /documents/{id}` - Brisanje dokumenta
- `GET /documents/check-duplicate` - Provera duplikata

#### 4.1.4 User Endpoints
- `GET /users` - Lista korisnika

### 4.2 RAG Implementacija

#### 4.2.1 RAG Service
```python
class RAGService:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)
        self.index = None
        self.documents = []
        self.ocr_processor = TesseractOCR()
```

**Ključne funkcionalnosti:**
- **Embedding Model**: all-MiniLM-L6-v2 za generisanje vektora
- **Vector Index**: FAISS za brzu pretragu
- **Document Storage**: JSON format za metapodatke
- **Search Algorithm**: L2 distance za najbliže susede
- **OCR Processing**: Tesseract za prepoznavanje teksta iz slika
- **Image Analysis**: OpenCV za analizu vizuelnog sadržaja

#### 4.2.2 Document Processing
- **PDF Support**: PyPDF2 za ekstrakciju teksta
- **DOCX Support**: python-docx za Word dokumente
- **Image Support**: Pillow za procesiranje slika
- **OCR Support**: Tesseract za prepoznavanje teksta
- **Text Chunking**: Razbijanje na stranice
- **Metadata Extraction**: Informacije o dokumentu ili slici

### 4.3 Re-ranking Implementacija

#### 4.3.1 Re-ranking Service
```python
class Reranker:
    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model = CrossEncoder(model_name)
        self.logger = logging.getLogger(__name__)
```

**Ključne funkcionalnosti:**
- **Cross-encoder Model**: ms-marco-MiniLM-L-6-v2 za precizno rangiranje
- **Query-Document Scoring**: Direktno rangiranje parova (upit, dokument)
- **Metadata Integration**: Uključivanje metapodataka u re-ranking proces
- **Score Combination**: Kombinovanje originalnog i re-rank score-a
- **Batch Processing**: Podrška za batch re-ranking više upita
- **Fallback Mechanism**: Automatski fallback na alternativni model

#### 4.3.2 Re-ranking Algoritam
1. **Initial Retrieval**: FAISS pretraga za dohvatanje kandidata
2. **Cross-encoder Scoring**: Precizno rangiranje parova (upit, dokument)
3. **Score Combination**: 30% originalni score + 70% re-rank score
4. **Final Ranking**: Sortiranje po kombinovanom score-u
5. **Top-k Selection**: Vraćanje najboljih k rezultata

#### 4.3.3 Re-ranking API Endpoints
- `POST /search/rerank` - Test re-ranking funkcionalnosti
- `GET /rerank/info` - Informacije o re-ranker modelu
- `POST /chat/rag` - RAG chat sa re-ranking opcijom (use_rerank parameter)

### 4.4 Database Schema

#### 4.4.1 Tabele
```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);

-- Messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY,
    content TEXT NOT NULL,
    sender TEXT NOT NULL,
    timestamp TIMESTAMP,
    user_id UUID REFERENCES users(id)
);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    total_pages INTEGER NOT NULL,
    status TEXT NOT NULL,
    image_url TEXT,
    ocr_text TEXT,
    image_analysis JSONB
);

-- Document pages table
CREATE TABLE document_pages (
    id UUID PRIMARY KEY,
    document_id UUID REFERENCES documents(id),
    page_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL,
    image_url TEXT,
    ocr_text TEXT,
    image_features JSONB
);
```

#### 4.4.2 Indeksi
- `idx_users_email` - Brza pretraga po email-u
- `idx_messages_timestamp` - Sortiranje poruka
- `idx_messages_user_id` - Poruke po korisniku
- `idx_documents_filename` - Dokumenti po imenu
- `idx_document_pages_document_id` - Stranice po dokumentu
- `idx_document_pages_content` - Full-text pretraga sadržaja

## 5. Frontend Arhitektura

### 5.1 Komponente

#### 5.1.1 Core Components
- **ChatWindow.tsx** - Glavni chat interfejs
- **ChatInput.tsx** - Input za poruke
- **Sidebar.tsx** - Navigacija i dokumenti
- **DocumentUpload.tsx** - Upload interfejs za dokumente i slike
- **ImageUpload.tsx** - Specijalizovani upload za slike sa OCR preview
- **DocumentList.tsx** - Lista dokumenata i slika
- **DocumentSearch.tsx** - Pretraga dokumenata i slika
- **SearchResults.tsx** - Rezultati pretrage
- **ImagePreview.tsx** - Prikaz slika sa OCR rezultatima

#### 5.1.2 Context Management
```typescript
// ChatContext.tsx
interface ChatContextType {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
}
```

### 5.2 State Management
- **React Context API** za globalno stanje
- **Local State** za komponente
- **Supabase Client** za real-time updates

### 5.3 UI/UX Features
- **Responsive Design** - Tailwind CSS
- **Dark Mode Support** - Tema prebacivanja
- **Loading States** - Indikatori učitavanja
- **Error Handling** - Toast notifikacije
- **File Upload** - Drag & drop interfejs za dokumente i slike
- **Image Preview** - Prikaz slika sa OCR rezultatima
- **Syntax Highlighting** - Kod blokovi
- **Markdown Rendering** - Formatiranje teksta
- **ChatGPT-like Interface** - Prepoznatljiv chat interfejs
- **Image Analysis** - Vizuelni prikaz analize slika

## 6. AI Integracija

### 6.1 Ollama Client
```python
class OllamaClient:
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.models = {
            "llama2": "llama2:7b",
            "mistral": "mistral:7b"
        }
        self.current_model = "llama2"  # Default model
```

**Funkcionalnosti:**
- **Model Management** - Lista i promena između Llama 2 i Mistral
- **Response Generation** - Async generisanje odgovora
- **Connection Health** - Provera dostupnosti
- **Error Handling** - Graceful error management
- **Model Switching** - Dinamičko prebacivanje između modela

### 6.2 System Prompts
```python
system_prompt = """Ti si ACAI (Advanced Coding AI) Assistant, napredni AI asistent za učenje.

VAŽNO - DOKUMENT I SLIKA MODE:
1. Koristi informacije iz dostavljenog konteksta kao primarni izvor
2. Ako informacija nije u kontekstu, jasno kaži "Ova informacija nije dostupna u dokumentu ili slici."
3. Možeš koristiti svoje postojeće znanje SAMO za objašnjavanje koncepata
4. Odgovaraj na srpskom jeziku
5. Za slike, koristi OCR tekst i vizuelnu analizu za odgovore
"""
```

### 6.3 RAG Integration
- **Context Retrieval** - Dohvatanje relevantnog konteksta iz dokumenata i slika
- **Source Attribution** - Citiranje izvora (dokumenti i slike)
- **Hybrid Responses** - Kombinacija RAG i generativnog AI-ja
- **Image Analysis** - OCR i vizuelna analiza slika
- **Multi-modal Search** - Pretraga kroz tekst i vizuelni sadržaj

## 7. Deployment i DevOps

### 7.1 Development Setup
```bash
# Backend setup
cd src/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend setup
cd src/frontend
npm install
npm run dev
```

### 7.2 Environment Variables
```bash
# Backend (.env)
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
OLLAMA_BASE_URL=http://localhost:11434

# Frontend (.env.local)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8001
```

### 7.3 Hosting i Deployment
- **Frontend**: Vercel (besplatan tier)
- **Backend**: Railway/Render (besplatan tier)
- **Database**: Supabase (besplatan tier)
- **AI Models**: Lokalno Ollama (Llama 2 + Mistral)

### 7.4 Startup Scripts
- **start_servers.sh** - Automatsko pokretanje
- **ACAI_Assistant.command** - macOS desktop shortcut
- **Port Management** - Automatsko oslobađanje portova
- **Browser Launch** - Automatsko otvaranje aplikacije

## 8. Performance i Optimizacija

### 8.1 Frontend Optimizacije
- **Next.js 15** - App Router i Turbopack
- **Code Splitting** - Automatsko deljenje koda
- **Image Optimization** - Next.js Image komponenta
- **Bundle Analysis** - Optimizacija veličine

### 8.2 Backend Optimizacije
- **Async/Await** - Non-blocking operacije
- **Connection Pooling** - Supabase connection management
- **Caching** - FAISS indeks caching
- **Error Handling** - Graceful degradation

### 8.3 RAG Optimizacije
- **Vector Index** - FAISS za brzu pretragu
- **Chunking Strategy** - Optimalna veličina chunk-ova
- **Embedding Caching** - Pre-computed embeddings
- **Batch Processing** - Bulk document processing

## 9. Security

### 9.1 Authentication
- **Supabase Auth** - JWT token management
- **CORS Configuration** - Cross-origin security
- **API Rate Limiting** - Request throttling

### 9.2 Data Protection
- **Environment Variables** - Sensitive data protection
- **Input Validation** - Pydantic models
- **SQL Injection Prevention** - Parameterized queries
- **File Upload Security** - Type validation

### 9.3 Privacy
- **Data Encryption** - Supabase encryption
- **User Consent** - GDPR compliance
- **Data Retention** - Configurable retention policies

## 10. Monitoring i Logging

### 10.1 Application Monitoring
- **Health Checks** - `/health` endpoint
- **Error Tracking** - Exception handling
- **Performance Metrics** - Response times
- **User Analytics** - Usage patterns

### 10.2 Logging Strategy
- **Structured Logging** - JSON format
- **Log Levels** - DEBUG, INFO, WARNING, ERROR
- **Log Rotation** - File size management
- **Centralized Logging** - Supabase logging

## 11. Future Roadmap

### 11.1 Planned Features
- [ ] **User Authentication** - Login/register sistem
- [ ] **Multi-language Support** - Više jezika
- [ ] **Conversation History** - Perzistentni razgovori
- [ ] **Document Sharing** - Deljenje dokumenata
- [ ] **Response Rating** - Feedback sistem
- [ ] **Advanced RAG** - Hybrid search algorithms
- [ ] **Real-time Collaboration** - Multi-user support
- [ ] **Mobile App** - React Native aplikacija
- [x] **OCR Integration** - Prepoznavanje teksta iz slika i skeniranih dokumenata
- [x] **Image Recognition** - AI analiza slika i vizuelnog sadržaja
- [ ] **Voice Input** - Govorno prepoznavanje za unos poruka
- [ ] **Document Annotation** - Interaktivno označavanje i komentarisanje dokumenata

### 11.2 Technical Improvements
- [ ] **Microservices Architecture** - Service decomposition
- [ ] **Containerization** - Docker deployment
- [ ] **CI/CD Pipeline** - Automated deployment
- [ ] **Load Balancing** - Horizontal scaling
- [ ] **Caching Layer** - Redis integration
- [ ] **API Versioning** - Backward compatibility

## 12. Troubleshooting

### 12.1 Common Issues

#### 12.1.1 Ollama Connection
```bash
# Provera Ollama statusa
curl http://localhost:11434/api/tags

# Restart Ollama servisa
ollama serve
```

#### 12.1.2 Port Conflicts
```bash
# Provera zauzetih portova
lsof -i :3000
lsof -i :8001

# Oslobađanje portova
kill -9 <PID>
```

#### 12.1.3 Database Connection
```bash
# Provera Supabase konekcije
curl -X GET "https://your-project.supabase.co/rest/v1/" \
  -H "apikey: your-anon-key"
```

### 12.2 Debug Mode
```bash
# Backend debug
uvicorn main:app --reload --log-level debug

# Frontend debug
npm run dev -- --debug
```

## 13. Contributing Guidelines

### 13.1 Development Workflow
1. **Fork Repository** - Kreiranje fork-a
2. **Create Branch** - Feature branch naming
3. **Code Changes** - Implementacija funkcionalnosti
4. **Testing** - Unit i integration testovi
5. **Documentation** - Ažuriranje dokumentacije
6. **Pull Request** - Code review proces

### 13.2 Code Standards
- **TypeScript** - Strict mode enabled
- **ESLint** - Code quality rules
- **Prettier** - Code formatting
- **Python** - PEP 8 standards
- **Black** - Python code formatting

### 13.3 Testing Strategy
- **Unit Tests** - Jest za frontend, pytest za backend
- **Integration Tests** - API endpoint testing
- **E2E Tests** - Playwright za UI testing
- **Performance Tests** - Load testing

## 14. Licenca i Pravna Informacija

### 14.1 Licenca
- **MIT License** - Open source licenca
- **Commercial Use** - Dozvoljeno
- **Modification** - Dozvoljeno
- **Distribution** - Dozvoljeno

### 14.2 Third-party Licenses
- **Ollama** - MIT License
- **Supabase** - Apache 2.0
- **Next.js** - MIT License
- **FastAPI** - MIT License

---

**Dokumentacija kreirana:** 2025-01-27  
**Verzija:** 1.0.0  
**Autor:** AcAI Assistant Development Team  
**Status:** Aktuelna 