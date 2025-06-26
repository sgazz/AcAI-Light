# AcAI Assistant - Projektna Dokumentacija

## 1. Pregled Projekta

### 1.1 Opis
AcAI Assistant je napredni AI asistent za učenje koji koristi RAG (Retrieval Augmented Generation) tehnologiju za pružanje personalizovanog iskustva učenja kroz analizu dokumenata i slika. Aplikacija je razvijena kao full-stack web aplikacija sa modernom arhitekturom.

### 1.2 Glavne Funkcionalnosti
- 💬 **Chat Interfejs** - Interaktivna komunikacija sa AI asistentom
- 🔍 **Multi-Step RAG Sistem** - Napredna pretraga za složene upite sa razbijanjem na sub-queries
- 🔄 **Napredni Re-ranking** - Cross-encoder modeli za precizno rangiranje rezultata
- 📄 **Upload Dokumenata i Slika** - Podrška za PDF, DOCX, JPG, BMP, GIF i druge formate
- 👁️ **OCR Integracija** - Prepoznavanje teksta iz slika i skeniranih dokumenata
- 🖼️ **Image Processing** - AI analiza slika i vizuelnog sadržaja
- 🔍 **Semantička Pretraga** - Brza pretraga kroz sadržaj dokumenata i slika
- 💾 **Čuvanje Istorije** - Perzistencija razgovora i dokumenata
- 🤖 **AI Integracija** - Integracija sa Llama 2 i Mistral modelima preko Ollama
- 📊 **Napredna Analitika** - Query analytics i performance metrics

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
                                │
                                ▼
                        ┌─────────────────┐
                        │   Tesseract     │
                        │   (OCR Engine)  │
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

### 2.5 OCR i Image Processing
- **OCR Engine**: Tesseract OCR
- **Image Processing**: OpenCV, Pillow
- **Language Support**: Serbian (srp), English (eng)
- **Image Formats**: PNG, JPG, JPEG, BMP, TIFF, TIF
- **Preprocessing**: Grayscale, Noise reduction, Adaptive thresholding

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
│   ├── OCR_FEATURES.md             # OCR funkcionalnosti
│   └── workflow-timeline-business.md
└── src/
    ├── backend/                    # FastAPI backend
    │   ├── app/
    │   │   ├── main.py                 # Glavni API endpoint
    │   │   ├── rag_service.py          # RAG servis
    │   │   ├── multi_step_retrieval.py # Multi-step retrieval
    │   │   ├── reranker.py             # Re-ranking funkcionalnost
    │   │   ├── ocr_service.py          # OCR servis
    │   │   ├── vector_store.py         # FAISS integracija
    │   │   ├── document_processor.py   # Obrada dokumenata
    │   │   ├── models.py               # SQLAlchemy modeli
    │   │   └── prompts.py              # AI promptovi
    │   ├── data/                   # RAG indeksi
    │   │   └── vector_index/
    │   ├── debug/                   # Debug fajlovi
    │   ├── requirements.txt        # Python dependencies
    │   └── venv/                   # Virtual environment
    └── frontend/                   # Next.js frontend
        ├── src/
        │   ├── app/                # Next.js app router
        │   ├── components/         # React komponente
        │   │   ├── ChatBox.tsx         # Chat interfejs
        │   │   ├── DocumentUpload.tsx  # Upload komponenta
        │   │   ├── ImagePreview.tsx    # OCR preview
        │   │   ├── SourcesDisplay.tsx  # Prikaz izvora
        │   │   └── Sidebar.tsx         # Navigacija
        │   ├── hooks/              # React hooks
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
- `POST /chat/rag` - RAG chat sa kontekstom
- `POST /chat/rag-multistep` - Multi-step RAG chat

#### 4.1.3 Document Endpoints
- `GET /documents` - Lista dokumenata
- `POST /documents/upload` - Upload dokumenta
- `GET /documents/{id}/pages` - Stranice dokumenta
- `GET /documents/search` - Pretraga dokumenata
- `DELETE /documents/{id}` - Brisanje dokumenta
- `GET /documents/check-duplicate` - Provera duplikata

#### 4.1.4 RAG Endpoints
- `POST /search/rerank` - Test re-ranking funkcionalnosti
- `GET /rerank/info` - Informacije o re-ranker modelu
- `POST /search/multistep` - Multi-step retrieval test
- `GET /multistep/info` - Multi-step retrieval informacije

#### 4.1.5 OCR Endpoints
- `GET /ocr/info` - OCR servis informacije
- `GET /ocr/supported-formats` - Podržani formati
- `GET /ocr/statistics` - OCR statistike
- `POST /ocr/extract` - Osnovna OCR ekstrakcija
- `POST /ocr/extract-advanced` - Napredna OCR sa opcijama
- `POST /ocr/batch-extract` - Batch OCR ekstrakcija

### 4.2 Multi-Step Retrieval Implementacija

#### 4.2.1 Multi-Step Retrieval Service
```python
class MultiStepRetrieval:
    def __init__(self, vector_store: VectorStore, reranker: Reranker):
        self.vector_store = vector_store
        self.reranker = reranker
        self.complex_query_indicators = [
            "uporedi", "razlika", "sličnost", "kako", "zašto", "kada", "gde"
        ]
```

**Ključne funkcionalnosti:**
- **Complex Query Detection** - Automatska detekcija složenih upita
- **Query Decomposition** - Razbijanje na sub-queries
- **Concept Extraction** - Ekstrakcija ključnih koncepata
- **Iterative Search** - Iterativna pretraga sa proširenjem
- **Query Expansion** - Proširenje upita na osnovu rezultata
- **Duplicate Removal** - Uklanjanje duplikata iz rezultata

#### 4.2.2 Multi-Step Algoritam
1. **Complexity Analysis** - Analiza složenosti upita
2. **Query Decomposition** - Razbijanje na jednostavnije delove
3. **Concept Extraction** - Ekstrakcija ključnih koncepata
4. **Expanded Search** - Pretraga sa proširenim upitom
5. **Iterative Refinement** - Iterativno proširenje konteksta
6. **Result Aggregation** - Kombinovanje rezultata iz svih koraka
7. **Re-ranking** - Finalno rangiranje rezultata

#### 4.2.3 Multi-Step API Endpoints
- `POST /chat/rag-multistep` - Multi-step RAG chat
- `POST /search/multistep` - Test multi-step retrieval
- `GET /multistep/info` - Informacije o multi-step sistemu

### 4.3 OCR Implementacija

#### 4.3.1 OCR Service
```python
class OCRService:
    def __init__(self, tesseract_path: Optional[str] = None):
        self.supported_formats = ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif']
        self.supported_languages = ['srp', 'eng', 'srp+eng']
```

**Ključne funkcionalnosti:**
- **Multi-language Support** - Podrška za srpski i engleski jezik
- **Image Preprocessing** - Napredna obrada slika za bolji OCR
- **Confidence Scoring** - Scoring pouzdanosti prepoznavanja
- **Batch Processing** - Obrada više slika odjednom
- **Custom Preprocessing** - Opcije za custom preprocessing
- **Bounding Box Detection** - Detekcija pozicija teksta

#### 4.3.2 OCR Preprocessing Pipeline
1. **Grayscale Conversion** - Konverzija u grayscale
2. **Noise Reduction** - Uklanjanje šuma
3. **Adaptive Thresholding** - Adaptivno pražnjenje
4. **Morphological Operations** - Morfološke operacije
5. **Deskew** - Ispravljanje nagnutosti (opciono)
6. **Image Resize** - Promena veličine (opciono)

#### 4.3.3 OCR API Endpoints
- `GET /ocr/info` - Informacije o OCR servisu
- `POST /ocr/extract` - Osnovna OCR ekstrakcija
- `POST /ocr/extract-advanced` - Napredna OCR sa opcijama
- `POST /ocr/batch-extract` - Batch OCR ekstrakcija

### 4.4 Re-ranking Implementacija

#### 4.4.1 Re-ranking Service
```python
class Reranker:
    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model = CrossEncoder(model_name)
        self.logger = logging.getLogger(__name__)
```

**Ključne funkcionalnosti:**
- **Cross-encoder Model** - ms-marco-MiniLM-L-6-v2 za precizno rangiranje
- **Query-Document Scoring** - Direktno rangiranje parova (upit, dokument)
- **Metadata Integration** - Uključivanje metapodataka u re-ranking proces
- **Score Combination** - Kombinovanje originalnog i re-rank score-a
- **Batch Processing** - Podrška za batch re-ranking više upita
- **Fallback Mechanism** - Automatski fallback na alternativni model

#### 4.4.2 Re-ranking Algoritam
1. **Initial Retrieval** - FAISS pretraga za dohvatanje kandidata
2. **Cross-encoder Scoring** - Precizno rangiranje parova (upit, dokument)
3. **Score Combination** - 30% originalni score + 70% re-rank score
4. **Final Ranking** - Sortiranje po kombinovanom score-u
5. **Top-k Selection** - Vraćanje najboljih k rezultata

#### 4.4.3 Re-ranking API Endpoints
- `POST /search/rerank` - Test re-ranking funkcionalnosti
- `GET /rerank/info` - Informacije o re-ranker modelu
- `POST /chat/rag` - RAG chat sa re-ranking opcijom (use_rerank parameter)

### 4.5 Database Schema

#### 4.5.1 Tabele
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

#### 4.5.2 Indeksi
- `idx_users_email` - Brza pretraga po email-u
- `idx_messages_timestamp` - Sortiranje poruka
- `idx_messages_user_id` - Poruke po korisniku
- `idx_documents_filename` - Dokumenti po imenu
- `idx_document_pages_document_id` - Stranice po dokumentu
- `idx_document_pages_content` - Full-text pretraga sadržaja

## 5. Frontend Arhitektura

### 5.1 Komponente

#### 5.1.1 Core Components
- **ChatBox.tsx** - Glavni chat interfejs
- **ChatInput.tsx** - Input za poruke
- **Sidebar.tsx** - Navigacija i dokumenti
- **DocumentUpload.tsx** - Upload interfejs za dokumente i slike
- **ImagePreview.tsx** - Prikaz slika sa OCR rezultatima
- **DocumentList.tsx** - Lista dokumenata i slika
- **DocumentSearch.tsx** - Pretraga dokumenata i slika
- **SearchResults.tsx** - Rezultati pretrage
- **SourcesDisplay.tsx** - Prikaz izvora za RAG odgovore

#### 5.1.2 OCR Components
- **ImagePreview.tsx** - Napredni prikaz slika sa bounding boxovima
- **OCRResults.tsx** - Prikaz OCR rezultata
- **BoundingBoxOverlay.tsx** - Overlay za bounding boxove
- **OCRExport.tsx** - Eksport OCR rezultata

#### 5.1.3 Context Management
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
- **Bounding Box Visualization** - Vizuelizacija OCR rezultata
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

### 6.4 Multi-Step RAG
- **Complex Query Handling** - Automatska detekcija složenih upita
- **Query Decomposition** - Razbijanje na sub-queries
- **Iterative Search** - Iterativna pretraga sa proširenjem
- **Result Aggregation** - Kombinovanje rezultata iz više koraka
- **Enhanced Context** - Bogatiji kontekst za AI odgovore

## 7. Deployment i DevOps

### 7.1 Development Setup
```bash
# Backend setup
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Frontend setup
cd frontend
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

### 8.4 Multi-Step Optimizacije
- **Query Complexity Analysis** - Brza detekcija složenosti
- **Parallel Processing** - Paralelna obrada sub-queries
- **Result Deduplication** - Efikasno uklanjanje duplikata
- **Early Termination** - Rano zaustavljanje za jednostavne upite

### 8.5 OCR Optimizacije
- **Image Preprocessing** - Optimizovana obrada slika
- **Batch Processing** - Paralelna obrada više slika
- **Confidence Filtering** - Filtriranje po pouzdanosti
- **Caching** - Cache-ovanje OCR rezultata

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

### 10.3 Performance Monitoring
- **Query Analytics** - Analiza složenosti upita
- **Multi-step Metrics** - Statistike multi-step retrieval
- **OCR Performance** - OCR accuracy i speed metrics
- **Re-ranking Metrics** - Re-ranking effectiveness

## 11. Future Roadmap

### 11.1 Implementirane Funkcionalnosti ✅
- [x] **OCR Integration** - Prepoznavanje teksta iz slika i skeniranih dokumenata
- [x] **Image Recognition** - AI analiza slika i vizuelnog sadržaja
- [x] **Multi-Step Retrieval** - Napredna pretraga za složene upite
- [x] **Advanced Re-ranking** - Cross-encoder modeli za precizno rangiranje
- [x] **Supabase Integration** - PostgreSQL baza sa pgvector
- [x] **Image Processing** - Napredna obrada slika
- [x] **Bounding Box Visualization** - Vizuelizacija OCR rezultata
- [x] **Batch OCR Processing** - Paralelna obrada više slika
- [x] **Query Analytics** - Analiza složenosti upita

### 11.2 Planned Features
- [ ] **User Authentication** - Login/register sistem
- [ ] **Multi-language Support** - Više jezika
- [ ] **Conversation History** - Perzistentni razgovori
- [ ] **Document Sharing** - Deljenje dokumenata
- [ ] **Response Rating** - Feedback sistem
- [ ] **Real-time Collaboration** - Multi-user support
- [ ] **Mobile App** - React Native aplikacija
- [ ] **Voice Input** - Govorno prepoznavanje za unos poruka
- [ ] **Document Annotation** - Interaktivno označavanje i komentarisanje dokumenata
- [ ] **Advanced Image Analysis** - Detekcija objekata i scena
- [ ] **Video Processing** - OCR i analiza video sadržaja
- [ ] **Audio Transcription** - Prepoznavanje govora iz audio fajlova

### 11.3 Technical Improvements
- [ ] **Microservices Architecture** - Service decomposition
- [ ] **Containerization** - Docker deployment
- [ ] **CI/CD Pipeline** - Automated deployment
- [ ] **Load Balancing** - Horizontal scaling
- [ ] **Caching Layer** - Redis integration
- [ ] **API Versioning** - Backward compatibility
- [ ] **GraphQL API** - Flexible data querying
- [ ] **WebSocket Support** - Real-time communication
- [ ] **Progressive Web App** - Offline functionality

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

#### 12.1.4 OCR Issues
```bash
# Provera Tesseract instalacije
tesseract --version

# Provera jezika
tesseract --list-langs

# Instalacija srpskog jezika
sudo apt-get install tesseract-ocr-srp  # Ubuntu/Debian
brew install tesseract-lang  # macOS
```

#### 12.1.5 Multi-Step Retrieval Issues
```bash
# Test multi-step retrieval
curl -X POST "http://localhost:8001/search/multistep" \
  -H "Content-Type: application/json" \
  -d '{"query": "Uporedi mašinsko učenje i deep learning"}'
```

### 12.2 Debug Mode
```bash
# Backend debug
uvicorn main:app --reload --log-level debug

# Frontend debug
npm run dev -- --debug
```

### 12.3 Performance Debugging
```bash
# Test RAG performance
python test_rag.py

# Test OCR performance
python test_ocr.py

# Test multi-step retrieval
python test_multistep.py
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
- **OCR Tests** - OCR accuracy testing
- **Multi-step Tests** - Multi-step retrieval testing

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
- **Tesseract OCR** - Apache 2.0
- **OpenCV** - Apache 2.0

---

**Dokumentacija kreirana:** 2025-01-27  
**Verzija:** 2.0.0  
**Autor:** AcAI Assistant Development Team  
**Status:** Aktuelna sa svim implementiranim funkcionalnostima 