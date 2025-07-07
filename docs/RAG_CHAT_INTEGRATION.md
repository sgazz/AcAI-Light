# RAG Integracija u Chat Sekciji

## Pregled

RAG (Retrieval-Augmented Generation) funkcionalnost je implementirana u chat sekciji na više nivoa, ali trenutno **nije direktno integrisana** u novu restrukturiranu chat komponentu. Evo detaljnog pregleda trenutnog stanja:

## 🔍 Trenutno Stanje RAG Integracije

### 1. **Backend RAG Endpoint-i**

#### Glavni RAG Endpoint-i:
- **`/chat/rag`** - Osnovni RAG endpoint
- **`/chat/rag-optimized`** - Optimizovani RAG sa analytics-om
- **`/chat/rag-enhanced-context`** - Enhanced context selection
- **`/chat/rag-multistep`** - Multi-step RAG proces

#### WebSocket RAG Integracija:
```python
# U generate_ai_response funkciji
rag_response = await rag_service.generate_rag_response(
    query=user_text,
    context="",
    max_results=3,
    use_rerank=True,
    session_id=connection.session_id
)
```

### 2. **Frontend RAG Implementacija**

#### Stara ChatBox Komponenta (Potpuno RAG Integrisana):
```typescript
// RAG Toggle-ovi
const [useRAG, setUseRAG] = useState(true);
const [useRerank, setUseRerank] = useState(true);
const [useEnhancedContext, setUseEnhancedContext] = useState(false);

// Endpoint selection
let endpoint = useRAG ? CHAT_RAG_ENDPOINT : CHAT_ENDPOINT;
if (useEnhancedContext) {
  endpoint = CHAT_RAG_ENHANCED_CONTEXT_ENDPOINT;
}
```

#### Nova Chat Komponenta (NEMA RAG Integraciju):
```typescript
// useChat hook - koristi samo običan chat endpoint
const response = await apiRequest('/chat', {
  method: 'POST',
  body: JSON.stringify({
    message: content.trim(),
    session_id: currentSessionId,
    model: 'mistral:latest'
  })
});
```

## 🚨 Problem: Nedostaje RAG u Novoj Chat Komponenti

### Šta nedostaje:

1. **RAG Toggle-ovi** - Nema opcija za uključivanje/isključivanje RAG-a
2. **RAG Endpoint Selection** - Koristi se samo `/chat` endpoint
3. **RAG Response Handling** - Ne prikazuje sources i RAG metadata
4. **RAG UI Indicators** - Nema indikatore za RAG korišćenje

## 🔧 Rešenje: Integracija RAG-a u Novu Chat Komponentu

### 1. Ažuriranje useChat Hook-a

```typescript
// Dodati RAG state-ove
const [useRAG, setUseRAG] = useState(true);
const [useRerank, setUseRerank] = useState(true);
const [useEnhancedContext, setUseEnhancedContext] = useState(false);

// Ažurirati sendMessage funkciju
const sendMessage = useCallback(async (content: string) => {
  // ... postojeći kod ...
  
  // Odaberi endpoint na osnovu RAG mode-a
  let endpoint = useRAG ? '/chat/rag' : '/chat';
  let body: any = {
    message: content.trim(),
    session_id: currentSessionId,
  };
  
  if (useRAG) {
    body.use_rerank = useRerank;
    if (useEnhancedContext) {
      endpoint = '/chat/rag-enhanced-context';
    }
  } else {
    body.model = 'mistral:latest';
  }
  
  const response = await apiRequest(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  
  // ... ostatak koda ...
}, [currentSessionId, useRAG, useRerank, useEnhancedContext]);
```

### 2. Dodavanje RAG Toggle-ova u ChatLayout

```typescript
// U ChatLayout komponenti
const [useRAG, setUseRAG] = useState(true);
const [useRerank, setUseRerank] = useState(true);
const [useEnhancedContext, setUseEnhancedContext] = useState(false);

// Dodati RAG controls u header
<div className="flex items-center gap-2">
  {/* RAG Toggle */}
  <button
    onClick={() => setUseRAG(!useRAG)}
    className={`px-3 py-1 rounded-lg text-sm ${
      useRAG 
        ? 'bg-green-600 text-white' 
        : 'bg-slate-600 text-slate-300'
    }`}
  >
    RAG {useRAG ? 'ON' : 'OFF'}
  </button>
  
  {/* Re-ranking Toggle */}
  {useRAG && (
    <button
      onClick={() => setUseRerank(!useRerank)}
      className={`px-3 py-1 rounded-lg text-sm ${
        useRerank 
          ? 'bg-purple-600 text-white' 
          : 'bg-slate-600 text-slate-300'
      }`}
    >
      Re-rank {useRerank ? 'ON' : 'OFF'}
    </button>
  )}
</div>
```

### 3. Ažuriranje MessageItem za RAG Prikaz

```typescript
// U MessageItem komponenti
{!isUser && message.used_rag && (
  <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
    <span>Korišćeni dokumenti</span>
  </div>
)}

{!isUser && message.sources && message.sources.length > 0 && (
  <div className="mt-3 pt-3 border-t border-white/10">
    <div className="text-xs text-slate-400 mb-2">Izvori:</div>
    <div className="space-y-1">
      {message.sources.slice(0, 3).map((source, index) => (
        <div key={index} className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer">
          📄 {source.title || source.filename || `Dokument ${index + 1}`}
        </div>
      ))}
    </div>
  </div>
)}
```

## 📋 Plan Integracije

### Faza 1: Osnovna RAG Integracija
1. ✅ Dodati RAG state-ove u useChat hook
2. ✅ Ažurirati sendMessage funkciju za RAG endpoint selection
3. ✅ Dodati RAG toggle-ove u ChatLayout
4. ✅ Ažurirati MessageItem za RAG prikaz

### Faza 2: Napredne RAG Funkcionalnosti
1. ✅ Dodati re-ranking toggle
2. ✅ Dodati enhanced context toggle
3. ✅ Implementirati RAG analytics prikaz
4. ✅ Dodati RAG performance metrics

### Faza 3: UI/UX Poboljšanja
1. ✅ Dodati RAG status indikatore
2. ✅ Implementirati RAG source preview
3. ✅ Dodati RAG confidence scores
4. ✅ Implementirati RAG feedback sistem

## 🎯 Preporučene Akcije

1. **Odmah**: Integrisati osnovnu RAG funkcionalnost u novu chat komponentu
2. **Kratkoročno**: Dodati RAG toggle-ove i source prikaz
3. **Srednjoročno**: Implementirati napredne RAG opcije
4. **Dugoročno**: Optimizovati RAG performance i UX

## 🔗 Povezani Fajlovi

- `frontend/src/components/Chat/hooks/useChat.ts` - Glavni chat hook
- `frontend/src/components/Chat/ChatLayout.tsx` - Chat layout komponenta
- `frontend/src/components/Chat/MessageItem.tsx` - Message prikaz
- `backend/app/main.py` - RAG endpoint-i
- `backend/app/rag_service.py` - RAG servis logika 