-- Exam Simulation Database Setup
-- Kreiraj tabele za exam management sistem

-- Tabela za ispite
CREATE TABLE IF NOT EXISTS exams (
    id SERIAL PRIMARY KEY,
    exam_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    duration_minutes INTEGER DEFAULT 60,
    total_points INTEGER DEFAULT 100,
    passing_score INTEGER DEFAULT 70,
    questions JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(20) DEFAULT 'draft',
    created_by VARCHAR(100) NOT NULL,
    is_public BOOLEAN DEFAULT false,
    allow_retakes BOOLEAN DEFAULT true,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela za pokušaje polaganja ispita
CREATE TABLE IF NOT EXISTS exam_attempts (
    id SERIAL PRIMARY KEY,
    attempt_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    answers JSONB DEFAULT '{}',
    score INTEGER DEFAULT 0,
    total_points INTEGER DEFAULT 0,
    percentage DECIMAL(5,2) DEFAULT 0.0,
    passed BOOLEAN DEFAULT false,
    time_taken_minutes INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela za pitanja (opciono, za reuse)
CREATE TABLE IF NOT EXISTS questions (
    id SERIAL PRIMARY KEY,
    question_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    question_text TEXT NOT NULL,
    question_type VARCHAR(20) NOT NULL,
    options JSONB DEFAULT '[]',
    correct_answer JSONB,
    explanation TEXT,
    points INTEGER DEFAULT 1,
    difficulty VARCHAR(20) DEFAULT 'medium',
    subject VARCHAR(100),
    tags TEXT[] DEFAULT '{}',
    created_by VARCHAR(100),
    is_public BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela za exam kategorije
CREATE TABLE IF NOT EXISTS exam_categories (
    id SERIAL PRIMARY KEY,
    category_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_category_id UUID REFERENCES exam_categories(category_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela za exam sharing
CREATE TABLE IF NOT EXISTS exam_sharing (
    id SERIAL PRIMARY KEY,
    share_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    exam_id UUID NOT NULL REFERENCES exams(exam_id) ON DELETE CASCADE,
    shared_by VARCHAR(100) NOT NULL,
    shared_with VARCHAR(100),
    permissions VARCHAR(20) DEFAULT 'read',
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeksi za bolje performanse
CREATE INDEX IF NOT EXISTS idx_exams_created_by ON exams(created_by);
CREATE INDEX IF NOT EXISTS idx_exams_subject ON exams(subject);
CREATE INDEX IF NOT EXISTS idx_exams_status ON exams(status);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_exam_id ON exam_attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_user_id ON exam_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_exam_attempts_start_time ON exam_attempts(start_time);
CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_tags ON questions USING GIN(tags);

-- RLS (Row Level Security) politike
ALTER TABLE exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_sharing ENABLE ROW LEVEL SECURITY;

-- Politike za exams tabelu
CREATE POLICY "Users can view public exams" ON exams
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own exams" ON exams
    FOR SELECT USING (created_by = current_user);

CREATE POLICY "Users can create exams" ON exams
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own exams" ON exams
    FOR UPDATE USING (created_by = current_user);

CREATE POLICY "Users can delete their own exams" ON exams
    FOR DELETE USING (created_by = current_user);

-- Politike za exam_attempts tabelu
CREATE POLICY "Users can view their own attempts" ON exam_attempts
    FOR SELECT USING (user_id = current_user);

CREATE POLICY "Users can create attempts" ON exam_attempts
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own attempts" ON exam_attempts
    FOR UPDATE USING (user_id = current_user);

-- Politike za questions tabelu
CREATE POLICY "Users can view public questions" ON questions
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view their own questions" ON questions
    FOR SELECT USING (created_by = current_user);

CREATE POLICY "Users can create questions" ON questions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own questions" ON questions
    FOR UPDATE USING (created_by = current_user);

-- Funkcije za automatsko ažuriranje updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggeri za automatsko ažuriranje
CREATE TRIGGER update_exams_updated_at BEFORE UPDATE ON exams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_questions_updated_at BEFORE UPDATE ON questions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Funkcija za izračunavanje statistika ispita
CREATE OR REPLACE FUNCTION get_exam_stats(exam_uuid UUID)
RETURNS TABLE (
    total_attempts BIGINT,
    avg_score DECIMAL(5,2),
    pass_rate DECIMAL(5,2),
    avg_time_minutes DECIMAL(5,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_attempts,
        AVG(percentage) as avg_score,
        (COUNT(*) FILTER (WHERE passed = true) * 100.0 / COUNT(*)) as pass_rate,
        AVG(time_taken_minutes) as avg_time_minutes
    FROM exam_attempts
    WHERE exam_id = exam_uuid;
END;
$$ LANGUAGE plpgsql;

-- Funkcija za dohvatanje pitanja po kriterijumima
CREATE OR REPLACE FUNCTION get_questions_by_criteria(
    p_subject VARCHAR DEFAULT NULL,
    p_difficulty VARCHAR DEFAULT NULL,
    p_question_type VARCHAR DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    question_id UUID,
    question_text TEXT,
    question_type VARCHAR,
    options JSONB,
    correct_answer JSONB,
    explanation TEXT,
    points INTEGER,
    difficulty VARCHAR,
    subject VARCHAR,
    tags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        q.question_id,
        q.question_text,
        q.question_type,
        q.options,
        q.correct_answer,
        q.explanation,
        q.points,
        q.difficulty,
        q.subject,
        q.tags
    FROM questions q
    WHERE (p_subject IS NULL OR q.subject = p_subject)
      AND (p_difficulty IS NULL OR q.difficulty = p_difficulty)
      AND (p_question_type IS NULL OR q.question_type = p_question_type)
      AND (q.is_public = true OR q.created_by = current_user)
    ORDER BY RANDOM()
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data
INSERT INTO exam_categories (name, description) VALUES
('Matematika', 'Matematički ispiti i testovi'),
('Fizika', 'Fizički ispiti i testovi'),
('Hemija', 'Hemijski ispiti i testovi'),
('Biologija', 'Biološki ispiti i testovi'),
('Programiranje', 'Ispiti iz programiranja'),
('Istorija', 'Istorijski ispiti i testovi'),
('Geografija', 'Geografski ispiti i testovi'),
('Engleski jezik', 'Ispiti iz engleskog jezika'),
('Srpski jezik', 'Ispiti iz srpskog jezika'),
('Informatika', 'Ispiti iz informatike');

-- Sample questions
INSERT INTO questions (question_text, question_type, options, correct_answer, explanation, points, difficulty, subject, tags) VALUES
(
    'Koji je rezultat 2 + 2?',
    'multiple_choice',
    '["3", "4", "5", "6"]',
    '"4"',
    'Osnovna matematika: 2 + 2 = 4',
    1,
    'easy',
    'Matematika',
    ARRAY['osnovna matematika', 'sabiranje']
),
(
    'Da li je 7 prost broj?',
    'true_false',
    '["Da", "Ne"]',
    '"Da"',
    '7 je prost broj jer je deljiv samo sa 1 i sa samim sobom',
    1,
    'medium',
    'Matematika',
    ARRAY['prosti brojevi', 'teorija brojeva']
),
(
    'Objasni šta je varijabla u programiranju.',
    'essay',
    '[]',
    '"Varijabla je kontejner koji čuva podatke u memoriji računara."',
    'Varijabla je osnovni koncept u programiranju koji omogućava čuvanje i manipulaciju podacima.',
    5,
    'medium',
    'Programiranje',
    ARRAY['varijable', 'osnovi programiranja']
);

-- Sample exam
INSERT INTO exams (title, description, subject, duration_minutes, total_points, passing_score, questions, status, created_by, is_public) VALUES
(
    'Osnovni test iz matematike',
    'Test osnovnih matematičkih operacija',
    'Matematika',
    30,
    10,
    7,
    '[
        {
            "question_id": "q1",
            "question_text": "Koji je rezultat 5 + 3?",
            "question_type": "multiple_choice",
            "options": ["6", "7", "8", "9"],
            "correct_answer": "8",
            "explanation": "5 + 3 = 8",
            "points": 1,
            "difficulty": "easy",
            "subject": "Matematika",
            "tags": ["sabiranje", "osnovna matematika"]
        },
        {
            "question_id": "q2", 
            "question_text": "Da li je 10 paran broj?",
            "question_type": "true_false",
            "options": ["Da", "Ne"],
            "correct_answer": "Da",
            "explanation": "10 je paran broj jer je deljiv sa 2",
            "points": 1,
            "difficulty": "easy",
            "subject": "Matematika",
            "tags": ["parni brojevi", "osnovna matematika"]
        }
    ]',
    'active',
    'test_user',
    true
);

-- Log poruka
DO $$
BEGIN
    RAISE NOTICE 'Exam Simulation database setup završen!';
    RAISE NOTICE 'Kreirane tabele: exams, exam_attempts, questions, exam_categories, exam_sharing';
    RAISE NOTICE 'Dodati indeksi i RLS politike';
    RAISE NOTICE 'Kreirane funkcije: get_exam_stats, get_questions_by_criteria';
    RAISE NOTICE 'Dodati sample podaci: kategorije, pitanja i test ispit';
END $$; 