-- Problem Generator Database Setup
-- Kreiraj tabele za Problem Generator funkcionalnost

-- Tabela za probleme
CREATE TABLE IF NOT EXISTS problems (
    id SERIAL PRIMARY KEY,
    problem_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    subject VARCHAR(50) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    problem_type VARCHAR(30) NOT NULL,
    question TEXT NOT NULL,
    options JSONB DEFAULT '[]',
    correct_answer TEXT,
    solution TEXT,
    hints JSONB DEFAULT '[]',
    explanation TEXT,
    tags JSONB DEFAULT '[]',
    template_used VARCHAR(100),
    ai_generated BOOLEAN DEFAULT true,
    created_by VARCHAR(100) DEFAULT 'system',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela za pokušaje rešavanja problema
CREATE TABLE IF NOT EXISTS problem_attempts (
    id SERIAL PRIMARY KEY,
    attempt_id UUID UNIQUE NOT NULL DEFAULT gen_random_uuid(),
    problem_id UUID NOT NULL REFERENCES problems(problem_id) ON DELETE CASCADE,
    user_id VARCHAR(100) NOT NULL,
    username VARCHAR(100) NOT NULL,
    user_answer TEXT,
    is_correct BOOLEAN,
    time_taken_seconds INTEGER DEFAULT 0,
    hints_used INTEGER DEFAULT 0,
    solution_viewed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela za korisničke statistike
CREATE TABLE IF NOT EXISTS user_problem_stats (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL UNIQUE,
    total_problems_attempted INTEGER DEFAULT 0,
    total_problems_correct INTEGER DEFAULT 0,
    total_time_spent_seconds INTEGER DEFAULT 0,
    favorite_subjects JSONB DEFAULT '[]',
    weak_topics JSONB DEFAULT '[]',
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela za problem šablone
CREATE TABLE IF NOT EXISTS problem_templates (
    id SERIAL PRIMARY KEY,
    template_id VARCHAR(100) UNIQUE NOT NULL,
    subject VARCHAR(50) NOT NULL,
    topic VARCHAR(100) NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    problem_type VARCHAR(30) NOT NULL,
    template_text TEXT NOT NULL,
    parameters JSONB DEFAULT '{}',
    solution_template TEXT,
    hints JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeksi za bolje performanse
CREATE INDEX IF NOT EXISTS idx_problems_subject ON problems(subject);
CREATE INDEX IF NOT EXISTS idx_problems_topic ON problems(topic);
CREATE INDEX IF NOT EXISTS idx_problems_difficulty ON problems(difficulty);
CREATE INDEX IF NOT EXISTS idx_problems_problem_type ON problems(problem_type);
CREATE INDEX IF NOT EXISTS idx_problems_created_at ON problems(created_at);
CREATE INDEX IF NOT EXISTS idx_problems_ai_generated ON problems(ai_generated);

CREATE INDEX IF NOT EXISTS idx_problem_attempts_problem_id ON problem_attempts(problem_id);
CREATE INDEX IF NOT EXISTS idx_problem_attempts_user_id ON problem_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_problem_attempts_created_at ON problem_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_problem_attempts_is_correct ON problem_attempts(is_correct);

CREATE INDEX IF NOT EXISTS idx_user_problem_stats_user_id ON user_problem_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_user_problem_stats_last_activity ON user_problem_stats(last_activity);

CREATE INDEX IF NOT EXISTS idx_problem_templates_subject ON problem_templates(subject);
CREATE INDEX IF NOT EXISTS idx_problem_templates_topic ON problem_templates(topic);
CREATE INDEX IF NOT EXISTS idx_problem_templates_difficulty ON problem_templates(difficulty);
CREATE INDEX IF NOT EXISTS idx_problem_templates_is_active ON problem_templates(is_active);

-- Funkcija za automatsko ažuriranje updated_at polja
CREATE OR REPLACE FUNCTION update_problem_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger za automatsko ažuriranje updated_at polja
CREATE TRIGGER update_problems_updated_at 
    BEFORE UPDATE ON problems 
    FOR EACH ROW EXECUTE FUNCTION update_problem_updated_at_column();

CREATE TRIGGER update_user_problem_stats_updated_at 
    BEFORE UPDATE ON user_problem_stats 
    FOR EACH ROW EXECUTE FUNCTION update_problem_updated_at_column();

CREATE TRIGGER update_problem_templates_updated_at 
    BEFORE UPDATE ON problem_templates 
    FOR EACH ROW EXECUTE FUNCTION update_problem_updated_at_column();

-- Funkcija za ažuriranje korisničkih statistika
CREATE OR REPLACE FUNCTION update_user_stats_after_attempt()
RETURNS TRIGGER AS $$
BEGIN
    -- Ažuriraj ili kreiraj korisničke statistike
    INSERT INTO user_problem_stats (
        user_id, 
        total_problems_attempted, 
        total_problems_correct,
        total_time_spent_seconds,
        last_activity
    ) VALUES (
        NEW.user_id,
        1,
        CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
        NEW.time_taken_seconds,
        NOW()
    )
    ON CONFLICT (user_id) DO UPDATE SET
        total_problems_attempted = user_problem_stats.total_problems_attempted + 1,
        total_problems_correct = user_problem_stats.total_problems_correct + 
            CASE WHEN NEW.is_correct THEN 1 ELSE 0 END,
        total_time_spent_seconds = user_problem_stats.total_time_spent_seconds + NEW.time_taken_seconds,
        last_activity = NOW(),
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger za automatsko ažuriranje korisničkih statistika
CREATE TRIGGER update_user_stats_trigger
    AFTER INSERT ON problem_attempts
    FOR EACH ROW EXECUTE FUNCTION update_user_stats_after_attempt();

-- Funkcija za dohvatanje statistika problema
CREATE OR REPLACE FUNCTION get_problem_stats()
RETURNS TABLE (
    total_problems BIGINT,
    problems_by_subject JSONB,
    problems_by_difficulty JSONB,
    problems_by_type JSONB,
    total_attempts BIGINT,
    correct_attempts BIGINT,
    avg_time_seconds NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM problems) as total_problems,
        (SELECT jsonb_object_agg(subject, count) 
         FROM (SELECT subject, COUNT(*) as count FROM problems GROUP BY subject) s) as problems_by_subject,
        (SELECT jsonb_object_agg(difficulty, count) 
         FROM (SELECT difficulty, COUNT(*) as count FROM problems GROUP BY difficulty) d) as problems_by_difficulty,
        (SELECT jsonb_object_agg(problem_type, count) 
         FROM (SELECT problem_type, COUNT(*) as count FROM problems GROUP BY problem_type) pt) as problems_by_type,
        (SELECT COUNT(*) FROM problem_attempts) as total_attempts,
        (SELECT COUNT(*) FROM problem_attempts WHERE is_correct = true) as correct_attempts,
        (SELECT AVG(time_taken_seconds) FROM problem_attempts) as avg_time_seconds;
END;
$$ LANGUAGE plpgsql;

-- Funkcija za dohvatanje preporučenih problema
CREATE OR REPLACE FUNCTION get_recommended_problems(
    p_user_id VARCHAR(100),
    p_subject VARCHAR(50) DEFAULT NULL,
    p_difficulty VARCHAR(20) DEFAULT NULL,
    p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
    problem_id UUID,
    subject VARCHAR(50),
    topic VARCHAR(100),
    difficulty VARCHAR(20),
    problem_type VARCHAR(30),
    question TEXT,
    options JSONB,
    correct_answer TEXT,
    solution TEXT,
    hints JSONB,
    explanation TEXT,
    tags JSONB,
    created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.problem_id,
        p.subject,
        p.topic,
        p.difficulty,
        p.problem_type,
        p.question,
        p.options,
        p.correct_answer,
        p.solution,
        p.hints,
        p.explanation,
        p.tags,
        p.created_at
    FROM problems p
    WHERE p.is_active = true
    AND (p_subject IS NULL OR p.subject = p_subject)
    AND (p_difficulty IS NULL OR p.difficulty = p_difficulty)
    AND p.problem_id NOT IN (
        SELECT DISTINCT pa.problem_id 
        FROM problem_attempts pa 
        WHERE pa.user_id = p_user_id AND pa.is_correct = true
    )
    ORDER BY RANDOM()
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Komentari za tabele
COMMENT ON TABLE problems IS 'Tabela za čuvanje generisanih problema';
COMMENT ON TABLE problem_attempts IS 'Tabela za čuvanje pokušaja rešavanja problema';
COMMENT ON TABLE user_problem_stats IS 'Tabela za čuvanje korisničkih statistika';
COMMENT ON TABLE problem_templates IS 'Tabela za čuvanje šablona problema';

-- RLS (Row Level Security) - opciono za buduću auth implementaciju
-- ALTER TABLE problems ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE problem_attempts ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_problem_stats ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE problem_templates ENABLE ROW LEVEL SECURITY; 