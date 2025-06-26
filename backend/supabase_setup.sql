-- AcAIA Supabase Database Setup
-- Ova skripta kreira potrebne tabele za AcAIA projekat

-- Omogućavanje pgvector ekstenzije
CREATE EXTENSION IF NOT EXISTS vector;

-- Tabela za dokumente
CREATE TABLE IF NOT EXISTS documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_type VARCHAR(50) NOT NULL,
    file_size BIGINT NOT NULL,
    content TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela za vektore (embeddings)
CREATE TABLE IF NOT EXISTS document_vectors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id UUID REFERENCES documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    embedding vector(1536), -- OpenAI embedding dimenzija
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela za chat istoriju
CREATE TABLE IF NOT EXISTS chat_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    user_message TEXT NOT NULL,
    assistant_message TEXT NOT NULL,
    sources JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela za OCR obrađene slike
CREATE TABLE IF NOT EXISTS ocr_images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    original_filename VARCHAR(255) NOT NULL,
    processed_filename VARCHAR(255),
    original_path VARCHAR(500) NOT NULL,
    processed_path VARCHAR(500),
    ocr_text TEXT,
    confidence_score FLOAT,
    language VARCHAR(10) DEFAULT 'srp+eng',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela za multi-step retrieval sesije
CREATE TABLE IF NOT EXISTS retrieval_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    query TEXT NOT NULL,
    steps JSONB DEFAULT '[]',
    final_results JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indeksi za bolje performanse
CREATE INDEX IF NOT EXISTS idx_documents_filename ON documents(filename);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at);

CREATE INDEX IF NOT EXISTS idx_document_vectors_document_id ON document_vectors(document_id);
CREATE INDEX IF NOT EXISTS idx_document_vectors_chunk_index ON document_vectors(chunk_index);
CREATE INDEX IF NOT EXISTS idx_document_vectors_embedding ON document_vectors USING ivfflat (embedding vector_cosine_ops);

CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at);

CREATE INDEX IF NOT EXISTS idx_ocr_images_filename ON ocr_images(original_filename);
CREATE INDEX IF NOT EXISTS idx_ocr_images_created_at ON ocr_images(created_at);

CREATE INDEX IF NOT EXISTS idx_retrieval_sessions_session_id ON retrieval_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_retrieval_sessions_created_at ON retrieval_sessions(created_at);

-- Funkcija za automatsko ažuriranje updated_at polja
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger za automatsko ažuriranje updated_at polja
CREATE TRIGGER update_documents_updated_at 
    BEFORE UPDATE ON documents 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Funkcija za pretragu sličnosti vektora
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.7,
    match_count int DEFAULT 10
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    chunk_text TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dv.id,
        dv.document_id,
        dv.chunk_text,
        1 - (dv.embedding <=> query_embedding) AS similarity
    FROM document_vectors dv
    WHERE 1 - (dv.embedding <=> query_embedding) > match_threshold
    ORDER BY dv.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Komentari za tabele
COMMENT ON TABLE documents IS 'Tabela za čuvanje informacija o uploadovanim dokumentima';
COMMENT ON TABLE document_vectors IS 'Tabela za čuvanje vektorskih reprezentacija dokumentnih delova';
COMMENT ON TABLE chat_history IS 'Tabela za čuvanje istorije chat konverzacija';
COMMENT ON TABLE ocr_images IS 'Tabela za čuvanje informacija o OCR obrađenim slikama';
COMMENT ON TABLE retrieval_sessions IS 'Tabela za čuvanje multi-step retrieval sesija';

-- RLS (Row Level Security) - opciono za buduću auth implementaciju
-- ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE document_vectors ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE ocr_images ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE retrieval_sessions ENABLE ROW LEVEL SECURITY; 