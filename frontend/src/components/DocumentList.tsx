'use client';

import { useState, useEffect } from 'react';
import { FaFile, FaTrash, FaEye, FaSpinner, FaFileAlt, FaClock, FaHdd, FaLayerGroup, FaCheckCircle, FaExclamationTriangle, FaCog, FaRedo, FaSearch, FaFilter, FaMagic, FaTimes } from 'react-icons/fa';
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
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
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
        return 'text-slate-400';
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'uploaded':
        return <FaCheckCircle className="text-green-400" size={16} />;
      case 'error':
        return <FaExclamationTriangle className="text-red-400" size={16} />;
      case 'processing':
        return <FaCog className="text-yellow-400 animate-spin" size={16} />;
      default:
        return <FaFile className="text-slate-400" size={16} />;
    }
  };

  // Filter documents
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = searchQuery === '' || 
      doc.filename.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || doc.status === filterStatus;
    return matchesSearch && matchesStatus;
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
    <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-2xl rounded-2xl p-8 h-full relative overflow-hidden">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-pulse"></div>
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-bounce"></div>
        <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-purple-400/10 rounded-full blur-xl animate-pulse"></div>
      </div>

      <div className="relative flex flex-col h-full">
        {/* Premium Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
                <FaFileAlt className="text-white" size={24} />
              </div>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-green-200 bg-clip-text text-transparent">
                Uploadovani dokumenti
              </h2>
              <p className="text-sm text-slate-400 font-medium">Upravljajte vašim dokumentima</p>
            </div>
          </div>
          <button 
            onClick={fetchDocuments}
            className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
          >
            <FaRedo size={16} />
            Osveži
          </button>
        </div>

        {/* Premium Search & Filter */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative flex-1">
            <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Pretraži dokumente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/20 backdrop-blur-sm transition-all duration-300"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-6 py-3 bg-slate-800/50 border border-white/10 rounded-xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/20 backdrop-blur-sm transition-all duration-300"
          >
            <option value="all">Svi statusi</option>
            <option value="uploaded">Učitano</option>
            <option value="processing">Obrađuje se</option>
            <option value="error">Greška</option>
          </select>
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
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
                className={`group relative p-6 rounded-2xl border cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                  selectedDocument?.id === doc.id
                    ? 'border-blue-500/50 bg-gradient-to-r from-blue-500/10 to-purple-500/10 shadow-xl shadow-blue-500/20'
                    : 'border-white/10 hover:border-blue-500/30 hover:bg-slate-800/50'
                }`}
                onClick={() => setSelectedDocument(doc)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Hover glow effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-3 bg-slate-700/50 rounded-xl">
                      {getFileIcon(doc.file_type, 24)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-white truncate mb-2">
                        {doc.filename}
                      </h3>
                      <div className="flex items-center gap-6 mb-3 text-sm text-slate-400">
                        <div className="flex items-center gap-2">
                          <FaHdd size={12} />
                          <span>{formatFileSize(doc.file_size)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaFileAlt size={12} />
                          <span>{doc.total_pages} stranica</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <FaLayerGroup size={12} />
                          <span>{doc.chunks_count} delova</span>
                        </div>
                        <div className={`flex items-center gap-2 ${getStatusColor(doc.status)}`}>
                          {getStatusIcon(doc.status)}
                          <span className="font-semibold">{getStatusText(doc.status)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <FaClock size={10} />
                        <span>Uploadovano: {formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewDocument(doc);
                      }}
                      className="p-3 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-xl transition-all duration-200"
                      title="Pregledaj dokument"
                    >
                      <FaEye size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDocument(doc.id);
                      }}
                      className="p-3 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-xl transition-all duration-200"
                      title="Obriši dokument"
                    >
                      <FaTrash size={16} />
                    </button>
                  </div>
                </div>

                {/* Premium OCR Info */}
                {doc.ocr_info && (
                  <div className="mt-4 p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-xl border border-white/10 backdrop-blur-sm">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <FaMagic size={14} className="text-blue-400" />
                        OCR Informacije
                      </h4>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOcrModal({ doc, ocr: doc.ocr_info });
                        }}
                        className="text-xs text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 px-2 py-1 rounded-lg transition-all duration-200"
                      >
                        Pregledaj rezultat
                      </button>
                    </div>
                    <div className="text-xs text-slate-400 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">Pouzdanost:</span>
                        <span className="text-blue-400 font-bold">{doc.ocr_info.confidence?.toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">Jezici:</span>
                        <span>{doc.ocr_info.languages?.join(', ') || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-semibold">Status:</span>
                        <span className={doc.ocr_info.status === 'success' ? 'text-green-400' : 'text-yellow-400'}>
                          {doc.ocr_info.status || 'N/A'}
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
                <span className={`${getStatusColor(selectedDocument.status)} font-semibold`}>
                  {getStatusText(selectedDocument.status)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">Uploadovano:</span>
                <span>{formatDate(selectedDocument.created_at)}</span>
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