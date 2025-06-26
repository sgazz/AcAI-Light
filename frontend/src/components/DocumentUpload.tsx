'use client';

import { useState, useCallback, useEffect } from 'react';
import { FaUpload, FaTrash, FaCheck, FaSpinner, FaEye } from 'react-icons/fa';
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

export default function DocumentUpload({ onDocumentUploaded }: DocumentUploadProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<{
    url: string;
    ocrResult: Record<string, unknown> | undefined;
    filename: string;
  } | null>(null);
  const { showError, showSuccess, showWarning } = useErrorToast();

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
      // Standardni upload za sve fajlove (slike će automatski biti obrađene OCR-om)
      const formData = new FormData();
      formData.append('file', file);
      
      const result = await apiRequest(UPLOAD_ENDPOINT, {
        method: 'POST',
        body: formData,
      });
      
      if (result.status === 'success') {
        // Učitaj ponovo sve dokumente da dobijemo ažurirane podatke
        await loadDocuments();
        if (onDocumentUploaded) {
          onDocumentUploaded();
        }
        
        // Prikaži success toast
        showSuccess(
          `Dokument "${file.name}" uspešno upload-ovan`,
          'Upload uspešan'
        );
        
        // Ako je slika i ima OCR info, prikaži dodatne informacije
        if (result.ocr_info && isImageFile(file.name)) {
          if (result.ocr_info.status === 'success') {
            showSuccess(
              `OCR uspešan: ${result.ocr_info.confidence?.toFixed(1)}% pouzdanost`,
              'OCR rezultat'
            );
          } else {
            showWarning(
              `OCR nije uspešan: ${result.ocr_info.message}`,
              'OCR upozorenje'
            );
          }
        }
      } else {
        throw new Error(result.message || 'Greška pri upload-u');
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
  }, [onDocumentUploaded, loadDocuments, showError, showSuccess, showWarning]);

  const handleFileSelect = useCallback(async (files: FileList) => {
    setIsUploading(true);
    
    // Upload svaki fajl pojedinačno
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const error = validateFile(file);
      
      if (error) {
        showError(error, 'Greška validacije');
        continue;
      }
      
      await uploadDocument(file);
    }
    
    setIsUploading(false);
  }, [uploadDocument, showError]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files);
    }
  }, [handleFileSelect]);

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
      handleFileSelect(files);
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
        return <FaSpinner className="text-blue-500 animate-spin" size={16} />;
      case 'uploaded':
        return <FaCheck className="text-green-500" size={16} />;
      case 'error':
        return <FaTrash className="text-red-500" size={16} />;
    }
  };

  if (isLoading) {
    return (
      <div className="bg-[#1a2236] rounded-2xl p-6 shadow-lg">
        <div className="flex items-center justify-center h-48">
          <FaSpinner className="text-blue-500 animate-spin" size={24} />
          <span className="ml-2 text-blue-300">Učitavanje dokumenata...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#1a2236] rounded-2xl p-6 shadow-lg">
      <h3 className="text-lg font-semibold text-white mb-4">Upload Dokumenata</h3>
      
      {/* Drag & Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
          isDragOver 
            ? 'border-blue-400 bg-blue-900/20' 
            : 'border-gray-600 hover:border-gray-500'
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <FaUpload className="mx-auto text-gray-400 mb-4" size={32} />
        <p className="text-gray-300 mb-2">
          Prevucite dokumente ovde ili kliknite za odabir
        </p>
        <p className="text-sm text-gray-500 mb-4">
          Podržani formati: PDF, DOCX, TXT, PNG, JPG, JPEG, BMP, TIFF (max 50MB)
        </p>
        
        <input
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.bmp,.tiff,.tif"
          onChange={handleFileInput}
          className="hidden"
          id="file-upload"
          disabled={isUploading}
        />
      </div>

      {/* Upload Progress */}
      {isUploading && (
        <div className="mt-4 p-4 bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-2 text-blue-300">
            <FaSpinner className="animate-spin" size={16} />
            <span>Upload u toku...</span>
          </div>
        </div>
      )}

      {/* Documents List */}
      {documents.length > 0 && (
        <div className="mt-6">
          <h4 className="text-md font-medium text-white mb-3">Upload-ovani Dokumenti</h4>
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-[#151c2c] rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {getFileIcon(doc.file_type)}
                  <div>
                    <p className="text-white text-sm font-medium">{doc.filename}</p>
                    <p className="text-gray-400 text-xs">
                      {doc.file_type.toUpperCase()} • {doc.total_pages} stranica • {formatFileSize(doc.file_size)}
                    </p>
                    {doc.chunks_count > 0 && (
                      <p className="text-gray-500 text-xs">
                        {doc.chunks_count} chunk-ova • {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    )}
                    {/* OCR informacije za slike */}
                    {isImageFile(doc.filename) && doc.ocr_info && (
                      <div className="mt-1">
                        {doc.ocr_info.confidence ? (
                          <p className="text-green-400 text-xs">
                            OCR: {doc.ocr_info.confidence.toFixed(1)}% confidence • {doc.ocr_info.languages?.join(', ')}
                          </p>
                        ) : doc.ocr_info.status === 'no_text_found' ? (
                          <p className="text-yellow-400 text-xs">
                            OCR: Nije pronađen tekst u slici
                          </p>
                        ) : doc.ocr_info.status === 'error' ? (
                          <p className="text-red-400 text-xs">
                            OCR greška: {doc.ocr_info.message}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getStatusIcon(doc.status)}
                  
                  {doc.status === 'error' && doc.error_message && (
                    <span className="text-red-400 text-xs max-w-32 truncate" title={doc.error_message}>
                      {doc.error_message}
                    </span>
                  )}
                  
                  {/* Dugme za pregled slike sa bounding boxovima */}
                  {isImageFile(doc.filename) && doc.ocr_info && doc.ocr_info.status === 'success' && (
                    <button
                      onClick={() => setSelectedImage({
                        url: `http://localhost:8001/documents/${doc.id}/content`,
                        ocrResult: doc.ocr_info,
                        filename: doc.filename
                      })}
                      className="text-gray-400 hover:text-blue-400 transition-colors"
                      title="Pregledaj sliku sa bounding boxovima"
                    >
                      <FaEye size={14} />
                    </button>
                  )}
                  
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                    title="Obriši dokument"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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