-- Study Room Setup za Supabase
-- Kreiraj tabele za Study Room funkcionalnost

-- Tabela za Study Room sobe
CREATE TABLE IF NOT EXISTS study_rooms (
    id BIGSERIAL PRIMARY KEY,
    room_id UUID UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(255),
    max_participants INTEGER DEFAULT 10,
    admin_user_id VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela za članove Study Room soba
CREATE TABLE IF NOT EXISTS study_room_members (
    id BIGSERIAL PRIMARY KEY,
    room_id UUID NOT NULL REFERENCES study_rooms(room_id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('admin', 'member', 'guest')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(room_id, user_id)
);

-- Tabela za poruke u Study Room sobama
CREATE TABLE IF NOT EXISTS study_room_messages (
    id BIGSERIAL PRIMARY KEY,
    message_id UUID UNIQUE NOT NULL,
    room_id UUID NOT NULL REFERENCES study_rooms(room_id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'chat' CHECK (message_type IN ('chat', 'system', 'ai')),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeksi za bolje performanse
CREATE INDEX IF NOT EXISTS idx_study_rooms_room_id ON study_rooms(room_id);
CREATE INDEX IF NOT EXISTS idx_study_rooms_admin_user_id ON study_rooms(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_study_rooms_is_active ON study_rooms(is_active);

CREATE INDEX IF NOT EXISTS idx_study_room_members_room_id ON study_room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_study_room_members_user_id ON study_room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_study_room_members_is_active ON study_room_members(is_active);

CREATE INDEX IF NOT EXISTS idx_study_room_messages_room_id ON study_room_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_study_room_messages_timestamp ON study_room_messages(timestamp);
CREATE INDEX IF NOT EXISTS idx_study_room_messages_user_id ON study_room_messages(user_id);

-- RLS (Row Level Security) politike
ALTER TABLE study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_room_messages ENABLE ROW LEVEL SECURITY;

-- Politike za study_rooms
CREATE POLICY "Users can view rooms they are members of" ON study_rooms
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM study_room_members 
            WHERE study_room_members.room_id = study_rooms.room_id 
            AND study_room_members.user_id = auth.uid()::text
            AND study_room_members.is_active = true
        )
    );

CREATE POLICY "Admins can create rooms" ON study_rooms
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update their rooms" ON study_rooms
    FOR UPDATE USING (admin_user_id = auth.uid()::text);

-- Politike za study_room_members
CREATE POLICY "Users can view members of rooms they are in" ON study_room_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM study_room_members sm2
            WHERE sm2.room_id = study_room_members.room_id 
            AND sm2.user_id = auth.uid()::text
            AND sm2.is_active = true
        )
    );

CREATE POLICY "Users can join rooms" ON study_room_members
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their own membership" ON study_room_members
    FOR UPDATE USING (user_id = auth.uid()::text);

-- Politike za study_room_messages
CREATE POLICY "Users can view messages in rooms they are members of" ON study_room_messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM study_room_members 
            WHERE study_room_members.room_id = study_room_messages.room_id 
            AND study_room_members.user_id = auth.uid()::text
            AND study_room_members.is_active = true
        )
    );

CREATE POLICY "Users can send messages in rooms they are members of" ON study_room_messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM study_room_members 
            WHERE study_room_members.room_id = study_room_messages.room_id 
            AND study_room_members.user_id = auth.uid()::text
            AND study_room_members.is_active = true
        )
    );

-- Funkcija za automatsko ažuriranje updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger za automatsko ažuriranje updated_at
CREATE TRIGGER update_study_rooms_updated_at 
    BEFORE UPDATE ON study_rooms 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Funkcija za brisanje starih poruka (opciono)
CREATE OR REPLACE FUNCTION cleanup_old_messages()
RETURNS void AS $$
BEGIN
    DELETE FROM study_room_messages 
    WHERE timestamp < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Funkcija za dohvatanje statistika sobe
CREATE OR REPLACE FUNCTION get_room_stats(room_uuid UUID)
RETURNS TABLE(
    total_members INTEGER,
    total_messages INTEGER,
    last_activity TIMESTAMP WITH TIME ZONE,
    admin_username VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(DISTINCT sm.user_id)::INTEGER as total_members,
        COUNT(srm.id)::INTEGER as total_messages,
        MAX(srm.timestamp) as last_activity,
        admin_member.username as admin_username
    FROM study_rooms sr
    LEFT JOIN study_room_members sm ON sr.room_id = sm.room_id AND sm.is_active = true
    LEFT JOIN study_room_messages srm ON sr.room_id = srm.room_id
    LEFT JOIN study_room_members admin_member ON sr.room_id = admin_member.room_id AND admin_member.role = 'admin'
    WHERE sr.room_id = room_uuid
    GROUP BY admin_member.username;
END;
$$ LANGUAGE plpgsql;

-- Komentari za dokumentaciju
COMMENT ON TABLE study_rooms IS 'Tabela za Study Room sobe - privatne sobe za kolaborativno učenje';
COMMENT ON TABLE study_room_members IS 'Tabela za članove Study Room soba - admin, member, guest uloge';
COMMENT ON TABLE study_room_messages IS 'Tabela za poruke u Study Room sobama - chat, system, ai tipovi';

COMMENT ON COLUMN study_rooms.room_id IS 'Jedinstveni UUID identifikator sobe';
COMMENT ON COLUMN study_rooms.invite_code IS 'Kratak kod za pozivnice (generisan iz room_id)';
COMMENT ON COLUMN study_rooms.admin_user_id IS 'ID korisnika koji je admin sobe';
COMMENT ON COLUMN study_rooms.is_active IS 'Da li je soba aktivna ili je arhivirana';

COMMENT ON COLUMN study_room_members.role IS 'Uloga člana: admin, member, guest';
COMMENT ON COLUMN study_room_members.is_active IS 'Da li je članstvo aktivno';

COMMENT ON COLUMN study_room_messages.message_type IS 'Tip poruke: chat, system, ai';
COMMENT ON COLUMN study_room_messages.timestamp IS 'Vreme slanja poruke';

-- Inicijalni podaci za testiranje (opciono)
-- INSERT INTO study_rooms (room_id, name, description, subject, admin_user_id) 
-- VALUES 
--     ('550e8400-e29b-41d4-a716-446655440000', 'Matematika - Diferencijalni račun', 'Soba za učenje diferencijalnog računa', 'Matematika', 'test_admin_1'),
--     ('550e8400-e29b-41d4-a716-446655440001', 'Fizika - Mehanika', 'Soba za učenje mehanike', 'Fizika', 'test_admin_2');

-- INSERT INTO study_room_members (room_id, user_id, username, role) 
-- VALUES 
--     ('550e8400-e29b-41d4-a716-446655440000', 'test_admin_1', 'Admin1', 'admin'),
--     ('550e8400-e29b-41d4-a716-446655440000', 'test_user_1', 'Student1', 'member'),
--     ('550e8400-e29b-41d4-a716-446655440001', 'test_admin_2', 'Admin2', 'admin'),
--     ('550e8400-e29b-41d4-a716-446655440001', 'test_user_2', 'Student2', 'member'); 