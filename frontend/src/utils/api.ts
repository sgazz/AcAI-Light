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