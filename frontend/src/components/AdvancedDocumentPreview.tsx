'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCcw, 
  Maximize2, 
  Minimize2,
  X,
  Download,
  ArrowLeft,
  ArrowRight,
  Search,
  BookOpen,
  FileText,
  Image as ImageIcon,
  Bookmark,
  Edit3,
  Copy,
  Share2,
  Settings,
  Eye,
  EyeOff,
  Type,
  Palette,
  Undo2,
  Redo2,
  Save,
  ChevronLeft,
  ChevronRight,
  PenTool,
  Filter,
  Crop,
  Highlighter,
  StickyNote
} from 'lucide-react';
import { FaTimes, FaSpinner, FaExclamationTriangle, FaFile } from 'react-icons/fa';
import { getFileIcon } from '../utils/fileUtils';
import { DOCUMENTS_ENDPOINT, API_BASE, apiRequest } from '../utils/api';
import { useErrorToast } from './ErrorToastProvider';

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

interface DocumentContent {
  document_id?: string;
  filename: string;
  file_type: string;
  content_type?: string;
  total_pages: number;
  pages: Record<number, string>;
  all_content: string;
  message?: string;
  // Za File objekte
  type?: 'text' | 'image' | 'pdf' | 'docx';
  content?: string | string[];
  file?: File;
}

interface AdvancedDocumentPreviewProps {
  // Backend props
  documentId?: string;
  filename?: string;
  // File props
  file?: File;
  // Common props
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
  ocrInfo?: {
    confidence?: number;
    languages?: string[];
    status?: string;
    message?: string;
    text?: string;
  };
}

const AdvancedDocumentPreview: React.FC<AdvancedDocumentPreviewProps> = ({
  documentId,
  filename: propFilename,
  file,
  isOpen,
  onClose,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false,
  ocrInfo
}) => {
  // Content states
  const [content, setContent] = useState<DocumentContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Navigation states
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<'pages' | 'all'>('pages');
  
  // Zoom and transform states
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isModalFullscreen, setIsModalFullscreen] = useState(false);
  
  // Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<number[]>([]);
  const [currentSearchIndex, setCurrentSearchIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [searchOptions, setSearchOptions] = useState({
    caseSensitive: false,
    useRegex: false,
    wholeWord: false
  });
  
  // Display states
  const [fontSize, setFontSize] = useState(14);
  const [lineSpacing, setLineSpacing] = useState(1.5);
  const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('light');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  
  // Bookmark states
  const [bookmarks, setBookmarks] = useState<Array<{ id: string; page: number; title: string; timestamp: number }>>([]);
  const [showBookmarks, setShowBookmarks] = useState(false);
  
  // Notes states
  const [notes, setNotes] = useState<Array<{ id: string; page: number; text: string; timestamp: number }>>([]);
  const [selectedText, setSelectedText] = useState('');
  
  // History states
  const [history, setHistory] = useState<Array<{ page: number; scale: number; timestamp: number }>>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Edit states
  const [isEditing, setIsEditing] = useState(false);
  const [editMode, setEditMode] = useState<'text' | 'drawing' | 'highlight' | 'note' | null>(null);
  const [drawColor, setDrawColor] = useState('#ff0000');
  const [drawSize, setDrawSize] = useState(3);
  const [drawHistory, setDrawHistory] = useState<Array<{ x: number; y: number; color: string; size: number; page: number }>>([]);
  const [drawHistoryIndex, setDrawHistoryIndex] = useState(-1);
  const [highlights, setHighlights] = useState<Array<{ id: string; text: string; page: number; color: string }>>([]);
  const [annotations, setAnnotations] = useState<Array<{ id: string; text: string; page: number; x: number; y: number; color: string }>>([]);
  const [textOverlays, setTextOverlays] = useState<Array<{ id: string; text: string; x: number; y: number; color: string; size: number; page: number }>>([]);
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null);
  const [isAddingText, setIsAddingText] = useState(false);
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const { showError, showSuccess } = useErrorToast();

  // Initialize content based on props
  useEffect(() => {
    console.log('Initialize content effect:', { isOpen, documentId, file: !!file });
    if (isOpen) {
      if (documentId) {
        console.log('Fetching document content for ID:', documentId);
        fetchDocumentContent();
      } else if (file) {
        console.log('Loading file content for file:', file.name);
        loadFileContent();
      }
    }
  }, [isOpen, documentId, file]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          if (isModalFullscreen) {
            setIsModalFullscreen(false);
          } else {
            onClose();
          }
          break;
        case 'f':
        case 'F':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setShowSearch(!showSearch);
          } else {
            handleModalFullscreen();
          }
          break;
        case 'ArrowRight':
          if (hasNext && !e.ctrlKey) {
            onNext?.();
          } else if (content && currentPage < content.total_pages) {
            handleNextPage();
          }
          break;
        case 'ArrowLeft':
          if (hasPrevious && !e.ctrlKey) {
            onPrevious?.();
          } else if (currentPage > 1) {
            handlePreviousPage();
          }
          break;
        case '=':
        case '+':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoomIn();
          }
          break;
        case '-':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleZoomOut();
          }
          break;
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleReset();
          }
          break;
        case 'r':
        case 'R':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleRotate();
          }
          break;
        case 's':
        case 'S':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleSaveBookmark();
          }
          break;
        case 'b':
        case 'B':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setShowBookmarks(!showBookmarks);
          }
          break;
        case 'e':
        case 'E':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            console.log('Ctrl+E pressed, starting editing');
            startEditing();
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, content, currentPage, hasNext, hasPrevious, isModalFullscreen, showSearch]);

  // Reset state when content changes
  useEffect(() => {
    console.log('Content changed, resetting state');
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setCurrentPage(1);
    setSearchResults([]);
    setCurrentSearchIndex(0);
    setIsModalFullscreen(false);
  }, [content]);

  // Fetch document content from backend
  const fetchDocumentContent = async () => {
    console.log('Fetching document content for ID:', documentId);
    try {
      setLoading(true);
      setError(null);
      
      // Prvo pokušaj da dohvatiš sadržaj dokumenta
      const data = await apiRequest(`${DOCUMENTS_ENDPOINT}/${documentId}/content`);
      
      if (data.status === 'success') {
        if (data.content_type === 'image') {
          // Za slike, dohvati originalni fajl
          const imageResponse = await fetch(`${API_BASE}/documents/${documentId}/original`);
          if (imageResponse.ok) {
            const blob = await imageResponse.blob();
            const imageUrl = URL.createObjectURL(blob);
            setContent({
              filename: data.filename,
              file_type: data.file_type,
              content_type: 'image',
              total_pages: 1,
              pages: {1: imageUrl},
              all_content: imageUrl
            });
          } else {
            throw new Error('Greška pri dohvatanju slike');
          }
        } else {
          // Za tekstualne dokumente, koristi postojeći sadržaj
          const pages = data.pages
            ? Object.fromEntries(
                Object.entries(data.pages).map(([k, v]) => [String(k), v])
              )
            : {};
          setContent({
            ...data,
            pages
          });
        }
        showSuccess('Sadržaj dokumenta uspešno učitan', 'Učitavanje');
      } else {
        throw new Error(data.message || 'Greška pri dohvatanju sadržaja');
      }
    } catch (error: any) {
      setError(error.message || 'Greška pri dohvatanju sadržaja dokumenta');
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

  // Load file content (for File objects)
  const loadFileContent = async () => {
    console.log('Loading file content for file:', file?.name);
    if (!file) return;

    try {
      setLoading(true);
      setError(null);

      const filename = file.name;
      const fileType = file.type;

      if (isImageFile(file)) {
        const imageUrl = URL.createObjectURL(file);
        setContent({
          filename,
          file_type: fileType,
          content_type: 'image',
          total_pages: 1,
          pages: {1: imageUrl},
          all_content: imageUrl,
          type: 'image',
          content: imageUrl,
          file
        });
      } else if (isTextFile(file)) {
        const text = await file.text();
        const lines = text.split('\n');
        setContent({
          filename,
          file_type: fileType,
          total_pages: Math.max(1, Math.ceil(lines.length / 50)),
          pages: {1: text},
          all_content: text,
          type: 'text',
          content: lines,
          file
        });
      } else if (isPdfFile(file)) {
        await loadPdfContent(file);
      } else if (isDocxFile(file)) {
        await loadDocxContent(file);
      } else {
        throw new Error('Nepodržan tip fajla');
      }
    } catch (error: any) {
      setError(error.message || 'Greška pri učitavanju fajla');
    } finally {
      setLoading(false);
    }
  };

  // Load PDF content
  const loadPdfContent = async (file: File) => {
    if (!pdfjsLib) {
      throw new Error('PDF.js nije učitan');
    }

    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pages: string[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      pages.push(pageText);
    }

    setContent({
      filename: file.name,
      file_type: file.type,
      total_pages: pdf.numPages,
      pages: pages.reduce((acc, text, index) => ({ ...acc, [index + 1]: text }), {}),
      all_content: pages.join('\n\n'),
      type: 'pdf',
      content: pages,
      file
    });
  };

  // Load DOCX content
  const loadDocxContent = async (file: File) => {
    if (!mammoth) {
      throw new Error('Mammoth.js nije učitan');
    }

    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    
    if (result.messages.length > 0) {
      console.warn('DOCX warnings:', result.messages);
    }

    const text = result.value;
    const lines = text.split('\n');

    setContent({
      filename: file.name,
      file_type: file.type,
      total_pages: Math.max(1, Math.ceil(lines.length / 50)),
      pages: {1: text},
      all_content: text,
      type: 'docx',
      content: lines,
      file
    });
  };

  // File type detection
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

  // Navigation functions
  const handlePreviousPage = () => {
    if (content && currentPage > 1) {
      addToHistory();
      setCurrentPage(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (content && currentPage < content.total_pages) {
      addToHistory();
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= (content?.total_pages || 1)) {
      addToHistory();
      setCurrentPage(page);
    }
  };

  // Zoom functions
  const handleZoomIn = () => {
    setScale(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setScale(prev => Math.max(prev / 1.2, 0.1));
  };

  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Fullscreen functions
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleModalFullscreen = () => {
    setIsModalFullscreen(!isModalFullscreen);
  };

  // Mouse events for panning and drawing
  const handleMouseDown = (e: React.MouseEvent) => {
    console.log('Mouse down:', { editMode, isEditing, scale });
    
    if (editMode === 'drawing') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      console.log('Drawing point:', { x, y });
      addDrawPoint(x, y);
    } else if (editMode === 'note' || editMode === 'text') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      console.log('Adding annotation/text:', { editMode, x, y });
      if (editMode === 'note') {
        addAnnotation(x, y);
      } else {
        addTextOverlay(x, y);
      }
    } else if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (editMode === 'drawing') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      console.log('Mouse move drawing:', { x, y });
      addDrawPoint(x, y);
    } else if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    console.log('Mouse up called');
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    console.log('Wheel event:', { delta, currentScale: scale });
    setScale(prev => Math.max(0.1, Math.min(5, prev * delta)));
  };

  // Search functions
  const handleSearch = () => {
    if (!searchTerm.trim() || !content) {
      setSearchResults([]);
      setCurrentSearchIndex(0);
      return;
    }

    const results: number[] = [];
    const searchText = searchOptions.caseSensitive ? searchTerm : searchTerm.toLowerCase();
    
    if (content.pages) {
      Object.entries(content.pages).forEach(([pageNum, pageContent]) => {
        const content = searchOptions.caseSensitive ? pageContent : pageContent.toLowerCase();
        if (searchOptions.useRegex) {
          try {
            const regex = new RegExp(searchText, searchOptions.caseSensitive ? 'g' : 'gi');
            if (regex.test(content)) {
              results.push(parseInt(pageNum));
            }
          } catch (e) {
            // Invalid regex, ignore
          }
        } else {
          if (searchOptions.wholeWord) {
            const words = content.split(/\s+/);
            if (words.some(word => word === searchText)) {
              results.push(parseInt(pageNum));
            }
          } else {
            if (content.includes(searchText)) {
              results.push(parseInt(pageNum));
            }
          }
        }
      });
    }

    setSearchResults(results);
    setCurrentSearchIndex(0);
    
    if (results.length > 0) {
      goToPage(results[0]);
    }
  };

  const goToNextSearch = () => {
    if (searchResults.length > 0) {
      const newIndex = (currentSearchIndex + 1) % searchResults.length;
      setCurrentSearchIndex(newIndex);
      goToPage(searchResults[newIndex]);
    }
  };

  const goToPreviousSearch = () => {
    if (searchResults.length > 0) {
      const newIndex = currentSearchIndex === 0 ? searchResults.length - 1 : currentSearchIndex - 1;
      setCurrentSearchIndex(newIndex);
      goToPage(searchResults[newIndex]);
    }
  };

  // Bookmark functions
  const handleSaveBookmark = () => {
    if (!content) return;
    
    const bookmark = {
      id: Date.now().toString(),
      page: currentPage,
      title: `Stranica ${currentPage}`,
      timestamp: Date.now()
    };
    
    setBookmarks(prev => [...prev, bookmark]);
    showSuccess('Bookmark sačuvan', 'Bookmark');
  };

  const handleRemoveBookmark = (id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  };

  const handleGoToBookmark = (bookmark: { page: number }) => {
    goToPage(bookmark.page);
    setShowBookmarks(false);
  };

  // History functions
  const addToHistory = () => {
    const newEntry = {
      page: currentPage,
      scale,
      timestamp: Date.now()
    };
    
    setHistory(prev => {
      const newHistory = [...prev.slice(0, historyIndex + 1), newEntry];
      return newHistory.slice(-50); // Keep last 50 entries
    });
    setHistoryIndex(prev => prev + 1);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const entry = history[historyIndex - 1];
      setCurrentPage(entry.page);
      setScale(entry.scale);
      setHistoryIndex(prev => prev - 1);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const entry = history[historyIndex + 1];
      setCurrentPage(entry.page);
      setScale(entry.scale);
      setHistoryIndex(prev => prev + 1);
    }
  };

  // Download function
  const handleDownload = () => {
    if (!content) return;
    
    try {
      const blob = new Blob([content.all_content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${content.filename}_content.txt`;
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

  // Text selection
  const handleTextSelection = () => {
    console.log('Text selection handler called');
    // Završi drag operaciju
    setIsDragging(false);
    
    // Proveri text selection
    const selection = window.getSelection();
    console.log('Selection:', selection?.toString());
    if (selection && selection.toString().trim()) {
      const selectedTextValue = selection.toString();
      console.log('Setting selected text:', selectedTextValue);
      setSelectedText(selectedTextValue);
      
      // Ako je highlight mode aktivan, dodaj highlight
      if (editMode === 'highlight') {
        console.log('Highlight mode active, adding highlight');
        addHighlight();
      }
    }
  };

  const handleCopySelected = () => {
    if (selectedText) {
      navigator.clipboard.writeText(selectedText);
      showSuccess('Tekst kopiran u clipboard', 'Kopiranje');
      setSelectedText('');
    }
  };

  // Edit functions
  const startEditing = () => {
    console.log('Start editing clicked, current isEditing:', isEditing);
    setIsEditing(!isEditing);
    if (!isEditing) {
      setEditMode(null);
    }
    console.log('New isEditing state will be:', !isEditing);
  };

  const startDrawing = () => {
    console.log('Start drawing clicked');
    setEditMode('drawing');
    setIsAddingText(false);
  };

  const startHighlighting = () => {
    console.log('Start highlighting clicked');
    setEditMode('highlight');
    setIsAddingText(false);
  };

  const startAddingNote = () => {
    console.log('Start adding note clicked');
    setEditMode('note');
    setIsAddingText(false);
  };

  const startAddingText = () => {
    console.log('Start adding text clicked');
    setEditMode('text');
    setIsAddingText(true);
  };

  const addDrawPoint = useCallback((x: number, y: number) => {
    console.log('Add draw point called:', { editMode, x, y, drawColor, drawSize, currentPage });
    if (editMode !== 'drawing') {
      console.log('Not in drawing mode, returning');
      return;
    }
    
    const newPoint = { x, y, color: drawColor, size: drawSize, page: currentPage };
    console.log('Adding new point:', newPoint);
    setDrawHistory(prev => [...prev.slice(0, drawHistoryIndex + 1), newPoint]);
    setDrawHistoryIndex(prev => prev + 1);
  }, [editMode, drawColor, drawSize, drawHistoryIndex, currentPage]);

  const undoDraw = () => {
    if (drawHistoryIndex > 0) {
      setDrawHistoryIndex(prev => prev - 1);
    }
  };

  const redoDraw = () => {
    if (drawHistoryIndex < drawHistory.length - 1) {
      setDrawHistoryIndex(prev => prev + 1);
    }
  };

  const clearDraw = () => {
    setDrawHistory([]);
    setDrawHistoryIndex(-1);
  };

  const addHighlight = () => {
    console.log('Add highlight called:', { selectedText, editMode, currentPage });
    if (selectedText && editMode === 'highlight') {
      const newHighlight = {
        id: Date.now().toString(),
        text: selectedText,
        page: currentPage,
        color: drawColor
      };
      console.log('Adding new highlight:', newHighlight);
      setHighlights(prev => [...prev, newHighlight]);
      setSelectedText('');
    }
  };

  const addAnnotation = (x: number, y: number) => {
    console.log('Add annotation called:', { editMode, x, y, currentPage });
    if (editMode === 'note') {
      const newAnnotation = {
        id: Date.now().toString(),
        text: 'Nova napomena',
        page: currentPage,
        x,
        y,
        color: drawColor
      };
      console.log('Adding new annotation:', newAnnotation);
      setAnnotations(prev => [...prev, newAnnotation]);
      setSelectedAnnotation(newAnnotation.id);
    }
  };

  const addTextOverlay = (x: number, y: number) => {
    console.log('Add text overlay called:', { editMode, x, y, currentPage });
    if (editMode === 'text') {
      const newText = {
        id: Date.now().toString(),
        text: 'Novi tekst',
        x,
        y,
        color: drawColor,
        size: drawSize * 2,
        page: currentPage
      };
      console.log('Adding new text overlay:', newText);
      setTextOverlays(prev => [...prev, newText]);
      setSelectedAnnotation(newText.id);
    }
  };

  const updateAnnotation = (id: string, updates: Partial<{ text: string; color: string; size?: number }>) => {
    setAnnotations(prev => prev.map(ann => 
      ann.id === id ? { ...ann, ...updates } : ann
    ));
    setTextOverlays(prev => prev.map(text => 
      text.id === id ? { ...text, ...updates } : text
    ));
  };

  const removeAnnotation = (id: string) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
    setTextOverlays(prev => prev.filter(text => text.id !== id));
    setSelectedAnnotation(null);
  };

  const saveChanges = () => {
    // Ovde bi se implementiralo čuvanje izmena u backend
    showSuccess('Izmene sačuvane', 'Čuvanje');
  };

  // Theme functions
  const getThemeClasses = () => {
    switch (theme) {
      case 'dark':
        return 'bg-gray-900 text-white';
      case 'sepia':
        return 'bg-amber-50 text-amber-900';
      default:
        return 'bg-white text-gray-900';
    }
  };

  // Render content
  const renderContent = () => {
    console.log('Rendering content:', { content: !!content, editMode, isEditing });
    if (!content) return null;

    if (content.content_type === 'image' || content.type === 'image') {
      console.log('Rendering image content');
      return (
        <div className="w-full h-full flex items-center justify-center p-4">
          <img
            src={content.pages[1] || content.content as string}
            alt={content.filename}
            className="max-w-full max-h-full object-contain"
            style={{ 
              transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
              transformOrigin: 'center',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
          />
        </div>
      );
    }

    // Text content
    console.log('Rendering text content');
    const currentPageContent = content.pages[currentPage] || '';
    const lines = currentPageContent.split('\n');
    const startLine = (currentPage - 1) * 50;
    const endLine = Math.min(startLine + 50, lines.length);
    const pageLines = lines.slice(startLine, endLine);
    
    console.log('Text content state:', { 
      currentPage, 
      totalLines: lines.length, 
      pageLines: pageLines.length,
      highlights: highlights.length,
      annotations: annotations.length,
      textOverlays: textOverlays.length,
      drawHistory: drawHistory.length
    });

    return (
      <div 
        className={`w-full h-full overflow-auto p-4 ${getThemeClasses()}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        onMouseUp={handleTextSelection}
      >
        <div 
          ref={contentRef}
          className="p-8 rounded-lg shadow-lg max-w-4xl mx-auto relative"
          style={{ 
            transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
            transformOrigin: 'top left',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            fontSize: `${fontSize}px`,
            lineHeight: lineSpacing
          }}
        >
          <div className="font-mono leading-relaxed">
            {pageLines.map((line, index) => {
              const lineNumber = startLine + index + 1;
              const isHighlighted = searchResults.includes(currentPage);
              
              // Proveri da li postoji highlight za ovu liniju
              const lineHighlights = highlights.filter(h => h.page === currentPage);
              let highlightedLine = line;
              
              // Primeni highlight-ove na liniju
              lineHighlights.forEach(highlight => {
                if (line.includes(highlight.text)) {
                  const parts = line.split(highlight.text);
                  highlightedLine = parts.join(`<mark style="background-color: ${highlight.color}">${highlight.text}</mark>`);
                }
              });
              
              if (lineHighlights.length > 0) {
                console.log('Applying highlights to line:', { lineNumber, lineHighlights });
              }
              
              return (
                <div
                  key={index}
                  className={`py-1 ${isHighlighted ? 'bg-yellow-200' : ''}`}
                >
                  {showLineNumbers && (
                    <span className="text-gray-500 mr-4 w-8 inline-block select-none">
                      {lineNumber}
                    </span>
                  )}
                  <span 
                    className="select-text"
                    dangerouslySetInnerHTML={{ __html: highlightedLine || ' ' }}
                  />
                </div>
              );
            })}
          </div>

          {/* Drawing overlay */}
          {(() => {
            console.log('Rendering drawing overlay:', { drawHistory: drawHistory.length, drawHistoryIndex, currentPage });
            return null;
          })()}
          <svg 
            className="absolute inset-0 pointer-events-none"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
              transformOrigin: 'top left'
            }}
          >
            {drawHistory.slice(0, drawHistoryIndex + 1)
              .filter(point => point.page === currentPage)
              .map((point, index) => (
                <circle
                  key={index}
                  cx={point.x}
                  cy={point.y}
                  r={point.size}
                  fill={point.color}
                />
              ))}
          </svg>

          {/* Annotations */}
          {(() => {
            console.log('Rendering annotations:', { annotations: annotations.length, currentPage });
            return null;
          })()}
          {annotations
            .filter(ann => ann.page === currentPage)
            .map((annotation) => (
              <div
                key={annotation.id}
                className={`absolute cursor-pointer ${selectedAnnotation === annotation.id ? 'ring-2 ring-blue-500' : ''}`}
                style={{
                  left: annotation.x,
                  top: annotation.y,
                  transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
                  transformOrigin: 'top left'
                }}
                onClick={() => setSelectedAnnotation(annotation.id)}
              >
                <div className="bg-yellow-200 p-2 rounded shadow-lg max-w-xs">
                  {selectedAnnotation === annotation.id ? (
                    <input
                      type="text"
                      value={annotation.text}
                      onChange={(e) => updateAnnotation(annotation.id, { text: e.target.value })}
                      className="bg-transparent border-none outline-none w-full"
                      autoFocus
                    />
                  ) : (
                    <span>{annotation.text}</span>
                  )}
                  {selectedAnnotation === annotation.id && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAnnotation(annotation.id);
                      }}
                      className="ml-2 text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}

          {/* Text overlays */}
          {(() => {
            console.log('Rendering text overlays:', { textOverlays: textOverlays.length, currentPage });
            return null;
          })()}
          {textOverlays
            .filter(text => text.page === currentPage)
            .map((textOverlay) => (
              <div
                key={textOverlay.id}
                className={`absolute cursor-pointer ${selectedAnnotation === textOverlay.id ? 'ring-2 ring-blue-500' : ''}`}
                style={{
                  left: textOverlay.x,
                  top: textOverlay.y,
                  color: textOverlay.color,
                  fontSize: `${textOverlay.size}px`,
                  transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
                  transformOrigin: 'top left'
                }}
                onClick={() => setSelectedAnnotation(textOverlay.id)}
              >
                {selectedAnnotation === textOverlay.id ? (
                  <input
                    type="text"
                    value={textOverlay.text}
                    onChange={(e) => updateAnnotation(textOverlay.id, { text: e.target.value })}
                    className="bg-transparent border-none outline-none"
                    style={{ color: textOverlay.color, fontSize: `${textOverlay.size}px` }}
                    autoFocus
                  />
                ) : (
                  <span>{textOverlay.text}</span>
                )}
                {selectedAnnotation === textOverlay.id && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAnnotation(textOverlay.id);
                    }}
                    className="ml-2 text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
        </div>
      </div>
    );
  };

  // Button classes
  const buttonClass = `
    p-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg
    hover:bg-white hover:shadow-lg transition-all duration-200
    text-gray-700 hover:text-gray-900
  `;

  const canSearch = content && (content.content_type !== 'image' && content.type !== 'image');
  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm"
          ref={containerRef}
        >
          {/* Header Controls */}
          {(() => {
            console.log('Header controls should render:', { scale, canSearch, isEditing });
            return null;
          })()}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-lg p-2 border border-gray-200">
              <button
                onClick={handleZoomOut}
                disabled={scale <= 0.5}
                className={`${buttonClass} ${scale <= 0.5 ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Umanji (Ctrl+-)"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleZoomIn}
                disabled={scale >= 3}
                className={`${buttonClass} ${scale >= 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Uvećaj (Ctrl+=)"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleReset}
                className={buttonClass}
                title="Resetuj (Ctrl+0)"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleRotate}
                className={buttonClass}
                title="Rotiraj (Ctrl+R)"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              
              {canSearch && (
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className={`${buttonClass} ${showSearch ? 'bg-blue-100' : ''}`}
                  title="Pretraži (Ctrl+F)"
                >
                  <Search className="w-5 h-5" />
                </button>
              )}
              
              <button
                onClick={() => setShowBookmarks(!showBookmarks)}
                className={`${buttonClass} ${showBookmarks ? 'bg-green-100' : ''}`}
                title="Bookmark-ovi (Ctrl+B)"
              >
                <Bookmark className="w-5 h-5" />
              </button>
              
              <button
                onClick={startEditing}
                className={`${buttonClass} ${isEditing ? 'bg-purple-100 ring-2 ring-purple-500 text-purple-700' : ''}`}
                title="Editovanje (Ctrl+E)"
              >
                <Edit3 className={`w-5 h-5 ${isEditing ? 'text-purple-700' : ''}`} />
              </button>
              
              <button
                onClick={handleModalFullscreen}
                className={buttonClass}
                title="Fullscreen (F)"
              >
                {isModalFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              
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
          {(() => {
            console.log('Search bar should render:', { showSearch, canSearch });
            return null;
          })()}
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

          {/* Edit Toolbar */}
          {(() => {
            console.log('Edit toolbar should render:', { isEditing, editMode });
            return null;
          })()}
          {isEditing && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-20 left-4 z-10"
            >
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-lg p-2 border border-gray-200">
                <div className="text-xs font-semibold text-purple-700 mr-2">
                  Edit Mode: {editMode || 'Izaberi alat'}
                </div>
                {/* Drawing tools */}
                <div className="flex gap-1">
                  <button
                    onClick={startDrawing}
                    className={`${buttonClass} ${editMode === 'drawing' ? 'bg-red-100 ring-2 ring-red-500' : ''}`}
                    title="Crtaj"
                  >
                    <PenTool className={`w-5 h-5 ${editMode === 'drawing' ? 'text-red-700' : ''}`} />
                  </button>
                  <input 
                    type="color" 
                    value={drawColor} 
                    onChange={(e) => setDrawColor(e.target.value)}
                    className="w-8 h-8 rounded border-2 border-white cursor-pointer"
                    title="Bojica"
                  />
                  <input 
                    type="range" 
                    min="1" 
                    max="10" 
                    value={drawSize} 
                    onChange={(e) => setDrawSize(Number(e.target.value))}
                    className="w-16 h-8"
                    title="Veličina olovke"
                  />
                  <button onClick={undoDraw} disabled={drawHistoryIndex <= 0} className={buttonClass} title="Undo">
                    <Undo2 className="w-5 h-5" />
                  </button>
                  <button onClick={redoDraw} disabled={drawHistoryIndex >= drawHistory.length - 1} className={buttonClass} title="Redo">
                    <Redo2 className="w-5 h-5" />
                  </button>
                  <button onClick={clearDraw} className={buttonClass} title="Obriši crtanje">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Highlighting */}
                <button
                  onClick={startHighlighting}
                  className={`${buttonClass} ${editMode === 'highlight' ? 'bg-yellow-100 ring-2 ring-yellow-500' : ''}`}
                  title="Označi tekst"
                >
                  <Highlighter className={`w-5 h-5 ${editMode === 'highlight' ? 'text-yellow-700' : ''}`} />
                </button>
                {editMode === 'highlight' && selectedText && (
                  <button
                    onClick={addHighlight}
                    className="px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600"
                    title="Dodaj highlight"
                  >
                    Dodaj
                  </button>
                )}

                {/* Notes */}
                <button
                  onClick={startAddingNote}
                  className={`${buttonClass} ${editMode === 'note' ? 'bg-blue-100 ring-2 ring-blue-500' : ''}`}
                  title="Dodaj napomenu"
                >
                  <StickyNote className={`w-5 h-5 ${editMode === 'note' ? 'text-blue-700' : ''}`} />
                </button>

                {/* Text overlay */}
                <button
                  onClick={startAddingText}
                  className={`${buttonClass} ${editMode === 'text' ? 'bg-green-100 ring-2 ring-green-500' : ''}`}
                  title="Dodaj tekst"
                >
                  <Type className={`w-5 h-5 ${editMode === 'text' ? 'text-green-700' : ''}`} />
                </button>

                {/* Save changes */}
                <button
                  onClick={saveChanges}
                  className="px-3 py-2 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                  title="Sačuvaj izmene"
                >
                  <Save className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* Bookmarks Panel */}
          {(() => {
            console.log('Bookmarks panel should render:', { showBookmarks, bookmarksCount: bookmarks.length });
            return null;
          })()}
          {showBookmarks && (
            <motion.div
              initial={{ opacity: 0, x: -300 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute top-4 left-4 z-10 w-80 bg-white/90 backdrop-blur-sm rounded-lg p-4 border border-gray-200"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Bookmark-ovi</h3>
                <button
                  onClick={handleSaveBookmark}
                  className="px-3 py-1 bg-green-500 text-white rounded text-xs hover:bg-green-600"
                >
                  Dodaj
                </button>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {bookmarks.map((bookmark) => (
                  <div key={bookmark.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <button
                      onClick={() => handleGoToBookmark(bookmark)}
                      className="text-left flex-1 hover:text-blue-600"
                    >
                      <div className="font-medium">{bookmark.title}</div>
                      <div className="text-xs text-gray-500">
                        {new Date(bookmark.timestamp).toLocaleString('sr-RS')}
                      </div>
                    </button>
                    <button
                      onClick={() => handleRemoveBookmark(bookmark.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {bookmarks.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    Nema bookmark-ova
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Close Button */}
          {(() => {
            console.log('Close button should render');
            return null;
          })()}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-3 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-lg hover:bg-white hover:shadow-lg transition-all duration-200 text-gray-700 hover:text-gray-900"
            title="Zatvori (ESC)"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation Arrows */}
          {(() => {
            console.log('Navigation arrows should render:', { hasPrevious, hasNext });
            return null;
          })()}
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
          {(() => {
            console.log('Content should render:', { loading, error, content: !!content });
            return null;
          })()}
          <div className="flex items-center justify-center w-full h-full p-4">
            {loading ? (
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
          {(() => {
            console.log('Pagination controls should render:', { loading, error, content: !!content, totalPages: content?.total_pages });
            return null;
          })()}
          {!loading && !error && content && content.total_pages > 1 && (
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
              <div className="flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-200">
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage <= 1}
                  className={`p-2 rounded ${currentPage <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <span className="text-sm font-medium">
                  Stranica {currentPage} od {content.total_pages}
                </span>
                
                <button
                  onClick={handleNextPage}
                  disabled={currentPage >= content.total_pages}
                  className={`p-2 rounded ${currentPage >= content.total_pages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-200'}`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* File Info */}
          {(() => {
            console.log('File info should render:', { content: !!content, filename: content?.filename });
            return null;
          })()}
          <div className="absolute bottom-4 left-4 z-10">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-200">
              <div className="text-sm text-gray-700 space-y-1">
                <div className="font-medium">{content?.filename || propFilename}</div>
                {content && (
                  <>
                    <div>Stranice: {content.total_pages}</div>
                    <div>Zoom: {Math.round(scale * 100)}%</div>
                    <div>Rotacija: {rotation}°</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* OCR Info */}
          {(() => {
            console.log('OCR info should render:', { ocrInfo: !!ocrInfo });
            return null;
          })()}
          {ocrInfo && (
            <div className="absolute bottom-4 right-4 z-10">
              <div className="bg-green-500/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-green-200">
                <div className="text-sm text-white space-y-1">
                  <div className="font-medium">OCR</div>
                  {ocrInfo.confidence && (
                    <div>Confidence: {ocrInfo.confidence.toFixed(1)}%</div>
                  )}
                  {ocrInfo.languages && (
                    <div>Jezici: {ocrInfo.languages.join(', ')}</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Edit Mode Info */}
          {(() => {
            console.log('Edit mode info should render:', { isEditing, editMode });
            return null;
          })()}
          {isEditing && (
            <div className="absolute bottom-4 right-4 z-10">
              <div className="bg-purple-500/80 backdrop-blur-sm rounded-lg px-4 py-2 border border-purple-200">
                <div className="text-sm text-white space-y-1">
                  <div className="font-medium">Edit Mode Aktivan</div>
                  {editMode === 'drawing' && <div>🎨 Crtanje - klikni i prevuci mišem</div>}
                  {editMode === 'highlight' && <div>🖍️ Označavanje teksta - selektuj tekst pa klikni "Dodaj"</div>}
                  {editMode === 'note' && <div>📝 Dodavanje napomena - klikni gde želiš napomenu</div>}
                  {editMode === 'text' && <div>✏️ Dodavanje teksta - klikni gde želiš tekst</div>}
                  {!editMode && <div>🔧 Izaberi alat iz toolbar-a</div>}
                </div>
              </div>
            </div>
          )}

          {/* Selected Text Actions */}
          {(() => {
            console.log('Selected text actions should render:', { selectedText: !!selectedText, selectedTextLength: selectedText?.length });
            return null;
          })()}
          {selectedText && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-10"
            >
              <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-lg p-2 border border-gray-200">
                <span className="text-sm text-gray-700 max-w-xs truncate">
                  "{selectedText}"
                </span>
                <button
                  onClick={handleCopySelected}
                  className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
                >
                  Kopiraj
                </button>
                <button
                  onClick={() => setSelectedText('')}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AdvancedDocumentPreview; 