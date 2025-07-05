'use client';

import { useState, useEffect } from 'react';
import { FaFile, FaTrash, FaEye, FaFileAlt, FaClock, FaHdd, FaLayerGroup, FaRedo, FaSearch, FaDownload, FaExternalLinkAlt, FaMagic, FaTimes } from 'react-icons/fa';
import DocumentPreview from './DocumentPreview';
import { formatFileSize, getFileIcon } from '../utils/fileUtils';
import { formatDate } from '../utils/dateUtils';
import { DOCUMENTS_ENDPOINT, apiRequest } from '../utils/api';
import { useErrorToast } from './ErrorToastProvider';
import { useFileOperations } from '../utils/fileOperations';
import { useStatusIcons } from '../utils/statusIcons';

interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  content?: string;
  metadata?: {
    total_pages?: number;
    chunks?: any[];
    embedding_count?: number;
    ocr_info?: {
      confidence?: number;
      languages?: string[];
      status?: string;
      message?: string;
      text?: string;
    };
  };
  created_at?: string;
  error_message?: string;
}

export default function DocumentList() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [ocrModal, setOcrModal] = useState<{ocr: Record<string, unknown> | undefined, doc: Document} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const { showError, showSuccess, showWarning } = useErrorToast();
  const { previewFromAPI, downloadFromAPI } = useFileOperations();
  const { getStatusIcon, getStatusColor, getStatusText } = useStatusIcons();

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

  const openOcrPreview = (document: Document) => {
    if (document.metadata?.ocr_info && document.metadata.ocr_info.text) {
      setOcrModal({ ocr: document.metadata.ocr_info, doc: document });
    } else {
      showWarning('Nema OCR rezultata za ovaj dokument', 'OCR Preview');
    }
  };

  const closeOcrPreview = () => {
    setOcrModal(null);
  };

  const handlePreviewOriginal = async (document: Document) => {
    const success = await previewFromAPI(`http://localhost:8001/documents/${document.id}/preview`);
    if (!success) {
      showError('Greška pri otvaranju preview-a', 'Preview greška');
    }
  };

  const handleDownloadOriginal = async (document: Document) => {
    const success = await downloadFromAPI(`http://localhost:8001/documents/${document.id}/download`, document.filename);
    if (!success) {
      showError('Greška pri preuzimanju fajla', 'Download greška');
    }
  };



  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchQuery === '' || 
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch; // Uklanjamo status filter jer svi dokumenti su "uploaded"
  });

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-2xl rounded-2xl p-8 h-full relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-pulse"></div>
          <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-bounce"></div>
        </div>
        
        <div className="relative flex items-center justify-center h-64">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse"></div>
          </div>
          <span className="ml-4 text-white font-semibold">Učitavanje dokumenata...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-2xl rounded-2xl p-8 h-full relative">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-pulse"></div>
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-bounce"></div>
        <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-purple-400/10 rounded-full blur-xl animate-pulse"></div>
      </div>

      <div className="relative flex flex-col h-full overflow-y-auto custom-scrollbar">
        {/* Premium Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 lg:mb-8">
          <div className="flex items-center gap-3 lg:gap-4">
            <div className="relative">
              <div className="p-2 lg:p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl lg:rounded-2xl shadow-lg">
                <FaFileAlt className="text-white" size={20} />
              </div>
              <div className="absolute -top-1 -right-1 w-2 lg:w-3 h-2 lg:h-3 bg-blue-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-lg lg:text-2xl font-bold bg-gradient-to-r from-white to-green-200 bg-clip-text text-transparent">
                Uploadovani dokumenti
              </h2>
              <p className="text-xs lg:text-sm text-slate-400 font-medium">Upravljajte vašim dokumentima</p>
            </div>
          </div>
          <button 
            onClick={fetchDocuments}
            className="flex items-center gap-2 lg:gap-3 px-4 lg:px-6 py-2 lg:py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg lg:rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl text-sm lg:text-base"
          >
            <FaRedo size={14} />
            <span className="hidden sm:inline">Osveži</span>
          </button>
        </div>

        {/* Premium Search & Filter */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 lg:gap-4 mb-4 lg:mb-6">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Pretraži dokumente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 lg:pl-12 pr-4 py-2 lg:py-3 bg-slate-800/50 border border-white/10 rounded-lg lg:rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/20 backdrop-blur-sm transition-all duration-300 text-sm lg:text-base"
            />
            <div className="absolute left-3 lg:left-4 top-1/2 transform -translate-y-1/2 w-3 lg:w-4 h-3 lg:h-4 bg-slate-700/80 rounded-full flex items-center justify-center z-10">
              <FaSearch className="text-white" size={10} />
            </div>
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 lg:px-6 py-2 lg:py-3 bg-slate-800/50 border border-white/10 rounded-lg lg:rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/20 backdrop-blur-sm transition-all duration-300 text-sm lg:text-base"
          >
            <option value="all">Svi statusi</option>
            <option value="uploaded">Učitano</option>
            <option value="processing">Obrađuje se</option>
            <option value="error">Greška</option>
          </select>
        </div>

        {/* Documents List */}
        <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar min-h-0">
          {filteredDocuments.length === 0 ? (
            <div className="text-center text-slate-400 py-16">
              <div className="relative mb-6">
                <FaFile size={64} className="mx-auto opacity-30" />
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-full blur-2xl animate-pulse"></div>
              </div>
              <p className="text-xl font-bold mb-3 text-white">
                {searchQuery || filterStatus !== 'all' ? 'Nema rezultata za vašu pretragu' : 'Nema uploadovanih dokumenata'}
              </p>
              <p className="text-sm opacity-75">
                {searchQuery || filterStatus !== 'all' ? 'Pokušajte sa drugim filterima' : 'Uploadujte dokumente da biste ih videli ovde'}
              </p>
            </div>
          ) : (
            filteredDocuments.map((doc, index) => (
              <div
                key={doc.id}
                className={`group relative p-4 lg:p-6 rounded-xl lg:rounded-2xl border cursor-pointer card-hover-profi ${
                  selectedDocument?.id === doc.id
                    ? 'border-blue-500/50 bg-gradient-to-r from-blue-500/10 to-purple-500/10 shadow-xl shadow-blue-500/20'
                    : 'border-white/10 hover-border-subtle hover-bg-subtle'
                }`}
                onClick={() => setSelectedDocument(doc)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Suptilni hover glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 to-purple-500/3 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative flex items-start justify-between">
                  <div className="flex items-start gap-3 lg:gap-4 flex-1">
                    <div className="p-2 lg:p-3 bg-slate-700/50 rounded-lg lg:rounded-xl">
                      {getFileIcon(doc.file_type, 20)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate mb-2 text-sm lg:text-base">
                        {doc.filename}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 lg:gap-6 mb-3 text-xs lg:text-sm text-slate-400">
                          <div className="flex items-center gap-2">
                            <FaHdd size={12} />
                            <span>{formatFileSize(doc.file_size)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaFileAlt size={12} />
                            <span>{doc.metadata?.total_pages || 0} stranica</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaLayerGroup size={12} />
                            <span>{doc.metadata?.embedding_count || 0} delova</span>
                          </div>
                          <div className={`flex items-center gap-2 ${getStatusColor('success')}`}>
                            {getStatusIcon('success')}
                            <span className="font-semibold">{getStatusText('success')}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <FaClock size={10} />
                          <span>Uploadovano: {doc.created_at ? formatDate(doc.created_at) : 'N/A'}</span>
                        </div>
                    </div>
                  </div>
                  <div className="flex gap-1 lg:gap-2 ml-2 lg:ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePreviewOriginal(doc);
                      }}
                      className="p-2 lg:p-3 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded-lg lg:rounded-xl icon-hover-profi"
                      title="Preview originalnog fajla"
                    >
                      <FaExternalLinkAlt size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadOriginal(doc);
                      }}
                      className="p-2 lg:p-3 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20 rounded-lg lg:rounded-xl icon-hover-profi"
                      title="Preuzmi originalni fajl"
                    >
                      <FaDownload size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openDocumentPreview(doc);
                      }}
                      className="p-2 lg:p-3 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-lg lg:rounded-xl icon-hover-profi"
                      title="Pregledaj sadržaj"
                    >
                      <FaEye size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDocument(doc);
                      }}
                      className="p-2 lg:p-3 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded-lg lg:rounded-xl icon-hover-profi"
                      title="Detalji dokumenta"
                    >
                      <FaFileAlt size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDocument(doc.id);
                      }}
                      className="p-2 lg:p-3 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg lg:rounded-xl icon-hover-profi"
                      title="Obriši dokument"
                    >
                      <FaTrash size={14} />
                    </button>
                  </div>
                </div>

                {/* Premium OCR Info */}
                {doc.metadata?.ocr_info && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-xl border border-white/10 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <FaMagic size={14} className="text-blue-400" />
                        OCR Informacije
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openOcrPreview(doc);
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 px-2 py-1 rounded-lg transition-all duration-200"
                      >
                        Pregledaj rezultat
                      </button>
                    </div>
                    <div className="text-xs text-slate-400 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">Pouzdanost:</span>
                        <span className="text-blue-400 font-bold">{doc.metadata.ocr_info.confidence?.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">Jezici:</span>
                        <span>{doc.metadata.ocr_info.languages?.join(', ') || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">Status:</span>
                        <span className={doc.metadata.ocr_info.status === 'success' ? 'text-green-400' : 'text-yellow-400'}>
                          {doc.metadata.ocr_info.status || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Premium Document Details */}
        {selectedDocument && (
          <div className="mt-6 p-6 bg-gradient-to-r from-slate-800/30 to-slate-700/30 rounded-2xl border border-white/10 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <FaFileAlt size={16} className="text-blue-400" />
                </div>
                Detalji dokumenta
              </h3>
              <button 
                onClick={() => setSelectedDocument(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200"
              >
                <FaTimes size={16} />
              </button>
            </div>
            <div className="text-sm text-slate-400 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">ID:</span>
                <span className="font-mono">{selectedDocument.id}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">Status:</span>
                                        <span className={`${getStatusColor('success')} font-semibold`}>
                          {getStatusText('success')}
                        </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">Uploadovano:</span>
                <span>{selectedDocument.created_at ? formatDate(selectedDocument.created_at) : 'N/A'}</span>
              </div>
              {selectedDocument.error_message && (
                <div className="flex items-center gap-2">
                  <span className="text-white font-semibold">Greška:</span>
                  <span className="text-red-400 font-medium">{selectedDocument.error_message}</span>
                </div>
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

      {/* OCR Preview Modal */}
      {ocrModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[var(--bg-tertiary)] rounded-xl max-w-4xl w-full h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[var(--accent-green)]/20 rounded-lg">
                  <FaMagic className="text-[var(--accent-green)]" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--text-primary)]">
                    OCR Preview - {ocrModal.doc.filename}
                  </h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Tekst prepoznat iz slike
                  </p>
                </div>
              </div>
              
              <button
                onClick={closeOcrPreview}
                className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-colors"
                title="Zatvori"
              >
                <FaTimes size={16} />
              </button>
            </div>

            {/* OCR Info */}
            <div className="p-4 border-b border-[var(--accent-green)] bg-[var(--accent-green)]/10">
              <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
                {ocrModal.ocr && typeof ocrModal.ocr === 'object' && 'confidence' in ocrModal.ocr && typeof ocrModal.ocr.confidence === 'number' && (
                  <span><strong>Pouzdanost:</strong> {ocrModal.ocr.confidence.toFixed(1)}%</span>
                )}
                {ocrModal.ocr && typeof ocrModal.ocr === 'object' && 'languages' in ocrModal.ocr && Array.isArray(ocrModal.ocr.languages) && (
                  <span><strong>Jezici:</strong> {ocrModal.ocr.languages.join(', ')}</span>
                )}
                {ocrModal.ocr && typeof ocrModal.ocr === 'object' && 'status' in ocrModal.ocr && typeof ocrModal.ocr.status === 'string' && (
                  <span><strong>Status:</strong> {ocrModal.ocr.status}</span>
                )}
                {ocrModal.ocr && typeof ocrModal.ocr === 'object' && 'message' in ocrModal.ocr && typeof ocrModal.ocr.message === 'string' && (
                  <span><strong>Poruka:</strong> {ocrModal.ocr.message}</span>
                )}
              </div>
            </div>

            {/* OCR Text Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="bg-[var(--bg-secondary)] rounded-lg p-4">
                <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">Prepoznati tekst:</h3>
                <div className="text-[var(--text-primary)] whitespace-pre-line leading-relaxed">
                  {ocrModal.ocr && typeof ocrModal.ocr === 'object' && 'text' in ocrModal.ocr && typeof ocrModal.ocr.text === 'string' 
                    ? ocrModal.ocr.text 
                    : 'Nema prepoznatog teksta'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 