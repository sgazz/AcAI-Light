# Study Journal - Plan Implementacije

## 📚 Pregled Funkcionalnosti

Study Journal je personalizovani sistem za praćenje učenja koji omogućava studentima da:
- **Bilježe napredak** u različitim predmetima
- **Kreiraju dnevnik učenja** sa refleksijama i zapažanjima
- **Prate ciljeve** i postignuća
- **Analiziraju statistike** učenja
- **Kreiraju flashcards** za ponavljanje
- **Planiraju sesije** učenja
- **Integrišu se** sa postojećim chat istorijom i problem generatorom

## 🏗️ Arhitektura

### Backend Komponente
1. **Study Journal Service** - glavni servis za upravljanje dnevnikom
2. **Journal Entry Manager** - upravljanje unosima u dnevnik
3. **Goal Tracker** - praćenje ciljeva i postignuća
4. **Flashcard System** - kreiranje i upravljanje flashcards
5. **Analytics Engine** - analiza napretka i statistika
6. **Integration Service** - povezivanje sa chat istorijom i problem generatorom

### Frontend Komponente
1. **StudyJournal.tsx** - glavna komponenta
2. **JournalEntry.tsx** - unos u dnevnik
3. **GoalTracker.tsx** - praćenje ciljeva
4. **FlashcardManager.tsx** - upravljanje flashcards
5. **StudyAnalytics.tsx** - analitika i statistike
6. **StudyPlanner.tsx** - planiranje sesija

### Supabase Tabele
1. **study_journal_entries** - unosima u dnevnik
2. **study_goals** - ciljevi učenja
3. **study_flashcards** - flashcards
4. **study_sessions** - planirane sesije
5. **study_analytics** - analitika i statistike

## 📊 Struktura Baze Podataka

### 1. study_journal_entries
```sql
- id (UUID, PK)
- user_id (VARCHAR)
- subject (VARCHAR)
- topic (VARCHAR)
- entry_type (ENUM: 'reflection', 'note', 'question', 'achievement')
- content (TEXT)
- mood_rating (INTEGER 1-5)
- study_time_minutes (INTEGER)
- difficulty_level (ENUM: 'easy', 'medium', 'hard')
- tags (JSONB)
- related_chat_session (VARCHAR) -- povezivanje sa chat istorijom
- related_problem_id (UUID) -- povezivanje sa problem generatorom
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 2. study_goals
```sql
- id (UUID, PK)
- user_id (VARCHAR)
- title (VARCHAR)
- description (TEXT)
- subject (VARCHAR)
- target_date (DATE)
- goal_type (ENUM: 'daily', 'weekly', 'monthly', 'custom')
- target_value (INTEGER) -- npr. broj sati, broj problema
- current_value (INTEGER)
- status (ENUM: 'active', 'completed', 'overdue')
- priority (ENUM: 'low', 'medium', 'high')
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 3. study_flashcards
```sql
- id (UUID, PK)
- user_id (VARCHAR)
- subject (VARCHAR)
- topic (VARCHAR)
- front_content (TEXT)
- back_content (TEXT)
- difficulty_level (ENUM: 'easy', 'medium', 'hard')
- last_reviewed (TIMESTAMP)
- review_count (INTEGER)
- mastery_level (INTEGER 1-5)
- tags (JSONB)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 4. study_sessions
```sql
- id (UUID, PK)
- user_id (VARCHAR)
- title (VARCHAR)
- description (TEXT)
- subject (VARCHAR)
- planned_duration_minutes (INTEGER)
- actual_duration_minutes (INTEGER)
- session_type (ENUM: 'review', 'practice', 'new_material', 'exam_prep')
- status (ENUM: 'planned', 'in_progress', 'completed', 'cancelled')
- scheduled_at (TIMESTAMP)
- started_at (TIMESTAMP)
- completed_at (TIMESTAMP)
- notes (TEXT)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

### 5. study_analytics
```sql
- id (UUID, PK)
- user_id (VARCHAR)
- date (DATE)
- total_study_time_minutes (INTEGER)
- subjects_studied (JSONB)
- entries_created (INTEGER)
- goals_progress (JSONB)
- flashcards_reviewed (INTEGER)
- mood_average (DECIMAL)
- created_at (TIMESTAMP)
```

## 🔄 Integracija sa Postojećim Sistemom

### Chat History Integracija
- **Povezivanje**: Svaki journal entry može biti povezan sa chat sesijom
- **Automatsko kreiranje**: Nakon chat sesije, predlaže se kreiranje journal entry-ja
- **Kontekst**: Journal entry može sadržati ključne tačke iz chat konverzacije

### Problem Generator Integracija
- **Povezivanje**: Journal entry može biti povezan sa rešenim problemom
- **Refleksija**: Student može zabeležiti kako je rešio problem
- **Težina**: Praćenje težine problema i napretka

### Study Room Integracija
- **Grupno učenje**: Journal entry može biti povezan sa study room sesijom
- **Kolaborativne beleške**: Deljenje journal entry-ja sa članovima sobe

## 🎯 Korisnički Scenariji

### 1. Dnevno Praćenje
```
Student otvara Study Journal nakon učenja:
1. Kreira journal entry sa refleksijom
2. Ocenjuje svoje raspoloženje (1-5)
3. Beleži vreme učenja
4. Dodaje tagove za kategorizaciju
5. Povezuje sa chat sesijom ili problemom
```

### 2. Postavljanje Ciljeva
```
Student postavlja ciljeve za učenje:
1. Definiše cilj (npr. "Naučiti diferencijalni račun")
2. Postavlja target datum
3. Definiše mernu jedinicu (sati, problemi, poglavlja)
4. Prati napredak
5. Dobija notifikacije o deadline-ovima
```

### 3. Flashcard Kreiranje
```
Student kreira flashcards iz učenog materijala:
1. Iz chat istorije ili journal entry-ja
2. Definiše front i back stranu
3. Postavlja težinu
4. Prati mastery level
5. Dobija reminders za ponavljanje
```

### 4. Analitika i Refleksija
```
Student analizira svoj napredak:
1. Pregleda statistike učenja
2. Analizira trendove raspoloženja
3. Identifikuje najefikasnije metode
4. Planira poboljšanja
5. Postavlja nove ciljeve
```

## 🚀 Implementacijski Koraci

### Faza 1: Backend Setup
1. ✅ Kreiranje SQL skripte za tabele
2. 🔄 Implementacija Study Journal servisa
3. 🔄 API endpointi za CRUD operacije
4. 🔄 Integracija sa postojećim sistemom

### Faza 2: Frontend Komponente
1. 🔄 StudyJournal glavna komponenta
2. 🔄 JournalEntry forma
3. 🔄 GoalTracker komponenta
4. 🔄 FlashcardManager
5. 🔄 StudyAnalytics dashboard

### Faza 3: Integracija
1. 🔄 Povezivanje sa chat istorijom
2. 🔄 Povezivanje sa problem generatorom
3. 🔄 Povezivanje sa study room-om
4. 🔄 Automatsko kreiranje entry-ja

### Faza 4: Napredne Funkcionalnosti
1. 🔄 AI preporuke za učenje
2. 🔄 Automatska kategorizacija
3. 🔄 Napredna analitika
4. 🔄 Export/Import funkcionalnosti

## 📈 Metrike i Analitika

### Praćene Metrike
- **Vreme učenja** po predmetu/danu
- **Napredak u ciljevima** (procenat završenosti)
- **Mastery level** flashcards
- **Raspoloženje** tokom učenja
- **Težina materijala** koji se uči
- **Efikasnost** različitih metoda učenja

### Dashboard Widgets
- **Dnevni pregled** aktivnosti
- **Nedeljni napredak** u ciljevima
- **Trend raspoloženja** tokom vremena
- **Najaktivniji predmeti**
- **Flashcards za ponavljanje**
- **Predstojeći deadline-ovi**

## 🔧 Tehnički Detalji

### Backend API Endpoints
```
POST   /study-journal/entries          # Kreiraj journal entry
GET    /study-journal/entries          # Dohvati journal entries
PUT    /study-journal/entries/{id}     # Ažuriraj journal entry
DELETE /study-journal/entries/{id}     # Obriši journal entry

POST   /study-journal/goals            # Kreiraj cilj
GET    /study-journal/goals            # Dohvati ciljeve
PUT    /study-journal/goals/{id}       # Ažuriraj cilj
DELETE /study-journal/goals/{id}       # Obriši cilj

POST   /study-journal/flashcards       # Kreiraj flashcard
GET    /study-journal/flashcards       # Dohvati flashcards
PUT    /study-journal/flashcards/{id}  # Ažuriraj flashcard
DELETE /study-journal/flashcards/{id}  # Obriši flashcard

GET    /study-journal/analytics        # Dohvati analitiku
GET    /study-journal/sessions         # Dohvati planirane sesije
POST   /study-journal/sessions         # Kreiraj sesiju
```

### Frontend Routing
```
/study-journal                    # Glavni dashboard
/study-journal/entries           # Lista journal entries
/study-journal/entries/new       # Novi journal entry
/study-journal/goals             # Ciljevi
/study-journal/flashcards        # Flashcards
/study-journal/analytics         # Analitika
/study-journal/planner           # Planer sesija
```

## 🎨 UI/UX Dizajn

### Glavni Dashboard
- **Kartice** za brzi pregled aktivnosti
- **Grafikoni** za vizualizaciju napretka
- **Kalendar** za praćenje sesija
- **Quick actions** za brzo kreiranje entry-ja

### Journal Entry Form
- **Rich text editor** za sadržaj
- **Mood selector** (emoji ili brojevi)
- **Tag selector** sa autocomplete
- **Subject/topic selector**
- **Time tracker** integracija

### Flashcard Interface
- **Flip animation** za front/back
- **Difficulty rating** nakon review-a
- **Spaced repetition** algoritam
- **Bulk operations** za kreiranje

## 🔒 Sigurnost i Privatnost

### Podaci
- **Enkripcija** osetljivih podataka
- **User isolation** - korisnici vide samo svoje podatke
- **Backup strategija** za journal entries
- **Export opcije** za korisničke podatke

### Pristup
- **Row Level Security** u Supabase
- **API autentifikacija** (za buduću auth implementaciju)
- **Rate limiting** za API pozive
- **Input validacija** i sanitizacija

## 📱 Responsive Dizajn

### Desktop
- **Sidebar navigation** sa svim opcijama
- **Multi-column layout** za dashboard
- **Advanced filtering** i search
- **Bulk operations** za upravljanje

### Mobile
- **Bottom navigation** za glavne sekcije
- **Swipe gestures** za flashcards
- **Voice input** za journal entries
- **Offline support** za osnovne funkcionalnosti

## 🧪 Testiranje

### Unit Tests
- **Study Journal Service** testovi
- **API endpoint** testovi
- **Database operation** testovi
- **Integration** testovi

### E2E Tests
- **Journal entry** workflow
- **Goal tracking** workflow
- **Flashcard** workflow
- **Analytics** workflow

### Performance Tests
- **Database query** optimizacija
- **API response** vremena
- **Frontend rendering** performanse
- **Memory usage** optimizacija

## 📚 Dokumentacija

### Korisnička Dokumentacija
- **User guide** za sve funkcionalnosti
- **Video tutorials** za kompleksne workflow-ove
- **FAQ** sekcija
- **Best practices** za efikasno učenje

### Tehnička Dokumentacija
- **API dokumentacija** (OpenAPI/Swagger)
- **Database schema** dokumentacija
- **Component** dokumentacija
- **Deployment** instrukcije

## 🎯 Success Metrics

### Kratkoročni (1-2 nedelje)
- ✅ SQL tabele kreirane u Supabase
- ✅ Backend API endpointi implementirani
- ✅ Osnovne frontend komponente kreirane
- ✅ CRUD operacije funkcionalne

### Srednjoročni (1-2 meseca)
- 🔄 Integracija sa chat istorijom
- 🔄 Integracija sa problem generatorom
- 🔄 Napredna analitika implementirana
- 🔄 Flashcard sistem funkcionalan

### Dugoročni (3+ meseca)
- 🔄 AI preporuke implementirane
- 🔄 Mobile app verzija
- 🔄 Offline funkcionalnosti
- 🔄 Advanced analytics i ML features

---

**Status**: 🟡 U razvoju  
**Prioritet**: Visok  
**Tim**: Backend + Frontend  
**Deadline**: 2-3 nedelje za MVP 