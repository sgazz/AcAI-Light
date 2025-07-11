# Setup Scripts

Ovaj direktorijum sadrži skripte za setup i održavanje AcAIA aplikacije.

## 📁 Sadržaj

### **SQL Setup Skripte**
- `supabase_setup.sql` - Osnovna Supabase setup (u root backend folderu)
- `career_guidance_setup.sql` - Tabele za career guidance funkcionalnost
- `exam_setup.sql` - Tabele za exam sistem
- `problem_generator_setup.sql` - Tabele za problem generator
- `session_management_setup.sql` - Tabele za session management
- `study_journal_setup.sql` - Tabele za study journal
- `study_room_setup.sql` - Tabele za study room funkcionalnost

### **Python Skripte**
- `process_existing_documents.py` - Procesira postojeće dokumente iz uploads/ foldera

## 🚀 Kako koristiti

### **1. Osnovni Setup**
```bash
# Pokreni osnovnu Supabase setup skriptu
psql -h your-supabase-host -U postgres -d postgres -f supabase_setup.sql
```

### **2. Dodatne Funkcionalnosti**
```bash
# Pokreni setup skripte za dodatne funkcionalnosti (kada budu potrebne)
psql -h your-supabase-host -U postgres -d postgres -f setup_scripts/career_guidance_setup.sql
psql -h your-supabase-host -U postgres -d postgres -f setup_scripts/exam_setup.sql
# ... itd.
```

### **3. Procesiranje Postojećih Dokumenata**
```bash
# Procesiraj sve dokumente iz uploads/ foldera
cd backend
python3 setup_scripts/process_existing_documents.py
```

## 📝 Napomene

- Setup skripte se pokreću samo jednom pri inicijalizaciji
- `process_existing_documents.py` se može pokretati više puta (ima deduplikaciju)
- Sve skripte su idempotentne (bezbedne za višestruko pokretanje) 