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
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

-- Dodavanje kolona za session management u chat_history tabelu

-- Dodavanje kolona za session metadata
ALTER TABLE chat_history 
ADD COLUMN IF NOT EXISTS session_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS session_description TEXT,
ADD COLUMN IF NOT EXISTS categories JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS share_links JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]',
ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Kreiranje nove tabele za session metadata (alternativno rešenje)
CREATE TABLE IF NOT EXISTS session_metadata (
    session_id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255),
    description TEXT,
    categories JSONB DEFAULT '[]',
    tags JSONB DEFAULT '[]',
    is_archived BOOLEAN DEFAULT FALSE,
    priority INTEGER DEFAULT 0,
    share_links JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Kreiranje tabele za share links
CREATE TABLE IF NOT EXISTS session_share_links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    share_token VARCHAR(255) UNIQUE NOT NULL,
    permissions JSONB DEFAULT '{"read": true, "write": false}',
    expires_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by VARCHAR(255),
    access_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE
);

-- Kreiranje tabele za session categories
CREATE TABLE IF NOT EXISTS session_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    category_color VARCHAR(7) DEFAULT '#3B82F6',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(session_id, category_name)
);

-- Indeksi za bolje performanse
CREATE INDEX IF NOT EXISTS idx_chat_history_session_name ON chat_history(session_name);
CREATE INDEX IF NOT EXISTS idx_chat_history_is_archived ON chat_history(is_archived);
CREATE INDEX IF NOT EXISTS idx_chat_history_last_accessed ON chat_history(last_accessed);
CREATE INDEX IF NOT EXISTS idx_chat_history_categories ON chat_history USING GIN(categories);

CREATE INDEX IF NOT EXISTS idx_session_metadata_name ON session_metadata(name);
CREATE INDEX IF NOT EXISTS idx_session_metadata_is_archived ON session_metadata(is_archived);
CREATE INDEX IF NOT EXISTS idx_session_metadata_categories ON session_metadata USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_session_metadata_last_accessed ON session_metadata(last_accessed);

CREATE INDEX IF NOT EXISTS idx_session_share_links_session_id ON session_share_links(session_id);
CREATE INDEX IF NOT EXISTS idx_session_share_links_share_token ON session_share_links(share_token);
CREATE INDEX IF NOT EXISTS idx_session_share_links_is_active ON session_share_links(is_active);
CREATE INDEX IF NOT EXISTS idx_session_share_links_expires_at ON session_share_links(expires_at);

CREATE INDEX IF NOT EXISTS idx_session_categories_session_id ON session_categories(session_id);
CREATE INDEX IF NOT EXISTS idx_session_categories_name ON session_categories(category_name);

-- Funkcija za automatsko ažuriranje last_accessed
CREATE OR REPLACE FUNCTION update_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_accessed = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger za automatsko ažuriranje last_accessed
CREATE TRIGGER update_chat_history_last_accessed 
    BEFORE UPDATE ON chat_history 
    FOR EACH ROW EXECUTE FUNCTION update_last_accessed();

CREATE TRIGGER update_session_metadata_last_accessed 
    BEFORE UPDATE ON session_metadata 
    FOR EACH ROW EXECUTE FUNCTION update_last_accessed();

-- Funkcija za kreiranje share token-a
CREATE OR REPLACE FUNCTION generate_share_token()
RETURNS VARCHAR(255) AS $$
BEGIN
    RETURN encode(gen_random_bytes(32), 'hex');
END;
$$ LANGUAGE plpgsql;

-- Funkcija za dodavanje kategorije sesiji
CREATE OR REPLACE FUNCTION add_session_category(
    p_session_id VARCHAR(255),
    p_category_name VARCHAR(100),
    p_category_color VARCHAR(7) DEFAULT '#3B82F6'
)
RETURNS BOOLEAN AS $$
BEGIN
    INSERT INTO session_categories (session_id, category_name, category_color)
    VALUES (p_session_id, p_category_name, p_category_color)
    ON CONFLICT (session_id, category_name) DO NOTHING;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Funkcija za uklanjanje kategorije sesiji
CREATE OR REPLACE FUNCTION remove_session_category(
    p_session_id VARCHAR(255),
    p_category_name VARCHAR(100)
)
RETURNS BOOLEAN AS $$
BEGIN
    DELETE FROM session_categories 
    WHERE session_id = p_session_id AND category_name = p_category_name;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- Funkcija za kreiranje share link-a
CREATE OR REPLACE FUNCTION create_session_share_link(
    p_session_id VARCHAR(255),
    p_permissions JSONB DEFAULT '{"read": true, "write": false}',
    p_expires_in_days INTEGER DEFAULT 7,
    p_created_by VARCHAR(255) DEFAULT NULL
)
RETURNS VARCHAR(255) AS $$
DECLARE
    v_share_token VARCHAR(255);
BEGIN
    v_share_token := generate_share_token();
    
    INSERT INTO session_share_links (
        session_id, 
        share_token, 
        permissions, 
        expires_at, 
        created_by
    ) VALUES (
        p_session_id,
        v_share_token,
        p_permissions,
        NOW() + INTERVAL '1 day' * p_expires_in_days,
        p_created_by
    );
    
    RETURN v_share_token;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Funkcija za validaciju share link-a
CREATE OR REPLACE FUNCTION validate_share_link(p_share_token VARCHAR(255))
RETURNS TABLE(
    session_id VARCHAR(255),
    permissions JSONB,
    is_valid BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ssl.session_id,
        ssl.permissions,
        ssl.is_active AND (ssl.expires_at IS NULL OR ssl.expires_at > NOW()) AS is_valid
    FROM session_share_links ssl
    WHERE ssl.share_token = p_share_token;
END;
$$ LANGUAGE plpgsql;

-- Komentari za nove tabele
COMMENT ON TABLE session_metadata IS 'Tabela za čuvanje metadata informacija o chat sesijama';
COMMENT ON TABLE session_share_links IS 'Tabela za čuvanje share link-ova za sesije';
COMMENT ON TABLE session_categories IS 'Tabela za čuvanje kategorija sesija';

-- Inicijalni podaci za testiranje (opciono)
-- INSERT INTO session_categories (session_id, category_name, category_color) VALUES 
-- ('test-session-1', 'Važno', '#EF4444'),
-- ('test-session-1', 'Posao', '#3B82F6'),
-- ('test-session-2', 'Lično', '#10B981'); 