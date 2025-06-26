'use client';

import { useState, useEffect } from 'react';
import { FaTimes, FaChevronLeft, FaChevronRight, FaDownload, FaSpinner } from 'react-icons/fa';
import { getFileIcon } from '../utils/fileUtils';
import { DOCUMENTS_ENDPOINT, apiRequest } from '../utils/api';
import { useErrorToast } from './ErrorToastProvider';

interface DocumentContent {
  document_id: string;
  filename: string;
  file_type: string;
  total_pages: number;
  pages: Record<number, string>;
  all_content: string;
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
        setContent(data);
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
        <div className="bg-[#1a2332] rounded-xl p-8 max-w-2xl w-full mx-4">
          <div className="flex items-center justify-center">
            <FaSpinner className="animate-spin text-blue-400 text-2xl mr-3" />
            <span className="text-white">Učitavanje dokumenta...</span>
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
      <div className="bg-[#1a2332] rounded-xl max-w-6xl w-full h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            {getFileIcon(content.file_type)}
            <div>
              <h2 className="text-xl font-bold text-white">{content.filename}</h2>
              <p className="text-sm text-gray-400">
                {content.total_pages} stranica • {content.file_type?.toUpperCase() || 'NEPOZNATO'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="p-2 text-blue-400 hover:bg-blue-900/30 rounded-lg transition-colors"
              title="Preuzmi sadržaj"
            >
              <FaDownload size={16} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:bg-gray-700 rounded-lg transition-colors"
              title="Zatvori"
            >
              <FaTimes size={16} />
            </button>
          </div>
        </div>

        {/* OCR INFO */}
        {ocrInfo && ocrInfo.text && (
          <div className="p-6 border-b border-green-700 bg-green-900/10">
            <h3 className="text-lg font-bold text-green-300 mb-2">OCR rezultat</h3>
            <div className="mb-2 text-green-200 whitespace-pre-line max-h-40 overflow-y-auto">
              {ocrInfo.text}
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-green-100">
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

        {/* View Mode Toggle */}
        <div className="flex items-center justify-center p-4 border-b border-gray-700">
          <div className="flex bg-[#151c2c] rounded-lg p-1">
            <button
              onClick={() => setViewMode('pages')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'pages'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Po stranicama
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Ceo dokument
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {viewMode === 'pages' ? (
            <div className="h-full flex flex-col">
              {/* Page Navigation */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage <= 1}
                  className="flex items-center gap-2 px-3 py-2 bg-[#151c2c] text-white rounded-lg hover:bg-[#1e2a3a] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <FaChevronLeft size={14} />
                  Prethodna
                </button>
                
                <div className="text-white">
                  Stranica {currentPage} od {content.total_pages}
                </div>
                
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= content.total_pages}
                  className="flex items-center gap-2 px-3 py-2 bg-[#151c2c] text-white rounded-lg hover:bg-[#1e2a3a] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Sledeća
                  <FaChevronRight size={14} />
                </button>
              </div>

              {/* Page Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <div className="bg-[#151c2c] rounded-lg p-6 h-full">
                  <div className="text-white whitespace-pre-wrap leading-relaxed">
                    {content.pages[currentPage] || 'Sadržaj stranice nije dostupan'}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* All Content View */
            <div className="h-full overflow-y-auto p-6">
              <div className="bg-[#151c2c] rounded-lg p-6">
                <div className="text-white whitespace-pre-wrap leading-relaxed">
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