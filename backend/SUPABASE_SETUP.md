# Supabase Integracija - AcAIA Projekat

Ova dokumentacija objašnjava kako postaviti i koristiti Supabase integraciju u AcAIA projektu.

## 📋 Preduvjeti

1. **Supabase nalog** - Kreiran na [supabase.com](https://supabase.com)
2. **PostgreSQL baza podataka** - Automatski kreira Supabase
3. **pgvector ekstenzija** - Za vektorske operacije

## 🚀 Postavljanje

### 1. Kreiranje Supabase Projekta

1. Idite na [supabase.com](https://supabase.com)
2. Kreirajte novi projekat
3. Zabilježite:
   - **Project URL** (npr. `https://kgtiuqnhaezokcsndofs.supabase.co`)
   - **anon key** (javni ključ)
   - **service_role key** (privatni ključ)

### 2. Konfiguracija Environment Varijabli

Kopirajte `env.example` u `.env` fajl i popunite podatke:

```bash
cp backend/env.example backend/.env
```

Uredite `.env` fajl sa vašim Supabase podacima:

```env
SUPABASE_URL=https://kgtiuqnhaezokcsndofs.supabase.co
SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.kgtiuqnhaezokcsndofs.supabase.co:5432/postgres
```

### 3. Kreiranje Tabela

Pokrenite SQL skriptu u Supabase SQL Editor-u:

```sql
-- Kopirajte sadržaj iz backend/supabase_setup.sql
-- i pokrenite u Supabase SQL Editor-u
```

Ili koristite Supabase CLI:

```bash
supabase db push
```

### 4. Instalacija Dependencija

```bash
cd backend
pip install -r requirements.txt
```

## 🧪 Testiranje

Pokrenite test skriptu za proveru integracije:

```bash
cd backend
python test_supabase.py
```

## 📊 Struktura Baze Podataka

### Tabele

1. **documents** - Informacije o uploadovanim dokumentima
2. **document_vectors** - Vektorske reprezentacije dokumentnih delova
3. **chat_history** - Istorija chat konverzacija
4. **ocr_images** - Informacije o OCR obrađenim slikama
5. **retrieval_sessions** - Multi-step retrieval sesije

### Indeksi

- Vektorski indeksi za brzu pretragu sličnosti
- Indeksi za filename, file_type, created_at
- Indeksi za session_id i chat istoriju

## 🔧 Korišćenje u Kodu

### Inicijalizacija

```python
from supabase_client import get_supabase_manager, init_supabase

# Inicijalizuj Supabase
if init_supabase():
    print("Supabase povezivanje uspešno!")
else:
    print("Greška pri povezivanju")

# Dohvati manager
manager = get_supabase_manager()
```

### Operacije sa Dokumentima

```python
# Ubaci dokument
doc_id = manager.insert_document(
    filename="test.pdf",
    file_path="/uploads/test.pdf",
    file_type="application/pdf",
    file_size=1024,
    content="Sadržaj dokumenta..."
)

# Dohvati dokument
doc = manager.get_document(doc_id)

# Dohvati sve dokumente
docs = manager.get_all_documents()
```

### Vektorske Operacije

```python
# Ubaci vektore
vectors = [
    {
        'chunk_index': 0,
        'chunk_text': 'Tekst chunka',
        'embedding': [0.1, 0.2, ...],  # 1536-dimenzionalni vektor
        'metadata': {'source': 'document'}
    }
]
manager.insert_document_vectors(doc_id, vectors)

# Pretraži slične vektore
results = manager.search_similar_vectors(
    query_embedding=[0.1, 0.2, ...],
    match_threshold=0.7,
    match_count=10
)
```

### Chat Istorija

```python
# Sačuvaj chat poruku
chat_id = manager.save_chat_message(
    session_id="user_session_123",
    user_message="Kako funkcioniše RAG?",
    assistant_message="RAG (Retrieval-Augmented Generation)...",
    sources=[{"title": "RAG dokument", "content": "..."}]
)

# Dohvati chat istoriju
history = manager.get_chat_history("user_session_123")
```

### OCR Operacije

```python
# Sačuvaj OCR sliku
ocr_id = manager.save_ocr_image(
    original_filename="image.png",
    original_path="/uploads/image.png",
    processed_filename="image_processed.png",
    processed_path="/uploads/processed/image_processed.png",
    ocr_text="Tekst iz slike",
    confidence_score=0.95,
    language="srp+eng"
)

# Dohvati OCR slike
ocr_images = manager.get_ocr_images()
```

### Statistike

```python
# Dohvati statistike baze
stats = manager.get_database_stats()
print(f"Ukupno dokumenata: {stats['total_documents']}")
print(f"Ukupno vektora: {stats['total_vectors']}")
print(f"Ukupno chat poruka: {stats['total_chat_messages']}")
```

## 🔒 Sigurnost

### Row Level Security (RLS)

Za buduću auth implementaciju, možete omogućiti RLS:

```sql
-- Omogući RLS na tabelama
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
-- ... ostale tabele

-- Kreiraj politike za pristup
CREATE POLICY "Users can view their own documents" ON documents
    FOR SELECT USING (auth.uid() = user_id);
```

### Environment Varijable

- Nikad ne commit-ujte `.env` fajl
- Koristite različite ključeve za development i production
- Redovno rotirajte ključeve

## 🚨 Troubleshooting

### Česti Problemi

1. **Connection Error**
   - Proverite SUPABASE_URL i ključeve
   - Proverite internet konekciju

2. **pgvector Error**
   - Proverite da li je pgvector ekstenzija omogućena
   - Pokrenite `CREATE EXTENSION IF NOT EXISTS vector;`

3. **Permission Error**
   - Proverite da li koristite service_role ključ
   - Proverite RLS politike

4. **Vector Dimension Error**
   - Proverite da li su vektori 1536-dimenzionalni
   - Proverite da li koristite ispravan embedding model

### Debugging

```python
import logging
logging.basicConfig(level=logging.DEBUG)

# Testiraj povezivanje
manager = get_supabase_manager()
if manager.test_connection():
    print("Povezivanje OK")
else:
    print("Povezivanje FAILED")
```

## 📈 Performanse

### Optimizacije

1. **Indeksi** - Automatski kreirani za ključne kolone
2. **Vektorski indeksi** - IVFFlat indeksi za brzu pretragu
3. **Batch operacije** - Za ubacivanje više vektora odjednom

### Monitoring

```python
# Pratite performanse
import time

start_time = time.time()
results = manager.search_similar_vectors(query_embedding, match_threshold=0.7)
end_time = time.time()

print(f"Pretraga trajala: {end_time - start_time:.2f} sekundi")
```

## 🔄 Backup i Restore

### Backup

```bash
# Backup baze podataka
pg_dump "postgresql://postgres:[PASSWORD]@db.kgtiuqnhaezokcsndofs.supabase.co:5432/postgres" > backup.sql
```

### Restore

```bash
# Restore baze podataka
psql "postgresql://postgres:[PASSWORD]@db.kgtiuqnhaezokcsndofs.supabase.co:5432/postgres" < backup.sql
```

## 📚 Dodatni Resursi

- [Supabase Dokumentacija](https://supabase.com/docs)
- [pgvector Dokumentacija](https://github.com/pgvector/pgvector)
- [Supabase Python Client](https://github.com/supabase-community/supabase-py)
- [AcAIA Projekat Dokumentacija](../README.md) 