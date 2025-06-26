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
        return 'text-green-400';
      case 'error':
        return 'text-red-400';
      case 'processing':
        return 'text-yellow-400';
      default:
        return 'text-gray-400';
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
        <FaSpinner className="animate-spin text-blue-400 text-2xl" />
        <span className="ml-2 text-gray-300">Učitavanje dokumenata...</span>
      </div>
    );
  }

  return (
    <>
      <div className="bg-[#1a2332] rounded-xl p-6 h-full overflow-hidden flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Uploadovani dokumenti</h2>
          <button 
            onClick={fetchDocuments}
            className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
          >
            Osveži
          </button>
        </div>

        {documents.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            <FaFile className="text-4xl mx-auto mb-4 opacity-50" />
            <p>Nema uploadovanih dokumenata</p>
            <p className="text-sm mt-2">Uploadujte dokumente da biste ih videli ovde</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-3">
              {documents.map((doc) => (
                <div 
                  key={doc.id}
                  className={`bg-[#151c2c] rounded-lg p-4 border-l-4 transition-all cursor-pointer hover:bg-[#1e2a3a] ${
                    selectedDocument?.id === doc.id ? 'border-blue-400 bg-[#1e2a3a]' : 'border-gray-600'
                  }`}
                  onClick={() => setSelectedDocument(doc)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        {getFileIcon(doc.file_type)}
                        <h3 className="font-semibold text-white truncate">{doc.filename}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)} bg-opacity-20`}>
                          {getStatusText(doc.status)}
                        </span>
                      </div>
                      
                      {/* OCR preview */}
                      {doc.ocr_info && doc.ocr_info.text && (
                        <div className="mt-1 text-xs text-green-300 bg-green-900/20 rounded p-2 flex items-center gap-2">
                          <span className="truncate max-w-[200px]">{doc.ocr_info.text.slice(0, 100)}{doc.ocr_info.text.length > 100 ? '...' : ''}</span>
                          <button
                            className="ml-2 px-2 py-1 text-xs bg-blue-700 text-white rounded hover:bg-blue-800"
                            onClick={e => { e.stopPropagation(); setOcrModal({ocr: doc.ocr_info, doc}); }}
                            title="Prikaži ceo OCR tekst"
                          >
                            OCR detalji
                          </button>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-400">
                        <div>
                          <span className="font-medium">Tip:</span> {doc.file_type}
                        </div>
                        <div>
                          <span className="font-medium">Veličina:</span> {formatFileSize(doc.file_size)}
                        </div>
                        <div>
                          <span className="font-medium">Stranice:</span> {doc.total_pages}
                        </div>
                        <div>
                          <span className="font-medium">Chunkovi:</span> {doc.chunks_count}
                        </div>
                      </div>
                      
                      <div className="text-xs text-gray-500 mt-2">
                        Uploadovano: {formatDate(doc.created_at)}
                      </div>

                      {doc.error_message && (
                        <div className="text-red-400 text-sm mt-2">
                          Greška: {doc.error_message}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openDocumentPreview(doc);
                        }}
                        className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Pregledaj dokument"
                      >
                        <FaEye size={16} />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDocument(doc.id);
                        }}
                        className="p-2 text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Obriši dokument"
                      >
                        <FaTrash size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Detalji dokumenta */}
        {selectedDocument && (
          <div className="mt-4 p-4 bg-[#151c2c] rounded-lg border border-gray-600">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">Detalji dokumenta</h3>
              <button 
                onClick={() => setSelectedDocument(null)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="text-sm text-gray-300 space-y-1">
              <p><strong>ID:</strong> {selectedDocument.id}</p>
              <p><strong>Status:</strong> <span className={getStatusColor(selectedDocument.status)}>{getStatusText(selectedDocument.status)}</span></p>
              <p><strong>Uploadovano:</strong> {formatDate(selectedDocument.created_at)}</p>
              {selectedDocument.error_message && (
                <p><strong>Greška:</strong> <span className="text-red-400">{selectedDocument.error_message}</span></p>
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
    </>
  );
} 