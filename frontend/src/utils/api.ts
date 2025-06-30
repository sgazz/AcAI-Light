/**
 * API konfiguracija
 */
export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8001';

/**
 * Dokument endpoints
 */
export const DOCUMENTS_ENDPOINT = `${API_BASE}/documents`;
export const UPLOAD_ENDPOINT = `${API_BASE}/documents/upload`;

/**
 * Chat endpoints
 */
export const CHAT_SESSIONS_ENDPOINT = `${API_BASE}/chat/sessions`;
export const CHAT_HISTORY_ENDPOINT = `${API_BASE}/chat/history`;
export const CHAT_NEW_SESSION_ENDPOINT = `${API_BASE}/chat/new-session`;
export const CHAT_ENDPOINT = `${API_BASE}/chat`;
export const CHAT_RAG_ENDPOINT = `${API_BASE}/chat/rag`;
export const CHAT_RAG_MULTISTEP_ENDPOINT = `${API_BASE}/chat/rag-multistep`;
export const CHAT_RAG_ENHANCED_CONTEXT_ENDPOINT = `${API_BASE}/chat/rag-enhanced-context`;

/**
 * OCR endpoints
 */
export const OCR_INFO_ENDPOINT = `${API_BASE}/ocr/info`;
export const OCR_SUPPORTED_FORMATS_ENDPOINT = `${API_BASE}/ocr/supported-formats`;
export const OCR_EXTRACT_ENDPOINT = `${API_BASE}/ocr/extract`;
export const OCR_EXTRACT_ADVANCED_ENDPOINT = `${API_BASE}/ocr/extract-advanced`;
export const OCR_BATCH_EXTRACT_ENDPOINT = `${API_BASE}/ocr/batch-extract`;

/**
 * Search endpoints
 */
export const SEARCH_MULTISTEP_ENDPOINT = `${API_BASE}/search/multistep`;

/**
 * Health check endpoint
 */
export const HEALTH_CHECK_ENDPOINT = `${API_BASE}/`;

/**
 * Query Rewriting endpoints
 */
export const QUERY_ENHANCE_ENDPOINT = `${API_BASE}/query/enhance`;
export const QUERY_EXPAND_ENDPOINT = `${API_BASE}/query/expand`;
export const QUERY_ANALYZE_ENDPOINT = `${API_BASE}/query/analyze`;

/**
 * Fact Checking endpoints
 */
export const FACT_CHECK_VERIFY_ENDPOINT = `${API_BASE}/fact-check/verify`;
export const FACT_CHECK_VERIFY_MULTIPLE_ENDPOINT = `${API_BASE}/fact-check/verify-multiple`;

/**
 * Session Management Endpoints
 */
export const SESSION_METADATA_ENDPOINT = `${API_BASE}/session/metadata`;
export const SESSION_CATEGORIES_ENDPOINT = `${API_BASE}/session/categories`;
export const SESSION_SHARING_ENDPOINT = `${API_BASE}/session/sharing`;
export const SESSIONS_METADATA_ENDPOINT = `${API_BASE}/sessions/metadata`;

/**
 * Centralizovani API request helper sa error handling-om
 */
export async function apiRequest<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get('content-type');
    let data: any = null;
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      // Backend error response (naš format)
      if (data && typeof data === 'object' && data.error) {
        const err = new Error(data.error.message || data.error.code || 'Greška na serveru');
        (err as any).status = data.status || 'error';
        (err as any).code = data.error.code;
        (err as any).category = data.error.category;
        (err as any).severity = data.error.severity;
        (err as any).timestamp = data.error.timestamp;
        throw err;
      }
      // FastAPI/Next.js error
      if (data && data.detail) {
        const err = new Error(data.detail);
        (err as any).status = 'error';
        throw err;
      }
      // Plain text error
      throw new Error(typeof data === 'string' ? data : 'Nepoznata greška');
    }
    return data;
  } catch (err: any) {
    // Network error
    if (err.name === 'TypeError' && err.message.includes('fetch')) {
      const netErr = new Error('Nema konekcije sa serverom. Proverite internet ili backend.');
      (netErr as any).status = 'network';
      throw netErr;
    }
    throw err;
  }
}

// Session Management API functions
export const createSessionMetadata = async (sessionId: string, name?: string, description?: string) => {
  return apiRequest(SESSION_METADATA_ENDPOINT, {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId, name, description }),
  });
};

export const getSessionMetadata = async (sessionId: string) => {
  return apiRequest(`${SESSION_METADATA_ENDPOINT}/${sessionId}`);
};

export const updateSessionMetadata = async (sessionId: string, data: { name?: string; description?: string; is_archived?: boolean }) => {
  return apiRequest(`${SESSION_METADATA_ENDPOINT}/${sessionId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
};

export const addSessionCategories = async (sessionId: string, categories: string[]) => {
  return apiRequest(`${SESSION_CATEGORIES_ENDPOINT}/${sessionId}`, {
    method: 'POST',
    body: JSON.stringify({ categories }),
  });
};

export const getSessionCategories = async (sessionId: string) => {
  return apiRequest(`${SESSION_CATEGORIES_ENDPOINT}/${sessionId}`);
};

export const createShareLink = async (sessionId: string, permissions: string = 'read', expiresIn: string = '7d') => {
  return apiRequest(`${SESSION_SHARING_ENDPOINT}/${sessionId}`, {
    method: 'POST',
    body: JSON.stringify({ permissions, expires_in: expiresIn }),
  });
};

export const getShareLinks = async (sessionId: string) => {
  return apiRequest(`${SESSION_SHARING_ENDPOINT}/${sessionId}`);
};

export const revokeShareLink = async (shareLinkId: string) => {
  return apiRequest(`${SESSION_SHARING_ENDPOINT}/${shareLinkId}`, {
    method: 'DELETE',
  });
};

export const getAllSessionsMetadata = async () => {
  return apiRequest(SESSIONS_METADATA_ENDPOINT);
}; 