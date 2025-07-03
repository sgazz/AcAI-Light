-- Career Guidance Database Setup
-- Supabase SQL Script

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Career Profiles Table
CREATE TABLE IF NOT EXISTS career_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    current_position TEXT,
    years_of_experience INTEGER DEFAULT 0,
    education_level TEXT,
    preferred_industries TEXT[] DEFAULT '{}',
    salary_expectations NUMERIC,
    location_preferences TEXT[] DEFAULT '{}',
    remote_work_preference BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Skills Inventory Table
CREATE TABLE IF NOT EXISTS skills_inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    skill_name TEXT NOT NULL,
    skill_category TEXT NOT NULL,
    proficiency_level INTEGER CHECK (proficiency_level >= 1 AND proficiency_level <= 5) DEFAULT 1,
    years_of_experience INTEGER DEFAULT 0,
    is_certified BOOLEAN DEFAULT false,
    certification_name TEXT,
    certification_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Career Assessments Table
CREATE TABLE IF NOT EXISTS career_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    assessment_type TEXT NOT NULL,
    assessment_name TEXT NOT NULL,
    questions JSONB,
    answers JSONB,
    results JSONB,
    score NUMERIC,
    completion_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Assessment Questions Table
CREATE TABLE IF NOT EXISTS assessment_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_type TEXT NOT NULL,
    question_text TEXT NOT NULL,
    question_category TEXT NOT NULL,
    options JSONB,
    correct_answer TEXT,
    weight NUMERIC DEFAULT 1.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Job Recommendations Table
CREATE TABLE IF NOT EXISTS job_recommendations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    job_title TEXT NOT NULL,
    company_name TEXT,
    job_description TEXT,
    required_skills TEXT[] DEFAULT '{}',
    preferred_skills TEXT[] DEFAULT '{}',
    salary_range TEXT,
    location TEXT,
    job_type TEXT,
    match_score NUMERIC CHECK (match_score >= 0 AND match_score <= 100),
    application_status TEXT DEFAULT 'recommended',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Career Paths Table
CREATE TABLE IF NOT EXISTS career_paths (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    path_name TEXT NOT NULL,
    target_role TEXT NOT NULL,
    starting_position TEXT,
    steps JSONB,
    estimated_duration INTEGER, -- in months
    required_skills TEXT[] DEFAULT '{}',
    progress_percentage NUMERIC DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Industry Insights Table
CREATE TABLE IF NOT EXISTS industry_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    industry_name TEXT NOT NULL UNIQUE,
    growth_rate NUMERIC,
    average_salary NUMERIC,
    job_demand TEXT,
    required_skills TEXT[] DEFAULT '{}',
    trends JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_career_profiles_user_id ON career_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_inventory_user_id ON skills_inventory(user_id);
CREATE INDEX IF NOT EXISTS idx_skills_inventory_category ON skills_inventory(skill_category);
CREATE INDEX IF NOT EXISTS idx_career_assessments_user_id ON career_assessments(user_id);
CREATE INDEX IF NOT EXISTS idx_career_assessments_type ON career_assessments(assessment_type);
CREATE INDEX IF NOT EXISTS idx_assessment_questions_type ON assessment_questions(assessment_type);
CREATE INDEX IF NOT EXISTS idx_job_recommendations_user_id ON job_recommendations(user_id);
CREATE INDEX IF NOT EXISTS idx_job_recommendations_status ON job_recommendations(application_status);
CREATE INDEX IF NOT EXISTS idx_career_paths_user_id ON career_paths(user_id);
CREATE INDEX IF NOT EXISTS idx_career_paths_active ON career_paths(is_active);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_career_profiles_updated_at 
    BEFORE UPDATE ON career_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_skills_inventory_updated_at 
    BEFORE UPDATE ON skills_inventory 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_career_paths_updated_at 
    BEFORE UPDATE ON career_paths 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_industry_insights_updated_at 
    BEFORE UPDATE ON industry_insights 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample assessment questions
INSERT INTO assessment_questions (assessment_type, question_text, question_category, options, correct_answer, weight) VALUES
-- Personality Assessment Questions
('personality', 'Kako se osećate u timskom radu?', 'teamwork', 
 '{"A": "Volim da radim sam", "B": "Preferiram timski rad", "C": "Mogu da radim i sam i u timu", "D": "Zavisi od situacije"}', 
 NULL, 1.0),

('personality', 'Kako reagujete na stres?', 'stress_management',
 '{"A": "Osećam se preplavljen", "B": "Održavam hladnu glavu", "C": "Tražim podršku", "D": "Planiranje mi pomaže"}',
 NULL, 1.0),

('personality', 'Kako donosite odluke?', 'decision_making',
 '{"A": "Intuicija", "B": "Analiza podataka", "C": "Savetovanje sa drugima", "D": "Kombinacija svega"}',
 NULL, 1.0),

-- Skills Assessment Questions
('skills', 'Koliko ste iskusni u programiranju?', 'technical',
 '{"A": "Početnik", "B": "Srednji nivo", "C": "Napredni", "D": "Ekspert"}',
 NULL, 1.0),

('skills', 'Kako ocenjujete svoje komunikacione veštine?', 'soft_skills',
 '{"A": "Potrebno poboljšanje", "B": "Osrednje", "C": "Dobre", "D": "Odlične"}',
 NULL, 1.0),

('skills', 'Koliko ste upoznati sa projektnim menadžmentom?', 'management',
 '{"A": "Nisam radio", "B": "Osnovno poznavanje", "C": "Praktično iskustvo", "D": "Certifikovan"}',
 NULL, 1.0),

-- Interest Assessment Questions
('interests', 'Šta vas najviše interesuje?', 'general_interests',
 '{"A": "Tehnologija i inovacije", "B": "Ljudski odnosi", "C": "Analiza i istraživanje", "D": "Kreativnost i dizajn"}',
 NULL, 1.0),

('interests', 'Kakav tip posla preferirate?', 'work_preferences',
 '{"A": "Strukturiran i predvidiv", "B": "Dinamičan i promenljiv", "C": "Analitičan i detaljan", "D": "Kreativan i inovativan"}',
 NULL, 1.0),

('interests', 'Gde vidite sebe za 5 godina?', 'career_goals',
 '{"A": "Tehnički ekspert", "B": "Menadžer/Leader", "C": "Konsultant", "D": "Preduzetnik"}',
 NULL, 1.0);

-- Insert sample industry insights
INSERT INTO industry_insights (industry_name, growth_rate, average_salary, job_demand, required_skills, trends) VALUES
('Software Development', 22.0, 85000, 'High', 
 ARRAY['JavaScript', 'Python', 'React', 'Node.js', 'SQL'],
 '{"remote_work": "increasing", "ai_integration": "growing", "cloud_computing": "essential"}'),

('Data Science', 31.0, 95000, 'Very High',
 ARRAY['Python', 'R', 'SQL', 'Machine Learning', 'Statistics'],
 '{"ai_ml": "exploding", "big_data": "critical", "automation": "increasing"}'),

('Digital Marketing', 18.0, 65000, 'High',
 ARRAY['SEO', 'Social Media', 'Google Analytics', 'Content Creation', 'Email Marketing'],
 '{"social_commerce": "growing", "video_content": "dominant", "personalization": "key"}'),

('Cybersecurity', 33.0, 90000, 'Very High',
 ARRAY['Network Security', 'Penetration Testing', 'Incident Response', 'Compliance', 'Cryptography'],
 '{"threat_intelligence": "critical", "zero_trust": "adopted", "automation": "increasing"}'),

('UX/UI Design', 15.0, 75000, 'High',
 ARRAY['Figma', 'Adobe XD', 'User Research', 'Prototyping', 'Design Systems'],
 '{"mobile_first": "standard", "accessibility": "required", "micro_interactions": "trending"}'),

('Product Management', 20.0, 100000, 'High',
 ARRAY['Product Strategy', 'User Research', 'Data Analysis', 'Agile', 'Stakeholder Management'],
 '{"data_driven": "essential", "customer_centric": "focus", "rapid_iteration": "standard"}'),

('DevOps', 25.0, 95000, 'Very High',
 ARRAY['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Monitoring'],
 '{"cloud_native": "standard", "automation": "critical", "observability": "essential"}'),

('Sales', 12.0, 70000, 'Medium',
 ARRAY['CRM', 'Lead Generation', 'Negotiation', 'Relationship Building', 'Product Knowledge'],
 '{"digital_sales": "growing", "social_selling": "effective", "data_analytics": "increasing"}'),

('Human Resources', 10.0, 60000, 'Medium',
 ARRAY['Recruitment', 'Employee Relations', 'HRIS', 'Compliance', 'Training'],
 '{"remote_hiring": "standard", "diversity_inclusion": "priority", "employee_experience": "focus"}'),

('Finance', 8.0, 80000, 'Medium',
 ARRAY['Financial Analysis', 'Excel', 'Accounting', 'Risk Management', 'Regulatory Compliance'],
 '{"fintech": "growing", "automation": "increasing", "data_analytics": "essential"}');

-- Create RLS (Row Level Security) policies
ALTER TABLE career_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE career_paths ENABLE ROW LEVEL SECURITY;

-- Career Profiles RLS
CREATE POLICY "Users can view own career profile" ON career_profiles
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own career profile" ON career_profiles
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own career profile" ON career_profiles
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own career profile" ON career_profiles
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Skills Inventory RLS
CREATE POLICY "Users can view own skills" ON skills_inventory
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own skills" ON skills_inventory
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own skills" ON skills_inventory
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own skills" ON skills_inventory
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Career Assessments RLS
CREATE POLICY "Users can view own assessments" ON career_assessments
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own assessments" ON career_assessments
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own assessments" ON career_assessments
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own assessments" ON career_assessments
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Job Recommendations RLS
CREATE POLICY "Users can view own job recommendations" ON job_recommendations
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own job recommendations" ON job_recommendations
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own job recommendations" ON job_recommendations
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own job recommendations" ON job_recommendations
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Career Paths RLS
CREATE POLICY "Users can view own career paths" ON career_paths
    FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own career paths" ON career_paths
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own career paths" ON career_paths
    FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own career paths" ON career_paths
    FOR DELETE USING (auth.uid()::text = user_id::text);

-- Assessment Questions and Industry Insights are public (read-only)
CREATE POLICY "Anyone can view assessment questions" ON assessment_questions
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view industry insights" ON industry_insights
    FOR SELECT USING (true);

-- Create views for easier querying
CREATE OR REPLACE VIEW user_skills_summary AS
SELECT 
    user_id,
    skill_category,
    COUNT(*) as skill_count,
    AVG(proficiency_level) as avg_proficiency,
    COUNT(CASE WHEN is_certified THEN 1 END) as certified_skills
FROM skills_inventory
GROUP BY user_id, skill_category;

CREATE OR REPLACE VIEW assessment_summary AS
SELECT 
    user_id,
    assessment_type,
    COUNT(*) as assessment_count,
    AVG(score) as avg_score,
    MAX(completion_date) as last_assessment
FROM career_assessments
WHERE completion_date IS NOT NULL
GROUP BY user_id, assessment_type;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Create function to get user career insights
CREATE OR REPLACE FUNCTION get_user_career_insights(user_uuid UUID)
RETURNS JSON AS $$
DECLARE
    result JSON;
BEGIN
    SELECT json_build_object(
        'profile', (SELECT row_to_json(cp) FROM career_profiles cp WHERE cp.user_id = user_uuid),
        'skills_summary', (SELECT json_agg(row_to_json(uss)) FROM user_skills_summary uss WHERE uss.user_id = user_uuid),
        'assessments_summary', (SELECT json_agg(row_to_json(assess_sum)) FROM assessment_summary assess_sum WHERE assess_sum.user_id = user_uuid),
        'recent_jobs', (SELECT json_agg(row_to_json(jr)) FROM job_recommendations jr WHERE jr.user_id = user_uuid ORDER BY jr.created_at DESC LIMIT 5),
        'active_paths', (SELECT json_agg(row_to_json(cp)) FROM career_paths cp WHERE cp.user_id = user_uuid AND cp.is_active = true)
    ) INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to calculate job match score
CREATE OR REPLACE FUNCTION calculate_job_match_score(
    user_uuid UUID,
    required_skills TEXT[],
    preferred_skills TEXT[]
)
RETURNS NUMERIC AS $$
DECLARE
    match_score NUMERIC := 0;
    total_required INTEGER := array_length(required_skills, 1);
    total_preferred INTEGER := array_length(preferred_skills, 1);
    required_matches INTEGER := 0;
    preferred_matches INTEGER := 0;
BEGIN
    -- Count required skills matches
    SELECT COUNT(*) INTO required_matches
    FROM skills_inventory si
    WHERE si.user_id = user_uuid 
    AND si.skill_name = ANY(required_skills)
    AND si.proficiency_level >= 3;
    
    -- Count preferred skills matches
    SELECT COUNT(*) INTO preferred_matches
    FROM skills_inventory si
    WHERE si.user_id = user_uuid 
    AND si.skill_name = ANY(preferred_skills)
    AND si.proficiency_level >= 2;
    
    -- Calculate score (70% required skills, 30% preferred skills)
    IF total_required > 0 THEN
        match_score := match_score + (required_matches::NUMERIC / total_required::NUMERIC) * 70;
    END IF;
    
    IF total_preferred > 0 THEN
        match_score := match_score + (preferred_matches::NUMERIC / total_preferred::NUMERIC) * 30;
    END IF;
    
    RETURN LEAST(match_score, 100);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert sample data for testing
INSERT INTO career_profiles (user_id, current_position, years_of_experience, education_level, preferred_industries, salary_expectations, location_preferences, remote_work_preference) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Software Developer', 3, 'Bachelor', ARRAY['Technology', 'Finance'], 70000, ARRAY['Belgrade', 'Novi Sad'], true),
('550e8400-e29b-41d4-a716-446655440001', 'Data Analyst', 1, 'Master', ARRAY['Technology', 'Healthcare'], 60000, ARRAY['Belgrade'], false),
('550e8400-e29b-41d4-a716-446655440002', 'UX Designer', 2, 'Bachelor', ARRAY['Technology', 'E-commerce'], 65000, ARRAY['Belgrade', 'Remote'], true);

INSERT INTO skills_inventory (user_id, skill_name, skill_category, proficiency_level, years_of_experience, is_certified) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'JavaScript', 'Programming', 4, 3, true),
('550e8400-e29b-41d4-a716-446655440000', 'React', 'Frontend', 4, 2, false),
('550e8400-e29b-41d4-a716-446655440000', 'Node.js', 'Backend', 3, 2, false),
('550e8400-e29b-41d4-a716-446655440001', 'Python', 'Programming', 4, 2, true),
('550e8400-e29b-41d4-a716-446655440001', 'SQL', 'Database', 3, 1, false),
('550e8400-e29b-41d4-a716-446655440001', 'Tableau', 'Data Visualization', 3, 1, false),
('550e8400-e29b-41d4-a716-446655440002', 'Figma', 'Design', 5, 2, true),
('550e8400-e29b-41d4-a716-446655440002', 'Adobe XD', 'Design', 4, 1, false),
('550e8400-e29b-41d4-a716-446655440002', 'User Research', 'UX', 3, 1, false);

-- Create sample career paths
INSERT INTO career_paths (user_id, path_name, target_role, starting_position, steps, estimated_duration, required_skills, progress_percentage) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Senior Developer Path', 'Senior Software Engineer', 'Software Developer',
 '[
   {"step": 1, "title": "Master Advanced JavaScript", "duration": 3, "completed": true},
   {"step": 2, "title": "Learn System Design", "duration": 6, "completed": false},
   {"step": 3, "title": "Gain Leadership Experience", "duration": 12, "completed": false}
 ]'::jsonb, 21, ARRAY['System Design', 'Leadership', 'Architecture'], 25),

('550e8400-e29b-41d4-a716-446655440001', 'Data Scientist Path', 'Data Scientist', 'Data Analyst',
 '[
   {"step": 1, "title": "Learn Machine Learning", "duration": 6, "completed": false},
   {"step": 2, "title": "Master Statistics", "duration": 4, "completed": false},
   {"step": 3, "title": "Build Portfolio Projects", "duration": 6, "completed": false}
 ]'::jsonb, 16, ARRAY['Machine Learning', 'Statistics', 'Python'], 0);

-- Create sample job recommendations
INSERT INTO job_recommendations (user_id, job_title, company_name, job_description, required_skills, preferred_skills, salary_range, location, job_type, match_score) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'Senior React Developer', 'TechCorp', 'Looking for experienced React developer...', 
 ARRAY['React', 'JavaScript', 'TypeScript'], ARRAY['Node.js', 'GraphQL'], '70000-90000', 'Belgrade', 'Full-time', 85),

('550e8400-e29b-41d4-a716-446655440001', 'Data Scientist', 'DataTech', 'Join our data science team...', 
 ARRAY['Python', 'Machine Learning', 'Statistics'], ARRAY['SQL', 'Deep Learning'], '80000-100000', 'Belgrade', 'Full-time', 75),

('550e8400-e29b-41d4-a716-446655440002', 'Senior UX Designer', 'DesignStudio', 'Lead our design initiatives...', 
 ARRAY['Figma', 'User Research', 'Prototyping'], ARRAY['Adobe XD', 'Design Systems'], '70000-90000', 'Remote', 'Full-time', 90);

COMMIT; 