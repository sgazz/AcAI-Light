# QA Test Plan - AcAIA System

## Dokument informacije
- **Projekat:** AcAIA (AI-powered Study Assistant)
- **Verzija:** 2.0.0 (Supabase-only)
- **Datum kreiranja:** 30.06.2025
- **Status:** Draft
- **Test Lead:** TBD
- **Test Environment:** Local Development + Supabase Cloud

## 1. Uvod

### 1.1 Svrha dokumenta
Ovaj dokument definiše sveobuhvatan plan za testiranje AcAIA sistema koji je nedavno migriran sa lokalne SQLite baze na Supabase cloud bazu. Plan pokriva funkcionalno, ne-funkcionalno, integraciono i security testiranje.

### 1.2 Scope testiranja
- Backend API (FastAPI na portu 8001)
- Frontend aplikacija (Next.js na portu 3000)
- Supabase integracija
- Ollama AI model integracija
- OCR funkcionalnost
- Session management
- Document management

### 1.3 Out of scope
- Testiranje Ollama modela samih po sebi
- Performance testiranje Supabase servisa
- Load testing sa više od 100 korisnika

## 2. Test strategija

### 2.1 Test pristup
- **Manual testing** za UI/UX funkcionalnosti
- **Automated testing** za API endpoint-e
- **Integration testing** za Supabase konekcije
- **Security testing** za input validation

### 2.2 Test environment
- **Backend:** http://localhost:8001
- **Frontend:** http://localhost:3000
- **Supabase:** Cloud instance
- **Ollama:** http://localhost:11434

### 2.3 Test data
- Test dokumenti: `tests/data/documents/`
- Test slike: `tests/data/images/`
- Test poruke: Predefinisane chat poruke

## 3. Funkcionalno testiranje

### 3.1 Chat funkcionalnost

#### TC-001: Osnovni chat
**Prioritet:** High  
**Precondition:** Backend i frontend serveri pokrenuti

**Test koraci:**
1. Otvori aplikaciju u browser-u
2. Klikni na chat polje
3. Unesi poruku: "Zdravo! Kako si?"
4. Pritisni Enter ili klikni Send
5. Sačekaj AI odgovor

**Expected Result:**
- AI treba da odgovori u roku od 5 sekundi
- Poruka treba da se prikaže u chat istoriji
- Poruka treba da se sačuva u Supabase

**Acceptance Criteria:**
- [ ] AI odgovara na poruku
- [ ] Poruka se prikazuje u chat istoriji
- [ ] Poruka se čuva u Supabase chat_history tabeli

#### TC-002: Chat istorija
**Prioritet:** High

**Test koraci:**
1. Pošalji nekoliko poruka u chat-u
2. Osveži stranicu
3. Proveri da li se poruke prikazuju
4. Kreiraj novu sesiju
5. Vrati se na prethodnu sesiju

**Expected Result:**
- Poruke treba da se zadrže nakon osvežavanja
- Različite sesije treba da imaju različite poruke

#### TC-003: Session management
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

### 3.2 RAG (Retrieval-Augmented Generation)

#### TC-004: Upload dokumenata
**Prioritet:** High

**Test koraci:**
1. Klikni na "Upload Document"
2. Izaberi PDF fajl
3. Sačekaj upload
4. Proveri da li se dokument prikazuje u listi

**Expected Result:**
- Dokument treba da se upload-uje
- Treba da se prikaže u listi dokumenata
- Treba da se sačuva u Supabase

#### TC-005: RAG chat
**Prioritet:** High

**Test koraci:**
1. Upload dokument sa tekstom o veštačkoj inteligenciji
2. U chat-u postavi pitanje: "Šta je veštačka inteligencija?"
3. Sačekaj odgovor

**Expected Result:**
- AI treba da koristi informacije iz dokumenta
- Treba da prikaže izvore (sources)
- Odgovor treba da bude relevantan

#### TC-006: Document management
**Prioritet:** Medium

**Test koraci:**
1. Upload nekoliko dokumenata
2. Proveri listu dokumenata
3. Obriši jedan dokument
4. Proveri da li je obrisan

**Expected Result:**
- Dokumenti treba da se prikazuju u listi
- Brisanje treba da ukloni dokument iz sistema

### 3.3 OCR funkcionalnost

#### TC-007: OCR ekstrakcija
**Prioritet:** Medium

**Test koraci:**
1. Klikni na "OCR" opciju
2. Upload sliku sa tekstom
3. Sačekaj OCR obrada
4. Proveri ekstraktovani tekst

**Expected Result:**
- OCR treba da ekstraktuje tekst iz slike
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

#### TC-009: Session metadata
**Prioritet:** Medium

**Test koraci:**
1. Kreiraj novu sesiju
2. Dodaj naziv: "Test Session"
3. Dodaj opis: "Test session za QA"
4. Sačuvaj
5. Proveri da li se metadata čuva

**Expected Result:**
- Metadata treba da se sačuva u Supabase
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

### 4.1 Performanse

#### TC-012: Response time
**Prioritet:** High

**Test koraci:**
1. Meri vreme odgovora za chat (< 5s)
2. Meri vreme odgovora za RAG (< 10s)
3. Meri vreme odgovora za OCR (< 30s)
4. Meri vreme upload-a dokumenata

**Acceptance Criteria:**
- [ ] Chat response < 5 sekundi
- [ ] RAG response < 10 sekundi
- [ ] OCR response < 30 sekundi
- [ ] Document upload < 60 sekundi (za 10MB fajl)

#### TC-013: Load testing
**Prioritet:** Medium

**Test koraci:**
1. Simuliraj 10 paralelnih korisnika
2. Pošalji zahteve istovremeno
3. Proveri da li sistem održava performanse

**Expected Result:**
- Sistem treba da održava performanse
- Ne treba da dođe do grešaka

### 4.2 Pouzdanost

#### TC-014: Error handling
**Prioritet:** High

**Test koraci:**
1. Testiraj sa praznim porukama
2. Testiraj sa nevalidnim fajlovima
3. Testiraj sa nedostupnim Supabase servisom
4. Proveri da li se greške prikazuju korisniku

**Expected Result:**
- Greške treba da se prikažu jasno
- Sistem treba da se oporavi nakon greške

#### TC-015: Data consistency
**Prioritet:** High

**Test koraci:**
1. Kreiraj podatke u različitim sesijama
2. Proveri da li se podaci čuvaju konzistentno
3. Testiraj sa prekidima konekcije

**Expected Result:**
- Podaci treba da se čuvaju konzistentno
- Ne treba da dođe do gubitka podataka

### 4.3 Korisničko iskustvo

#### TC-016: Responsive design
**Prioritet:** Medium

**Test koraci:**
1. Testiraj na desktop (1920x1080)
2. Testiraj na tablet (768x1024)
3. Testiraj na mobile (375x667)
4. Proveri da li se UI prilagođava

**Expected Result:**
- UI treba da se prilagođava različitim veličinama
- Funkcionalnost treba da radi na svim uređajima

#### TC-017: Browser compatibility
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

#### TC-018: API komunikacija
**Prioritet:** High

**Test koraci:**
1. Proveri sve API endpoint-e
2. Testiraj da li se podaci sinhronizuju
3. Proveri da li se greške prosleđuju

**Expected Result:**
- Svi API pozivi treba da rade
- Podaci treba da se sinhronizuju
- Greške treba da se prosleđuju frontendu

### 5.2 Supabase integracija

#### TC-019: Database operacije
**Prioritet:** High

**Test koraci:**
1. Proveri da li se podaci čuvaju u Supabase
2. Proveri da li se podaci čitaju ispravno
3. Proveri foreign key veze

**Expected Result:**
- Podaci treba da se čuvaju u Supabase
- Podaci treba da se čitaju ispravno
- Veze treba da se održavaju

### 5.3 Ollama integracija

#### TC-020: AI model
**Prioritet:** High

**Test koraci:**
1. Proveri da li Ollama odgovara
2. Testiraj sa različitim modelima
3. Proveri da li se odgovori čuvaju

**Expected Result:**
- Ollama treba da odgovara
- AI odgovori treba da se čuvaju

## 6. Security testiranje

### 6.1 Input validation

#### TC-021: SQL injection
**Prioritet:** High

**Test koraci:**
1. Unesi SQL komande u input polja
2. Proveri da li se input sanitizuje
3. Proveri da li se greške prikazuju

**Expected Result:**
- SQL injection treba da bude sprečen
- Input treba da se sanitizuje

#### TC-022: XSS (Cross-Site Scripting)
**Prioritet:** High

**Test koraci:**
1. Unesi JavaScript kod u input polja
2. Proveri da li se kod escape-uje
3. Proveri da li se ne izvršava

**Expected Result:**
- XSS treba da bude sprečen
- Kod treba da se escape-uje

### 6.2 File upload security

#### TC-023: File type validation
**Prioritet:** High

**Test koraci:**
1. Pokušaj upload različitih tipova fajlova
2. Proveri da li se odbijaju opasni fajlovi
3. Proveri da li se prihvataju samo dozvoljeni tipovi

**Expected Result:**
- Opasni fajlovi treba da se odbijaju
- Samo dozvoljeni tipovi treba da se prihvataju

#### TC-024: File size limits
**Prioritet:** Medium

**Test koraci:**
1. Pokušaj upload velikih fajlova
2. Proveri da li se postavljaju ograničenja
3. Proveri da li se prikazuju odgovarajuće poruke

**Expected Result:**
- Veliki fajlovi treba da se odbijaju
- Treba da se prikažu odgovarajuće poruke

## 7. Regression testiranje

### 7.1 Prethodne funkcionalnosti

#### TC-025: Chat funkcionalnost
**Prioritet:** High

**Test koraci:**
1. Proveri da li sve prethodne funkcionalnosti rade
2. Testiraj da li su nove funkcionalnosti dodane bez breaking changes
3. Proveri da li su podaci migrirani ispravno

**Expected Result:**
- Sve prethodne funkcionalnosti treba da rade
- Nema breaking changes
- Podaci su migrirani ispravno

## 8. Test scenariji za edge cases

### 8.1 Network issues

#### TC-026: Slow connection
**Prioritet:** Medium

**Test koraci:**
1. Simuliraj sporu konekciju
2. Proveri da li se timeout-ovi postavljaju
3. Proveri da li se prikazuju odgovarajuće poruke

**Expected Result:**
- Timeout-ovi treba da se postavljaju
- Treba da se prikažu odgovarajuće poruke

#### TC-027: No connection
**Prioritet:** Medium

**Test koraci:**
1. Simuliraj nedostupnost interneta
2. Proveri da li se prikazuju odgovarajuće poruke
3. Proveri da li se sistem oporavlja

**Expected Result:**
- Treba da se prikažu odgovarajuće poruke
- Sistem treba da se oporavi

### 8.2 Data corruption

#### TC-028: Invalid data
**Prioritet:** Low

**Test koraci:**
1. Testiraj sa oštećenim fajlovima
2. Proveri da li se greške pravilno obrađuju
3. Proveri da li se prikazuju odgovarajuće poruke

**Expected Result:**
- Greške treba da se pravilno obrađuju
- Treba da se prikažu odgovarajuće poruke

### 8.3 Concurrent access

#### TC-029: Multiple users
**Prioritet:** Low

**Test koraci:**
1. Testiraj sa više korisnika
2. Proveri da li se podaci ne prepisuju
3. Proveri da li se sesije održavaju odvojeno

**Expected Result:**
- Podaci se ne prepisuju
- Sesije se održavaju odvojeno

## 9. Test checklist za svaki deployment

### 9.1 Pre-deployment
- [ ] Svi unit testovi prolaze
- [ ] Svi integration testovi prolaze
- [ ] Code review završen
- [ ] Environment varijable postavljene
- [ ] Supabase konekcija testirana

### 9.2 Post-deployment
- [ ] Health check endpoint radi
- [ ] Osnovne funkcionalnosti rade
- [ ] Supabase konekcija radi
- [ ] Monitoring postavljen
- [ ] Error logging radi

## 10. Test izveštaj template

### 10.1 Test execution summary
```
Test Suite: AcAIA QA Test Plan
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
```

### 10.2 Failed test cases
```
TC-XXX: [NAZIV TESTA]
Status: Failed
Error: [OPIS GREŠKE]
Steps to reproduce: [KORACI]
Expected: [OČEKIVANI REZULTAT]
Actual: [STVARNI REZULTAT]
Screenshot: [LINK]
```

### 10.3 Recommendations
- [ ] Lista preporuka za poboljšanje
- [ ] Prioriteti za fix-ove
- [ ] Sledeći koraci

## 11. Automatizacija testova

### 11.1 API testovi
- Koristiti pytest za backend testove
- Automatizovati sve API endpoint-e
- Pokretati na svakom commit-u

### 11.2 UI testovi
- Koristiti Playwright ili Cypress
- Automatizovati kritične user flows
- Pokretati na svakom deployment-u

### 11.3 Performance testovi
- Koristiti k6 ili JMeter
- Automatizovati load testove
- Pokretati periodično

## 12. Test maintenance

### 12.1 Ažuriranje test plana
- Ažurirati na svaku veću promenu funkcionalnosti
- Dodavati nove test case-ove po potrebi
- Uklanjati zastarele testove

### 12.2 Test data management
- Održavati test podatke ažurnim
- Čistiti test podatke periodično
- Backup test podataka

---

**Dokument kontrolisan od:** [IME]  
**Datum poslednje izmene:** 30.06.2025  
**Verzija:** 1.0  
**Status:** Draft 