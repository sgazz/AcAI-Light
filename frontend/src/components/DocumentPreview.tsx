'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaChevronLeft, FaChevronRight, FaDownload, FaSpinner, FaExclamationTriangle, FaFile } from 'react-icons/fa';
import { getFileIcon } from '../utils/fileUtils';
import { DOCUMENTS_ENDPOINT, apiRequest } from '../utils/api';
import { useErrorToast } from './ErrorToastProvider';

interface DocumentContent {
  document_id?: string;
  filename: string;
  file_type: string;
  content_type?: string;
  total_pages: number;
  pages: Record<number, string>;
  all_content: string;
  message?: string;
}

interface DocumentPreviewProps {
  documentId: string;
  filename: string;
  onClose: () => void;
  ocrInfo?: {
    confidence?: number;
    languages?: string[];
    status?: string;
    message?: string;
    text?: string;
  };
}

export default function DocumentPreview({ documentId, filename, onClose, ocrInfo }: DocumentPreviewProps) {
  const [content, setContent] = useState<DocumentContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'pages' | 'all'>('pages');
  const { showError, showSuccess } = useErrorToast();

  useEffect(() => {
    fetchDocumentContent();
  }, [documentId]);

  const fetchDocumentContent = async () => {
    try {
      setLoading(true);
      const data = await apiRequest(`${DOCUMENTS_ENDPOINT}/${documentId}/content`);
      
      if (data.status === 'success') {
        // Ako je slika, prikaži poruku
        if (data.content_type === 'image') {
          setContent({
            filename: data.filename,
            file_type: data.file_type,
            content_type: 'image',
            total_pages: 1,
            pages: {1: data.message || 'Slika je dostupna za preview'},
            all_content: data.message || 'Slika je dostupna za preview'
          });
        } else {
          setContent(data);
        }
        setCurrentPage(1);
        showSuccess('Sadržaj dokumenta uspešno učitan', 'Učitavanje');
      } else {
        throw new Error(data.message || 'Greška pri dohvatanju sadržaja');
      }
    } catch (error: any) {
      showError(
        error.message || 'Greška pri dohvatanju sadržaja dokumenta',
        'Greška učitavanja',
        true,
        fetchDocumentContent
      );
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousPage = () => {
    if (content && currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (content && currentPage < content.total_pages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handleDownload = () => {
    if (!content) return;
    
    try {
      const blob = new Blob([content.all_content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}_content.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showSuccess('Sadržaj dokumenta preuzet', 'Preuzimanje');
    } catch (error: any) {
      showError(
        'Greška pri preuzimanju sadržaja',
        'Greška preuzimanja',
        true,
        handleDownload
      );
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-[var(--bg-tertiary)] rounded-xl p-8 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-center">
            <FaSpinner className="animate-spin text-[var(--accent-blue)] text-2xl mr-3" />
            <span className="text-[var(--text-primary)]">Učitavanje dokumenta...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!content) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-tertiary)] rounded-xl max-w-6xl w-full h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            {getFileIcon(content.file_type)}
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{content.filename}</h2>
              <p className="text-sm text-[var(--text-secondary)]">
                {content.total_pages} stranica • {content.file_type?.toUpperCase() || 'NEPOZNATO'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="p-2 text-[var(--accent-blue)] hover:bg-[var(--accent-blue)]/20 rounded-lg transition-colors"
              title="Preuzmi sadržaj"
            >
              <FaDownload size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-colors"
              title="Zatvori"
            >
              <FaTimes size={16} />
            </button>
          </div>
        </div>

        {/* OCR INFO */}
        {ocrInfo && ocrInfo.text && (
          <div className="p-6 border-b border-[var(--accent-green)] bg-[var(--accent-green)]/10">
            <h3 className="text-lg font-bold text-[var(--accent-green)] mb-2">OCR rezultat</h3>
            <div className="mb-2 text-[var(--text-primary)] whitespace-pre-line max-h-40 overflow-y-auto">
              {ocrInfo.text}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-[var(--text-secondary)]">
              {ocrInfo.confidence !== undefined && (
                <span><strong>Confidence:</strong> {ocrInfo.confidence.toFixed(1)}%</span>
              )}
              {ocrInfo.languages && (
                <span><strong>Jezici:</strong> {ocrInfo.languages.join(', ')}</span>
              )}
              {ocrInfo.status && (
                <span><strong>Status:</strong> {ocrInfo.status}</span>
              )}
              {ocrInfo.message && (
                <span><strong>Poruka:</strong> {ocrInfo.message}</span>
              )}
            </div>
          </div>
        )}

        {/* View Mode Toggle - Only for text documents */}
        {content && content.content_type !== 'image' && (
          <div className="flex items-center justify-center p-4 border-b border-[var(--border-color)]">
            <div className="flex bg-[var(--bg-secondary)] rounded-lg p-1">
              <button
                onClick={() => setViewMode('pages')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'pages'
                    ? 'bg-[var(--accent-blue)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Po stranicama
              </button>
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'all'
                    ? 'bg-[var(--accent-blue)] text-[var(--text-primary)]'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                }`}
              >
                Ceo dokument
              </button>
            </div>
          </div>
        )}

        {/* Image Preview Message */}
        {content && content.content_type === 'image' && (
          <div className="flex items-center justify-center p-8 border-b border-[var(--border-color)]">
            <div className="text-center">
              <div className="text-6xl mb-4">🖼️</div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">
                Slika je dostupna za preview
              </h3>
              <p className="text-[var(--text-secondary)] mb-4">
                Koristite dugme "Preview originalnog fajla" u listi dokumenata da vidite sliku.
              </p>
              <div className="text-sm text-[var(--text-muted)]">
                {content.message || 'Slika je uspešno uploadovana i obrađena.'}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {content.content_type === 'image' ? (
            /* Image Preview */
            <div className="h-full flex flex-col">
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-[var(--bg-secondary)] rounded-lg p-6 h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-6xl mb-4">🖼️</div>
                    <div className="text-[var(--text-primary)] text-lg font-semibold mb-2">
                      {content.filename}
                    </div>
                    <div className="text-[var(--text-secondary)]">
                      {content.message || 'Slika je dostupna za preview'}
                    </div>
                    <div className="mt-4 text-sm text-[var(--text-muted)]">
                      Tip: {content.file_type}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : viewMode === 'pages' ? (
            <div className="h-full flex flex-col">
              {/* Page Navigation */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage <= 1}
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaChevronLeft size={14} />
                  Prethodna
                </button>
                
                <div className="text-[var(--text-primary)]">
                  Stranica {currentPage} od {content.total_pages}
                </div>
                
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= content.total_pages}
                  className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sledeća
                  <FaChevronRight size={14} />
                </button>
              </div>

              {/* Page Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-[var(--bg-secondary)] rounded-lg p-6 h-full">
                  <div className="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                    {content.pages[currentPage] || 'Sadržaj stranice nije dostupan'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* All Content View */
            <div className="h-full overflow-y-auto p-6">
              <div className="bg-[var(--bg-secondary)] rounded-lg p-6">
                <div className="text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">
                  {content.all_content}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 