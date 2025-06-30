# QA Test Plan - AcAIA System

## Dokument informacije
- **Projekat:** AcAIA (AI-powered Study Assistant)
- **Verzija:** 2.1.0 (Optimized Supabase + Performance)
- **Datum kreiranja:** 30.06.2025
- **Datum poslednje izmene:** 30.06.2025
- **Status:** Active
- **Test Lead:** TBD
- **Test Environment:** Local Development + Supabase Cloud

## 1. Uvod

### 1.1 Svrha dokumenta
Ovaj dokument definiše sveobuhvatan plan za testiranje AcAIA sistema koji je nedavno migriran sa lokalne SQLite baze na Supabase cloud bazu i optimizovan za bolje performanse. Plan pokriva funkcionalno, ne-funkcionalno, integraciono, security i performance testiranje.

### 1.2 Scope testiranja
- Backend API (FastAPI na portu 8001)
- Frontend aplikacija (Next.js na portu 3000)
- Supabase integracija (async optimizovana)
- Ollama AI model integracija (preloaded models)
- OCR funkcionalnost
- Session management
- Document management
- Performance optimizacije
- Caching sistem
- Background tasks

### 1.3 Implementirane optimizacije
- **Async Supabase Manager:** Asinhroni HTTP pozivi za bolje performanse
- **Model Preloading:** Ollama modeli se učitavaju pri pokretanju
- **AI Response Caching:** Keširanje AI odgovora za ponovljene upite
- **Semantic Cache:** Keširanje sličnih upita na osnovu semantičke sličnosti
- **Connection Pooling:** Optimizovano upravljanje konekcijama
- **Background Tasks:** Asinhrono procesiranje zahtevnih operacija
- **Prompt Optimization:** Skraćeni promptovi za brže odgovore
- **Async Context Retrieval:** Asinhrono dohvatanje konteksta

### 1.4 Out of scope
- Testiranje Ollama modela samih po sebi
- Performance testiranje Supabase servisa
- Load testing sa više od 100 korisnika

## 2. Test strategija

### 2.1 Test pristup
- **Manual testing** za UI/UX funkcionalnosti
- **Automated testing** za API endpoint-e
- **Integration testing** za Supabase konekcije
- **Security testing** za input validation
- **Performance testing** za optimizacije

### 2.2 Test environment
- **Backend:** http://localhost:8001
- **Frontend:** http://localhost:3000
- **Supabase:** Cloud instance (async optimized)
- **Ollama:** http://localhost:11434 (preloaded models)

### 2.3 Test data
- Test dokumenti: `tests/data/documents/`
- Test slike: `tests/data/images/`
- Test poruke: Predefinisane chat poruke
- Performance test data: `tests/python/test_async_performance.py`

## 3. Funkcionalno testiranje

### 3.1 Chat funkcionalnost

#### TC-001: Osnovni chat (Optimized)
**Prioritet:** High  
**Precondition:** Backend i frontend serveri pokrenuti, modeli preloadovani

**Test koraci:**
1. Otvori aplikaciju u browser-u
2. Klikni na chat polje
3. Unesi poruku: "Zdravo! Kako si?"
4. Pritisni Enter ili klikni Send
5. Sačekaj AI odgovor

**Expected Result:**
- AI treba da odgovori u roku od 3 sekundi (optimizovano)
- Poruka treba da se prikaže u chat istoriji
- Poruka treba da se sačuva u Supabase (async)

**Acceptance Criteria:**
- [ ] AI odgovara na poruku < 3 sekunde
- [ ] Poruka se prikazuje u chat istoriji
- [ ] Poruka se čuva u Supabase chat_history tabeli
- [ ] Async Supabase operacije rade ispravno

#### TC-002: Chat istorija (Async)
**Prioritet:** High

**Test koraci:**
1. Pošalji nekoliko poruka u chat-u
2. Osveži stranicu
3. Proveri da li se poruke prikazuju (async load)
4. Kreiraj novu sesiju
5. Vrati se na prethodnu sesiju

**Expected Result:**
- Poruke treba da se zadrže nakon osvežavanja
- Različite sesije treba da imaju različite poruke
- Async loading treba da bude brži od 1 sekunde

#### TC-003: Session management (Optimized)
**Prioritet:** Medium

**Test koraci:**
1. Kreiraj novu sesiju
2. Dodaj naziv i opis sesije
3. Pošalji nekoliko poruka
4. Kreiraj još jednu sesiju
5. Prebaci se između sesija

**Expected Result:**
- Sesije treba da se čuvaju sa metadata
- Poruke treba da se čuvaju po sesijama
- Async operacije treba da budu brže

### 3.2 RAG (Retrieval-Augmented Generation)

#### TC-004: Upload dokumenata (Background Tasks)
**Prioritet:** High

**Test koraci:**
1. Klikni na "Upload Document"
2. Izaberi PDF fajl
3. Sačekaj upload (background processing)
4. Proveri da li se dokument prikazuje u listi

**Expected Result:**
- Dokument treba da se upload-uje
- Background task treba da procesira dokument
- Treba da se prikaže u listi dokumenata
- Treba da se sačuva u Supabase

#### TC-005: RAG chat (Optimized)
**Prioritet:** High

**Test koraci:**
1. Upload dokument sa tekstom o veštačkoj inteligenciji
2. U chat-u postavi pitanje: "Šta je veštačka inteligencija?"
3. Sačekaj odgovor

**Expected Result:**
- AI treba da koristi informacije iz dokumenta
- Treba da prikaže izvore (sources)
- Odgovor treba da bude relevantan
- Response time < 8 sekundi (optimizovano)

#### TC-006: Document management (Async)
**Prioritet:** Medium

**Test koraci:**
1. Upload nekoliko dokumenata
2. Proveri listu dokumenata (async load)
3. Obriši jedan dokument
4. Proveri da li je obrisan

**Expected Result:**
- Dokumenti treba da se prikazuju u listi
- Async loading treba da bude brži
- Brisanje treba da ukloni dokument iz sistema

### 3.3 OCR funkcionalnost

#### TC-007: OCR ekstrakcija (Background Tasks)
**Prioritet:** Medium

**Test koraci:**
1. Klikni na "OCR" opciju
2. Upload sliku sa tekstom
3. Sačekaj OCR obrada (background task)
4. Proveri ekstraktovani tekst

**Expected Result:**
- OCR treba da ekstraktuje tekst iz slike
- Background task treba da procesira sliku
- Treba da prikaže confidence score
- Treba da sačuva rezultat u Supabase

#### TC-008: OCR sa različitim formatima
**Prioritet:** Low

**Test koraci:**
1. Testiraj sa PNG slikama
2. Testiraj sa JPG slikama
3. Testiraj sa TIFF slikama
4. Testiraj sa slikama bez teksta

**Expected Result:**
- OCR treba da radi sa svim podržanim formatima
- Treba da prikaže odgovarajuću poruku za slike bez teksta

### 3.4 Session metadata i kategorije

#### TC-009: Session metadata (Async)
**Prioritet:** Medium

**Test koraci:**
1. Kreiraj novu sesiju
2. Dodaj naziv: "Test Session"
3. Dodaj opis: "Test session za QA"
4. Sačuvaj
5. Proveri da li se metadata čuva

**Expected Result:**
- Metadata treba da se sačuva u Supabase
- Async operacije treba da budu brže
- Treba da se prikaže u UI-u

#### TC-010: Session kategorije
**Prioritet:** Low

**Test koraci:**
1. Otvori sesiju
2. Dodaj kategorije: ["Test", "QA", "Demo"]
3. Sačuvaj
4. Proveri da li se kategorije prikazuju

**Expected Result:**
- Kategorije treba da se sačuvaju
- Treba da se prikažu sa bojama

#### TC-011: Session deljenje
**Prioritet:** Low

**Test koraci:**
1. Kreiraj share link za sesiju
2. Proveri da li se link generiše
3. Testiraj link u incognito tab-u
4. Opozovi link

**Expected Result:**
- Share link treba da se kreira
- Treba da omogući pristup sesiji
- Opozivanje treba da onemogući pristup

## 4. Ne-funkcionalno testiranje

### 4.1 Performanse (Optimized)

#### TC-012: Response time (Updated Metrics)
**Prioritet:** High

**Test koraci:**
1. Meri vreme odgovora za chat (< 3s - optimizovano)
2. Meri vreme odgovora za RAG (< 8s - optimizovano)
3. Meri vreme odgovora za OCR (< 30s)
4. Meri vreme upload-a dokumenata
5. Testiraj cache hit/miss scenarije

**Acceptance Criteria:**
- [ ] Chat response < 3 sekunde (optimizovano sa 5s)
- [ ] RAG response < 8 sekundi (optimizovano sa 10s)
- [ ] OCR response < 30 sekundi
- [ ] Document upload < 60 sekundi (za 10MB fajl)
- [ ] Cache hit response < 1 sekunda
- [ ] Semantic cache hit response < 2 sekunde

#### TC-013: Load testing (Optimized)
**Prioritet:** Medium

**Test koraci:**
1. Simuliraj 10 paralelnih korisnika
2. Pošalji zahteve istovremeno
3. Proveri da li sistem održava performanse
4. Testiraj concurrent cache access

**Expected Result:**
- Sistem treba da održava performanse
- Ne treba da dođe do grešaka
- Cache treba da radi concurrent

#### TC-014: Cache Performance Testing
**Prioritet:** High

**Test koraci:**
1. Pošalji isti upit dva puta
2. Meri response time za prvi i drugi poziv
3. Pošalji sličan upit (semantic cache test)
4. Proveri cache hit rate

**Expected Result:**
- Prvi poziv: normalan response time
- Drugi poziv: < 1 sekunda (cache hit)
- Sličan upit: < 2 sekunde (semantic cache)
- Cache hit rate > 80%

### 4.2 Pouzdanost

#### TC-015: Error handling (Optimized)
**Prioritet:** High

**Test koraci:**
1. Testiraj sa praznim porukama
2. Testiraj sa nevalidnim fajlovima
3. Testiraj sa nedostupnim Supabase servisom
4. Testiraj sa nedostupnim Ollama servisom
5. Proveri da li se greške prikazuju korisniku

**Expected Result:**
- Greške treba da se prikažu jasno
- Sistem treba da se oporavi nakon greške
- Background tasks treba da se oporave

#### TC-016: Data consistency (Async)
**Prioritet:** High

**Test koraci:**
1. Kreiraj podatke u različitim sesijama
2. Proveri da li se podaci čuvaju konzistentno
3. Testiraj sa prekidima konekcije
4. Testiraj async operacije

**Expected Result:**
- Podaci treba da se čuvaju konzistentno
- Ne treba da dođe do gubitka podataka
- Async operacije treba da se završe

### 4.3 Korisničko iskustvo

#### TC-017: Responsive design
**Prioritet:** Medium

**Test koraci:**
1. Testiraj na desktop (1920x1080)
2. Testiraj na tablet (768x1024)
3. Testiraj na mobile (375x667)
4. Proveri da li se UI prilagođava

**Expected Result:**
- UI treba da se prilagođava različitim veličinama
- Funkcionalnost treba da radi na svim uređajima

#### TC-018: Browser compatibility
**Prioritet:** Medium

**Test koraci:**
1. Testiraj u Chrome
2. Testiraj u Firefox
3. Testiraj u Safari
4. Testiraj u Edge

**Expected Result:**
- Aplikacija treba da radi u svim browserima
- Funkcionalnost treba da bude konzistentna

## 5. Integraciono testiranje

### 5.1 Backend-Frontend integracija

#### TC-019: API komunikacija (Optimized)
**Prioritet:** High

**Test koraci:**
1. Proveri sve API endpoint-e
2. Testiraj da li se podaci sinhronizuju
3. Proveri da li se greške prosleđuju
4. Testiraj async endpoint-e

**Expected Result:**
- Svi API pozivi treba da rade
- Podaci treba da se sinhronizuju
- Greške treba da se prosleđuju frontendu
- Async endpoint-e treba da budu brži

### 5.2 Supabase integracija (Async)

#### TC-020: Database operacije (Async)
**Prioritet:** High

**Test koraci:**
1. Proveri da li se podaci čuvaju u Supabase (async)
2. Proveri da li se podaci čitaju ispravno (async)
3. Proveri foreign key veze
4. Testiraj connection pooling

**Expected Result:**
- Podaci treba da se čuvaju u Supabase
- Async operacije treba da budu brže
- Podaci treba da se čitaju ispravno
- Veze treba da se održavaju

### 5.3 Ollama integracija (Preloaded)

#### TC-021: AI model (Preloaded)
**Prioritet:** High

**Test koraci:**
1. Proveri da li Ollama odgovara
2. Proveri da li su modeli preloadovani
3. Testiraj sa različitim modelima
4. Proveri da li se odgovori čuvaju
5. Testiraj cache hit/miss

**Expected Result:**
- Ollama treba da odgovara
- Modeli treba da budu preloadovani
- AI odgovori treba da se čuvaju
- Cache treba da radi

## 6. Performance Optimizacije Testiranje

### 6.1 Model Preloading

#### TC-022: Model Preload Test
**Prioritet:** High

**Test koraci:**
1. Restartuj backend server
2. Proveri da li se modeli učitavaju pri pokretanju
3. Pošalji prvi upit
4. Meri response time

**Expected Result:**
- Modeli se učitavaju pri pokretanju
- Prvi upit treba da bude brži
- Preload status treba da se prikaže

#### TC-023: Model Switching Test
**Prioritet:** Medium

**Test koraci:**
1. Promeni model u konfiguraciji
2. Restartuj server
3. Proveri da li se novi model učitava
4. Testiraj odgovore

**Expected Result:**
- Novi model se učitava
- Odgovori se generišu sa novim modelom

### 6.2 Caching System

#### TC-024: AI Response Cache Test
**Prioritet:** High

**Test koraci:**
1. Pošalji upit: "Šta je veštačka inteligencija?"
2. Meri response time
3. Pošalji isti upit ponovo
4. Meri response time
5. Proveri da li je odgovor identičan

**Expected Result:**
- Prvi poziv: normalan response time
- Drugi poziv: < 1 sekunda
- Odgovori treba da budu identični

#### TC-025: Semantic Cache Test
**Prioritet:** High

**Test koraci:**
1. Pošalji upit: "Šta je AI?"
2. Meri response time
3. Pošalji sličan upit: "Objasni mi veštačku inteligenciju"
4. Meri response time
5. Proveri da li se koristi semantic cache

**Expected Result:**
- Prvi poziv: normalan response time
- Sličan upit: < 2 sekunde
- Semantic cache treba da radi

#### TC-026: Cache Invalidation Test
**Prioritet:** Medium

**Test koraci:**
1. Pošalji upit i dobij cache hit
2. Restartuj server
3. Pošalji isti upit
4. Proveri da li je cache očišćen

**Expected Result:**
- Cache se očišćava pri restartu
- Prvi poziv nakon restart-a: normalan response time

### 6.3 Async Operations

#### TC-027: Async Supabase Test
**Prioritet:** High

**Test koraci:**
1. Kreiraj novu sesiju
2. Pošalji nekoliko poruka istovremeno
3. Proveri da li se sve čuvaju
4. Meri ukupno vreme

**Expected Result:**
- Sve poruke se čuvaju
- Async operacije su brže od sync
- Nema race conditions

#### TC-028: Background Tasks Test
**Prioritet:** Medium

**Test koraci:**
1. Upload veliki dokument
2. Proveri da li se background task pokreće
3. Proveri da li se dokument procesira
4. Meri vreme procesiranja

**Expected Result:**
- Background task se pokreće
- Dokument se procesira
- UI ostaje responsive

### 6.4 Connection Pooling

#### TC-029: Concurrent Connections Test
**Prioritet:** Medium

**Test koraci:**
1. Simuliraj 5 paralelnih korisnika
2. Svaki korisnik šalje zahteve
3. Proveri da li se konekcije upravljaju ispravno
4. Meri response times

**Expected Result:**
- Konekcije se upravljaju ispravno
- Nema connection pool exhaustion
- Response times ostaju konzistentni

## 7. Security testiranje

### 7.1 Input validation

#### TC-030: SQL injection
**Prioritet:** High

**Test koraci:**
1. Unesi SQL komande u input polja
2. Proveri da li se input sanitizuje
3. Proveri da li se greške prikazuju

**Expected Result:**
- SQL injection treba da bude sprečen
- Input treba da se sanitizuje

#### TC-031: XSS (Cross-Site Scripting)
**Prioritet:** High

**Test koraci:**
1. Unesi JavaScript kod u input polja
2. Proveri da li se kod escape-uje
3. Proveri da li se ne izvršava

**Expected Result:**
- XSS treba da bude sprečen
- Kod treba da se escape-uje

### 7.2 File upload security

#### TC-032: File type validation
**Prioritet:** High

**Test koraci:**
1. Pokušaj upload različitih tipova fajlova
2. Proveri da li se odbijaju opasni fajlovi
3. Proveri da li se prihvataju samo dozvoljeni tipovi

**Expected Result:**
- Opasni fajlovi treba da se odbijaju
- Samo dozvoljeni tipovi treba da se prihvataju

#### TC-033: File size limits
**Prioritet:** Medium

**Test koraci:**
1. Pokušaj upload velikih fajlova
2. Proveri da li se postavljaju ograničenja
3. Proveri da li se prikazuju odgovarajuće poruke

**Expected Result:**
- Veliki fajlovi treba da se odbijaju
- Treba da se prikažu odgovarajuće poruke

## 8. Regression testiranje

### 8.1 Prethodne funkcionalnosti

#### TC-034: Chat funkcionalnost (Regression)
**Prioritet:** High

**Test koraci:**
1. Proveri da li sve prethodne funkcionalnosti rade
2. Testiraj da li su nove funkcionalnosti dodane bez breaking changes
3. Proveri da li su podaci migrirani ispravno
4. Testiraj optimizacije

**Expected Result:**
- Sve prethodne funkcionalnosti treba da rade
- Nema breaking changes
- Podaci su migrirani ispravno
- Optimizacije rade

## 9. Test scenariji za edge cases

### 9.1 Network issues

#### TC-035: Slow connection (Optimized)
**Prioritet:** Medium

**Test koraci:**
1. Simuliraj sporu konekciju
2. Proveri da li se timeout-ovi postavljaju
3. Proveri da li se prikazuju odgovarajuće poruke
4. Testiraj async operacije

**Expected Result:**
- Timeout-ovi treba da se postavljaju
- Treba da se prikažu odgovarajuće poruke
- Async operacije treba da se oporave

#### TC-036: No connection
**Prioritet:** Medium

**Test koraci:**
1. Simuliraj nedostupnost interneta
2. Proveri da li se prikazuju odgovarajuće poruke
3. Proveri da li se sistem oporavlja
4. Testiraj cache funkcionalnost

**Expected Result:**
- Treba da se prikažu odgovarajuće poruke
- Sistem treba da se oporavi
- Cache treba da radi offline

### 9.2 Data corruption

#### TC-037: Invalid data
**Prioritet:** Low

**Test koraci:**
1. Testiraj sa oštećenim fajlovima
2. Proveri da li se greške pravilno obrađuju
3. Proveri da li se prikazuju odgovarajuće poruke

**Expected Result:**
- Greške treba da se pravilno obrađuju
- Treba da se prikažu odgovarajuće poruke

### 9.3 Concurrent access

#### TC-038: Multiple users (Optimized)
**Prioritet:** Low

**Test koraci:**
1. Testiraj sa više korisnika
2. Proveri da li se podaci ne prepisuju
3. Proveri da li se sesije održavaju odvojeno
4. Testiraj cache concurrent access

**Expected Result:**
- Podaci se ne prepisuju
- Sesije se održavaju odvojeno
- Cache radi concurrent

## 10. Performance Benchmarking

### 10.1 Baseline vs Optimized Comparison

#### TC-039: Performance Comparison
**Prioritet:** High

**Test koraci:**
1. Meri baseline performanse (pre optimizacija)
2. Meri optimizovane performanse
3. Uporedi rezultate
4. Dokumentuj poboljšanja

**Expected Result:**
- Chat response: 50% poboljšanje (5s → 3s)
- RAG response: 20% poboljšanje (10s → 8s)
- Cache hit: 90% poboljšanje (< 1s)
- Concurrent users: 2x poboljšanje

### 10.2 Scalability Testing

#### TC-040: Scalability Test
**Prioritet:** Medium

**Test koraci:**
1. Testiraj sa 1 korisnikom
2. Testiraj sa 5 korisnika
3. Testiraj sa 10 korisnika
4. Meri response times i throughput

**Expected Result:**
- Response times ostaju konzistentni
- Throughput se skalira linearno
- Nema degradation

## 11. Test checklist za svaki deployment

### 11.1 Pre-deployment
- [ ] Svi unit testovi prolaze
- [ ] Svi integration testovi prolaze
- [ ] Performance testovi prolaze
- [ ] Code review završen
- [ ] Environment varijable postavljene
- [ ] Supabase konekcija testirana
- [ ] Model preloading testiran
- [ ] Cache sistem testiran

### 11.2 Post-deployment
- [ ] Health check endpoint radi
- [ ] Osnovne funkcionalnosti rade
- [ ] Supabase konekcija radi
- [ ] Monitoring postavljen
- [ ] Error logging radi
- [ ] Performance metrike se prikupljaju
- [ ] Cache hit rate > 80%

## 12. Test izveštaj template

### 12.1 Test execution summary
```
Test Suite: AcAIA QA Test Plan (Optimized)
Date: [DATUM]
Tester: [IME]
Environment: [ENVIRONMENT]

Total Test Cases: [BROJ]
Passed: [BROJ]
Failed: [BROJ]
Skipped: [BROJ]
Pass Rate: [PROCENAT]%

Critical Issues: [BROJ]
High Issues: [BROJ]
Medium Issues: [BROJ]
Low Issues: [BROJ]

Performance Metrics:
- Average Chat Response: [VREME]
- Average RAG Response: [VREME]
- Cache Hit Rate: [PROCENAT]%
- Concurrent Users Supported: [BROJ]
```

### 12.2 Failed test cases
```
TC-XXX: [NAZIV TESTA]
Status: Failed
Error: [OPIS GREŠKE]
Steps to reproduce: [KORACI]
Expected: [OČEKIVANI REZULTAT]
Actual: [STVARNI REZULTAT]
Screenshot: [LINK]
```

### 12.3 Performance Analysis
```
Performance Improvements:
- Chat Response: [BROJ]% poboljšanje
- RAG Response: [BROJ]% poboljšanje
- Cache Effectiveness: [BROJ]% hit rate
- Scalability: [BROJ]x poboljšanje

Bottlenecks Identified:
- [LISTA BOTTLENECK-A]

Optimization Recommendations:
- [LISTA PREPORUKA]
```

### 12.4 Recommendations
- [ ] Lista preporuka za poboljšanje
- [ ] Prioriteti za fix-ove
- [ ] Sledeći koraci za optimizaciju

## 13. Automatizacija testova

### 13.1 API testovi
- Koristiti pytest za backend testove
- Automatizovati sve API endpoint-e
- Pokretati na svakom commit-u
- Dodati performance testove

### 13.2 UI testovi
- Koristiti Playwright ili Cypress
- Automatizovati kritične user flows
- Pokretati na svakom deployment-u
- Dodati cache testing

### 13.3 Performance testovi
- Koristiti k6 ili JMeter
- Automatizovati load testove
- Pokretati periodično
- Dodati cache performance testove

### 13.4 Cache testovi
- Automatizovati cache hit/miss testove
- Testirati semantic cache
- Meriti cache effectiveness
- Testirati cache invalidation

## 14. Test maintenance

### 14.1 Ažuriranje test plana
- Ažurirati na svaku veću promenu funkcionalnosti
- Dodavati nove test case-ove po potrebi
- Uklanjati zastarele testove
- Ažurirati performance metrike

### 14.2 Test data management
- Održavati test podatke ažurnim
- Čistiti test podatke periodično
- Backup test podataka
- Održavati cache test data

### 14.3 Performance monitoring
- Pratiti performance metrike
- Ažurirati baseline podatke
- Identifikovati regresije
- Optimizovati testove

---

**Dokument kontrolisan od:** [IME]  
**Datum poslednje izmene:** 30.06.2025  
**Verzija:** 2.1.0  
**Status:** Active 