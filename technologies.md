# 🛠️ Tehnološki Stack - AcAIA

## 📋 Pregled

AcAIA koristi moderni tehnološki stack koji kombinuje napredne AI tehnologije, robustnu backend arhitekturu i elegantan frontend interfejs. Sistem je dizajniran za skalabilnost, performanse i korisničko iskustvo.

## 🎯 Frontend Tehnologije

### 1. **Next.js 15.3.3**
**Opis:** React framework sa App Router i Turbopack

**Ključne karakteristike:**
- **App Router** - File-based routing sistem
- **Turbopack** - Ultra-brzi bundler
- **Server Components** - Hybrid rendering
- **Streaming** - Progressive loading
- **TypeScript** - Built-in TypeScript podrška

**Implementacija:**
```typescript
// App Router struktura
src/app/
├── layout.tsx          # Root layout
├── page.tsx           # Home page
├── chat/
│   └── page.tsx       # Chat stranica
└── documents/
    └── page.tsx       # Documents stranica
```

### 2. **React 19.0.0**
**Opis:** Moderna React biblioteka sa najnovijim funkcionalnostima

**Ključne karakteristike:**
- **Concurrent Features** - Concurrent rendering
- **Suspense** - Loading states
- **Hooks** - Functional components
- **Context API** - State management

**Implementacija:**
```typescript
// Modern React hooks
const [messages, setMessages] = useState<Message[]>([]);
const [isLoading, setIsLoading] = useState(false);

// Custom hooks
const useChat = () => {
  const [chatState, setChatState] = useState(initialState);
  // Custom logic
  return { chatState, sendMessage, clearChat };
};
```

### 3. **TypeScript 5**
**Opis:** Tipizovan JavaScript za bolju developer experience

**Ključne karakteristike:**
- **Strict Mode** - Stroga tipizacija
- **Advanced Types** - Union, intersection, mapped types
- **Generic Types** - Reusable type definitions
- **Type Inference** - Automatska detekcija tipova

**Implementacija:**
```typescript
// Type definitions
interface Message {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  sessionId: string;
}

interface OCRResult {
  text: string;
  confidence: number;
  languages: string[];
  boxes: string;
  image_size: [number, number];
}

// Generic types
type ApiResponse<T> = {
  status: 'success' | 'error';
  data?: T;
  message?: string;
};
```

### 4. **Tailwind CSS 4**
**Opis:** Utility-first CSS framework

**Ključne karakteristike:**
- **Utility Classes** - Rapid development
- **Responsive Design** - Mobile-first approach
- **Dark Mode** - Built-in dark mode support
- **Customization** - Configurable design system

**Implementacija:**
```css
/* Tailwind konfiguracija */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Custom komponente */
@layer components {
  .btn-primary {
    @apply bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg;
  }
  
  .chat-message {
    @apply p-4 rounded-lg mb-4 max-w-3xl;
  }
  
  .user-message {
    @apply bg-blue-100 ml-auto;
  }
  
  .ai-message {
    @apply bg-gray-100;
  }
}
```

### 5. **Material-UI (MUI) 7.1.1**
**Opis:** React UI komponente biblioteka

**Ključne karakteristike:**
- **Design System** - Konzistentan dizajn
- **Accessibility** - WCAG compliance
- **Theming** - Customizable themes
- **Components** - Rich component library

**Implementacija:**
```typescript
import { 
  Button, 
  TextField, 
  Card, 
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent 
} from '@mui/material';

// MUI komponente
<Card>
  <CardContent>
    <TextField 
      label="Poruka" 
      variant="outlined" 
      fullWidth 
      multiline 
      rows={4}
    />
    <Button variant="contained" color="primary">
      Pošalji
    </Button>
  </CardContent>
</Card>
```

### 6. **React Dropzone**
**Opis:** File upload komponenta

**Ključne karakteristike:**
- **Drag & Drop** - Intuitivno upload
- **Multiple Files** - Batch upload
- **File Validation** - Type i size validation
- **Progress Tracking** - Upload progress

**Implementacija:**
```typescript
import { useDropzone } from 'react-dropzone';

const { getRootProps, getInputProps, isDragActive } = useDropzone({
  accept: {
    'image/*': ['.png', '.jpg', '.jpeg', '.bmp', '.tiff'],
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt']
  },
  maxSize: 10 * 1024 * 1024, // 10MB
  onDrop: handleFileDrop
});
```

## 🔧 Backend Tehnologije

### 1. **FastAPI 0.104.1**
**Opis:** Brzi Python web framework

**Ključne karakteristike:**
- **Async/Await** - Non-blocking operacije
- **Type Hints** - Built-in type validation
- **Auto Documentation** - Swagger/OpenAPI
- **High Performance** - Starlette based
- **Dependency Injection** - Clean architecture

**Implementacija:**
```python
from fastapi import FastAPI, File, UploadFile, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

app = FastAPI(title="AcAIA API", version="2.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Dependency injection
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# API endpoints
@app.post("/chat/rag-multistep")
async def multi_step_rag_chat(
    message: dict, 
    db: Session = Depends(get_db)
):
    """Multi-step RAG chat endpoint"""
    # Implementation
    pass
```

### 2. **Python 3.x**
**Opis:** Moderna Python verzija sa async podrškom

**Ključne karakteristike:**
- **Async/Await** - Asynchronous programming
- **Type Hints** - Static typing
- **Modern Syntax** - Walrus operator, f-strings
- **Rich Ecosystem** - Extensive libraries

**Implementacija:**
```python
# Modern Python features
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import asyncio

@dataclass
class OCRResult:
    text: str
    confidence: float
    languages: List[str]
    image_size: tuple[int, int, int]

async def process_image_async(image_path: str) -> OCRResult:
    """Async image processing"""
    # Async implementation
    pass
```

### 3. **Uvicorn 0.24.0**
**Opis:** ASGI server za FastAPI

**Ključne karakteristike:**
- **High Performance** - Built on uvloop
- **WebSocket Support** - Real-time communication
- **Process Management** - Multiple workers
- **Hot Reload** - Development mode

**Implementacija:**
```bash
# Development
uvicorn app.main:app --reload --port 8001

# Production
uvicorn app.main:app --host 0.0.0.0 --port 8001 --workers 4
```

## 🤖 AI i RAG Tehnologije

### 1. **Ollama**
**Opis:** Lokalni AI modeli server

**Ključne karakteristike:**
- **Local Execution** - Privacy focused
- **Multiple Models** - Llama 2, Mistral, etc.
- **REST API** - Easy integration
- **Model Management** - Easy model switching

**Implementacija:**
```python
from ollama import Client

class OllamaClient:
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.client = Client(host=base_url)
        self.models = {
            "llama2": "llama2:7b",
            "mistral": "mistral:7b"
        }
    
    async def generate_response(self, prompt: str, model: str = "mistral"):
        response = self.client.chat(
            model=model,
            messages=[{"role": "user", "content": prompt}]
        )
        return response['message']['content']
```

### 2. **Sentence Transformers**
**Opis:** Embedding modeli za tekst

**Ključne karakteristike:**
- **Pre-trained Models** - Ready to use
- **Multiple Languages** - Cross-lingual support
- **High Quality** - State-of-the-art embeddings
- **Easy Integration** - Simple API

**Implementacija:**
```python
from sentence_transformers import SentenceTransformer

class VectorStore:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)
        self.index = None
        self.documents = []
    
    def create_embeddings(self, texts: List[str]) -> np.ndarray:
        """Kreira embeddings za liste teksta"""
        return self.model.encode(texts, show_progress_bar=True)
    
    def search(self, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """Pretražuje najsličnije dokumente"""
        query_embedding = self.model.encode([query])
        scores, indices = self.index.search(query_embedding, top_k)
        return self._format_results(scores[0], indices[0])
```

### 3. **Cross-Encoder (Re-ranking)**
**Opis:** Napredni modeli za precizno rangiranje

**Ključne karakteristike:**
- **Query-Document Scoring** - Direct relevance scoring
- **High Accuracy** - Better than bi-encoders
- **Metadata Integration** - Rich context
- **Score Combination** - Hybrid ranking

**Implementacija:**
```python
from sentence_transformers import CrossEncoder

class Reranker:
    def __init__(self, model_name: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"):
        self.model = CrossEncoder(model_name)
    
    def rerank(self, query: str, documents: List[Dict[str, Any]], top_k: int = 5):
        """Re-rankuje dokumente na osnovu upita"""
        # Pripremi parove (query, document)
        pairs = [(query, doc['content']) for doc in documents]
        
        # Izračunaj scores
        scores = self.model.predict(pairs)
        
        # Kombinuj sa originalnim scores
        for i, doc in enumerate(documents):
            doc['rerank_score'] = float(scores[i])
            doc['combined_score'] = 0.3 * doc.get('score', 0) + 0.7 * scores[i]
        
        # Sortiraj po kombinovanom score-u
        documents.sort(key=lambda x: x['combined_score'], reverse=True)
        return documents[:top_k]
```

### 4. **FAISS (Facebook AI Similarity Search)**
**Opis:** Brza vector pretraga biblioteka

**Ključne karakteristike:**
- **High Performance** - Optimized for speed
- **Multiple Index Types** - Different algorithms
- **GPU Support** - CUDA acceleration
- **Scalability** - Handles large datasets

**Implementacija:**
```python
import faiss
import numpy as np

class VectorStore:
    def __init__(self, dimension: int = 384):
        # Kreiraj FAISS indeks
        self.index = faiss.IndexFlatL2(dimension)
        self.dimension = dimension
    
    def add_documents(self, embeddings: np.ndarray):
        """Dodaje embeddings u indeks"""
        self.index.add(embeddings.astype('float32'))
    
    def search(self, query_embedding: np.ndarray, top_k: int = 5):
        """Pretražuje najsličnije vektore"""
        scores, indices = self.index.search(
            query_embedding.astype('float32'), 
            top_k
        )
        return scores[0], indices[0]
    
    def save_index(self, path: str):
        """Čuva indeks na disk"""
        faiss.write_index(self.index, path)
    
    def load_index(self, path: str):
        """Učitava indeks sa diska"""
        self.index = faiss.read_index(path)
```

## 🔍 Multi-Step Retrieval

### 1. **Complex Query Detection**
**Opis:** Automatska detekcija složenih upita

**Implementacija:**
```python
class MultiStepRetrieval:
    def __init__(self):
        self.complex_query_indicators = [
            "uporedi", "razlika", "sličnost", "kako", "zašto", "kada", "gde",
            "i", "ili", "ali", "takođe", "pored", "uz",
            "prvo", "drugo", "treće", "nakon", "pre", "tokom"
        ]
    
    def is_complex_query(self, query: str) -> bool:
        """Proverava da li je upit složen"""
        query_lower = query.lower()
        
        # Proveri dužinu upita
        if len(query.split()) > 8:
            return True
        
        # Proveri ključne reči
        for indicator in self.complex_query_indicators:
            if indicator in query_lower:
                return True
        
        # Proveri broj pitanja
        if query.count("?") > 1:
            return True
        
        return False
```

### 2. **Query Decomposition**
**Opis:** Razbijanje složenih upita na jednostavnije delove

**Implementacija:**
```python
def decompose_query(self, query: str) -> List[str]:
    """Razbija složeni upit na jednostavnije delove"""
    sub_queries = []
    
    # Razbijanje po pitanjima
    if "?" in query:
        parts = re.split(r"\?+", query)
        for part in parts:
            part = part.strip()
            if part and len(part) > 3:
                sub_queries.append(part + "?")
    else:
        # Razbijanje po konjunkcijama
        conjunctions = [" i ", " ili ", " ali ", " takođe ", " pored ", " uz "]
        current_query = query
        
        for conj in conjunctions:
            if conj in current_query:
                parts = current_query.split(conj)
                for part in parts:
                    part = part.strip()
                    if part and len(part) > 3:
                        sub_queries.append(part)
                break
    
    return sub_queries if sub_queries else [query]
```

### 3. **Iterative Search**
**Opis:** Iterativna pretraga sa proširenjem konteksta

**Implementacija:**
```python
def iterative_search(self, query: str, max_iterations: int = 3, top_k: int = 5):
    """Iterativna pretraga sa proširenjem konteksta"""
    all_results = []
    current_query = query
    
    for iteration in range(max_iterations):
        # Pretraži sa trenutnim upitom
        results = self.vector_store.search(current_query, top_k * 2)
        
        if not results:
            break
        
        # Dodaj rezultate
        all_results.extend(results)
        
        # Proširi upit na osnovu pronađenih rezultata
        if iteration < max_iterations - 1:
            current_query = self._expand_query(query, results)
    
    # Ukloni duplikate i vrati najbolje rezultate
    unique_results = self._remove_duplicates(all_results)
    return unique_results[:top_k]
```

## 👁️ OCR i Image Processing

### 1. **Tesseract OCR**
**Opis:** Open source OCR engine

**Ključne karakteristike:**
- **Multi-language** - 100+ jezika
- **High Accuracy** - State-of-the-art results
- **Customizable** - Configurable parameters
- **Bounding Boxes** - Text position detection

**Implementacija:**
```python
import pytesseract
from PIL import Image
import cv2
import numpy as np

class OCRService:
    def __init__(self, tesseract_path: Optional[str] = None):
        if tesseract_path:
            pytesseract.pytesseract.tesseract_cmd = tesseract_path
        
        self.supported_formats = ['.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.tif']
        self.supported_languages = ['srp', 'eng', 'srp+eng']
    
    def extract_text(self, image_path: str, languages: List[str] = None) -> Dict[str, Any]:
        """Ekstraktuje tekst iz slike"""
        # Učitaj sliku
        image = cv2.imread(image_path)
        if image is None:
            return {"status": "error", "message": "Nije moguće učitati sliku"}
        
        # Preprocessing
        processed_image = self._preprocess_image(image)
        
        # Postavi jezike
        if languages is None:
            languages = ['srp', 'eng']
        lang_string = '+'.join(languages)
        
        # OCR ekstrakcija
        text = pytesseract.image_to_string(processed_image, lang=lang_string)
        confidence = self._get_confidence(processed_image, lang_string)
        boxes = pytesseract.image_to_boxes(processed_image, lang=lang_string)
        
        return {
            'status': 'success',
            'text': text.strip(),
            'confidence': confidence,
            'languages': languages,
            'image_size': image.shape,
            'boxes': boxes
        }
```

### 2. **OpenCV**
**Opis:** Napredna obrada slika biblioteka

**Ključne karakteristike:**
- **Image Processing** - Comprehensive tools
- **Computer Vision** - Advanced algorithms
- **Performance** - Optimized C++ backend
- **Cross-platform** - Multiple OS support

**Implementacija:**
```python
def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
    """Preprocessing slike za bolji OCR"""
    # Konvertuj u grayscale
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    
    # Noise reduction
    denoised = cv2.medianBlur(gray, 3)
    
    # Adaptive thresholding
    thresh = cv2.adaptiveThreshold(
        denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
    )
    
    # Morphological operations
    kernel = np.ones((1, 1), np.uint8)
    cleaned = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel)
    
    return cleaned

def _deskew_image(self, image: np.ndarray) -> np.ndarray:
    """Rotira sliku da ispravi nagnutost teksta"""
    # Detektuj ugao rotacije
    coords = np.column_stack(np.where(image > 0))
    angle = cv2.minAreaRect(coords)[-1]
    
    # Ako je ugao manji od -45, rotiraj za 90 stepeni
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    
    # Rotiraj sliku
    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    M = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(image, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    
    return rotated
```

### 3. **Pillow (PIL)**
**Opis:** Python Imaging Library

**Ključne karakteristike:**
- **Image Manipulation** - Basic operations
- **Format Support** - Multiple image formats
- **Easy API** - Simple interface
- **Wide Usage** - Industry standard

**Implementacija:**
```python
from PIL import Image, ImageEnhance

def enhance_image(image_path: str) -> Image.Image:
    """Poboljšava kvalitet slike za OCR"""
    # Učitaj sliku
    image = Image.open(image_path)
    
    # Povećaj kontrast
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(1.5)
    
    # Povećaj oštrinu
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(1.2)
    
    return image
```

## 🗄️ Baza Podataka

### 1. **Supabase**
**Opis:** Open source Firebase alternativa

**Ključne karakteristike:**
- **PostgreSQL** - Relational database
- **Real-time** - Live updates
- **Auth** - Built-in authentication
- **Storage** - File storage
- **Edge Functions** - Serverless functions

**Implementacija:**
```python
from supabase import create_client, Client

class SupabaseClient:
    def __init__(self):
        self.supabase: Client = create_client(
            os.getenv("SUPABASE_URL"),
            os.getenv("SUPABASE_SERVICE_KEY")
        )
    
    async def save_message(self, message: dict):
        """Čuva poruku u bazu"""
        result = self.supabase.table('messages').insert(message).execute()
        return result.data
    
    async def get_messages(self, session_id: str):
        """Dohvata poruke za sesiju"""
        result = self.supabase.table('messages')\
            .select('*')\
            .eq('session_id', session_id)\
            .order('timestamp')\
            .execute()
        return result.data
```

### 2. **PostgreSQL**
**Opis:** Napredna relacijska baza podataka

**Ključne karakteristike:**
- **ACID Compliance** - Transaction safety
- **JSON Support** - Native JSONB
- **Extensions** - pgvector, etc.
- **Performance** - High performance
- **Scalability** - Horizontal scaling

**Implementacija:**
```sql
-- Tabele
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'ai')),
    session_id TEXT NOT NULL,
    timestamp TIMESTAMP DEFAULT NOW()
);

CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    total_pages INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploaded',
    file_size INTEGER,
    chunks_count INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indeksi
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);
CREATE INDEX idx_documents_filename ON documents(filename);
```

### 3. **pgvector**
**Opis:** Vector extension za PostgreSQL

**Ključne karakteristike:**
- **Vector Storage** - Efficient vector storage
- **Similarity Search** - Fast similarity queries
- **Multiple Algorithms** - Different distance metrics
- **Integration** - Native PostgreSQL integration

**Implementacija:**
```sql
-- Omogući pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Kreiraj tabelu sa vector kolonom
CREATE TABLE document_embeddings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID REFERENCES documents(id),
    page_number INTEGER,
    content TEXT,
    embedding vector(384),  -- 384-dimenzionalni embedding
    created_at TIMESTAMP DEFAULT NOW()
);

-- Kreiraj indeks za brzu pretragu
CREATE INDEX ON document_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Pretraga najsličnijih vektora
SELECT content, embedding <=> '[0.1, 0.2, ...]'::vector as distance
FROM document_embeddings
ORDER BY embedding <=> '[0.1, 0.2, ...]'::vector
LIMIT 5;
```

## 🔧 Development Tools

### 1. **ESLint**
**Opis:** JavaScript/TypeScript linting

**Konfiguracija:**
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'next/core-web-vitals',
    '@typescript-eslint/recommended'
  ],
  rules: {
    '@typescript-eslint/no-unused-vars': 'error',
    '@typescript-eslint/explicit-function-return-type': 'warn'
  }
};
```

### 2. **Prettier**
**Opis:** Code formatting

**Konfiguracija:**
```json
// .prettierrc
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "printWidth": 80,
  "tabWidth": 2
}
```

### 3. **Black**
**Opis:** Python code formatter

**Konfiguracija:**
```toml
# pyproject.toml
[tool.black]
line-length = 88
target-version = ['py39']
include = '\.pyi?$'
extend-exclude = '''
/(
  # directories
  \.eggs
  | \.git
  | \.hg
  | \.mypy_cache
  | \.tox
  | \.venv
  | build
  | dist
)/
'''
```

## 🚀 Deployment

### 1. **Vercel**
**Opis:** Frontend hosting platform

**Ključne karakteristike:**
- **Next.js Optimized** - Built for Next.js
- **Edge Functions** - Serverless functions
- **CDN** - Global content delivery
- **Analytics** - Built-in analytics

### 2. **Railway/Render**
**Opis:** Backend hosting platform

**Ključne karakteristike:**
- **Python Support** - Native Python support
- **PostgreSQL** - Managed database
- **Auto-deploy** - Git integration
- **Scaling** - Automatic scaling

### 3. **Docker**
**Opis:** Containerization platform

**Implementacija:**
```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
```

## 📊 Performance Metrics

### 1. **Frontend Performance**
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **First Input Delay**: < 100ms

### 2. **Backend Performance**
- **API Response Time**: < 200ms
- **RAG Search Time**: < 500ms
- **OCR Processing Time**: < 5s per image
- **Concurrent Users**: 100+

### 3. **AI Model Performance**
- **Ollama Response Time**: < 3s
- **Embedding Generation**: < 100ms per document
- **Re-ranking Time**: < 200ms per query
- **Multi-step Retrieval**: < 1s per complex query

## 🔒 Security

### 1. **Authentication**
- **JWT Tokens** - Secure token-based auth
- **CORS Configuration** - Cross-origin security
- **Rate Limiting** - API abuse prevention

### 2. **Data Protection**
- **Environment Variables** - Sensitive data protection
- **Input Validation** - Pydantic models
- **SQL Injection Prevention** - Parameterized queries
- **File Upload Security** - Type validation

### 3. **Privacy**
- **Local AI Models** - No data sent to external APIs
- **Data Encryption** - Supabase encryption
- **User Consent** - GDPR compliance
- **Data Retention** - Configurable policies

---

**Tehnološki stack je pažljivo odabran za optimalne performanse, skalabilnost i korisničko iskustvo!** 🚀