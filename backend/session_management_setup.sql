-- AcAIA Session Management Setup
-- Kopiraj ovu skriptu u Supabase SQL Editor i pokreni je

-- SESSION MANAGEMENT TABELE

-- Tabela za session metadata (ime, kategorije, itd.)
CREATE TABLE IF NOT EXISTS session_metadata (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255),
    description TEXT,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMP WITH TIME ZONE,
    archived_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela za session kategorije
CREATE TABLE IF NOT EXISTS session_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, category_name)
);

-- Tabela za session sharing
CREATE TABLE IF NOT EXISTS session_sharing (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    share_link VARCHAR(255) NOT NULL UNIQUE,
    permissions VARCHAR(20) DEFAULT 'read', -- 'read', 'read_write', 'admin'
    expires_at TIMESTAMP WITH TIME ZONE,
    max_accesses INTEGER,
    current_accesses INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela za session access log
CREATE TABLE IF NOT EXISTS session_access_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    share_link_id UUID REFERENCES session_sharing(id) ON DELETE CASCADE,
    access_type VARCHAR(20) NOT NULL, -- 'view', 'download', 'export'
    ip_address INET,
    user_agent TEXT,
    accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SESSION MANAGEMENT INDEKSI
CREATE INDEX IF NOT EXISTS idx_session_metadata_session_id ON session_metadata(session_id);
CREATE INDEX IF NOT EXISTS idx_session_metadata_is_archived ON session_metadata(is_archived);
CREATE INDEX IF NOT EXISTS idx_session_metadata_created_at ON session_metadata(created_at);

CREATE INDEX IF NOT EXISTS idx_session_categories_session_id ON session_categories(session_id);
CREATE INDEX IF NOT EXISTS idx_session_categories_category_name ON session_categories(category_name);

CREATE INDEX IF NOT EXISTS idx_session_sharing_session_id ON session_sharing(session_id);
CREATE INDEX IF NOT EXISTS idx_session_sharing_share_link ON session_sharing(share_link);
CREATE INDEX IF NOT EXISTS idx_session_sharing_is_active ON session_sharing(is_active);
CREATE INDEX IF NOT EXISTS idx_session_sharing_expires_at ON session_sharing(expires_at);

CREATE INDEX IF NOT EXISTS idx_session_access_log_session_id ON session_access_log(session_id);
CREATE INDEX IF NOT EXISTS idx_session_access_log_share_link_id ON session_access_log(share_link_id);
CREATE INDEX IF NOT EXISTS idx_session_access_log_accessed_at ON session_access_log(accessed_at);

-- Funkcija za automatsko ažuriranje updated_at polja
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger za automatsko ažuriranje updated_at polja
DROP TRIGGER IF EXISTS update_session_metadata_updated_at ON session_metadata;
CREATE TRIGGER update_session_metadata_updated_at 
    BEFORE UPDATE ON session_metadata 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_session_sharing_updated_at ON session_sharing;
CREATE TRIGGER update_session_sharing_updated_at 
    BEFORE UPDATE ON session_sharing 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Funkcija za kreiranje session metadata ako ne postoji
CREATE OR REPLACE FUNCTION ensure_session_metadata(session_id_param VARCHAR(255))
RETURNS VOID AS $$
BEGIN
    INSERT INTO session_metadata (session_id, name)
    VALUES (session_id_param, 'Nova sesija')
    ON CONFLICT (session_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;

-- Komentari za tabele
COMMENT ON TABLE session_metadata IS 'Tabela za čuvanje metadata informacija o sesijama (ime, arhiviranje)';
COMMENT ON TABLE session_categories IS 'Tabela za čuvanje kategorija sesija';
COMMENT ON TABLE session_sharing IS 'Tabela za čuvanje informacija o deljenju sesija';
COMMENT ON TABLE session_access_log IS 'Tabela za čuvanje loga pristupa deljenim sesijama';

-- RLS (Row Level Security) - opciono za buduću auth implementaciju
-- ALTER TABLE session_metadata ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE session_categories ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE session_sharing ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE session_access_log ENABLE ROW LEVEL SECURITY;

-- Test podaci (opciono)
-- INSERT INTO session_metadata (session_id, name, description) 
-- VALUES ('test-session-1', 'Test Sesija 1', 'Ovo je test sesija za razvoj');

-- INSERT INTO session_categories (session_id, category_name, color) 
-- VALUES ('test-session-1', 'AI', '#3B82F6'), ('test-session-1', 'Test', '#EF4444');

-- INSERT INTO session_sharing (session_id, share_link, permissions, expires_at) 
-- VALUES ('test-session-1', 'share_test123', 'read', NOW() + INTERVAL '7 days'); 