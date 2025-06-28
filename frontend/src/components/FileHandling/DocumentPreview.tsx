'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Download, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  X,
  ChevronLeft,
  ChevronRight,
  Search,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  Image as ImageIcon
} from 'lucide-react';

// PDF.js import - samo na client-side
let pdfjsLib: any = null;
let mammoth: any = null;

// Dynamic imports za client-side
if (typeof window !== 'undefined') {
  import('pdfjs-dist').then((pdf) => {
    pdfjsLib = pdf;
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;
  });
  
  import('mammoth').then((mam) => {
    mammoth = mam.default;
  });
}

interface DocumentPreviewProps {
  file: File;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

interface FileContent {
  type: 'text' | 'image' | 'pdf' | 'docx';
  content: string | string[];
  pages?: number;
}

const DocumentPreview: React.FC<DocumentPreviewProps> = ({
  file,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false
}) => {
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [pdfjsLib, setPdfjsLib] = useState<any>(null);
  const [mammothLib, setMammothLib] = useState<any>(null);
  const [libsReady, setLibsReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    console.log('DocumentPreview: Starting dynamic imports...');
    if (typeof window !== 'undefined') {
      Promise.all([
        import('pdfjs-dist'),
        import('mammoth')
      ]).then(([pdf, mam]) => {
        if (mounted) {
          console.log('DocumentPreview: Libraries imported successfully');
          
          // Koristi synchronous mode bez worker-a
          try {
            // Postavi workerSrc na validan CDN URL
            pdf.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdf.version}/pdf.worker.min.js`;
            console.log('DocumentPreview: Using CDN worker URL');
          } catch (error) {
            console.warn('DocumentPreview: Could not set worker URL, trying alternative CDN');
            // Fallback na alternativni CDN
            pdf.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdf.version}/build/pdf.worker.min.js`;
          }
          
          setPdfjsLib(pdf);
          setMammothLib(mam.default);
          setLibsReady(true);
          console.log('DocumentPreview: Libraries ready, libsReady set to true');
        }
      }).catch(error => {
        console.error('DocumentPreview: Error importing libraries:', error);
        if (mounted) {
          setError(`Greška pri učitavanju biblioteka: ${error.message}`);
        }
      });
    }
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    console.log('DocumentPreview: useEffect triggered', { isOpen, file: !!file, libsReady });
    if (isOpen && file && libsReady) {
      console.log('DocumentPreview: All conditions met, calling loadDocument');
      loadDocument();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, file, libsReady]);

  const isImageFile = (file: File): boolean => {
    return file.type.startsWith('image/') || 
           ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].some(ext => 
             file.name.toLowerCase().endsWith(ext)
           );
  };

  const isTextFile = (file: File): boolean => {
    return file.type.startsWith('text/') || 
           file.type === 'application/json' || 
           file.type === 'application/xml' ||
           ['txt', 'md', 'json', 'xml', 'csv', 'log'].some(ext => 
             file.name.toLowerCase().endsWith(ext)
           );
  };

  const isPdfFile = (file: File): boolean => {
    return file.type === 'application/pdf' || 
           file.name.toLowerCase().endsWith('.pdf');
  };

  const isDocxFile = (file: File): boolean => {
    return file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
           file.name.toLowerCase().endsWith('.docx');
  };

  const loadDocument = async () => {
    console.log('DocumentPreview: loadDocument started');
    setIsLoading(true);
    setError(null);
    setFileContent(null);
    setCurrentPage(1);
    setSearchResults([]);
    setSearchTerm('');

    try {
      if (!file) {
        console.log('DocumentPreview: No file provided');
        return;
      }
      console.log('DocumentPreview: Loading document:', file.name, 'Type:', file.type);
      
      if (isImageFile(file)) {
        console.log('DocumentPreview: Processing image file');
        const imageUrl = URL.createObjectURL(file);
        setFileContent({ type: 'image', content: imageUrl });
        setTotalPages(1);
        setIsLoading(false);
        console.log('DocumentPreview: Image loaded successfully');
      } else if (isTextFile(file)) {
        console.log('DocumentPreview: Processing text file');
        const text = await file.text();
        const lines = text.split('\n');
        setFileContent({ type: 'text', content: lines });
        setTotalPages(Math.max(1, Math.ceil(lines.length / 50)));
        setIsLoading(false);
        console.log('DocumentPreview: Text file loaded successfully, lines:', lines.length);
      } else if (isPdfFile(file)) {
        console.log('DocumentPreview: Processing PDF file');
        if (!pdfjsLib) {
          console.error('DocumentPreview: PDF library not loaded!');
          throw new Error('PDF biblioteka nije učitana!');
        }
        console.log('DocumentPreview: PDF library available, processing...');
        const arrayBuffer = await file.arrayBuffer();
        console.log('DocumentPreview: PDF arrayBuffer loaded, size:', arrayBuffer.byteLength);
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        console.log('DocumentPreview: PDF document loaded, pages:', pdf.numPages);
        const pages: string[] = [];
        for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
          console.log(`DocumentPreview: Processing page ${i}`);
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          pages.push(pageText);
        }
        setFileContent({ type: 'pdf', content: pages, pages: pdf.numPages });
        setTotalPages(Math.min(pdf.numPages, 10));
        setIsLoading(false);
        console.log('DocumentPreview: PDF loaded successfully');
      } else if (isDocxFile(file)) {
        console.log('DocumentPreview: Processing DOCX file');
        if (!mammothLib) {
          console.error('DocumentPreview: Mammoth library not loaded!');
          throw new Error('Mammoth biblioteka nije učitana!');
        }
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammothLib.extractRawText({ arrayBuffer });
        const lines = result.value.split('\n');
        setFileContent({ type: 'docx', content: lines });
        setTotalPages(Math.max(1, Math.ceil(lines.length / 50)));
        setIsLoading(false);
        console.log('DocumentPreview: DOCX loaded successfully, lines:', lines.length);
      } else {
        console.log('DocumentPreview: Unsupported file type:', file.type);
        setError(`Ovaj tip fajla nije podržan za preview: ${file.type}. Podržani su: PDF, DOCX, TXT, slike (PNG, JPG, JPEG).`);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('DocumentPreview: Error loading document:', err);
      setError(`Greška pri učitavanju dokumenta: ${err instanceof Error ? err.message : 'Nepoznata greška'}. Proverite da li je fajl oštećen.`);
      setIsLoading(false);
    }
  };

  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.1, 3));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.1, 0.5));
  };

  const handleReset = () => {
    setScale(1);
    setCurrentPage(1);
  };

  const handleSearch = () => {
    if (!searchTerm.trim() || !fileContent) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const results: number[] = [];
    
    if (fileContent.type === 'text' || fileContent.type === 'docx') {
      const lines = fileContent.content as string[];
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(searchTerm.toLowerCase())) {
          results.push(index + 1);
        }
      });
    } else if (fileContent.type === 'pdf') {
      const pages = fileContent.content as string[];
      pages.forEach((page, index) => {
        if (page.toLowerCase().includes(searchTerm.toLowerCase())) {
          results.push(index + 1);
        }
      });
    }

    setSearchResults(results);
    setCurrentSearchIndex(0);
    
    if (results.length > 0) {
      const lineNumber = results[0];
      setCurrentPage(Math.ceil(lineNumber / 50));
    }
  };

  const goToNextSearch = () => {
    if (searchResults.length > 0) {
      const newIndex = (currentSearchIndex + 1) % searchResults.length;
      setCurrentSearchIndex(newIndex);
      const lineNumber = searchResults[newIndex];
      setCurrentPage(Math.ceil(lineNumber / 50));
    }
  };

  const goToPreviousSearch = () => {
    if (searchResults.length > 0) {
      const newIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
      setCurrentSearchIndex(newIndex);
      const lineNumber = searchResults[newIndex];
      setCurrentPage(Math.ceil(lineNumber / 50));
    }
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(file);
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getFileInfo = () => {
    const size = (file.size / 1024).toFixed(2);
    const lastModified = new Date(file.lastModified).toLocaleDateString('sr-RS');
    return { size, lastModified };
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  const renderContent = () => {
    if (!fileContent) return null;

    if (fileContent.type === 'image') {
      return (
        <div className="w-full h-full flex items-center justify-center p-4">
          <img
            src={fileContent.content as string}
            alt={file.name}
            className="max-w-full max-h-full object-contain"
            style={{ transform: `scale(${scale})` }}
          />
        </div>
      );
    }

    if (fileContent.type === 'text' || fileContent.type === 'docx') {
      const lines = fileContent.content as string[];
      const startLine = (currentPage - 1) * 50;
      const endLine = Math.min(startLine + 50, lines.length);
      const pageLines = lines.slice(startLine, endLine);

      return (
        <div className="w-full h-full overflow-auto p-4">
          <div 
            className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
          >
            <div className="font-mono text-sm leading-relaxed">
              {pageLines.map((line, index) => {
                const lineNumber = startLine + index + 1;
                const isHighlighted = searchResults.includes(lineNumber);
                const isCurrentSearch = searchResults[currentSearchIndex] === lineNumber;
                
                return (
                  <div
                    key={index}
                    className={`py-1 ${isHighlighted ? 'bg-yellow-200' : ''} ${isCurrentSearch ? 'bg-blue-200' : ''}`}
                  >
                    <span className="text-gray-500 mr-4 w-8 inline-block">
                      {lineNumber}
                    </span>
                    <span className="text-gray-800">{line || ' '}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      );
    }

    if (fileContent.type === 'pdf') {
      const pages = fileContent.content as string[];
      const currentPageContent = pages[currentPage - 1] || '';

      return (
        <div className="w-full h-full overflow-auto p-4">
          <div 
            className="bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto"
            style={{ transform: `scale(${scale})`, transformOrigin: 'top left' }}
          >
            <div className="mb-4 pb-2 border-b border-gray-300">
              <h3 className="text-lg font-semibold text-gray-800">PDF Stranica {currentPage}</h3>
            </div>
            <div className="text-sm leading-relaxed text-gray-800 whitespace-pre-wrap">
              {currentPageContent}
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const buttonClass = `
    p-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg
    hover:bg-white hover:shadow-lg transition-all duration-200
    text-gray-700 hover:text-gray-900
  `;

  const canSearch = fileContent && (fileContent.type === 'text' || fileContent.type === 'docx' || fileContent.type === 'pdf');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
        >
          {/* Header Controls */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-lg p-2 border border-gray-200">
              <button
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                className={`${buttonClass} ${scale <= 0.5 ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Umanji"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleZoomIn}
                disabled={scale >= 3}
                className={`${buttonClass} ${scale >= 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Uvećaj"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleReset}
                className={buttonClass}
                title="Resetuj"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              
              {canSearch && (
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className={`${buttonClass} ${showSearch ? 'bg-blue-100' : ''}`}
                  title="Pretraži"
                >
                  <Search className="w-5 h-5" />
                </button>
              )}
              
              <button
                onClick={handleDownload}
                className={buttonClass}
                title="Preuzmi"
              >
                <Download className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search Bar */}
          {showSearch && canSearch && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-4 left-4 z-10"
            >
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-lg p-2 border border-gray-200">
                <Search className="w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Pretraži dokument..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="bg-transparent border-none outline-none text-sm w-48"
                />
                {searchResults.length > 0 && (
                  <div className="flex items-center space-x-1 text-xs text-gray-600">
                    <span>{currentSearchIndex + 1}/{searchResults.length}</span>
                    <button
                      onClick={goToPreviousSearch}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <ArrowLeft className="w-3 h-3" />
                    </button>
                    <button
                      onClick={goToNextSearch}
                      className="p-1 hover:bg-gray-200 rounded"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
                <button
                  onClick={handleSearch}
                  className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                >
                  Traži
                </button>
              </div>
            </motion.div>
          )}

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-200 text-gray-700 hover:text-gray-900"
            title="Zatvori (ESC)"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation Arrows */}
          {hasPrevious && (
            <button
              onClick={onPrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-200 text-gray-700 hover:text-gray-900"
              title="Prethodni dokument"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {hasNext && (
            <button
              onClick={onNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-4 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-200 text-gray-700 hover:text-gray-900"
              title="Sledeći dokument"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Content */}
          <div className="flex items-center justify-center w-full h-full p-4">
            {isLoading ? (
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p>Učitavanje dokumenta...</p>
              </div>
            ) : error ? (
              <div className="text-center text-white max-w-md">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-semibold mb-2">Greška pri učitavanju</h3>
                <p className="text-gray-300 mb-4">{error}</p>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Preuzmi fajl
                </button>
              </div>
            ) : (
              <div className="w-full h-full">
                {renderContent()}
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          {!isLoading && !error && totalPages > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-200">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage <= 1}
                  className={`p-2 rounded ${currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="text-sm font-medium">
                  Stranica {currentPage} od {totalPages}
                </span>
                
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage >= totalPages}
                  className={`p-2 rounded ${currentPage >= totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* File Info */}
          <div className="absolute bottom-4 left-4 z-10">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-200">
              <div className="text-sm text-gray-700 space-y-1">
                <div className="font-medium">{file.name}</div>
                <div>{getFileInfo().size} KB</div>
                <div>Poslednja izmena: {getFileInfo().lastModified}</div>
                {!isLoading && !error && fileContent && (
                  <div>
                    {fileContent.type === 'text' || fileContent.type === 'docx' ? (
                      <>Linije: {(fileContent.content as string[]).length}</>
                    ) : fileContent.type === 'pdf' ? (
                      <>PDF stranice: {fileContent.pages}</>
                    ) : fileContent.type === 'image' ? (
                      <>Tip: Slika</>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Zoom Info */}
          <div className="absolute bottom-4 right-4 z-10">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-200">
              <span className="text-sm font-medium text-gray-700">
                {Math.round(scale * 100)}%
              </span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DocumentPreview;