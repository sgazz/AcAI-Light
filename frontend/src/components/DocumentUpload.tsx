'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { FaUpload, FaTrash, FaCheck, FaSpinner, FaEye, FaCog, FaCloudUploadAlt, FaTimes } from 'react-icons/fa';
import ImagePreview from './ImagePreview';
import { formatFileSize, getFileIcon, isImageFile, validateFile } from '../utils/fileUtils';
import { DOCUMENTS_ENDPOINT, UPLOAD_ENDPOINT, apiRequest } from '../utils/api';
import { useErrorToast } from './ErrorToastProvider';

interface Document {
  id: string;
  filename: string;
  file_type: string;
  total_pages: number;
  file_size: number;
  status: 'uploading' | 'uploaded' | 'error';
  chunks_count: number;
  created_at: string;
  error_message?: string;
  ocr_info?: {
    confidence?: number;
    languages?: string[];
    status?: string;
    message?: string;
  };
}

interface DocumentUploadProps {
  onDocumentUploaded?: () => void;
}

interface OCROptions {
  minConfidence: number;
  languages: string[];
  deskew: boolean;
  resize: boolean;
}

export default function DocumentUpload({ onDocumentUploaded }: DocumentUploadProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploads, setUploads] = useState<Array<{id: string; file: File; progress: number; status: 'uploading' | 'success' | 'error'; error?: string}>>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showOCROptions, setShowOCROptions] = useState(false);
  const [ocrOptions, setOCROptions] = useState<OCROptions>({
    minConfidence: 50,
    languages: ['srp', 'eng'],
    deskew: false,
    resize: false
  });
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    ocrResult: Record<string, unknown> | undefined;
    filename: string;
  } | null>(null);
  const { showError, showSuccess, showWarning } = useErrorToast();
  
  // Refs
  const dropRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Učitaj postojeće dokumente
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = useCallback(async () => {
    try {
      const data = await apiRequest(DOCUMENTS_ENDPOINT);
      
      if (data.status === 'success') {
        setDocuments(data.documents);
      }
    } catch (error: any) {
      console.error('Greška pri učitavanju dokumenata:', error);
      showError(
        error.message || 'Greška pri učitavanju dokumenata',
        'Greška učitavanja',
        true,
        loadDocuments
      );
    } finally {
      setIsLoading(false);
    }
  }, [showError]);

  const uploadDocument = useCallback(async (file: File): Promise<void> => {
    const tempDocId = Math.random().toString(36).substr(2, 9);
    
    // Dodaj dokument u listu sa statusom 'uploading'
    const newDoc: Document = {
      id: tempDocId,
      filename: file.name,
      file_type: '.' + file.name.split('.').pop()?.toLowerCase() || '',
      total_pages: 0,
      file_size: file.size,
      status: 'uploading',
      chunks_count: 0,
      created_at: new Date().toISOString()
    };
    
    setDocuments(prev => [newDoc, ...prev]);
    
    try {
      // Ako je slika, koristi napredne OCR opcije
      if (isImageFile(file.name)) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('languages', ocrOptions.languages.join(','));
        
        // Koristi napredni OCR endpoint sa query parametrima
        const queryParams = new URLSearchParams({
          min_confidence: ocrOptions.minConfidence.toString(),
          deskew: ocrOptions.deskew.toString(),
          resize: ocrOptions.resize.toString()
        });
        
        const result = await apiRequest(`${UPLOAD_ENDPOINT}?${queryParams}`, {
          method: 'POST',
          body: formData,
        });
        
        if (result.status === 'success') {
          await loadDocuments();
          if (onDocumentUploaded) {
            onDocumentUploaded();
          }
          
          showSuccess(
            `Slika "${file.name}" uspešno upload-ovana sa OCR opcijama`,
            'Upload uspešan'
          );
          
          if (result.ocr_info && result.ocr_info.status === 'success') {
            showSuccess(
              `OCR uspešan: ${result.ocr_info.confidence?.toFixed(1)}% pouzdanost`,
              'OCR rezultat'
            );
          } else if (result.ocr_info && result.ocr_info.status === 'low_confidence') {
            showWarning(
              `OCR niska pouzdanost: ${result.ocr_info.message}`,
              'OCR upozorenje'
            );
          }
        } else {
          throw new Error(result.message || 'Greška pri upload-u');
        }
      } else {
        // Standardni upload za ostale fajlove
        const formData = new FormData();
        formData.append('file', file);
        
        const result = await apiRequest(UPLOAD_ENDPOINT, {
          method: 'POST',
          body: formData,
        });
        
        if (result.status === 'success') {
          await loadDocuments();
          if (onDocumentUploaded) {
            onDocumentUploaded();
          }
          
          showSuccess(
            `Dokument "${file.name}" uspešno upload-ovan`,
            'Upload uspešan'
          );
        } else {
          throw new Error(result.message || 'Greška pri upload-u');
        }
      }
    } catch (error: any) {
      // Ažuriraj dokument sa greškom
      setDocuments(prev => prev.map(doc => 
        doc.id === tempDocId 
          ? { 
              ...doc, 
              status: 'error' as const,
              error_message: error.message || 'Nepoznata greška'
            }
          : doc
      ));
      
      // Prikaži error toast sa retry opcijom
      showError(
        `Greška pri upload-u "${file.name}": ${error.message}`,
        'Greška upload-a',
        true,
        () => uploadDocument(file)
      );
    }
  }, [onDocumentUploaded, loadDocuments, showError, showSuccess, showWarning, ocrOptions]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Dodaj fajlove u uploads state
    const newUploads = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'uploading' as const
    }));
    
    setUploads(prev => [...prev, ...newUploads]);
  }, []);

  const handleFileSelectFromDrop = useCallback(async (files: FileList) => {
    // Dodaj fajlove u uploads state
    const newUploads = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'uploading' as const
    }));
    
    setUploads(prev => [...prev, ...newUploads]);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelectFromDrop(files);
    }
  }, [handleFileSelectFromDrop]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(e);
    }
  }, [handleFileSelect]);

  const deleteDocument = async (docId: string) => {
    try {
      const result = await apiRequest(`${DOCUMENTS_ENDPOINT}/${docId}`, {
        method: 'DELETE',
      });
      
      if (result.status === 'success') {
        setDocuments(prev => prev.filter(doc => doc.id !== docId));
        showSuccess('Dokument uspešno obrisan', 'Brisanje');
      } else {
        throw new Error(result.message || 'Greška pri brisanju dokumenta');
      }
    } catch (error: any) {
      console.error('Greška pri brisanju dokumenta:', error);
      showError(
        error.message || 'Greška pri brisanju dokumenta',
        'Greška brisanja',
        true,
        () => deleteDocument(docId)
      );
    }
  };

  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'uploading':
        return <FaSpinner className="text-[var(--accent-blue)] animate-spin" size={16} />;
      case 'uploaded':
        return <FaCheck className="text-[var(--accent-green)]" size={16} />;
      case 'error':
        return <FaTrash className="text-[var(--accent-red)]" size={16} />;
    }
  };

  const startUpload = useCallback(async () => {
    setIsUploading(true);
    
    for (const upload of uploads) {
      if (upload.status === 'uploading') {
        await uploadDocument(upload.file);
      }
    }
    
    setIsUploading(false);
  }, [uploads, uploadDocument]);

  const clearUploads = useCallback(() => {
    setUploads([]);
  }, []);

  const removeUpload = useCallback((id: string) => {
    setUploads(prev => prev.filter(upload => upload.id !== id));
  }, []);

  if (isLoading) {
    return (
      <div className="bg-[var(--bg-tertiary)] rounded-xl p-6 h-full">
        <div className="flex items-center justify-center h-48">
          <FaSpinner className="text-[var(--accent-blue)] animate-spin" size={24} />
          <span className="ml-2 text-[var(--text-primary)]">Učitavanje dokumenata...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-primary)] min-h-full w-full flex flex-col">
      <div className="bg-[var(--bg-tertiary)] rounded-xl p-6 h-full">
        <div className="flex items-center gap-2 mb-6">
          <div className="text-[var(--accent-blue)]"><FaUpload size={24} /></div>
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Upload dokumenta</h2>
        </div>

        <div className="space-y-6">
          {/* Drag & Drop Area */}
          <div
            ref={dropRef}
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/10'
                : 'border-[var(--border-color)] hover:border-[var(--accent-blue)]'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="text-[var(--accent-blue)] mb-4">
              <FaCloudUploadAlt size={48} />
            </div>
            <p className="text-lg font-medium text-[var(--text-primary)] mb-2">
              Prevucite dokumente ovde ili kliknite da izaberete
            </p>
            <p className="text-sm text-[var(--text-secondary)] mb-4">
              Podržani formati: PDF, DOCX, TXT, PNG, JPG, JPEG
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2 bg-[var(--accent-blue)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-blue)]/80 transition-colors"
            >
              Izaberi fajlove
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.txt,.png,.jpg,.jpeg"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Upload Progress */}
          {uploads.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Upload progres</h3>
              {uploads.map((upload) => (
                <div
                  key={upload.id}
                  className="p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {getFileIcon(upload.file.type)}
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">{upload.file.name}</p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {formatFileSize(upload.file.size)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {upload.status === 'uploading' && (
                        <FaSpinner className="animate-spin text-[var(--accent-blue)]" />
                      )}
                      {upload.status === 'success' && (
                        <FaCheck className="text-[var(--accent-green)]" />
                      )}
                      {upload.status === 'error' && (
                        <FaTimes className="text-[var(--accent-red)]" />
                      )}
                      <button
                        onClick={() => removeUpload(upload.id)}
                        className="text-[var(--text-muted)] hover:text-[var(--accent-red)]"
                      >
                        <FaTimes size={16} />
                      </button>
                    </div>
                  </div>

                  {upload.status === 'uploading' && (
                    <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-2">
                      <div
                        className="bg-[var(--accent-blue)] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${upload.progress}%` }}
                      />
                    </div>
                  )}

                  {upload.status === 'error' && (
                    <p className="text-sm text-[var(--accent-red)] mt-2">
                      Greška: {upload.error}
                    </p>
                  )}

                  {upload.status === 'success' && (
                    <p className="text-sm text-[var(--accent-green)] mt-2">
                      Uspešno uploadovano!
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* OCR Options */}
          <div className="mt-4">
            <button
              onClick={() => setShowOCROptions(!showOCROptions)}
              className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--accent-blue)] transition-colors text-sm"
            >
              <FaCog size={14} />
              <span>OCR Opcije</span>
            </button>
            
            {showOCROptions && (
              <div className="mt-3 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
                <h5 className="text-[var(--text-primary)] font-medium mb-3">Napredne OCR Opcije</h5>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Confidence Threshold */}
                  <div>
                    <label className="block text-[var(--text-muted)] text-sm mb-2">
                      Minimalni Confidence (%)
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={ocrOptions.minConfidence}
                      onChange={(e) => setOCROptions(prev => ({
                        ...prev,
                        minConfidence: parseInt(e.target.value)
                      }))}
                      className="w-full h-2 bg-[var(--bg-tertiary)] rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-xs text-[var(--text-secondary)] mt-1">
                      <span>0%</span>
                      <span className="text-[var(--accent-blue)]">{ocrOptions.minConfidence}%</span>
                      <span>100%</span>
                    </div>
                  </div>

                  {/* Languages */}
                  <div>
                    <label className="block text-[var(--text-muted)] text-sm mb-2">
                      Jezici
                    </label>
                    <div className="space-y-2">
                      {['srp', 'eng'].map((lang) => (
                        <label key={lang} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={ocrOptions.languages.includes(lang)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setOCROptions(prev => ({
                                  ...prev,
                                  languages: [...prev.languages, lang]
                                }));
                              } else {
                                setOCROptions(prev => ({
                                  ...prev,
                                  languages: prev.languages.filter(l => l !== lang)
                                }));
                              }
                            }}
                            className="rounded border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                          />
                          <span className="text-[var(--text-secondary)]">
                            {lang === 'srp' ? 'Srpski' : 'Engleski'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Preprocessing Options */}
                  <div>
                    <label className="block text-[var(--text-muted)] text-sm mb-2">
                      Preprocessing
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={ocrOptions.deskew}
                          onChange={(e) => setOCROptions(prev => ({
                            ...prev,
                            deskew: e.target.checked
                          }))}
                          className="rounded border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                        />
                        <span className="text-[var(--text-secondary)]">Deskew (rotacija)</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={ocrOptions.resize}
                          onChange={(e) => setOCROptions(prev => ({
                            ...prev,
                            resize: e.target.checked
                          }))}
                          className="rounded border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--accent-blue)] focus:ring-[var(--accent-blue)]"
                        />
                        <span className="text-[var(--text-secondary)]">Resize (promena veličine)</span>
                      </label>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="md:col-span-2">
                    <div className="text-xs text-[var(--text-secondary)] bg-[var(--bg-tertiary)] p-3 rounded">
                      <p><strong>Confidence:</strong> Minimalni procenat pouzdanosti za prihvatljiv OCR rezultat</p>
                      <p><strong>Jezici:</strong> Izaberi jezike za OCR prepoznavanje</p>
                      <p><strong>Preprocessing:</strong> Dodatne opcije za poboljšanje kvaliteta slike</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Upload Button */}
          {isUploading && (
            <div className="flex gap-3">
              <button
                onClick={() => {}}
                disabled={isUploading}
                className="flex-1 px-6 py-3 bg-[var(--accent-blue)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-blue)]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isUploading ? (
                  <div className="flex items-center justify-center gap-2">
                    <FaSpinner className="animate-spin" />
                    Uploadujem...
                  </div>
                ) : (
                  'Uploaduj sve fajlove'
                )}
              </button>
              <button
                onClick={() => {}}
                className="px-6 py-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
              >
                Obriši sve
              </button>
            </div>
          )}
        </div>

        {/* ImagePreview Modal */}
        {selectedImage && (
          <ImagePreview
            imageUrl={selectedImage.url}
            ocrResult={selectedImage.ocrResult}
            filename={selectedImage.filename}
            onClose={() => setSelectedImage(null)}
          />
        )}
      </div>
    </div>
  );
} 