'use client';

import { useState, useEffect } from 'react';
import { FaFile, FaTrash, FaEye, FaFileAlt, FaClock, FaHdd, FaLayerGroup, FaRedo, FaSearch, FaDownload, FaExternalLinkAlt, FaMagic, FaTimes, FaImage, FaLanguage, FaCheck, FaExclamationTriangle, FaEdit, FaSave, FaUndo } from 'react-icons/fa';
import AdvancedDocumentPreview from './AdvancedDocumentPreview';
import ImagePreview from './FileHandling/ImagePreview';
import { formatFileSize, getFileIcon } from '../utils/fileUtils';
import { formatDate } from '../utils/dateUtils';
import { DOCUMENTS_ENDPOINT, apiRequest, updateOcrText, fixOcrText as fixOcrTextAPI } from '../utils/api';
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
  const [ocrModal, setOcrModal] = useState<{ocr: Record<string, unknown> | undefined, doc: Document, rect?: DOMRect} | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Image preview states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  
  // OCR edit states
  const [isEditingOcr, setIsEditingOcr] = useState(false);
  const [editedOcrText, setEditedOcrText] = useState('');
  
  const { showError, showSuccess, showWarning } = useErrorToast();
  const { previewFromAPI, downloadFromAPI } = useFileOperations();
  const { getStatusIcon, getStatusColor, getStatusText } = useStatusIcons();

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Keyboard shortcuts za OCR edit
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (ocrModal && isEditingOcr) {
        if (e.key === 'Escape') {
          cancelOcrEdit();
        } else if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          saveOcrEdit();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [ocrModal, isEditingOcr]);

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

  const isImageFile = (filename: string, fileType: string): boolean => {
    return fileType.startsWith('image/') || 
           ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].some(ext => 
             filename.toLowerCase().endsWith(ext)
           );
  };

  const openDocumentPreview = (document: Document) => {
    // Ako je slika, otvori u modal-u
    if (isImageFile(document.filename, document.file_type)) {
      const imageUrl = `http://localhost:8001/documents/${document.id}/preview`;
      setSelectedImage(imageUrl);
      setShowImagePreview(true);
    } else {
      // Za ostale dokumente, koristi postojeći DocumentPreview
      setPreviewDocument(document);
    }
  };

  const closeDocumentPreview = () => {
    setPreviewDocument(null);
  };

  const closeImagePreview = () => {
    setShowImagePreview(false);
    setSelectedImage(null);
  };

  const openOcrPreview = (document: Document, rect?: DOMRect) => {
    if (document.metadata?.ocr_info && document.metadata.ocr_info.text) {
      setOcrModal({ ocr: document.metadata.ocr_info, doc: document, rect });
    } else {
      showWarning('Nema OCR rezultata za ovaj dokument', 'OCR Preview');
    }
  };

  const closeOcrPreview = () => {
    setOcrModal(null);
    setIsEditingOcr(false);
    setEditedOcrText('');
  };

  const startEditingOcr = () => {
    if (ocrModal?.ocr && typeof ocrModal.ocr === 'object' && 'text' in ocrModal.ocr && typeof ocrModal.ocr.text === 'string') {
      setEditedOcrText(ocrModal.ocr.text);
      setIsEditingOcr(true);
    }
  };

  const saveOcrEdit = async () => {
    try {
      if (!ocrModal?.doc?.id) {
        showError('Nema ID dokumenta za čuvanje', 'Greška čuvanja');
        return;
      }

      // Pozovi API funkciju za čuvanje
      const result = await updateOcrText(ocrModal.doc.id, editedOcrText);
      
      if (result.status === 'success') {
        // Ažuriraj lokalno stanje
        const updatedOcr = { ...ocrModal.ocr, text: editedOcrText };
        setOcrModal({ ...ocrModal, ocr: updatedOcr });
        setIsEditingOcr(false);
        showSuccess('OCR tekst uspešno sačuvan', 'Čuvanje');
      } else {
        throw new Error(result.message || 'Greška pri čuvanju');
      }
    } catch (error: any) {
      showError(`Greška pri čuvanju OCR teksta: ${error.message}`, 'Greška čuvanja');
    }
  };

  const fixOcrText = async (mode: 'fix' | 'format') => {
    try {
      if (!ocrModal?.ocr || typeof ocrModal.ocr !== 'object' || !('text' in ocrModal.ocr) || typeof ocrModal.ocr.text !== 'string') {
        showError('Nema teksta za ispravljanje', 'Greška');
        return;
      }

      const currentText = ocrModal.ocr.text;
      
      // Prikaži loading
      showSuccess('AI obrađuje tekst...', 'Obrađivanje');
      
      // Pozovi API funkciju
      const result = await fixOcrTextAPI(currentText, mode);
      
      if (result.status === 'success') {
        // Ažuriraj tekst u modal-u
        const updatedOcr = { ...ocrModal.ocr, text: result.fixed_text };
        setOcrModal({ ...ocrModal, ocr: updatedOcr });
        
        // Ako je u edit mode-u, ažuriraj i textarea
        if (isEditingOcr) {
          setEditedOcrText(result.fixed_text);
        }
        
        const actionText = mode === 'fix' ? 'ispravljen' : 'formatiran';
        showSuccess(`Tekst uspešno ${actionText}`, 'AI Obrađivanje');
      } else {
        throw new Error(result.message || 'Greška pri AI obradi');
      }
    } catch (error: any) {
      showError(`Greška pri ${mode === 'fix' ? 'ispravljanju' : 'formatiranju'} teksta: ${error.message}`, 'AI Greška');
    }
  };

  const cancelOcrEdit = () => {
    setIsEditingOcr(false);
    setEditedOcrText('');
  };

  const handlePreviewOriginal = (documentId: string) => {
    // Otvori originalni dokument u novom tab-u
    window.open(`http://localhost:8001/documents/${documentId}/original`, '_blank');
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
    <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-2xl rounded-2xl p-4 sm:p-6 lg:p-8 max-h-screen overflow-y-auto relative">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none select-none z-0 hidden sm:block">
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
                      onClick={() => handlePreviewOriginal(doc.id)}
                      className="p-2 text-slate-400 hover:text-blue-400 hover:bg-blue-500/20 rounded-lg icon-hover-profi"
                      title="Preview originalnog fajla"
                    >
                      <FaEye size={16} />
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
                      className={`p-2 lg:p-3 rounded-lg lg:rounded-xl icon-hover-profi ${
                        isImageFile(doc.filename, doc.file_type)
                          ? 'text-purple-400 hover:text-purple-300 hover:bg-purple-500/20'
                          : 'text-blue-400 hover:text-blue-300 hover:bg-blue-500/20'
                      }`}
                      title={isImageFile(doc.filename, doc.file_type) ? "Pregledaj sliku" : "Pregledaj sadržaj"}
                    >
                      {isImageFile(doc.filename, doc.file_type) ? (
                        <FaImage size={14} />
                      ) : (
                        <FaEye size={14} />
                      )}
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
                          const rect = (e.target as HTMLElement).getBoundingClientRect();
                          openOcrPreview(doc, rect);
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
        <AdvancedDocumentPreview
          documentId={previewDocument.id}
          filename={previewDocument.filename}
          isOpen={!!previewDocument}
          onClose={closeDocumentPreview}
          ocrInfo={previewDocument.metadata?.ocr_info}
        />
      )}

      {/* OCR Preview Modal */}
      {ocrModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-white/80 via-slate-100/90 to-blue-100/80 backdrop-blur-2xl rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-blue-200/40">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-blue-200/30 bg-white/60 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <FaMagic className="text-blue-400" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-blue-900">OCR rezultat - {ocrModal.doc.filename}</h2>
                  <p className="text-sm text-blue-600">Tekst prepoznat iz slike</p>
                </div>
              </div>
              <button
                onClick={closeOcrPreview}
                className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-100/60 rounded-lg transition-colors"
                title="Zatvori"
              >
                <FaTimes size={20} />
              </button>
            </div>

            {/* OCR Info */}
            <div className="p-4 border-b border-blue-200/30 bg-blue-50/40 flex flex-wrap gap-4 items-center">
              {ocrModal.ocr && typeof ocrModal.ocr === 'object' && 'confidence' in ocrModal.ocr && typeof ocrModal.ocr.confidence === 'number' && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-200/60 text-blue-900 font-semibold text-xs">
                  <FaMagic className="text-blue-400" size={14} />
                  Pouzdanost: {ocrModal.ocr.confidence.toFixed(1)}%
                </span>
              )}
              {ocrModal.ocr && typeof ocrModal.ocr === 'object' && 'languages' in ocrModal.ocr && Array.isArray(ocrModal.ocr.languages) && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-200/60 text-green-900 font-semibold text-xs">
                  <FaLanguage className="text-green-400" size={14} />
                  Jezici: {ocrModal.ocr.languages.join(', ')}
                </span>
              )}
              {ocrModal.ocr && typeof ocrModal.ocr === 'object' && 'status' in ocrModal.ocr && typeof ocrModal.ocr.status === 'string' && (
                <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-semibold text-xs ${ocrModal.ocr.status === 'success' ? 'bg-emerald-200/60 text-emerald-900' : 'bg-yellow-200/60 text-yellow-900'}`}>
                  <FaCheck className="text-emerald-400" size={14} />
                  Status: {ocrModal.ocr.status}
                </span>
              )}
              {ocrModal.ocr && typeof ocrModal.ocr === 'object' && 'message' in ocrModal.ocr && typeof ocrModal.ocr.message === 'string' && (
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-200/60 text-yellow-900 font-semibold text-xs">
                  <FaExclamationTriangle className="text-yellow-400" size={14} />
                  {ocrModal.ocr.message}
                </span>
              )}
            </div>

            {/* OCR Text Content */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="bg-white/80 rounded-lg p-4 shadow-inner flex flex-col gap-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-blue-900">Prepoznati tekst:</h3>
                  <div className="flex gap-2">
                    {!isEditingOcr ? (
                      <>
                        <button
                          onClick={startEditingOcr}
                          className="px-3 py-1 bg-green-200/60 hover:bg-green-300/80 text-green-900 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          title="Uredi OCR tekst (Enter)"
                        >
                          <FaEdit size={12} />
                          Uredi
                        </button>
                        <button
                          onClick={() => fixOcrText('fix')}
                          className="px-3 py-1 bg-purple-200/60 hover:bg-purple-300/80 text-purple-900 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          title="AI ispravi tekst"
                        >
                          <FaMagic size={12} />
                          Popravi
                        </button>
                        <button
                          onClick={() => fixOcrText('format')}
                          className="px-3 py-1 bg-orange-200/60 hover:bg-orange-300/80 text-orange-900 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          title="AI formatiraj tekst"
                        >
                          <FaFileAlt size={12} />
                          Formatiraj
                        </button>
                        <button
                          onClick={() => {
                            if (ocrModal.ocr && typeof ocrModal.ocr === 'object' && 'text' in ocrModal.ocr && typeof ocrModal.ocr.text === 'string') {
                              navigator.clipboard.writeText(ocrModal.ocr.text);
                            }
                          }}
                          className="px-3 py-1 bg-blue-200/60 hover:bg-blue-300/80 text-blue-900 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Kopiraj tekst
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={saveOcrEdit}
                          className="px-3 py-1 bg-green-200/60 hover:bg-green-300/80 text-green-900 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          title="Sačuvaj izmene (Ctrl+S)"
                        >
                          <FaSave size={12} />
                          Sačuvaj
                        </button>
                        <button
                          onClick={() => fixOcrText('fix')}
                          className="px-3 py-1 bg-purple-200/60 hover:bg-purple-300/80 text-purple-900 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          title="AI ispravi tekst"
                        >
                          <FaMagic size={12} />
                          Popravi
                        </button>
                        <button
                          onClick={() => fixOcrText('format')}
                          className="px-3 py-1 bg-orange-200/60 hover:bg-orange-300/80 text-orange-900 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          title="AI formatiraj tekst"
                        >
                          <FaFileAlt size={12} />
                          Formatiraj
                        </button>
                        <button
                          onClick={cancelOcrEdit}
                          className="px-3 py-1 bg-red-200/60 hover:bg-red-300/80 text-red-900 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          title="Otkaži izmene (ESC)"
                        >
                          <FaUndo size={12} />
                          Otkaži
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {isEditingOcr ? (
                  <textarea
                    value={editedOcrText}
                    onChange={(e) => setEditedOcrText(e.target.value)}
                    className="w-full h-64 p-3 text-blue-900 text-sm font-mono bg-blue-50/60 rounded border-2 border-blue-300/50 focus:border-blue-500 focus:outline-none resize-none"
                    placeholder="Uredite prepoznati tekst..."
                  />
                ) : (
                  <div className="text-blue-900 whitespace-pre-line leading-relaxed text-sm max-h-64 overflow-y-auto font-mono bg-blue-50/60 rounded p-3">
                    {ocrModal.ocr && typeof ocrModal.ocr === 'object' && 'text' in ocrModal.ocr && typeof ocrModal.ocr.text === 'string' 
                      ? ocrModal.ocr.text 
                      : 'Nema prepoznatog teksta'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

              {/* Image Preview Modal */}
        {showImagePreview && selectedImage && (
          <ImagePreview
            src={selectedImage}
            alt="Image preview"
            isOpen={showImagePreview}
            onClose={closeImagePreview}
          />
        )}
    </div>
  );
} 