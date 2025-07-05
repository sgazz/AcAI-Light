'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone, FileRejection } from 'react-dropzone';
import { motion, AnimatePresence } from 'framer-motion';
import { useFileOperations } from '../../utils/fileOperations';
import { useStatusIcons } from '../../utils/statusIcons';
import { 
  Upload, 
  File, 
  Image, 
  FileText, 
  X, 
  Download,
  Eye,
  Trash2
} from 'lucide-react';
import ImagePreview from './ImagePreview';
import DocumentPreview from './DocumentPreview';

interface FileItem {
  id: string;
  file: File;
  preview?: string;
  type: 'image' | 'document' | 'other';
  size: string;
  uploaded: boolean;
  status?: 'loading' | 'success' | 'error';
}

interface FileSharingProps {
  onFileUpload: (files: File[]) => void;
  onFileRemove: (fileId: string) => void;
  maxFiles?: number;
  maxSize?: number; // u MB
  acceptedTypes?: string[];
}

const FileSharing: React.FC<FileSharingProps> = ({
  onFileUpload,
  onFileRemove,
  maxFiles = 5,
  maxSize = 10, // 10MB
  acceptedTypes = ['image/*', 'application/pdf', 'text/*']
}) => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Preview states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<File | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [showDocumentPreview, setShowDocumentPreview] = useState(false);
  const { downloadFile } = useFileOperations();
  const { getStatusIcon, getStatusColor, getStatusText } = useStatusIcons();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileType = (file: File): 'image' | 'document' | 'other' => {
    if (file.type.startsWith('image/') || 
        ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].some(ext => 
          file.name.toLowerCase().endsWith(ext)
        )) {
      return 'image';
    }
    if (file.type.includes('pdf') || 
        file.type.includes('document') || 
        file.type.includes('text') ||
        file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        ['pdf', 'docx', 'txt', 'md', 'json', 'xml', 'csv', 'log'].some(ext => 
          file.name.toLowerCase().endsWith(ext)
        )) {
      return 'document';
    }
    return 'other';
  };

  const getFileIcon = (type: 'image' | 'document' | 'other') => {
    switch (type) {
      case 'image':
        return <Image className="w-5 h-5 text-blue-500" />;
      case 'document':
        return <FileText className="w-5 h-5 text-green-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null);

    // Provera broja fajlova
    if (files.length + acceptedFiles.length > maxFiles) {
      setError(`Možete uploadovati maksimalno ${maxFiles} fajlova`);
      return;
    }

    // Provera veličine fajlova
    const oversizedFiles = acceptedFiles.filter(file => file.size > maxSize * 1024 * 1024);
    if (oversizedFiles.length > 0) {
      setError(`Neki fajlovi su preveliki. Maksimalna veličina je ${maxSize}MB`);
      return;
    }

    const newFiles: FileItem[] = acceptedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      type: getFileType(file),
      size: formatFileSize(file.size),
      uploaded: false,
      status: 'loading' as const
    }));

    // Kreiranje preview-a za slike
    newFiles.forEach(fileItem => {
      if (fileItem.type === 'image') {
        const reader = new FileReader();
        reader.onload = (e) => {
          setFiles(prev => prev.map(f => 
            f.id === fileItem.id 
              ? { ...f, preview: e.target?.result as string }
              : f
          ));
        };
        reader.readAsDataURL(fileItem.file);
      }
    });

    setFiles(prev => [...prev, ...newFiles]);
    onFileUpload(acceptedFiles);
  }, [files, maxFiles, maxSize, onFileUpload]);

  const { getRootProps, getInputProps, isDragActive: dropzoneDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc, type) => ({ ...acc, [type]: [] }), {}),
    maxFiles: maxFiles - files.length,
    maxSize: maxSize * 1024 * 1024
  });

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
    onFileRemove(fileId);
  };

  const handleImagePreview = (fileItem: FileItem) => {
    if (fileItem.type === 'image' && fileItem.preview) {
      setSelectedImage(fileItem.preview);
      setShowImagePreview(true);
    }
  };

  const handleDocumentPreview = (fileItem: FileItem) => {
    if (fileItem.type === 'document') {
      setSelectedDocument(fileItem.file);
      setShowDocumentPreview(true);
    }
  };

  return (
    <div className="relative w-full space-y-6 p-8 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 rounded-2xl shadow-2xl border border-white/10 overflow-hidden">
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none select-none">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-pulse"></div>
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-bounce"></div>
        <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-purple-400/10 rounded-full blur-xl animate-pulse"></div>
      </div>

      {/* Premium Header */}
      <div className="relative z-10 flex items-center gap-3 mb-6 mt-2 flex-shrink-0">
        <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
          <Upload className="text-white" size={28} />
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-wide bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            File Sharing
          </h2>
          <p className="text-xs text-slate-400 font-medium">Premium drag & drop deljenje fajlova</p>
        </div>
      </div>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-50/80 border border-red-200 rounded-xl backdrop-blur-md shadow-lg relative z-10"
          >
            <div className="flex items-center space-x-2 text-red-700">
              <X className="w-4 h-4" />
              <span className="text-sm font-medium">{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop Zone */}
      <div
        {...getRootProps()}
        className={
          `relative border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer z-10
          ${isDragActive || dropzoneDragActive
            ? 'border-blue-400 bg-gradient-to-br from-blue-500/10 to-purple-500/10 shadow-xl scale-105'
            : 'border-white/20 hover:border-blue-400 bg-white/5 hover:bg-blue-50/10 shadow-lg'
          }`
        }
      >
        <input {...getInputProps()} />
        <motion.div
          initial={{ scale: 1 }}
          animate={{ scale: isDragActive || dropzoneDragActive ? 1.05 : 1 }}
          className="space-y-4"
        >
          <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
            <Upload className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-white drop-shadow">
              {isDragActive || dropzoneDragActive ? 'Spustite fajlove ovde' : 'Prevučite fajlove ovde'}
            </h3>
            <p className="text-sm text-slate-200/80">
              ili kliknite za odabir fajlova
            </p>
            <p className="text-xs text-slate-400">
              Maksimalno {maxFiles} fajlova, {maxSize}MB po fajlu
            </p>
          </div>
        </motion.div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3 relative z-10"
        >
          <h4 className="text-sm font-semibold text-slate-200 mb-2">Uploadovani fajlovi <span className="text-xs text-slate-400">({files.length}/{maxFiles})</span></h4>
          <div className="space-y-2">
            {files.map((fileItem) => (
              <motion.div
                key={fileItem.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex items-center space-x-3 p-4 bg-gradient-to-br from-white/60 via-slate-100/60 to-blue-50/60 backdrop-blur-xl border border-white/20 rounded-2xl shadow-md hover:shadow-xl transition-all duration-200"
              >
                {/* File Icon */}
                <div className="flex-shrink-0">
                  {getFileIcon(fileItem.type)}
                </div>
                {/* File Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {fileItem.file.name}
                    </p>
                    <div className="flex items-center space-x-1">
                      {fileItem.status && (
                        <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(fileItem.status)} bg-white/80 shadow-sm`}>
                          {getStatusIcon(fileItem.status)}
                          <span className="ml-1">{getStatusText(fileItem.status)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500">{fileItem.size}</p>
                </div>
                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {fileItem.type === 'image' && fileItem.preview && (
                    <button
                      onClick={() => handleImagePreview(fileItem)}
                      className="p-2 text-blue-600 hover:text-white hover:bg-blue-500/80 rounded-xl transition-colors shadow-sm"
                      title="Pregledaj sliku"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  )}
                  {fileItem.type === 'document' && (
                    <button
                      onClick={() => handleDocumentPreview(fileItem)}
                      className="p-2 text-green-600 hover:text-white hover:bg-green-500/80 rounded-xl transition-colors shadow-sm"
                      title="Pregledaj dokument"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => removeFile(fileItem.id)}
                    className="p-2 text-red-500 hover:text-white hover:bg-red-500/80 rounded-xl transition-colors shadow-sm"
                    title="Obriši fajl"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Image Preview Modal */}
      {selectedImage && (
        <ImagePreview
          src={selectedImage}
          alt="Image preview"
          isOpen={showImagePreview}
          onClose={() => {
            setShowImagePreview(false);
            setSelectedImage(null);
          }}
        />
      )}

      {/* Document Preview Modal */}
      {selectedDocument && (
        <DocumentPreview
          file={selectedDocument}
          isOpen={showDocumentPreview}
          onClose={() => {
            setShowDocumentPreview(false);
            setSelectedDocument(null);
          }}
        />
      )}
    </div>
  );
};

export default FileSharing; 