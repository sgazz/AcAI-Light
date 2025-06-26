# 🚨 HIGH PRIORITY IMPLEMENTATION PLAN - AcAIA

## 📋 Pregled

Ovaj dokument sadrži detaljan plan implementacije high priority elemenata za AcAIA aplikaciju. Implementacija će se odvijati u 4 nedelje sa fokusom na performanse, korisničko iskustvo i funkcionalnost.

---

## 🎯 **NEDELJA 1: PERFORMANSE (URGENT)**

### **1.1 Redis Caching Implementation**

#### **Backend Setup**
```bash
# Instalacija Redis-a
brew install redis  # macOS
# sudo apt-get install redis-server  # Ubuntu

# Instalacija Python Redis klijenta
pip install redis
```

#### **Implementacija**
- [ ] **Cache Manager** - `backend/app/cache_manager.py`
- [ ] **RAG Service Caching** - Integracija sa postojećim RAG servisom
- [ ] **Session Caching** - Caching korisničkih sesija
- [ ] **Query Result Caching** - Caching rezultata pretrage

#### **Timeline:** 2-3 dana

### **1.2 Async Processing Implementation**

#### **Backend Optimizacija**
- [ ] **Async Endpoints** - Konvertovanje postojećih endpointa u async
- [ ] **Background Tasks** - Implementacija background taskova za heavy processing
- [ ] **Connection Pooling** - Optimizacija Supabase konekcija
- [ ] **Load Balancing** - Osnovno load balancing

#### **Timeline:** 1-2 dana

### **1.3 Performance Monitoring**

#### **Implementacija**
- [ ] **Performance Metrics** - Praćenje response time-a
- [ ] **Memory Usage** - Monitoring memorije
- [ ] **Database Performance** - Praćenje DB performansi
- [ ] **Cache Hit Rate** - Praćenje cache efikasnosti

#### **Timeline:** 1 dan

---

## 🎯 **NEDELJA 2: KORISNIČKO ISKUSTVO (URGENT)**

### **2.1 WebSocket Chat Implementation**

#### **Backend WebSocket Setup**
- [ ] **WebSocket Server** - FastAPI WebSocket integracija
- [ ] **Real-time Chat** - WebSocket chat endpoint
- [ ] **Typing Indicators** - Real-time typing indicators
- [ ] **Message Status** - Status tracking poruka

#### **Frontend WebSocket Integration**
- [ ] **WebSocket Client** - React WebSocket klijent
- [ ] **Real-time UI** - Real-time chat interfejs
- [ ] **Typing Indicators** - UI za typing indicators
- [ ] **Message Status** - UI za message status

#### **Timeline:** 3-5 dana

### **2.2 Enhanced Error Handling**

#### **Backend Error Handling**
- [ ] **Structured Error Responses** - Standardizovani error format
- [ ] **Error Logging** - Centralizovano logovanje grešaka
- [ ] **Retry Logic** - Automatski retry za greške
- [ ] **Graceful Degradation** - Graceful handling grešaka

#### **Frontend Error Handling**
- [ ] **User-friendly Error Messages** - Jasne poruke korisnicima
- [ ] **Error Toast Notifications** - Toast notifications za greške
- [ ] **Retry UI** - UI za retry funkcionalnost
- [ ] **Offline Handling** - Offline error handling

#### **Timeline:** 1 dan

### **2.3 Loading States & UX Improvements**

#### **Frontend Enhancements**
- [ ] **Loading Spinners** - Loading indikatori za sve operacije
- [ ] **Skeleton Loading** - Skeleton loading za sadržaj
- [ ] **Progress Indicators** - Progress bars za upload
- [ ] **Smooth Transitions** - Animacije i tranzicije

#### **Timeline:** 1 dan

---

## 🎯 **NEDELJA 3: AI UNPREDENJA (HIGH)**

### **3.1 Query Rewriting Implementation**

#### **Backend Implementation**
- [ ] **Query Rewriter Service** - `backend/app/query_rewriter.py`
- [ ] **LLM Integration** - Integracija sa Ollama za query rewriting
- [ ] **Query Enhancement** - Automatsko poboljšanje upita
- [ ] **Context Awareness** - Kontekstualno poboljšanje

#### **Frontend Integration**
- [ ] **Query Preview** - Prikaz poboljšanog upita
- [ ] **User Feedback** - Mogućnost korisnika da odobri/odbaci poboljšanje
- [ ] **Query History** - Istorija poboljšanih upita

#### **Timeline:** 2-3 dana

### **3.2 Fact Checking Implementation**

#### **Backend Implementation**
- [ ] **Fact Checker Service** - `backend/app/fact_checker.py`
- [ ] **Verification Logic** - Logika za proveru tačnosti
- [ ] **Confidence Scoring** - Scoring pouzdanosti odgovora
- [ ] **Source Attribution** - Povezivanje sa izvorima

#### **Frontend Integration**
- [ ] **Confidence Indicators** - UI indikatori pouzdanosti
- [ ] **Source Display** - Prikaz izvora informacija
- [ ] **Verification Status** - Status verifikacije odgovora

#### **Timeline:** 3-4 dana

### **3.3 Context Selection Enhancement**

#### **Backend Implementation**
- [ ] **Context Selector** - Pametni izbor relevantnog konteksta
- [ ] **Multi-modal Context** - Kontekst iz različitih izvora
- [ ] **Context Ranking** - Rangiranje konteksta po relevantnosti
- [ ] **Dynamic Context** - Dinamički prilagođavanje konteksta

#### **Timeline:** 2 dana

---

## 🖼️ **NEDELJA 4: OCR & SECURITY (HIGH)**

### **4.1 Cloud OCR Fallback Implementation**

#### **Backend Implementation**
- [ ] **Multi-engine OCR** - `backend/app/multi_engine_ocr.py`
- [ ] **Google Vision Integration** - Google Vision API integracija
- [ ] **Azure OCR Integration** - Azure Computer Vision integracija
- [ ] **Fallback Logic** - Logika za fallback između engine-ova

#### **Frontend Integration**
- [ ] **OCR Engine Selection** - UI za izbor OCR engine-a
- [ ] **Confidence Display** - Prikaz confidence score-a
- [ ] **Engine Comparison** - Poređenje rezultata različitih engine-ova

#### **Timeline:** 2-3 dana

### **4.2 Basic Authentication Implementation**

#### **Backend Implementation**
- [ ] **JWT Authentication** - JWT token management
- [ ] **User Management** - Osnovno upravljanje korisnicima
- [ ] **Session Management** - Upravljanje sesijama
- [ ] **Role-based Access** - Osnovne role i permisije

#### **Frontend Implementation**
- [ ] **Login/Register UI** - Autentifikacioni interfejs
- [ ] **Session Persistence** - Čuvanje sesija
- [ ] **Protected Routes** - Zaštita ruta
- [ ] **User Profile** - Korisnički profil

#### **Timeline:** 2-3 dana

### **4.3 User Sessions & Data Persistence**

#### **Backend Implementation**
- [ ] **Session Storage** - Čuvanje sesija u bazi
- [ ] **User Preferences** - Korisničke preferencije
- [ ] **Data Persistence** - Perzistencija korisničkih podataka
- [ ] **Session Recovery** - Vraćanje sesija

#### **Timeline:** 1-2 dana

---

## 📊 **DETALJNI IMPLEMENTACIJA PLAN**

### **Dan 1-2: Redis Caching**
```python
# backend/app/cache_manager.py
import redis
import json
from typing import Optional, Any

class CacheManager:
    def __init__(self):
        self.redis = redis.Redis(host='localhost', port=6379, db=0)
    
    async def get(self, key: str) -> Optional[Any]:
        """Dohvati podatak iz cache-a"""
        try:
            data = self.redis.get(key)
            return json.loads(data) if data else None
        except Exception:
            return None
    
    async def set(self, key: str, value: Any, ttl: int = 3600) -> bool:
        """Sačuvaj podatak u cache"""
        try:
            self.redis.setex(key, ttl, json.dumps(value))
            return True
        except Exception:
            return False
    
    async def delete(self, key: str) -> bool:
        """Obriši podatak iz cache-a"""
        try:
            self.redis.delete(key)
            return True
        except Exception:
            return False
```

### **Dan 3-4: Async Processing**
```python
# backend/app/main.py - Async endpoints
@app.post("/chat/rag-multistep")
async def multi_step_rag_chat_endpoint(message: dict, db: Session = Depends(get_db)):
    # Async processing
    result = await rag_service.process_async(message)
    return result

# backend/app/background_tasks.py
from fastapi import BackgroundTasks

class BackgroundTaskManager:
    def __init__(self):
        self.tasks = []
    
    async def add_task(self, func, *args, **kwargs):
        """Dodaj background task"""
        task = {
            'func': func,
            'args': args,
            'kwargs': kwargs,
            'status': 'pending'
        }
        self.tasks.append(task)
        return task
```

### **Dan 5-7: WebSocket Chat**
```python
# backend/app/websocket.py
from fastapi import WebSocket, WebSocketDisconnect
from typing import List

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)
    
    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
    
    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

@app.websocket("/ws/chat")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Process message
            response = await process_chat_message(data)
            await manager.send_personal_message(response, websocket)
    except WebSocketDisconnect:
        manager.disconnect(websocket)
```

### **Dan 8-10: Query Rewriting**
```python
# backend/app/query_rewriter.py
class QueryRewriter:
    def __init__(self, llm_client):
        self.llm_client = llm_client
    
    async def rewrite_query(self, original_query: str, context: str = "") -> str:
        """Poboljšaj upit za pretragu"""
        prompt = f"""
        Poboljšaj sledeći upit za pretragu u dokumentima:
        
        Original upit: {original_query}
        Kontekst: {context}
        
        Poboljšani upit (samo upit, bez objašnjenja):
        """
        
        response = await self.llm_client.generate(prompt)
        return response.strip()
    
    async def expand_query(self, query: str) -> List[str]:
        """Proširi upit sa sinonimima"""
        # Implementacija query expansion
        pass
```

### **Dan 11-14: Fact Checking**
```python
# backend/app/fact_checker.py
class FactChecker:
    def __init__(self, llm_client):
        self.llm_client = llm_client
    
    async def verify_answer(self, answer: str, context: str) -> dict:
        """Proveri tačnost odgovora"""
        prompt = f"""
        Proveri tačnost sledećeg odgovora na osnovu konteksta:
        
        Odgovor: {answer}
        Kontekst: {context}
        
        Analiziraj i vrati JSON sa:
        - verified: boolean (da li je odgovor tačan)
        - confidence: float (0-1, pouzdanost)
        - reasoning: string (obrazloženje)
        - sources: list (izvori informacija)
        """
        
        response = await self.llm_client.generate(prompt)
        return self.parse_verification_response(response)
    
    def parse_verification_response(self, response: str) -> dict:
        """Parsiraj odgovor verifikacije"""
        # Implementacija parsiranja
        pass
```

### **Dan 15-17: Cloud OCR Fallback**
```python
# backend/app/multi_engine_ocr.py
import google.cloud.vision
import azure.cognitiveservices.vision.computervision

class MultiEngineOCR:
    def __init__(self):
        self.tesseract = TesseractOCR()
        self.google_vision = GoogleVisionOCR()
        self.azure_vision = AzureVisionOCR()
    
    async def extract_text(self, image: bytes, options: dict = {}) -> dict:
        """Multi-engine OCR sa fallback"""
        
        # Try Tesseract first
        try:
            tesseract_result = await self.tesseract.extract(image, options)
            if tesseract_result['confidence'] > 0.8:
                return {
                    'text': tesseract_result['text'],
                    'confidence': tesseract_result['confidence'],
                    'engine': 'tesseract'
                }
        except Exception as e:
            print(f"Tesseract failed: {e}")
        
        # Fallback to Google Vision
        try:
            google_result = await self.google_vision.extract(image)
            return {
                'text': google_result['text'],
                'confidence': google_result['confidence'],
                'engine': 'google_vision'
            }
        except Exception as e:
            print(f"Google Vision failed: {e}")
        
        # Final fallback to Azure
        try:
            azure_result = await self.azure_vision.extract(image)
            return {
                'text': azure_result['text'],
                'confidence': azure_result['confidence'],
                'engine': 'azure_vision'
            }
        except Exception as e:
            print(f"Azure Vision failed: {e}")
        
        # Return empty result if all fail
        return {
            'text': '',
            'confidence': 0.0,
            'engine': 'none'
        }
```

### **Dan 18-21: Authentication**
```python
# backend/app/auth.py
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from datetime import datetime, timedelta

# Security configuration
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

class AuthManager:
    def __init__(self):
        self.pwd_context = pwd_context
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return self.pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        return self.pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: timedelta = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=15)
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    
    def verify_token(self, token: str):
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            username: str = payload.get("sub")
            if username is None:
                raise HTTPException(status_code=401, detail="Invalid token")
            return username
        except JWTError:
            raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/token")
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/chat")
async def chat_endpoint(
    message: dict,
    current_user: User = Depends(get_current_user)
):
    return await process_message(message, current_user)
```

---

## 🎯 **TESTING PLAN**

### **Unit Tests**
- [ ] **Cache Manager Tests** - Testiranje cache funkcionalnosti
- [ ] **Query Rewriter Tests** - Testiranje query rewriting
- [ ] **Fact Checker Tests** - Testiranje fact checking
- [ ] **Multi-engine OCR Tests** - Testiranje OCR fallback

### **Integration Tests**
- [ ] **WebSocket Tests** - Testiranje real-time funkcionalnosti
- [ ] **Authentication Tests** - Testiranje auth sistema
- [ ] **Performance Tests** - Testiranje performansi
- [ ] **End-to-end Tests** - Kompletni workflow testovi

### **Performance Tests**
- [ ] **Load Testing** - Testiranje pod opterećenjem
- [ ] **Cache Performance** - Testiranje cache efikasnosti
- [ ] **Response Time** - Testiranje response time-a
- [ ] **Memory Usage** - Testiranje memorije

---

## 📈 **SUCCESS METRICS**

### **Performance Metrics**
- **Response Time**: < 1 sekunda za česte upite
- **Cache Hit Rate**: > 80%
- **Memory Usage**: < 500MB
- **Concurrent Users**: > 100

### **User Experience Metrics**
- **User Engagement**: +50% engagement
- **Session Duration**: +30% dužina sesije
- **Error Rate**: < 1% grešaka
- **User Satisfaction**: > 4.5/5

### **AI Quality Metrics**
- **Query Success Rate**: > 90%
- **Answer Accuracy**: > 85%
- **Fact Check Confidence**: > 80%
- **User Trust**: +40% pouzdanja

---

## 🚀 **DEPLOYMENT PLAN**

### **Phase 1: Backend Deployment**
- [ ] **Redis Setup** - Instalacija i konfiguracija Redis-a
- [ ] **Environment Variables** - Konfiguracija env varijabli
- [ ] **Database Migration** - Migracija baze podataka
- [ ] **Service Deployment** - Deployment backend servisa

### **Phase 2: Frontend Deployment**
- [ ] **Build Optimization** - Optimizacija build-a
- [ ] **CDN Setup** - Setup CDN-a za static assets
- [ ] **Frontend Deployment** - Deployment frontend-a
- [ ] **SSL Certificate** - Setup SSL sertifikata

### **Phase 3: Monitoring Setup**
- [ ] **Performance Monitoring** - Setup monitoring alata
- [ ] **Error Tracking** - Setup error tracking-a
- [ ] **Analytics** - Setup analytics-a
- [ ] **Alerts** - Setup alert sistema

---

## 📋 **CHECKLIST**

### **Nedelja 1: Performance**
- [ ] Redis instalacija i konfiguracija
- [ ] Cache manager implementacija
- [ ] Async processing implementacija
- [ ] Performance monitoring setup
- [ ] Load testing

### **Nedelja 2: UX**
- [ ] WebSocket server implementacija
- [ ] Real-time chat frontend
- [ ] Error handling implementacija
- [ ] Loading states implementacija
- [ ] UX testing

### **Nedelja 3: AI**
- [ ] Query rewriter implementacija
- [ ] Fact checker implementacija
- [ ] Context selection implementacija
- [ ] AI quality testing
- [ ] User feedback collection

### **Nedelja 4: OCR & Security**
- [ ] Cloud OCR fallback implementacija
- [ ] Authentication implementacija
- [ ] User sessions implementacija
- [ ] Security testing
- [ ] Final integration testing

---

**Dokument kreiran:** 2025-01-27  
**Verzija:** 1.0.0  
**Status:** Aktuelan plan za implementaciju high priority elemenata 