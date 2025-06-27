'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { FaUpload, FaTrash, FaCheck, FaSpinner, FaEye, FaCog, FaCloudUploadAlt, FaTimes, FaFileAlt, FaImage, FaCogs, FaMagic, FaLanguage, FaShieldAlt } from 'react-icons/fa';
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
    
    // Automatski pokreni upload
    setIsUploading(true);
    for (const file of files) {
      await uploadDocument(file);
    }
    setIsUploading(false);
    
    // Resetuj file input
    e.target.value = '';
  }, [uploadDocument]);

  const handleFileSelectFromDrop = useCallback(async (files: FileList) => {
    // Dodaj fajlove u uploads state
    const newUploads = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'uploading' as const
    }));
    
    setUploads(prev => [...prev, ...newUploads]);
    
    // Automatski pokreni upload
    setIsUploading(true);
    for (const file of files) {
      await uploadDocument(file);
    }
    setIsUploading(false);
  }, [uploadDocument]);

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
        return <FaSpinner className="text-blue-400 animate-spin" size={16} />;
      case 'uploaded':
        return <FaCheck className="text-green-400" size={16} />;
      case 'error':
        return <FaTrash className="text-red-400" size={16} />;
    }
  };

  const startUpload = useCallback(async () => {
    setIsUploading(true);
    
    for (const upload of uploads) {
      if (upload.status === 'uploading') {
        try {
          await uploadDocument(upload.file);
          // Ažuriraj status na success
          setUploads(prev => prev.map(u => 
            u.id === upload.id 
              ? { ...u, status: 'success' as const }
              : u
          ));
        } catch (error: any) {
          // Ažuriraj status na error
          setUploads(prev => prev.map(u => 
            u.id === upload.id 
              ? { ...u, status: 'error' as const, error: error.message || 'Nepoznata greška' }
              : u
          ));
        }
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
      <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-2xl rounded-2xl p-8 h-full relative overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-pulse"></div>
          <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-bounce"></div>
        </div>
        
        <div className="relative flex items-center justify-center h-48">
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

      <div className="relative space-y-8">
        {/* Premium Header */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
              <FaUpload className="text-white" size={24} />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          </div>
          <div>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Upload dokumenta
            </h2>
            <p className="text-sm text-slate-400 font-medium">Dodajte dokumente za AI analizu</p>
          </div>
        </div>

        {/* Premium Drag & Drop Area */}
        <div
          ref={dropRef}
          className={`relative group border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-500 ${
            isDragOver
              ? 'border-blue-500/50 bg-gradient-to-r from-blue-500/10 to-purple-500/10 scale-105'
              : 'border-white/20 hover:border-blue-500/30 hover:bg-slate-800/30'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          
          <div className="relative">
            <div className="text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-300">
              <FaCloudUploadAlt size={64} />
            </div>
            <p className="text-xl font-bold text-white mb-3">
              Prevucite dokumente ovde ili kliknite da izaberete
            </p>
            <p className="text-sm text-slate-400 mb-6">
              Podržani formati: PDF, DOCX, TXT, PNG, JPG, JPEG
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
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
        </div>

        {/* Premium Upload Progress */}
        {uploads.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <FaFileAlt size={18} className="text-blue-400" />
              </div>
              Upload progres
            </h3>
            {uploads.map((upload, index) => (
              <div
                key={upload.id}
                className="group relative p-6 bg-slate-800/50 rounded-2xl border border-white/10 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02]"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-slate-700/50 rounded-xl">
                      {getFileIcon(upload.file.type)}
                    </div>
                    <div>
                      <p className="font-bold text-white">{upload.file.name}</p>
                      <p className="text-sm text-slate-400">
                        {formatFileSize(upload.file.size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {upload.status === 'uploading' && (
                      <div className="relative">
                        <FaSpinner className="animate-spin text-blue-400" size={20} />
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse"></div>
                      </div>
                    )}
                    {upload.status === 'success' && (
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <FaCheck className="text-green-400" size={16} />
                      </div>
                    )}
                    {upload.status === 'error' && (
                      <div className="p-2 bg-red-500/20 rounded-lg">
                        <FaTimes className="text-red-400" size={16} />
                      </div>
                    )}
                    <button
                      onClick={() => removeUpload(upload.id)}
                      className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition-all duration-200"
                    >
                      <FaTimes size={16} />
                    </button>
                  </div>
                </div>

                {upload.status === 'uploading' && (
                  <div className="w-full bg-slate-700/50 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 shadow-lg"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}

                {upload.status === 'error' && (
                  <p className="text-sm text-red-400 mt-3 font-medium">
                    Greška: {upload.error}
                  </p>
                )}

                {upload.status === 'success' && (
                  <p className="text-sm text-green-400 mt-3 font-medium">
                    Uspešno uploadovano!
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Premium OCR Options */}
        <div className="space-y-4">
          <button
            onClick={() => setShowOCROptions(!showOCROptions)}
            className="flex items-center gap-3 text-slate-400 hover:text-blue-400 transition-all duration-300 text-sm font-semibold group"
          >
            <div className="p-2 bg-slate-700/50 rounded-lg group-hover:bg-blue-500/20 transition-all duration-300">
              <FaCogs size={16} className="group-hover:text-blue-400" />
            </div>
            <span>Napredne OCR Opcije</span>
            <div className={`transition-transform duration-300 ${showOCROptions ? 'rotate-180' : ''}`}>
              <FaTimes size={12} />
            </div>
          </button>
          
          {showOCROptions && (
            <div className="space-y-6 p-6 bg-slate-800/30 rounded-2xl border border-white/10 backdrop-blur-sm animate-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <FaMagic size={18} className="text-blue-400" />
                </div>
                <h5 className="text-lg font-bold text-white">Napredne OCR Opcije</h5>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Confidence Threshold */}
                <div className="space-y-3">
                  <label className="block text-white font-semibold text-sm">
                    Minimalni Confidence (%)
                  </label>
                  <div className="relative">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={ocrOptions.minConfidence}
                      onChange={(e) => setOCROptions(prev => ({
                        ...prev,
                        minConfidence: parseInt(e.target.value)
                      }))}
                      className="w-full h-3 bg-slate-700/50 rounded-lg appearance-none cursor-pointer slider"
                    />
                    <div className="flex justify-between text-xs text-slate-400 mt-2">
                      <span>0%</span>
                      <span className="text-blue-400 font-bold">{ocrOptions.minConfidence}%</span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>

                {/* Languages */}
                <div className="space-y-3">
                  <label className="block text-white font-semibold text-sm flex items-center gap-2">
                    <FaLanguage size={14} />
                    Jezici
                  </label>
                  <div className="space-y-3">
                    {['srp', 'eng'].map((lang) => (
                      <label key={lang} className="flex items-center gap-3 text-sm group cursor-pointer">
                        <div className="relative">
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
                            className="w-5 h-5 rounded border-white/20 bg-slate-700/50 text-blue-500 focus:ring-blue-500/50 focus:ring-2 transition-all duration-200"
                          />
                        </div>
                        <span className="text-slate-300 group-hover:text-white transition-colors duration-200">
                          {lang === 'srp' ? 'Srpski' : 'Engleski'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Preprocessing Options */}
                <div className="space-y-3">
                  <label className="block text-white font-semibold text-sm flex items-center gap-2">
                    <FaShieldAlt size={14} />
                    Preprocessing
                  </label>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 text-sm group cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={ocrOptions.deskew}
                          onChange={(e) => setOCROptions(prev => ({
                            ...prev,
                            deskew: e.target.checked
                          }))}
                          className="w-5 h-5 rounded border-white/20 bg-slate-700/50 text-blue-500 focus:ring-blue-500/50 focus:ring-2 transition-all duration-200"
                        />
                      </div>
                      <span className="text-slate-300 group-hover:text-white transition-colors duration-200">Deskew (rotacija)</span>
                    </label>
                    <label className="flex items-center gap-3 text-sm group cursor-pointer">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={ocrOptions.resize}
                          onChange={(e) => setOCROptions(prev => ({
                            ...prev,
                            resize: e.target.checked
                          }))}
                          className="w-5 h-5 rounded border-white/20 bg-slate-700/50 text-blue-500 focus:ring-blue-500/50 focus:ring-2 transition-all duration-200"
                        />
                      </div>
                      <span className="text-slate-300 group-hover:text-white transition-colors duration-200">Resize (promena veličine)</span>
                    </label>
                  </div>
                </div>

                {/* Info */}
                <div className="md:col-span-2">
                  <div className="text-xs text-slate-400 bg-slate-700/30 p-4 rounded-xl border border-white/10">
                    <p className="mb-2"><strong className="text-white">Confidence:</strong> Minimalni procenat pouzdanosti za prihvatljiv OCR rezultat</p>
                    <p className="mb-2"><strong className="text-white">Jezici:</strong> Izaberi jezike za OCR prepoznavanje</p>
                    <p><strong className="text-white">Preprocessing:</strong> Dodatne opcije za poboljšanje kvaliteta slike</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Premium Upload Button */}
        {uploads.length > 0 && (
          <div className="flex gap-4">
            <button
              onClick={startUpload}
              disabled={isUploading}
              className="flex-1 px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-semibold shadow-lg hover:shadow-xl"
            >
              {isUploading ? (
                <div className="flex items-center justify-center gap-3">
                  <FaSpinner className="animate-spin" />
                  Uploadujem...
                </div>
              ) : (
                'Uploaduj sve fajlove'
              )}
            </button>
            <button
              onClick={clearUploads}
              className="px-8 py-4 bg-slate-700/50 text-white border border-white/10 rounded-xl hover:bg-slate-600/50 transition-all duration-300 font-semibold"
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
  );
} 