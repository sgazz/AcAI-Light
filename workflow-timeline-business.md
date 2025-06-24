# EduTech AI Platform - Projekt Plan

## Workflow i Timeline

### Nedelja 1: Setup i Osnovna Infrastruktura

#### Dan 1-2: Projekt Setup
- [ ] Inicijalizacija Next.js projekta
- [ ] Podešavanje Vercel deployment-a
- [ ] Postavljanje Supabase projekta
- [ ] Konfiguracija Git repozitorijuma
- [ ] Setup development environment-a

#### Dan 3-4: Autentifikacija i Baza
- [ ] Implementacija Supabase autentifikacije
- [ ] Kreiranje osnovnih tabela u bazi
- [ ] Setup pgvector za RAG
- [ ] Implementacija osnovnih API endpoint-a

#### Dan 5-7: RAG Pipeline i Image Processing
- [ ] Setup Llama 2 i Mistral lokalno
- [ ] Implementacija embedding sistema
- [ ] Kreiranje RAG pipeline-a
- [ ] Setup Tesseract OCR
- [ ] Implementacija image processing
- [ ] Testiranje osnovnih upita sa slikama

### Nedelja 2: Frontend i Core Funkcionalnosti

#### Dan 1-3: UI Komponente
- [ ] Implementacija osnovnog layout-a
- [ ] Kreiranje komponenti za:
  - Upload dokumenata i slika
  - OCR preview i image analysis
  - Prikaz rezultata
  - Q&A interfejs
  - Dashboard

#### Dan 4-7: Core Funkcionalnosti
- [ ] Implementacija upload sistema za dokumente i slike
- [ ] Integracija OCR sistema
- [ ] Integracija RAG sistema sa frontend-om
- [ ] Kreiranje sistema za praćenje napretka
- [ ] Implementacija osnovnog search-a
- [ ] Image preview sa OCR rezultatima

### Nedelja 3: Testiranje i Optimizacija

#### Dan 1-3: Testiranje
- [ ] Unit testovi
- [ ] Integration testovi
- [ ] Performance testovi
- [ ] Security testovi

#### Dan 4-7: Optimizacija
- [ ] Performance optimizacija
- [ ] UI/UX poboljšanja
- [ ] Bug fixes
- [ ] Dokumentacija

### Nedelja 4: Launch i Monitoring

#### Dan 1-3: Finalna Priprema
- [ ] Finalno testiranje
- [ ] Deployment na produkciju
- [ ] Setup monitoring sistema
- [ ] Backup strategija

#### Dan 4-7: Launch
- [ ] Soft launch
- [ ] Prikupljanje feedback-a
- [ ] Brzi fixes
- [ ] Plan za skaliranje

## Biznis Plan

### Faza 1: MVP Launch (Mesec 1-2)

#### Ciljevi
- 100 aktivnih korisnika
- 500 procesiranih dokumenata
- 1000 uspešnih upita
- Feedback od 20 korisnika

#### Metrike
- User engagement
- Query success rate
- System performance
- User feedback

### Faza 2: Rano Rast (Mesec 3-4)

#### Ciljevi
- 500 aktivnih korisnika
- Implementacija premium funkcionalnosti
- Partnerstvo sa 2-3 edukativne institucije
- 80% retention rate

#### Prioriteti
- User acquisition
- Feature development
- Performance optimization
- Community building

### Faza 3: Monetizacija (Mesec 5-6)

#### Ciljevi
- 1000 aktivnih korisnika
- 100 premium korisnika
- 2-3 enterprise klijenta
- Break-even point

#### Strategija
- Freemium model launch
- Enterprise paketi
- API monetizacija
- Partner program

### Faza 4: Skaliranje (Mesec 7-12)

#### Ciljevi
- 5000 aktivnih korisnika
- 500 premium korisnika
- 10+ enterprise klijenata
- Profitabilnost

#### Ekspanzija
- Geografska ekspanzija
- Novi vertikale
- Advanced AI features
- Enterprise solutions

## Finansijski Projekti (Godina 1)

### Prihodi
- Premium subscriptions: $50,000
- Enterprise sales: $100,000
- API usage: $25,000
- Total: $175,000

### Troškovi
- Development: $0 (open source)
- Hosting: $100-200/mesečno
- Marketing: $500-1000/mesečno
- Total: $15,000-20,000

### Break-even
- Očekivano u mesecu 8-9
- Profitabilnost u mesecu 10-11

## Ključni Uspešni Faktori
1. User engagement i retention
2. Quality of AI responses
3. System performance i skalabilnost
4. Community building
5. Enterprise adoption

## Tehnološki Stack

### Frontend
- Next.js
- Tailwind CSS
- Supabase Client

### Backend
- FastAPI
- Llama 2 + Mistral (lokalno)
- Supabase (besplatni tier)

### RAG Pipeline
- LangChain
- all-MiniLM-L6-v2 za embeddings
- Supabase pgvector za vektor bazu
- Tesseract OCR za prepoznavanje teksta
- Pillow + OpenCV za image processing

### Hosting
- Vercel (frontend)
- Railway/Render (backend)
- Supabase (database)

## Monitoring i Analytics

### Ključne Metrike
- Daily Active Users (DAU)
- Monthly Active Users (MAU)
- Retention Rate
- Query Success Rate
- System Performance Metrics
- User Feedback Score

### Alati
- Vercel Analytics
- Supabase Analytics
- Custom logging system
- User feedback collection

# Workflow i Business Procesi - AcAI Assistant

## 1. Korisnički Workflow

### 1.1 Onboarding Proces

#### 1.1.1 Prvi Pristup
```
1. Korisnik otvara aplikaciju
   ├── Učitava se landing page
   ├── Prikazuje se chat interfejs
   └── Automatski se proverava Ollama status

2. Inicijalna konfiguracija
   ├── Provera backend konekcije
   ├── Provera Supabase konekcije
   └── Prikaz statusa servisa
```

#### 1.1.2 Prvi Chat
```
1. Korisnik unosi prvu poruku
   ├── Poruka se šalje na backend
   ├── Backend proverava RAG kontekst
   └── Generiše se AI odgovor

2. Prikaz rezultata
   ├── Odgovor se prikazuje u chat-u
   ├── Prikazuju se izvori (ako postoje)
   └── Poruka se čuva u bazi
```

### 1.2 Dokument Upload Workflow

#### 1.2.1 Upload Proces
```
1. Korisnik odabira dokument
   ├── Drag & drop ili file picker
   ├── Validacija formata (PDF, DOCX, TXT)
   └── Provera veličine fajla

2. Upload na backend
   ├── Fajl se šalje na /documents/upload
   ├── Backend procesira dokument
   └── Ekstrakcija teksta po stranicama

3. RAG indeksiranje
   ├── Tekst se razbija na chunk-ove
   ├── Generišu se embedding-ovi
   └── Dodaju se u FAISS indeks

4. Čuvanje u bazu
   ├── Metapodaci se čuvaju u documents tabelu
   ├── Sadržaj stranica se čuva u document_pages
   └── Status se ažurira na "processed"
```

#### 1.2.2 Dokument Processing
```python
# document_processor.py workflow
def process_document(file: UploadFile):
    # 1. Validacija
    validate_file_type(file)
    validate_file_size(file)
    
    # 2. Ekstrakcija teksta
    if file.filename.endswith('.pdf'):
        text = extract_pdf_text(file)
    elif file.filename.endswith('.docx'):
        text = extract_docx_text(file)
    elif file.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.tiff', '.bmp')):
        # OCR za slike
        text = extract_text_with_ocr(file)
    else:
        text = extract_txt_text(file)
    
    # 3. Razbijanje na stranice
    pages = split_into_pages(text)
    
    # 4. Čuvanje u bazu
    document_id = save_document_metadata(file.filename, len(pages))
    
    for i, page_content in enumerate(pages):
        save_document_page(document_id, i+1, page_content)
    
    # 5. RAG indeksiranje
    add_to_rag_index(pages, document_id)
    
    return {"status": "success", "document_id": document_id}

# Planirana OCR integracija
def extract_text_with_ocr(file: UploadFile) -> str:
    """Ekstrakcija teksta iz slika koristeći OCR"""
    import easyocr
    from PIL import Image
    import io
    
    # Učitavanje slike
    image = Image.open(io.BytesIO(file.file.read()))
    
    # OCR processing
    reader = easyocr.Reader(['sr', 'en'])  # Serbian i English
    results = reader.readtext(image)
    
    # Kombinovanje rezultata
    text = ' '.join([result[1] for result in results])
    return text

# Planirana image recognition integracija
def analyze_image_content(file: UploadFile) -> Dict[str, Any]:
    """Analiza sadržaja slike"""
    import cv2
    from transformers import CLIPProcessor, CLIPModel
    
    # Učitavanje modela
    clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
    clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    
    # Analiza slike
    image = Image.open(io.BytesIO(file.file.read()))
    inputs = clip_processor(images=image, return_tensors="pt")
    
    return {
        "objects": detect_objects(image),
        "text": extract_text_with_ocr(file),
        "context": analyze_context(image, clip_model, clip_processor)
    }
```

### 1.3 Chat Workflow

#### 1.3.1 Poruka Processing
```
1. Korisnik šalje poruku
   ├── Frontend validacija
   ├── Prikaz loading stanja
   └── Slanje na backend

2. Backend processing
   ├── RAG pretraga relevantnog konteksta
   ├── Konstruisanje enhanced prompt-a
   └── Poziv Ollama API-ja

3. AI odgovor
   ├── Generisanje odgovora
   ├── Formatiranje sa izvorima
   └── Slanje nazad frontend-u

4. Prikaz rezultata
   ├── Markdown rendering
   ├── Syntax highlighting
   └── Prikaz izvora
```

#### 1.3.2 RAG Integration
```python
# rag_client_simple.py workflow
def get_context_for_query(query: str):
    # 1. Pretraga relevantnih dokumenata
    search_results = rag_service.search(query, k=3)
    
    # 2. Konstruisanje konteksta
    context = ""
    sources = []
    
    for result in search_results:
        context += f"Dokument: {result['document_name']}\n"
        context += f"Stranica: {result['page_number']}\n"
        context += f"Sadržaj: {result['content']}\n\n"
        
        sources.append({
            "document_name": result['document_name'],
            "page_number": result['page_number'],
            "content": result['content'][:200] + "..."
        })
    
    return {
        "context": context,
        "sources": sources
    }
```

## 2. Business Procesi

### 2.1 Dokument Management

#### 2.1.1 Lifecycle Dokumenta
```
1. Upload
   ├── Validacija formata
   ├── Provera duplikata
   └── Inicijalni status: "uploading"

2. Processing
   ├── Ekstrakcija teksta
   ├── Razbijanje na stranice
   └── Status: "processing"

3. Indexing
   ├── RAG indeksiranje
   ├── Embedding generisanje
   └── Status: "indexed"

4. Available
   ├── Dokument dostupan za pretragu
   ├── Može se koristiti u chat-u
   └── Status: "available"

5. Archive/Delete
   ├── Arhiviranje starih dokumenata
   ├── Brisanje iz indeksa
   └── Status: "archived"
```

#### 2.1.2 Duplicate Detection
```python
# Provera duplikata
@app.get("/documents/check-duplicate")
async def check_duplicate_document(filename: str):
    try:
        response = supabase.table("documents").select("id").eq("filename", filename).execute()
        return {
            "is_duplicate": len(response.data) > 0,
            "existing_document": response.data[0] if response.data else None
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### 2.2 User Management

#### 2.2.1 User Session
```
1. Anonymous Access
   ├── Osnovne funkcionalnosti
   ├── Chat bez čuvanja istorije
   └── Upload dokumenata

2. Registered User
   ├── Čuvanje istorije razgovora
   ├── Personalizovani interfejs
   └── Napredne funkcionalnosti

3. Premium User
   ├── Više dokumenata
   ├── Napredni RAG features
   └── Priority support
```

### 2.3 Analytics i Reporting

#### 2.3.1 Usage Analytics
```sql
-- Korisničke statistike
SELECT 
    DATE(created_at) as date,
    COUNT(*) as total_messages,
    COUNT(DISTINCT user_id) as unique_users,
    AVG(LENGTH(content)) as avg_message_length
FROM messages 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Dokument statistike
SELECT 
    file_type,
    COUNT(*) as total_documents,
    AVG(total_pages) as avg_pages,
    SUM(total_pages) as total_pages
FROM documents 
WHERE status = 'available'
GROUP BY file_type;
```

#### 2.3.2 Performance Metrics
```python
# Performance monitoring
import time
from functools import wraps

def measure_performance(func):
    @wraps(func)
    async def wrapper(*args, **kwargs):
        start_time = time.time()
        result = await func(*args, **kwargs)
        end_time = time.time()
        
        # Log performance metrics
        print(f"{func.__name__} took {end_time - start_time:.2f} seconds")
        return result
    return wrapper

@app.post("/chat")
@measure_performance
async def chat(message: ChatMessage):
    # Chat implementation
    pass
```

### 2.4 Planirane AI Funkcionalnosti

#### 2.4.1 OCR Processing Pipeline
```
1. Image Upload
   ├── Validacija formata slika
   ├── Provera kvaliteta slike
   └── Pre-processing (resize, enhance)

2. OCR Processing
   ├── EasyOCR/Tesseract processing
   ├── Multi-language detection
   └── Confidence scoring

3. Post-processing
   ├── Text cleaning i formatting
   ├── Layout analysis
   └── Structured data extraction

4. Integration
   ├── Dodavanje u RAG indeks
   ├── Čuvanje u bazu
   └── Search optimization
```

#### 2.4.2 Image Recognition Workflow
```
1. Image Analysis
   ├── Object detection (YOLO)
   ├── Scene understanding (CLIP)
   └── Text extraction (OCR)

2. Content Classification
   ├── Document type detection
   ├── Content categorization
   └── Relevance scoring

3. Metadata Generation
   ├── Auto-tagging
   ├── Summary generation
   └── Key information extraction

4. Enhanced Search
   ├── Visual similarity search
   ├── Content-based retrieval
   └── Cross-modal search
```

#### 2.4.3 Voice Input Integration
```
1. Audio Capture
   ├── Real-time recording
   ├── Audio preprocessing
   └── Quality enhancement

2. Speech Recognition
   ├── Whisper model processing
   ├── Language detection
   └── Accent adaptation

3. Text Processing
   ├── Punctuation restoration
   ├── Grammar correction
   └── Context understanding

4. Chat Integration
   ├── Automatic message sending
   ├── Voice feedback
   └── Conversation flow
```

#### 2.4.4 Document Annotation System
```
1. Document Viewing
   ├── PDF rendering
   ├── Zoom i pan controls
   └── Multi-page navigation

2. Annotation Tools
   ├── Text highlighting
   ├── Comment boxes
   ├── Drawing tools
   └── Shape annotations

3. Collaboration Features
   ├── Shared annotations
   ├── Comment threads
   ├── Version control
   └── Export options

4. AI-Assisted Annotation
   ├── Auto-highlighting
   ├── Smart suggestions
   ├── Content analysis
   └── Summary generation
```

## 3. Error Handling i Recovery

### 3.1 Error Scenarios

#### 3.1.1 Ollama Connection Issues
```python
# ollama_client.py
def check_connection(self) -> bool:
    try:
        response = httpx.get(f"{self.base_url}/api/tags", timeout=5.0)
        return response.status_code == 200
    except (httpx.ConnectError, httpx.TimeoutException):
        return False

async def generate_response(self, prompt: str, system_prompt: str = "") -> str:
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{self.base_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "system": system_prompt,
                    "stream": False
                }
            )
            return response.json()["response"]
    except Exception as e:
        raise Exception(f"Ollama error: {str(e)}")
```

#### 3.1.2 Document Processing Errors
```python
# Error handling u document processing
def process_document_safe(file: UploadFile):
    try:
        return process_document(file)
    except UnsupportedFormatError:
        return {"status": "error", "message": "Nepodržan format fajla"}
    except FileTooLargeError:
        return {"status": "error", "message": "Fajl je prevelik"}
    except ProcessingError:
        return {"status": "error", "message": "Greška pri procesiranju"}
    except Exception as e:
        return {"status": "error", "message": f"Neočekivana greška: {str(e)}"}
```

### 3.2 Recovery Strategies

#### 3.2.1 Automatic Retry
```python
# Retry mechanism
import asyncio
from typing import Callable, Any

async def retry_operation(
    operation: Callable,
    max_retries: int = 3,
    delay: float = 1.0
) -> Any:
    for attempt in range(max_retries):
        try:
            return await operation()
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            await asyncio.sleep(delay * (2 ** attempt))  # Exponential backoff
```

#### 3.2.2 Fallback Responses
```python
# Fallback za AI odgovore
async def chat_with_fallback(message: ChatMessage):
    try:
        # Pokušaj sa RAG
        return await chat_with_rag(message)
    except Exception as e:
        # Fallback na general AI odgovor
        return await chat_general(message)
```

## 4. Scalability Considerations

### 4.1 Horizontal Scaling

#### 4.1.1 Load Balancing
```python
# Multiple backend instances
# nginx.conf
upstream backend {
    server backend1:8001;
    server backend2:8001;
    server backend3:8001;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

#### 4.1.2 Database Scaling
```sql
-- Read replicas za Supabase
-- Konfiguracija u Supabase dashboard-u
-- Automatsko load balancing između primary i replica instanci
```

### 4.2 Caching Strategy

#### 4.2.1 RAG Caching
```python
# Redis caching za RAG rezultate
import redis
import json

redis_client = redis.Redis(host='localhost', port=6379, db=0)

def get_cached_rag_result(query: str):
    cache_key = f"rag:{hash(query)}"
    cached_result = redis_client.get(cache_key)
    
    if cached_result:
        return json.loads(cached_result)
    
    # Generate new result
    result = rag_service.search(query)
    
    # Cache for 1 hour
    redis_client.setex(cache_key, 3600, json.dumps(result))
    return result
```

#### 4.2.2 Embedding Caching
```python
# Cache pre-computed embeddings
def get_cached_embedding(text: str):
    cache_key = f"embedding:{hash(text)}"
    cached_embedding = redis_client.get(cache_key)
    
    if cached_embedding:
        return np.frombuffer(cached_embedding, dtype=np.float32)
    
    # Generate new embedding
    embedding = model.encode([text])[0]
    
    # Cache indefinitely
    redis_client.set(cache_key, embedding.tobytes())
    return embedding
```

## 5. Monitoring i Alerting

### 5.1 Health Checks

#### 5.1.1 Service Health
```python
@app.get("/health")
async def health_check():
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": check_database_health(),
            "ollama": check_ollama_health(),
            "rag_index": check_rag_health()
        }
    }
    
    # Ako bilo koji servis nije zdrav, promeni status
    if not all(health_status["services"].values()):
        health_status["status"] = "unhealthy"
    
    return health_status
```

#### 5.1.2 Performance Monitoring
```python
# Prometheus metrics
from prometheus_client import Counter, Histogram, generate_latest

# Metrics
REQUEST_COUNT = Counter('http_requests_total', 'Total HTTP requests', ['method', 'endpoint'])
REQUEST_DURATION = Histogram('http_request_duration_seconds', 'HTTP request duration')

@app.middleware("http")
async def prometheus_middleware(request: Request, call_next):
    start_time = time.time()
    
    response = await call_next(request)
    
    duration = time.time() - start_time
    REQUEST_COUNT.labels(method=request.method, endpoint=request.url.path).inc()
    REQUEST_DURATION.observe(duration)
    
    return response

@app.get("/metrics")
async def metrics():
    return Response(generate_latest(), media_type="text/plain")
```

### 5.2 Alerting

#### 5.2.1 Error Alerts
```python
# Slack alerting
import requests

def send_alert(message: str, level: str = "warning"):
    webhook_url = os.getenv("SLACK_WEBHOOK_URL")
    
    payload = {
        "text": f"[{level.upper()}] AcAI Assistant: {message}",
        "color": "danger" if level == "error" else "warning"
    }
    
    requests.post(webhook_url, json=payload)

# Usage u error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    send_alert(f"Global error: {str(exc)}", "error")
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )
```

## 6. Backup i Disaster Recovery

### 6.1 Data Backup

#### 6.1.1 Database Backup
```sql
-- Automatski backup Supabase
-- Konfigurirano u Supabase dashboard-u
-- Dnevni backup sa 7 dana retention

-- Manual backup
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### 6.1.2 RAG Index Backup
```python
# Backup FAISS indeksa
def backup_rag_index():
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = f"backups/rag_index_{timestamp}"
    
    # Backup FAISS indeks
    faiss.write_index(rag_service.index, f"{backup_path}/index.faiss")
    
    # Backup dokumenta
    with open(f"{backup_path}/documents.json", "w") as f:
        json.dump(rag_service.documents, f)
    
    # Compress backup
    import tarfile
    with tarfile.open(f"{backup_path}.tar.gz", "w:gz") as tar:
        tar.add(backup_path, arcname=os.path.basename(backup_path))
    
    return f"{backup_path}.tar.gz"
```

### 6.2 Recovery Procedures

#### 6.2.1 Database Recovery
```bash
# Restore database
psql $DATABASE_URL < backup_20250127_143022.sql

# Verify recovery
psql $DATABASE_URL -c "SELECT COUNT(*) FROM documents;"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM messages;"
```

#### 6.2.2 RAG Index Recovery
```python
# Restore RAG indeks
def restore_rag_index(backup_path: str):
    # Extract backup
    import tarfile
    with tarfile.open(backup_path, "r:gz") as tar:
        tar.extractall("temp_restore")
    
    # Restore FAISS indeks
    rag_service.index = faiss.read_index("temp_restore/index.faiss")
    
    # Restore dokumenta
    with open("temp_restore/documents.json", "r") as f:
        rag_service.documents = json.load(f)
    
    # Cleanup
    import shutil
    shutil.rmtree("temp_restore")
```

---

**Dokumentacija kreirana:** 2025-01-27  
**Verzija:** 1.0.0  
**Status:** Aktuelna