-- AcAIA SQLite Database Setup
-- Ova skripta kreira potrebne tabele za AcAIA projekat

-- Omogućavanje foreign key constraints
PRAGMA foreign_keys = ON;

-- ============================================================================
-- SESSION MANAGEMENT TABELE
-- ============================================================================

-- Tabela za session metadata
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    description TEXT,
    user_id VARCHAR(255) DEFAULT 'default_user',
    is_archived BOOLEAN DEFAULT 0,
    archived_at DATETIME,
    archived_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela za session kategorije
CREATE TABLE IF NOT EXISTS session_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(255) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE,
    UNIQUE(session_id, category_name)
);

-- Tabela za session sharing
CREATE TABLE IF NOT EXISTS session_sharing (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(255) NOT NULL,
    share_link VARCHAR(255) UNIQUE NOT NULL,
    permissions VARCHAR(20) DEFAULT 'read',
    expires_at DATETIME,
    max_accesses INTEGER,
    current_accesses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

-- ============================================================================
-- CHAT HISTORY TABELE
-- ============================================================================

-- Tabela za chat istoriju
CREATE TABLE IF NOT EXISTS chat_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id VARCHAR(255) NOT NULL,
    message_id VARCHAR(255) UNIQUE NOT NULL,
    sender VARCHAR(50) NOT NULL, -- 'user' ili 'assistant'
    content TEXT NOT NULL,
    sources TEXT, -- JSON string
    metadata TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
);

-- ============================================================================
-- DOCUMENT MANAGEMENT TABELE
-- ============================================================================

-- Tabela za dokumente
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id VARCHAR(255) UNIQUE NOT NULL,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    content TEXT,
    metadata TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela za vektore (embeddings)
CREATE TABLE IF NOT EXISTS document_vectors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id VARCHAR(255) NOT NULL,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding_data TEXT, -- JSON string sa vektorom
    metadata TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (document_id) REFERENCES documents(document_id) ON DELETE CASCADE
);

-- ============================================================================
-- OCR TABELE
-- ============================================================================

-- Tabela za OCR obrađene slike
CREATE TABLE IF NOT EXISTS ocr_images (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    image_id VARCHAR(255) UNIQUE NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    processed_filename VARCHAR(255),
    original_path VARCHAR(500) NOT NULL,
    processed_path VARCHAR(500),
    ocr_text TEXT,
    confidence_score REAL,
    language VARCHAR(10) DEFAULT 'srp+eng',
    metadata TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- STUDY ROOM TABELE
-- ============================================================================

-- Tabela za study room-ove
CREATE TABLE IF NOT EXISTS study_rooms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    max_participants INTEGER DEFAULT 10,
    admin_user_id VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela za study room članove
CREATE TABLE IF NOT EXISTS study_room_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (room_id) REFERENCES study_rooms(room_id) ON DELETE CASCADE,
    UNIQUE(room_id, user_id)
);

-- Tabela za study room poruke
CREATE TABLE IF NOT EXISTS study_room_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    room_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'text',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES study_rooms(room_id) ON DELETE CASCADE
);

-- ============================================================================
-- STUDY JOURNAL TABELE
-- ============================================================================

-- Tabela za study journal unose
CREATE TABLE IF NOT EXISTS study_journal_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    subject VARCHAR(100),
    topic VARCHAR(255),
    entry_type VARCHAR(50) NOT NULL, -- 'reflection', 'note', 'question', 'achievement'
    content TEXT NOT NULL,
    mood_rating INTEGER, -- 1-10
    study_time_minutes INTEGER,
    difficulty_level VARCHAR(20), -- 'easy', 'medium', 'hard'
    tags TEXT, -- JSON string
    related_chat_session VARCHAR(255),
    related_problem_id VARCHAR(255),
    related_study_room_id VARCHAR(255),
    is_public BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela za study ciljeve
CREATE TABLE IF NOT EXISTS study_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    goal_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    target_date DATETIME,
    goal_type VARCHAR(50) NOT NULL, -- 'daily', 'weekly', 'monthly', 'custom'
    target_value INTEGER NOT NULL,
    current_value INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'overdue', 'cancelled'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high'
    measurement_unit VARCHAR(50),
    tags TEXT, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela za flashcards
CREATE TABLE IF NOT EXISTS flashcards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flashcard_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    subject VARCHAR(100),
    topic VARCHAR(255),
    front_content TEXT NOT NULL,
    back_content TEXT NOT NULL,
    difficulty_level VARCHAR(20) DEFAULT 'medium',
    tags TEXT, -- JSON string
    is_archived BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela za flashcard reviews
CREATE TABLE IF NOT EXISTS flashcard_reviews (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    flashcard_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    difficulty_rating INTEGER NOT NULL, -- 1-5
    was_correct BOOLEAN NOT NULL,
    response_time_seconds REAL,
    reviewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (flashcard_id) REFERENCES flashcards(flashcard_id) ON DELETE CASCADE
);

-- ============================================================================
-- EXAM TABELE
-- ============================================================================

-- Tabela za ispite
CREATE TABLE IF NOT EXISTS exams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exam_id VARCHAR(255) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    duration_minutes INTEGER DEFAULT 60,
    total_points INTEGER DEFAULT 100,
    passing_score INTEGER DEFAULT 60,
    questions TEXT, -- JSON string
    created_by VARCHAR(255) NOT NULL,
    is_public BOOLEAN DEFAULT 0,
    allow_retakes BOOLEAN DEFAULT 1,
    max_attempts INTEGER DEFAULT 3,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela za exam pokušaje
CREATE TABLE IF NOT EXISTS exam_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    attempt_id VARCHAR(255) UNIQUE NOT NULL,
    exam_id VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    score INTEGER,
    answers TEXT, -- JSON string
    status VARCHAR(50) DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
    FOREIGN KEY (exam_id) REFERENCES exams(exam_id) ON DELETE CASCADE
);

-- ============================================================================
-- PROBLEM GENERATOR TABELE
-- ============================================================================

-- Tabela za probleme
CREATE TABLE IF NOT EXISTS problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    problem_id VARCHAR(255) UNIQUE NOT NULL,
    subject VARCHAR(100) NOT NULL,
    topic VARCHAR(255),
    difficulty_level VARCHAR(20) DEFAULT 'medium',
    problem_text TEXT NOT NULL,
    solution TEXT,
    answer_type VARCHAR(50) DEFAULT 'text', -- 'text', 'multiple_choice', 'numeric'
    options TEXT, -- JSON string za multiple choice
    correct_answer TEXT,
    explanation TEXT,
    tags TEXT, -- JSON string
    created_by VARCHAR(255) DEFAULT 'system',
    is_public BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela za problem kategorije
CREATE TABLE IF NOT EXISTS problem_categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    parent_category_id VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_category_id) REFERENCES problem_categories(category_id) ON DELETE SET NULL
);

-- ============================================================================
-- CAREER GUIDANCE TABELE
-- ============================================================================

-- Tabela za career profile
CREATE TABLE IF NOT EXISTS career_profiles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    profile_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) UNIQUE NOT NULL,
    current_position VARCHAR(255),
    years_of_experience INTEGER,
    education_level VARCHAR(100),
    preferred_industries TEXT, -- JSON string
    salary_expectations INTEGER,
    location_preferences TEXT, -- JSON string
    remote_work_preference BOOLEAN DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela za skills
CREATE TABLE IF NOT EXISTS skills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    skill_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    skill_name VARCHAR(255) NOT NULL,
    skill_category VARCHAR(100),
    proficiency_level INTEGER NOT NULL, -- 1-5
    years_of_experience INTEGER,
    is_certified BOOLEAN DEFAULT 0,
    certification_name VARCHAR(255),
    certification_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela za career assessments
CREATE TABLE IF NOT EXISTS career_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    assessment_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    assessment_type VARCHAR(100) NOT NULL,
    assessment_name VARCHAR(255) NOT NULL,
    questions TEXT, -- JSON string
    answers TEXT, -- JSON string
    results TEXT, -- JSON string
    completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela za job recommendations
CREATE TABLE IF NOT EXISTS job_recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    job_id VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    job_title VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    location VARCHAR(255),
    salary_range VARCHAR(100),
    job_description TEXT,
    requirements TEXT, -- JSON string
    match_score REAL, -- 0-100
    status VARCHAR(50) DEFAULT 'recommended', -- 'recommended', 'applied', 'interviewed', 'offered', 'rejected'
    application_date DATE,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- CACHE I ANALYTICS TABELE
-- ============================================================================

-- Tabela za cache
CREATE TABLE IF NOT EXISTS cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    cache_key VARCHAR(255) UNIQUE NOT NULL,
    cache_value TEXT NOT NULL,
    cache_type VARCHAR(50) DEFAULT 'general',
    expires_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela za analytics
CREATE TABLE IF NOT EXISTS analytics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type VARCHAR(100) NOT NULL,
    event_data TEXT, -- JSON string
    user_id VARCHAR(255),
    session_id VARCHAR(255),
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- INDEKSI ZA BOLJE PERFORMANSE
-- ============================================================================

-- Session indeksi
CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_sessions_is_archived ON sessions(is_archived);

-- Chat history indeksi
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_history_sender ON chat_history(sender);

-- Document indeksi
CREATE INDEX IF NOT EXISTS idx_documents_document_id ON documents(document_id);
CREATE INDEX IF NOT EXISTS idx_documents_filename ON documents(filename);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

-- Document vectors indeksi
CREATE INDEX IF NOT EXISTS idx_document_vectors_document_id ON document_vectors(document_id);
CREATE INDEX IF NOT EXISTS idx_document_vectors_chunk_index ON document_vectors(chunk_index);

-- OCR indeksi
CREATE INDEX IF NOT EXISTS idx_ocr_images_image_id ON ocr_images(image_id);
CREATE INDEX IF NOT EXISTS idx_ocr_images_filename ON ocr_images(original_filename);
CREATE INDEX IF NOT EXISTS idx_ocr_images_created_at ON ocr_images(created_at);

-- Study room indeksi
CREATE INDEX IF NOT EXISTS idx_study_rooms_room_id ON study_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_study_rooms_admin_user_id ON study_rooms(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_study_rooms_is_active ON study_rooms(is_active);

-- Study journal indeksi
CREATE INDEX IF NOT EXISTS idx_study_journal_entries_user_id ON study_journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_study_journal_entries_subject ON study_journal_entries(subject);
CREATE INDEX IF NOT EXISTS idx_study_journal_entries_entry_type ON study_journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_study_journal_entries_created_at ON study_journal_entries(created_at);

-- Exam indeksi
CREATE INDEX IF NOT EXISTS idx_exams_exam_id ON exams(exam_id);
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON exams(created_by);
CREATE INDEX IF NOT EXISTS idx_exams_subject ON exams(subject);

-- Problem indeksi
CREATE INDEX IF NOT EXISTS idx_problems_problem_id ON problems(problem_id);
CREATE INDEX IF NOT EXISTS idx_problems_subject ON problems(subject);
CREATE INDEX IF NOT EXISTS idx_problems_difficulty_level ON problems(difficulty_level);

-- Career indeksi
CREATE INDEX IF NOT EXISTS idx_career_profiles_user_id ON career_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_user_id ON skills(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_skill_category ON skills(skill_category);

-- Cache indeksi
CREATE INDEX IF NOT EXISTS idx_cache_cache_key ON cache(cache_key);
CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache(expires_at);

-- Analytics indeksi
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);

-- ============================================================================
-- TRIGGERI ZA AUTOMATSKO AŽURIRANJE
-- ============================================================================

-- Trigger za automatsko ažuriranje updated_at polja u sessions tabeli
CREATE TRIGGER IF NOT EXISTS update_sessions_updated_at
    AFTER UPDATE ON sessions
    FOR EACH ROW
BEGIN
    UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger za automatsko ažuriranje updated_at polja u documents tabeli
CREATE TRIGGER IF NOT EXISTS update_documents_updated_at
    AFTER UPDATE ON documents
    FOR EACH ROW
BEGIN
    UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger za automatsko ažuriranje updated_at polja u study_journal_entries tabeli
CREATE TRIGGER IF NOT EXISTS update_study_journal_entries_updated_at
    AFTER UPDATE ON study_journal_entries
    FOR EACH ROW
BEGIN
    UPDATE study_journal_entries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger za automatsko ažuriranje updated_at polja u study_goals tabeli
CREATE TRIGGER IF NOT EXISTS update_study_goals_updated_at
    AFTER UPDATE ON study_goals
    FOR EACH ROW
BEGIN
    UPDATE study_goals SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger za automatsko ažuriranje updated_at polja u flashcards tabeli
CREATE TRIGGER IF NOT EXISTS update_flashcards_updated_at
    AFTER UPDATE ON flashcards
    FOR EACH ROW
BEGIN
    UPDATE flashcards SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger za automatsko ažuriranje updated_at polja u exams tabeli
CREATE TRIGGER IF NOT EXISTS update_exams_updated_at
    AFTER UPDATE ON exams
    FOR EACH ROW
BEGIN
    UPDATE exams SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger za automatsko ažuriranje updated_at polja u problems tabeli
CREATE TRIGGER IF NOT EXISTS update_problems_updated_at
    AFTER UPDATE ON problems
    FOR EACH ROW
BEGIN
    UPDATE problems SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger za automatsko ažuriranje updated_at polja u career_profiles tabeli
CREATE TRIGGER IF NOT EXISTS update_career_profiles_updated_at
    AFTER UPDATE ON career_profiles
    FOR EACH ROW
BEGIN
    UPDATE career_profiles SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger za automatsko ažuriranje updated_at polja u skills tabeli
CREATE TRIGGER IF NOT EXISTS update_skills_updated_at
    AFTER UPDATE ON skills
    FOR EACH ROW
BEGIN
    UPDATE skills SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Trigger za automatsko ažuriranje updated_at polja u job_recommendations tabeli
CREATE TRIGGER IF NOT EXISTS update_job_recommendations_updated_at
    AFTER UPDATE ON job_recommendations
    FOR EACH ROW
BEGIN
    UPDATE job_recommendations SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- ============================================================================
-- INICIJALNI PODACI (OPCIONO)
-- ============================================================================

-- Dodaj nekoliko osnovnih problem kategorija
INSERT OR IGNORE INTO problem_categories (category_id, name, description, subject) VALUES
('math-basic', 'Osnovna matematika', 'Osnovni matematički koncepti', 'matematika'),
('math-advanced', 'Napredna matematika', 'Napredni matematički koncepti', 'matematika'),
('physics-mechanics', 'Mehanika', 'Mehanički sistemi i zakoni', 'fizika'),
('physics-thermodynamics', 'Termodinamika', 'Toplota i energija', 'fizika'),
('chemistry-organic', 'Organska hemija', 'Organski spojevi', 'hemija'),
('chemistry-inorganic', 'Neorganska hemija', 'Neorganski spojevi', 'hemija');

-- Dodaj nekoliko osnovnih problema
INSERT OR IGNORE INTO problems (problem_id, subject, topic, difficulty_level, problem_text, solution, correct_answer) VALUES
('math-001', 'matematika', 'Algebra', 'easy', 'Reši jednačinu: 2x + 5 = 13', '2x + 5 = 13\n2x = 13 - 5\n2x = 8\nx = 4', '4'),
('math-002', 'matematika', 'Geometrija', 'medium', 'Izračunaj površinu kruga sa poluprečnikom 5cm', 'P = πr² = π × 5² = 25π cm²', '25π'),
('physics-001', 'fizika', 'Mehanika', 'easy', 'Izračunaj brzinu objekta koji pređe 100m za 10 sekundi', 'v = s/t = 100m/10s = 10 m/s', '10');

-- Dodaj nekoliko osnovnih flashcards
INSERT OR IGNORE INTO flashcards (flashcard_id, user_id, subject, topic, front_content, back_content) VALUES
('flash-001', 'default_user', 'matematika', 'Algebra', 'Šta je kvadratna jednačina?', 'Jednačina oblika ax² + bx + c = 0, gde je a ≠ 0'),
('flash-002', 'default_user', 'fizika', 'Mehanika', 'Šta je Newtonov prvi zakon?', 'Telo ostaje u stanju mirovanja ili ravnomernog pravolinijskog kretanja dok na njega ne deluje spoljašnja sila'),
('flash-003', 'default_user', 'hemija', 'Organska hemija', 'Šta je alkohol?', 'Organski spoj koji sadrži hidroksilnu grupu (-OH) vezanu za ugljenik');

-- Dodaj nekoliko osnovnih study goals
INSERT OR IGNORE INTO study_goals (goal_id, user_id, title, description, subject, goal_type, target_value, measurement_unit) VALUES
('goal-001', 'default_user', 'Dnevno učenje', 'Uči 2 sata dnevno', 'general', 'daily', 120, 'minuti'),
('goal-002', 'default_user', 'Nedeljni pregled', 'Pregledaj 5 lekcija nedeljno', 'general', 'weekly', 5, 'lekcije'),
('goal-003', 'default_user', 'Mesecni test', 'Uradi 10 testova mesecno', 'general', 'monthly', 10, 'testovi');

-- Dodaj nekoliko osnovnih career skills
INSERT OR IGNORE INTO skills (skill_id, user_id, skill_name, skill_category, proficiency_level, years_of_experience) VALUES
('skill-001', 'default_user', 'Python', 'programming', 3, 2),
('skill-002', 'default_user', 'JavaScript', 'programming', 2, 1),
('skill-003', 'default_user', 'React', 'frontend', 2, 1),
('skill-004', 'default_user', 'SQL', 'database', 3, 2);

-- Dodaj nekoliko osnovnih job recommendations
INSERT OR IGNORE INTO job_recommendations (job_id, user_id, job_title, company, location, salary_range, job_description, match_score) VALUES
('job-001', 'default_user', 'Python Developer', 'TechCorp', 'Beograd', '2000-3000 EUR', 'Tražimo Python developera sa iskustvom u React-u', 85.5),
('job-002', 'default_user', 'Full Stack Developer', 'StartupXYZ', 'Novi Sad', '2500-3500 EUR', 'Full stack pozicija sa Python i JavaScript iskustvom', 90.2),
('job-003', 'default_user', 'Software Engineer', 'BigTech', 'Remote', '3000-5000 EUR', 'Software engineer pozicija sa fokusom na backend', 78.8);

-- ============================================================================
-- KOMENTARI ZA TABELE
-- ============================================================================

-- Dodaj komentare za tabele (SQLite ne podržava COMMENT ON, ali možemo dodati u dokumentaciju)
/*
Tabele u AcAIA SQLite bazi:

1. sessions - Glavna tabela za chat sesije
2. session_categories - Kategorije sesija
3. session_sharing - Deljenje sesija
4. chat_history - Istorija chat poruka
5. documents - Uploadovani dokumenti
6. document_vectors - Vektorske reprezentacije dokumentnih delova
7. ocr_images - OCR obrađene slike
8. study_rooms - Study room-ovi za grupno učenje
9. study_room_members - Članovi study room-ova
10. study_room_messages - Poruke u study room-ovima
11. study_journal_entries - Unosi u study journal-u
12. study_goals - Study ciljevi
13. flashcards - Flashcards za učenje
14. flashcard_reviews - Review-ovi flashcards-a
15. exams - Ispiti
16. exam_attempts - Pokušaji ispita
17. problems - Problemi za vežbanje
18. problem_categories - Kategorije problema
19. career_profiles - Career profile-ovi
20. skills - Veštine korisnika
21. career_assessments - Career assessments
22. job_recommendations - Preporuke za posao
23. cache - Cache podaci
24. analytics - Analytics podaci

Sve tabele koriste SQLite INTEGER PRIMARY KEY AUTOINCREMENT za ID-ove
i imaju created_at/updated_at timestamp-ove za praćenje vremena.
*/ 