# Tehnologije - AcAI Assistant

## 1. Frontend Tehnologije

### 1.1 Next.js 15.3.3
**Opis:** React framework za produkciju sa ugrađenim optimizacijama

**Ključne karakteristike:**
- **App Router** - Novi routing sistem
- **Server Components** - Server-side rendering
- **Turbopack** - Brži bundler od Webpack-a
- **Image Optimization** - Automatska optimizacija slika
- **TypeScript Support** - Prva klasa TypeScript podrška

**Korišćenje u projektu:**
```typescript
// app/layout.tsx
export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="sr">
      <body>{children}</body>
    </html>
  )
}
```

### 1.2 React 19.0.0
**Opis:** Biblioteka za kreiranje korisničkih interfejsa

**Ključne karakteristike:**
- **Hooks** - useState, useEffect, useContext
- **Concurrent Features** - React 18+ features
- **Server Components** - Hybrid rendering
- **Automatic Batching** - Performance optimizacija

**Korišćenje u projektu:**
```typescript
// ChatContext.tsx
const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Context implementation
};
```

### 1.3 TypeScript 5
**Opis:** Typed superset JavaScript-a

**Ključne karakteristike:**
- **Static Typing** - Compile-time type checking
- **Interface Definitions** - Contract-based development
- **Generic Types** - Reusable type definitions
- **Advanced Types** - Union, intersection, mapped types

**Korišćenje u projektu:**
```typescript
// types/chat.ts
export interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string;
}

export interface Document {
  id: string;
  filename: string;
  file_type: string;
  total_pages: number;
  status: string;
  created_at?: string;
}
```

### 1.4 Tailwind CSS 4
**Opis:** Utility-first CSS framework

**Ključne karakteristike:**
- **Utility Classes** - Rapid UI development
- **Responsive Design** - Mobile-first approach
- **Dark Mode** - Built-in dark mode support
- **Customization** - Configurable design system

**Korišćenje u projektu:**
```typescript
// ChatWindow.tsx
<div className="flex flex-col h-full bg-white dark:bg-gray-900">
  <div className="flex-1 overflow-y-auto p-4 space-y-4">
    {messages.map((message) => (
      <div key={message.id} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          message.sender === 'user' 
            ? 'bg-blue-500 text-white' 
            : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white'
        }`}>
          {message.content}
        </div>
      </div>
    ))}
  </div>
</div>
```

### 1.5 Material-UI (MUI) 7.1.1
**Opis:** React UI component library

**Ključne karakteristike:**
- **Design System** - Consistent UI components
- **Theme Support** - Customizable theming
- **Accessibility** - WCAG compliance
- **Icon Library** - Comprehensive icon set

**Korišćenje u projektu:**
```typescript
// DocumentUpload.tsx
import { Button, CircularProgress, Typography } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

<Button
  variant="contained"
  component="label"
  startIcon={<CloudUpload />}
  disabled={isUploading}
>
  {isUploading ? <CircularProgress size={20} /> : 'Upload Dokument'}
</Button>
```

### 1.6 React Dropzone 14.3.8
**Opis:** Drag & drop file upload komponenta

**Ključne karakteristike:**
- **Drag & Drop** - Intuitive file upload
- **File Validation** - Type and size validation
- **Progress Tracking** - Upload progress
- **Multiple Files** - Batch upload support

**Korišćenje u projektu:**
```typescript
// DocumentUpload.tsx
const { getRootProps, getInputProps, isDragActive } = useDropzone({
  accept: {
    'application/pdf': ['.pdf'],
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    'text/plain': ['.txt']
  },
  onDrop: handleFileDrop
});
```

### 1.7 React Markdown 10.1.0
**Opis:** Markdown renderer za React

**Ključne karakteristike:**
- **Markdown Support** - Full markdown syntax
- **Custom Components** - Extensible rendering
- **Syntax Highlighting** - Code block support
- **Security** - XSS protection

**Korišćenje u projektu:**
```typescript
// ChatWindow.tsx
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';

<ReactMarkdown
  components={{
    code({ node, inline, className, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          language={match[1]}
          PreTag="div"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      );
    }
  }}
>
  {message.content}
</ReactMarkdown>
```

## 2. Backend Tehnologije

### 2.1 FastAPI 0.104.1
**Opis:** Modern, fast web framework za Python

**Ključne karakteristike:**
- **High Performance** - Async/await support
- **Automatic Documentation** - OpenAPI/Swagger
- **Type Hints** - Pydantic model validation
- **Dependency Injection** - Clean architecture

**Korišćenje u projektu:**
```python
# main.py
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="AcAI Assistant API")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/chat", response_model=ChatResponse)
async def chat(message: ChatMessage):
    try:
        # AI processing logic
        response = await ollama_client.generate_response(
            prompt=enhanced_prompt,
            system_prompt=system_prompt
        )
        return ChatResponse(response=response, sources=sources)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### 2.2 Uvicorn 0.24.0
**Opis:** Lightning-fast ASGI server

**Ključne karakteristike:**
- **ASGI Support** - Async server gateway interface
- **WebSocket Support** - Real-time communication
- **Hot Reload** - Development convenience
- **Production Ready** - High performance

**Korišćenje u projektu:**
```bash
# Development
uvicorn main:app --reload --port 8001

# Production
uvicorn main:app --host 0.0.0.0 --port 8001 --workers 4
```

### 2.3 Pydantic
**Opis:** Data validation using Python type annotations

**Ključne karakteristike:**
- **Type Validation** - Runtime type checking
- **Data Serialization** - JSON conversion
- **Model Generation** - Automatic model creation
- **Error Handling** - Detailed validation errors

**Korišćenje u projektu:**
```python
# main.py
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class ChatMessage(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str
    sources: Optional[List[Dict[str, Any]]] = None

class MessageIn(BaseModel):
    content: str
    sender: str  # 'user' ili 'assistant'
    timestamp: Optional[str] = None

class Document(BaseModel):
    id: str
    filename: str
    file_type: str
    total_pages: int
    status: str
    created_at: Optional[str] = None
```

### 2.3 AI i RAG
- **AI Models**: Ollama (Llama 2 + Mistral kombinacija)
- **Embeddings**: Sentence Transformers (all-MiniLM-L6-v2)
- **Vector Search**: FAISS 1.7.4
- **Document Processing**: PyPDF2, python-docx
- **Image Processing**: Pillow, OpenCV
- **OCR Processing**: Tesseract OCR
- **Numerical Computing**: NumPy 1.26.0

## 3. AI i Machine Learning

### 3.1 Ollama - AI Models
**Opis:** Lokalni AI model server za pokretanje open-source modela

**Korišćeni modeli:**
- **Llama 2 7B** - Osnovni model za opšte upite
- **Mistral 7B** - Napredni model za kompleksnije zadatke
- **Model Switching** - Dinamičko prebacivanje između modela

**Korišćenje u projektu:**
```python
# ollama_client.py
class OllamaClient:
    def __init__(self, base_url: str = "http://localhost:11434"):
        self.base_url = base_url
        self.models = {
            "llama2": "llama2:7b",
            "mistral": "mistral:7b"
        }
        self.current_model = "llama2"
    
    async def switch_model(self, model_name: str):
        if model_name in self.models:
            self.current_model = model_name
            return True
        return False
```

### 3.2 Tesseract OCR
**Opis:** Open-source OCR engine za prepoznavanje teksta iz slika

**Ključne karakteristike:**
- **Multi-language Support** - Podrška za više jezika
- **High Accuracy** - Napredni algoritmi za prepoznavanje
- **Image Preprocessing** - Automatska optimizacija slika
- **Text Extraction** - Strukturirani izlaz

**Korišćenje u projektu:**
```python
# ocr_processor.py
import pytesseract
from PIL import Image
import cv2

class TesseractOCR:
    def __init__(self):
        self.config = '--oem 3 --psm 6'
    
    def extract_text(self, image_path: str) -> str:
        # Preprocessing
        image = cv2.imread(image_path)
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # OCR processing
        text = pytesseract.image_to_string(gray, config=self.config)
        return text
    
    def extract_text_with_confidence(self, image_path: str) -> dict:
        data = pytesseract.image_to_data(image_path, config=self.config, output_type=pytesseract.Output.DICT)
        return data
```

### 3.3 Image Processing
**Opis:** Biblioteke za procesiranje i analizu slika

**Pillow (PIL):**
```python
# image_processor.py
from PIL import Image, ImageEnhance, ImageFilter

class ImageProcessor:
    def enhance_image(self, image_path: str) -> Image:
        image = Image.open(image_path)
        
        # Enhance contrast
        enhancer = ImageEnhance.Contrast(image)
        enhanced = enhancer.enhance(1.5)
        
        # Sharpen
        sharpened = enhanced.filter(ImageFilter.SHARPEN)
        return sharpened
```

**OpenCV:**
```python
# image_analyzer.py
import cv2
import numpy as np

class ImageAnalyzer:
    def analyze_image(self, image_path: str) -> dict:
        image = cv2.imread(image_path)
        
        # Basic analysis
        height, width = image.shape[:2]
        channels = image.shape[2] if len(image.shape) > 2 else 1
        
        # Color analysis
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
        avg_color = np.mean(hsv, axis=(0, 1))
        
        return {
            "dimensions": {"width": width, "height": height},
            "channels": channels,
            "average_color": avg_color.tolist()
        }
```

### 3.4 Sentence Transformers
**Opis:** State-of-the-art sentence embeddings

**Ključne karakteristike:**
- **Pre-trained Models** - Ready-to-use embeddings
- **Multiple Languages** - Cross-lingual support
- **Semantic Search** - Meaning-based retrieval
- **Easy Integration** - Simple API

**Korišćenje u projektu:**
```python
# rag_service.py
from sentence_transformers import SentenceTransformer
import numpy as np

class RAGService:
    def __init__(self, model_name: str = "all-MiniLM-L6-v2"):
        self.model = SentenceTransformer(model_name)
        self.index = None
        self.documents = []
    
    def add_documents(self, documents: List[Dict[str, Any]]):
        texts = [doc["content"] for doc in documents]
        embeddings = self.model.encode(texts)
        
        if self.index.ntotal == 0:
            self.index.add(embeddings)
        else:
            self.index.add(embeddings)
        
        self.documents.extend(documents)
    
    def search(self, query: str, k: int = 3) -> List[Dict[str, Any]]:
        query_embedding = self.model.encode([query])
        distances, indices = self.index.search(query_embedding, k)
        
        results = []
        for idx in indices[0]:
            if idx < len(self.documents):
                results.append(self.documents[idx])
        
        return results
```

### 3.5 FAISS 1.7.4
**Opis:** Library for efficient similarity search

**Ključne karakteristike:**
- **Vector Search** - High-dimensional similarity
- **Multiple Index Types** - Different search strategies
- **GPU Support** - Accelerated search
- **Memory Efficient** - Optimized storage

**Korišćenje u projektu:**
```python
# rag_service.py
import faiss

class RAGService:
    def initialize_index(self):
        """Inicijalizuje FAISS indeks za brzu pretragu"""
        dimension = self.model.get_sentence_embedding_dimension()
        self.index = faiss.IndexFlatL2(dimension)
    
    def save_index(self, path: str):
        """Čuva indeks i dokumente na disk"""
        if not os.path.exists(path):
            os.makedirs(path)
        
        faiss.write_index(self.index, os.path.join(path, "index.faiss"))
        with open(os.path.join(path, "documents.json"), "w") as f:
            json.dump(self.documents, f)
    
    def load_index(self, path: str):
        """Učitava indeks i dokumente sa diska"""
        self.index = faiss.read_index(os.path.join(path, "index.faiss"))
        with open(os.path.join(path, "documents.json"), "r") as f:
            self.documents = json.load(f)
```

### 3.6 Planirane AI Tehnologije

#### 3.6.1 OCR (Optical Character Recognition)
**Opis:** Prepoznavanje teksta iz slika i skeniranih dokumenata

**Planirane tehnologije:**
- **Tesseract OCR** - Open source OCR engine
- **EasyOCR** - Deep learning based OCR
- **PaddleOCR** - High accuracy OCR solution
- **Azure Computer Vision** - Cloud OCR service

**Implementacija:**
```python
# Planirana OCR integracija
import easyocr
from PIL import Image

class OCRService:
    def __init__(self):
        self.reader = easyocr.Reader(['sr', 'en'])  # Serbian i English
    
    def extract_text_from_image(self, image_path: str) -> str:
        """Ekstrakcija teksta iz slike"""
        results = self.reader.readtext(image_path)
        text = ' '.join([result[1] for result in results])
        return text
    
    def extract_text_from_pdf_images(self, pdf_path: str) -> List[str]:
        """Ekstrakcija teksta iz PDF slika"""
        # Konvertovanje PDF stranica u slike
        # OCR na svakoj slici
        # Vraćanje lista teksta po stranicama
        pass
```

#### 3.6.2 Image Recognition
**Opis:** AI analiza slika i vizuelnog sadržaja

**Planirane tehnologije:**
- **OpenCV** - Computer vision library
- **YOLO** - Object detection
- **CLIP** - Vision-language model
- **DALL-E** - Image generation

**Implementacija:**
```python
# Planirana image recognition integracija
import cv2
from transformers import CLIPProcessor, CLIPModel

class ImageRecognitionService:
    def __init__(self):
        self.clip_model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
        self.clip_processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")
    
    def analyze_image_content(self, image_path: str) -> Dict[str, Any]:
        """Analiza sadržaja slike"""
        image = Image.open(image_path)
        inputs = self.clip_processor(images=image, return_tensors="pt")
        
        # Analiza objekata, teksta, konteksta
        return {
            "objects": self.detect_objects(image),
            "text": self.extract_text(image),
            "context": self.analyze_context(image)
        }
    
    def detect_objects(self, image) -> List[str]:
        """Detekcija objekata u slici"""
        # YOLO implementacija
        pass
    
    def analyze_context(self, image) -> str:
        """Analiza konteksta slike"""
        # CLIP based context analysis
        pass
```

#### 3.6.3 Voice Recognition
**Opis:** Govorno prepoznavanje za unos poruka

**Planirane tehnologije:**
- **Whisper** - OpenAI speech recognition
- **SpeechRecognition** - Python speech recognition
- **Web Speech API** - Browser-based speech recognition

**Implementacija:**
```python
# Planirana voice recognition integracija
import whisper
import speech_recognition as sr

class VoiceRecognitionService:
    def __init__(self):
        self.whisper_model = whisper.load_model("base")
        self.recognizer = sr.Recognizer()
    
    def transcribe_audio(self, audio_file: str) -> str:
        """Transkripcija audio fajla"""
        result = self.whisper_model.transcribe(audio_file)
        return result["text"]
    
    def real_time_speech_to_text(self) -> str:
        """Real-time govorno prepoznavanje"""
        with sr.Microphone() as source:
            audio = self.recognizer.listen(source)
            try:
                text = self.recognizer.recognize_google(audio, language="sr-RS")
                return text
            except sr.UnknownValueError:
                return "Nije moguće prepoznati govor"
```

#### 3.6.4 Document Annotation
**Opis:** Interaktivno označavanje i komentarisanje dokumenata

**Planirane tehnologije:**
- **PDF.js** - PDF rendering i annotation
- **Fabric.js** - Canvas-based annotation
- **React-PDF** - PDF viewer sa annotation support

**Implementacija:**
```typescript
// Planirana document annotation integracija
interface Annotation {
  id: string;
  type: 'highlight' | 'comment' | 'drawing';
  page: number;
  coordinates: { x: number; y: number; width: number; height: number };
  content: string;
  color: string;
  created_at: string;
}

class DocumentAnnotationService {
  addHighlight(page: number, coordinates: any, color: string): Annotation {
    // Dodavanje highlight-a
  }
  
  addComment(page: number, coordinates: any, content: string): Annotation {
    // Dodavanje komentara
  }
  
  saveAnnotations(documentId: string, annotations: Annotation[]): void {
    // Čuvanje annotation-a u bazu
  }
}
```

## 4. Baza Podataka

### 4.1 Supabase
**Opis:** Open source Firebase alternative

**Ključne karakteristike:**
- **PostgreSQL** - Full SQL database
- **Real-time** - Live data updates
- **Auth** - Built-in authentication
- **Storage** - File storage
- **Edge Functions** - Serverless functions

**Korišćenje u projektu:**
```python
# supabase_client.py
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_KEY")
supabase: Client = create_client(url, key)

# Database operations
def get_messages():
    response = supabase.table("messages").select("*").order("timestamp", desc=False).execute()
    return response.data

def save_message(message_data):
    response = supabase.table("messages").insert(message_data).execute()
    return response.data[0]
```

### 4.2 PostgreSQL
**Opis:** Advanced open source database

**Ključne karakteristike:**
- **ACID Compliance** - Transaction safety
- **JSON Support** - Native JSONB type
- **Full-text Search** - Text search capabilities
- **Extensions** - pgvector for vectors

**Schema u projektu:**
```sql
-- Users table
CREATE TABLE users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Messages table
CREATE TABLE messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Documents table
CREATE TABLE documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    total_pages INTEGER NOT NULL,
    status TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Document pages table
CREATE TABLE document_pages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    page_number INTEGER NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);
```

## 5. Development Tools

### 5.1 TypeScript 5
**Opis:** Typed JavaScript

**Konfiguracija:**
```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "es6"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ],
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### 5.2 ESLint
**Opis:** JavaScript linting utility

**Konfiguracija:**
```javascript
// eslint.config.mjs
import { dirname } from "path"
import { fileURLToPath } from "url"
import { FlatCompat } from "@eslint/eslintrc"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const compat = new FlatCompat({
  baseDirectory: __dirname,
})

const eslintConfig = [
  ...compat.extends("next/core-web-vitals"),
]

export default eslintConfig
```

### 5.3 Tailwind CSS
**Opis:** Utility-first CSS framework

**Konfiguracija:**
```javascript
// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
```

## 6. Performance Optimizacije

### 6.1 Frontend Optimizacije
- **Code Splitting** - Dynamic imports
- **Image Optimization** - Next.js Image component
- **Bundle Analysis** - Webpack bundle analyzer
- **Caching** - Browser caching strategies

### 6.2 Backend Optimizacije
- **Async/Await** - Non-blocking operations
- **Connection Pooling** - Database connection management
- **Caching** - In-memory caching
- **Compression** - Gzip compression

### 6.3 RAG Optimizacije
- **Vector Index** - FAISS for fast search
- **Chunking Strategy** - Optimal chunk sizes
- **Embedding Caching** - Pre-computed embeddings
- **Batch Processing** - Bulk operations

## 7. Security

### 7.1 Authentication
- **JWT Tokens** - Secure token-based auth
- **CORS Configuration** - Cross-origin security
- **Rate Limiting** - Request throttling
- **Input Validation** - Pydantic models

### 7.2 Data Protection
- **Environment Variables** - Sensitive data protection
- **SQL Injection Prevention** - Parameterized queries
- **File Upload Security** - Type validation
- **HTTPS** - Encrypted communication

## 8. Monitoring i Logging

### 8.1 Application Monitoring
- **Health Checks** - `/health` endpoint
- **Error Tracking** - Exception handling
- **Performance Metrics** - Response times
- **User Analytics** - Usage patterns

### 8.2 Logging Strategy
- **Structured Logging** - JSON format
- **Log Levels** - DEBUG, INFO, WARNING, ERROR
- **Log Rotation** - File size management
- **Centralized Logging** - Supabase logging

---

**Dokumentacija kreirana:** 2025-01-27  
**Verzija:** 1.0.0  
**Status:** Aktuelna