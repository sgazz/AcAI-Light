-- Study Journal Database Setup
-- Kreiraj tabele za Study Journal funkcionalnost

-- Tabela za journal entries (unosima u dnevnik)
CREATE TABLE IF NOT EXISTS study_journal_entries (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    topic VARCHAR(200),
    entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN ('reflection', 'note', 'question', 'achievement')),
    content TEXT NOT NULL,
    mood_rating INTEGER CHECK (mood_rating >= 1 AND mood_rating <= 5),
    study_time_minutes INTEGER DEFAULT 0,
    difficulty_level VARCHAR(20) CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    tags JSONB DEFAULT '[]',
    related_chat_session VARCHAR(255), -- povezivanje sa chat istorijom
    related_problem_id UUID, -- povezivanje sa problem generatorom
    related_study_room_id UUID, -- povezivanje sa study room-om
    is_public BOOLEAN DEFAULT false, -- za deljenje sa drugima
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela za ciljeve učenja
CREATE TABLE IF NOT EXISTS study_goals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    target_date DATE NOT NULL,
    goal_type VARCHAR(20) NOT NULL CHECK (goal_type IN ('daily', 'weekly', 'monthly', 'custom')),
    target_value INTEGER NOT NULL, -- npr. broj sati, broj problema, broj poglavlja
    current_value INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue', 'cancelled')),
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    measurement_unit VARCHAR(50) DEFAULT 'minutes', -- 'minutes', 'problems', 'chapters', 'pages'
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela za flashcards
CREATE TABLE IF NOT EXISTS study_flashcards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    subject VARCHAR(100) NOT NULL,
    topic VARCHAR(200),
    front_content TEXT NOT NULL,
    back_content TEXT NOT NULL,
    difficulty_level VARCHAR(20) DEFAULT 'medium' CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
    last_reviewed TIMESTAMP WITH TIME ZONE,
    review_count INTEGER DEFAULT 0,
    mastery_level INTEGER DEFAULT 1 CHECK (mastery_level >= 1 AND mastery_level <= 5),
    next_review_date DATE, -- za spaced repetition
    tags JSONB DEFAULT '[]',
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela za planirane sesije učenja
CREATE TABLE IF NOT EXISTS study_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(100),
    planned_duration_minutes INTEGER NOT NULL,
    actual_duration_minutes INTEGER,
    session_type VARCHAR(50) DEFAULT 'practice' CHECK (session_type IN ('review', 'practice', 'new_material', 'exam_prep', 'group_study')),
    status VARCHAR(20) DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    related_goals JSONB DEFAULT '[]', -- ciljevi povezani sa sesijom
    tags JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela za analitiku i statistike
CREATE TABLE IF NOT EXISTS study_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    total_study_time_minutes INTEGER DEFAULT 0,
    subjects_studied JSONB DEFAULT '[]', -- lista predmeta sa vremenom
    entries_created INTEGER DEFAULT 0,
    goals_progress JSONB DEFAULT '[]', -- napredak u ciljevima
    flashcards_reviewed INTEGER DEFAULT 0,
    mood_average DECIMAL(3,2), -- prosečno raspoloženje (1-5)
    productivity_score DECIMAL(3,2), -- skor produktivnosti (0-10)
    study_sessions_completed INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, date)
);

-- Tabela za flashcard review istoriju
CREATE TABLE IF NOT EXISTS flashcard_reviews (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    flashcard_id UUID NOT NULL REFERENCES study_flashcards(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    review_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    difficulty_rating INTEGER CHECK (difficulty_rating >= 1 AND difficulty_rating <= 5),
    response_time_seconds INTEGER, -- vreme potrebno za odgovor
    was_correct BOOLEAN,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela za study streaks (neprekidno učenje)
CREATE TABLE IF NOT EXISTS study_streaks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL UNIQUE,
    current_streak_days INTEGER DEFAULT 0,
    longest_streak_days INTEGER DEFAULT 0,
    last_study_date DATE,
    streak_start_date DATE,
    total_study_days INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeksi za bolje performanse
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON study_journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_subject ON study_journal_entries(subject);
CREATE INDEX IF NOT EXISTS idx_journal_entries_entry_type ON study_journal_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON study_journal_entries(created_at);
CREATE INDEX IF NOT EXISTS idx_journal_entries_related_chat ON study_journal_entries(related_chat_session);
CREATE INDEX IF NOT EXISTS idx_journal_entries_related_problem ON study_journal_entries(related_problem_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tags ON study_journal_entries USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_study_goals_user_id ON study_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_study_goals_subject ON study_goals(subject);
CREATE INDEX IF NOT EXISTS idx_study_goals_status ON study_goals(status);
CREATE INDEX IF NOT EXISTS idx_study_goals_target_date ON study_goals(target_date);
CREATE INDEX IF NOT EXISTS idx_study_goals_priority ON study_goals(priority);
CREATE INDEX IF NOT EXISTS idx_study_goals_tags ON study_goals USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_flashcards_user_id ON study_flashcards(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcards_subject ON study_flashcards(subject);
CREATE INDEX IF NOT EXISTS idx_flashcards_difficulty ON study_flashcards(difficulty_level);
CREATE INDEX IF NOT EXISTS idx_flashcards_mastery ON study_flashcards(mastery_level);
CREATE INDEX IF NOT EXISTS idx_flashcards_next_review ON study_flashcards(next_review_date);
CREATE INDEX IF NOT EXISTS idx_flashcards_tags ON study_flashcards USING GIN(tags);

CREATE INDEX IF NOT EXISTS idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_study_sessions_subject ON study_sessions(subject);
CREATE INDEX IF NOT EXISTS idx_study_sessions_status ON study_sessions(status);
CREATE INDEX IF NOT EXISTS idx_study_sessions_scheduled ON study_sessions(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_study_sessions_type ON study_sessions(session_type);

CREATE INDEX IF NOT EXISTS idx_study_analytics_user_id ON study_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_study_analytics_date ON study_analytics(date);

CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_flashcard_id ON flashcard_reviews(flashcard_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_user_id ON flashcard_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_reviews_date ON flashcard_reviews(review_date);

-- Funkcija za automatsko ažuriranje updated_at polja
CREATE OR REPLACE FUNCTION update_study_journal_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggeri za automatsko ažuriranje updated_at polja
CREATE TRIGGER update_journal_entries_updated_at 
    BEFORE UPDATE ON study_journal_entries 
    FOR EACH ROW EXECUTE FUNCTION update_study_journal_updated_at_column();

CREATE TRIGGER update_study_goals_updated_at 
    BEFORE UPDATE ON study_goals 
    FOR EACH ROW EXECUTE FUNCTION update_study_journal_updated_at_column();

CREATE TRIGGER update_flashcards_updated_at 
    BEFORE UPDATE ON study_flashcards 
    FOR EACH ROW EXECUTE FUNCTION update_study_journal_updated_at_column();

CREATE TRIGGER update_study_sessions_updated_at 
    BEFORE UPDATE ON study_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_study_journal_updated_at_column();

CREATE TRIGGER update_study_streaks_updated_at 
    BEFORE UPDATE ON study_streaks 
    FOR EACH ROW EXECUTE FUNCTION update_study_journal_updated_at_column();

-- Funkcija za ažuriranje study streaks
CREATE OR REPLACE FUNCTION update_study_streak(user_id_param VARCHAR(255))
RETURNS VOID AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    last_study_date DATE;
    current_streak INTEGER;
    longest_streak INTEGER;
BEGIN
    -- Dohvati postojeći streak
    SELECT last_study_date, current_streak_days, longest_streak_days 
    INTO last_study_date, current_streak, longest_streak
    FROM study_streaks 
    WHERE user_id = user_id_param;
    
    -- Ako je prvi put da uči
    IF last_study_date IS NULL THEN
        INSERT INTO study_streaks (user_id, current_streak_days, longest_streak_days, last_study_date, streak_start_date, total_study_days)
        VALUES (user_id_param, 1, 1, today_date, today_date, 1)
        ON CONFLICT (user_id) DO UPDATE SET
            current_streak_days = 1,
            longest_streak_days = GREATEST(study_streaks.longest_streak_days, 1),
            last_study_date = today_date,
            streak_start_date = today_date,
            total_study_days = study_streaks.total_study_days + 1;
    -- Ako je učio juče, nastavi streak
    ELSIF last_study_date = today_date - INTERVAL '1 day' THEN
        UPDATE study_streaks SET
            current_streak_days = current_streak + 1,
            longest_streak_days = GREATEST(longest_streak, current_streak + 1),
            last_study_date = today_date,
            total_study_days = total_study_days + 1
        WHERE user_id = user_id_param;
    -- Ako je učio danas, samo ažuriraj total_study_days
    ELSIF last_study_date = today_date THEN
        UPDATE study_streaks SET
            total_study_days = total_study_days + 1
        WHERE user_id = user_id_param;
    -- Ako je propustio dan, resetuj streak
    ELSE
        UPDATE study_streaks SET
            current_streak_days = 1,
            last_study_date = today_date,
            streak_start_date = today_date,
            total_study_days = total_study_days + 1
        WHERE user_id = user_id_param;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Funkcija za ažuriranje analitike
CREATE OR REPLACE FUNCTION update_study_analytics(
    user_id_param VARCHAR(255),
    study_time_minutes INTEGER DEFAULT 0,
    subject_param VARCHAR(100) DEFAULT NULL,
    mood_rating INTEGER DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
    today_date DATE := CURRENT_DATE;
    existing_record RECORD;
    new_subjects_studied JSONB;
    new_goals_progress JSONB;
BEGIN
    -- Dohvati postojeću analitiku za danas
    SELECT * INTO existing_record 
    FROM study_analytics 
    WHERE user_id = user_id_param AND date = today_date;
    
    -- Ako ne postoji, kreiraj novu
    IF existing_record IS NULL THEN
        INSERT INTO study_analytics (
            user_id, date, total_study_time_minutes, 
            subjects_studied, entries_created, mood_average
        ) VALUES (
            user_id_param, today_date, study_time_minutes,
            CASE WHEN subject_param IS NOT NULL THEN jsonb_build_array(subject_param) ELSE '[]'::jsonb END,
            1, mood_rating
        );
    ELSE
        -- Ažuriraj postojeću
        new_subjects_studied := existing_record.subjects_studied;
        IF subject_param IS NOT NULL AND NOT (new_subjects_studied @> jsonb_build_array(subject_param)) THEN
            new_subjects_studied := new_subjects_studied || jsonb_build_array(subject_param);
        END IF;
        
        UPDATE study_analytics SET
            total_study_time_minutes = total_study_time_minutes + study_time_minutes,
            subjects_studied = new_subjects_studied,
            entries_created = entries_created + 1,
            mood_average = CASE 
                WHEN mood_rating IS NOT NULL THEN 
                    (mood_average * entries_created + mood_rating) / (entries_created + 1)
                ELSE mood_average 
            END
        WHERE user_id = user_id_param AND date = today_date;
    END IF;
    
    -- Ažuriraj study streak
    PERFORM update_study_streak(user_id_param);
END;
$$ LANGUAGE plpgsql;

-- Funkcija za dohvatanje statistika korisnika
CREATE OR REPLACE FUNCTION get_user_study_stats(user_id_param VARCHAR(255))
RETURNS TABLE (
    total_study_days INTEGER,
    total_study_time_hours DECIMAL,
    current_streak_days INTEGER,
    longest_streak_days INTEGER,
    total_entries INTEGER,
    total_goals INTEGER,
    completed_goals INTEGER,
    total_flashcards INTEGER,
    average_mood DECIMAL,
    favorite_subject VARCHAR(100),
    productivity_score DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(ss.total_study_days, 0) as total_study_days,
        COALESCE(ROUND(SUM(sa.total_study_time_minutes) / 60.0, 2), 0) as total_study_time_hours,
        COALESCE(ss.current_streak_days, 0) as current_streak_days,
        COALESCE(ss.longest_streak_days, 0) as longest_streak_days,
        COUNT(sje.id)::INTEGER as total_entries,
        COUNT(sg.id)::INTEGER as total_goals,
        COUNT(CASE WHEN sg.status = 'completed' THEN 1 END)::INTEGER as completed_goals,
        COUNT(sf.id)::INTEGER as total_flashcards,
        COALESCE(AVG(sa.mood_average), 0) as average_mood,
        (SELECT subject FROM study_journal_entries 
         WHERE user_id = user_id_param 
         GROUP BY subject 
         ORDER BY COUNT(*) DESC 
         LIMIT 1) as favorite_subject,
        COALESCE(AVG(sa.productivity_score), 0) as productivity_score
    FROM study_streaks ss
    LEFT JOIN study_analytics sa ON ss.user_id = sa.user_id
    LEFT JOIN study_journal_entries sje ON ss.user_id = sje.user_id
    LEFT JOIN study_goals sg ON ss.user_id = sg.user_id
    LEFT JOIN study_flashcards sf ON ss.user_id = sf.user_id
    WHERE ss.user_id = user_id_param
    GROUP BY ss.total_study_days, ss.current_streak_days, ss.longest_streak_days;
END;
$$ LANGUAGE plpgsql;

-- Funkcija za dohvatanje flashcards za review (spaced repetition)
CREATE OR REPLACE FUNCTION get_flashcards_for_review(user_id_param VARCHAR(255), limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
    id UUID,
    subject VARCHAR(100),
    topic VARCHAR(200),
    front_content TEXT,
    back_content TEXT,
    difficulty_level VARCHAR(20),
    mastery_level INTEGER,
    review_count INTEGER,
    days_since_last_review INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sf.id,
        sf.subject,
        sf.topic,
        sf.front_content,
        sf.back_content,
        sf.difficulty_level,
        sf.mastery_level,
        sf.review_count,
        COALESCE(CURRENT_DATE - sf.last_reviewed::DATE, 999) as days_since_last_review
    FROM study_flashcards sf
    WHERE sf.user_id = user_id_param 
    AND sf.is_archived = false
    AND (sf.next_review_date IS NULL OR sf.next_review_date <= CURRENT_DATE)
    ORDER BY 
        CASE 
            WHEN sf.last_reviewed IS NULL THEN 1
            ELSE 0
        END DESC,
        sf.last_reviewed ASC,
        sf.mastery_level ASC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- Funkcija za ažuriranje flashcard mastery level
CREATE OR REPLACE FUNCTION update_flashcard_mastery(
    flashcard_id_param UUID,
    difficulty_rating INTEGER,
    was_correct BOOLEAN
)
RETURNS VOID AS $$
DECLARE
    current_mastery INTEGER;
    new_mastery INTEGER;
    next_review_interval INTEGER;
BEGIN
    -- Dohvati trenutni mastery level
    SELECT mastery_level INTO current_mastery
    FROM study_flashcards
    WHERE id = flashcard_id_param;
    
    -- Izračunaj novi mastery level
    IF was_correct THEN
        new_mastery := LEAST(current_mastery + 1, 5);
    ELSE
        new_mastery := GREATEST(current_mastery - 1, 1);
    END IF;
    
    -- Izračunaj interval za sledeći review (spaced repetition)
    CASE new_mastery
        WHEN 1 THEN next_review_interval := 1;    -- 1 dan
        WHEN 2 THEN next_review_interval := 3;    -- 3 dana
        WHEN 3 THEN next_review_interval := 7;    -- 1 nedelja
        WHEN 4 THEN next_review_interval := 14;   -- 2 nedelje
        WHEN 5 THEN next_review_interval := 30;   -- 1 mesec
    END CASE;
    
    -- Ažuriraj flashcard
    UPDATE study_flashcards SET
        mastery_level = new_mastery,
        review_count = review_count + 1,
        last_reviewed = NOW(),
        next_review_date = CURRENT_DATE + (next_review_interval || ' days')::INTERVAL
    WHERE id = flashcard_id_param;
END;
$$ LANGUAGE plpgsql;

-- Komentari za tabele
COMMENT ON TABLE study_journal_entries IS 'Tabela za unosima u Study Journal - refleksije, beleške, pitanja, postignuća';
COMMENT ON TABLE study_goals IS 'Tabela za ciljeve učenja - dnevni, nedeljni, mesečni ciljevi';
COMMENT ON TABLE study_flashcards IS 'Tabela za flashcards - kartice za ponavljanje sa spaced repetition';
COMMENT ON TABLE study_sessions IS 'Tabela za planirane sesije učenja';
COMMENT ON TABLE study_analytics IS 'Tabela za dnevnu analitiku učenja';
COMMENT ON TABLE flashcard_reviews IS 'Tabela za istoriju review-a flashcards';
COMMENT ON TABLE study_streaks IS 'Tabela za praćenje streak-a učenja';

-- RLS (Row Level Security) - opciono za buduću auth implementaciju
-- ALTER TABLE study_journal_entries ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE study_goals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE study_flashcards ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE study_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE study_analytics ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE flashcard_reviews ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE study_streaks ENABLE ROW LEVEL SECURITY;

-- Test podaci (opciono)
-- INSERT INTO study_journal_entries (user_id, subject, topic, entry_type, content, mood_rating, study_time_minutes) 
-- VALUES ('test_user_1', 'Matematika', 'Diferencijalni račun', 'reflection', 'Danas sam naučio osnove derivacija. Koncept je jasan!', 4, 45);

-- INSERT INTO study_goals (user_id, title, description, subject, target_date, goal_type, target_value) 
-- VALUES ('test_user_1', 'Naučiti derivacije', 'Savladati osnovne tehnike deriviranja', 'Matematika', CURRENT_DATE + INTERVAL '7 days', 'weekly', 300);

-- INSERT INTO study_flashcards (user_id, subject, topic, front_content, back_content) 
-- VALUES ('test_user_1', 'Matematika', 'Derivacije', 'Šta je derivacija funkcije?', 'Derivacija je mera brzine promene funkcije u odnosu na nezavisnu varijablu.'); 