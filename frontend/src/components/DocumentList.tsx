'use client';

import { useState, useEffect } from 'react';
import { FaFile, FaTrash, FaEye, FaSpinner } from 'react-icons/fa';
import DocumentPreview from './DocumentPreview';
import { formatFileSize, getFileIcon } from '../utils/fileUtils';
import { formatDate } from '../utils/dateUtils';
import { DOCUMENTS_ENDPOINT, apiRequest } from '../utils/api';
import { useErrorToast } from './ErrorToastProvider';

interface Document {
  id: string;
  filename: string;
  file_type: string;
  total_pages: number;
  file_size: number;
  status: string;
  chunks_count: number;
  created_at: string;
  error_message?: string;
  ocr_info?: {
    confidence?: number;
    languages?: string[];
    status?: string;
    message?: string;
    text?: string;
  };
}

export default function DocumentList() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [ocrModal, setOcrModal] = useState<{ocr: Record<string, unknown> | undefined, doc: Document} | null>(null);
  const { showError, showSuccess, showWarning } = useErrorToast();

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(DOCUMENTS_ENDPOINT);
      
      if (data.status === 'success') {
        setDocuments(data.documents || []);
      } else {
        throw new Error(data.message || 'Greška pri dohvatanju dokumenata');
      }
    } catch (error: any) {
      showError(
        error.message || 'Greška pri dohvatanju dokumenata',
        'Greška učitavanja',
        true,
        fetchDocuments
      );
    } finally {
      setLoading(false);
    }
  };

  const deleteDocument = async (docId: string) => {
    if (!confirm('Da li ste sigurni da želite da obrišete ovaj dokument?')) {
      return;
    }

    try {
      const data = await apiRequest(`${DOCUMENTS_ENDPOINT}/${docId}`, {
        method: 'DELETE',
      });
      
      if (data.status === 'success') {
        // Osveži listu dokumenata
        await fetchDocuments();
        showSuccess('Dokument uspešno obrisan', 'Brisanje');
      } else {
        throw new Error(data.message || 'Greška pri brisanju dokumenta');
      }
    } catch (error: any) {
      showError(
        error.message || 'Greška pri brisanju dokumenta',
        'Greška brisanja',
        true,
        () => deleteDocument(docId)
      );
    }
  };

  const openDocumentPreview = (document: Document) => {
    setPreviewDocument(document);
  };

  const closeDocumentPreview = () => {
    setPreviewDocument(null);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'uploaded':
        return 'text-[var(--accent-green)]';
      case 'error':
        return 'text-[var(--accent-red)]';
      case 'processing':
        return 'text-[var(--accent-yellow)]';
      default:
        return 'text-[var(--text-muted)]';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'uploaded':
        return 'Učitano';
      case 'error':
        return 'Greška';
      case 'processing':
        return 'Obrađuje se';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FaSpinner className="animate-spin text-[var(--accent-blue)] text-2xl" />
        <span className="ml-2 text-[var(--text-secondary)]">Učitavanje dokumenata...</span>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-primary)] min-h-full w-full flex flex-col">
      <div className="bg-[var(--bg-tertiary)] rounded-xl p-6 h-full overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Uploadovani dokumenti</h2>
          <button 
            onClick={fetchDocuments}
            className="px-3 py-1 bg-[var(--accent-blue)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-blue)]/80 text-sm"
          >
            Osveži
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="text-center text-[var(--text-muted)] py-8">
            <FaFile className="text-4xl mx-auto mb-4 opacity-50" />
            <p>Nema uploadovanih dokumenata</p>
            <p className="text-sm mt-2">Uploadujte dokumente da biste ih videli ovde</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-3">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedDocument?.id === doc.id
                    ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/10'
                    : 'border-[var(--border-color)] hover:border-[var(--accent-blue)] hover:bg-[var(--bg-secondary)]'
                }`}
                onClick={() => setSelectedDocument(doc)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex-shrink-0 mt-1">
                      {getFileIcon(doc.file_type, 24)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[var(--text-primary)] truncate">
                        {doc.filename}
                      </h3>
                      <div className="flex items-center gap-4 mt-1 text-sm text-[var(--text-secondary)]">
                        <span>{formatFileSize(doc.file_size)}</span>
                        <span>{doc.total_pages} stranica</span>
                        <span>{doc.chunks_count} delova</span>
                        <span className={getStatusColor(doc.status)}>
                          {getStatusText(doc.status)}
                        </span>
                      </div>
                      <div className="text-xs text-[var(--text-muted)] mt-1">
                        Uploadovano: {formatDate(doc.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewDocument(doc);
                      }}
                      className="p-2 text-[var(--accent-blue)] hover:text-[var(--accent-blue)]/80 hover:bg-[var(--accent-blue)]/10 rounded-lg transition-colors"
                      title="Pregledaj dokument"
                    >
                      <FaEye size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDocument(doc.id);
                      }}
                      className="p-2 text-[var(--accent-red)] hover:text-[var(--accent-red)]/80 hover:bg-[var(--accent-red)]/10 rounded-lg transition-colors"
                      title="Obriši dokument"
                    >
                      <FaTrash size={16} />
                    </button>
                  </div>
                </div>

                {/* OCR Info */}
                {doc.ocr_info && (
                  <div className="mt-3 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-[var(--text-primary)]">OCR Informacije</h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOcrModal({ doc, ocr: doc.ocr_info });
                        }}
                        className="text-xs text-[var(--accent-blue)] hover:text-[var(--accent-blue)]/80"
                      >
                        Pregledaj rezultat
                      </button>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] space-y-1">
                      <div>Pouzdanost: {doc.ocr_info.confidence?.toFixed(1)}%</div>
                      <div>Jezici: {doc.ocr_info.languages?.join(', ') || 'N/A'}</div>
                      <div>Status: {doc.ocr_info.status || 'N/A'}</div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {selectedDocument && (
          <div className="mt-4 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-[var(--text-primary)]">Detalji dokumenta</h3>
              <button 
                onClick={() => setSelectedDocument(null)}
                className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                ×
              </button>
            </div>
            <div className="text-sm text-[var(--text-secondary)] space-y-1">
              <p><strong>ID:</strong> {selectedDocument.id}</p>
              <p><strong>Status:</strong> <span className={getStatusColor(selectedDocument.status)}>{getStatusText(selectedDocument.status)}</span></p>
              <p><strong>Uploadovano:</strong> {formatDate(selectedDocument.created_at)}</p>
              {selectedDocument.error_message && (
                <p><strong>Greška:</strong> <span className="text-[var(--accent-red)]">{selectedDocument.error_message}</span></p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Document Preview Modal */}
      {previewDocument && (
        <DocumentPreview
          documentId={previewDocument.id}
          filename={previewDocument.filename}
          onClose={closeDocumentPreview}
        />
      )}

      {ocrModal && (
        <DocumentPreview
          documentId={ocrModal.doc.id}
          filename={ocrModal.doc.filename}
          onClose={() => setOcrModal(null)}
          ocrInfo={ocrModal.ocr}
        />
      )}
    </div>
  );
} 