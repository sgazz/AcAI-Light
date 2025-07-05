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
  Crop,
  Palette,
  PenTool,
  Type,
  Filter,
  Undo2,
  Redo2
} from 'lucide-react';

interface ImagePreviewProps {
  src: string;
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  hasNext?: boolean;
  hasPrevious?: boolean;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  src,
  alt = 'Image preview',
  isOpen,
  onClose,
  onNext,
  onPrevious,
  hasNext = false,
  hasPrevious = false
}) => {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isModalFullscreen, setIsModalFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  // Filter states
  const [filters, setFilters] = useState({
    grayscale: 0,
    sepia: 0,
    brightness: 1,
    contrast: 1
  });
  
  // Crop states
  const [isCropping, setIsCropping] = useState(false);
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDraggingCrop, setIsDraggingCrop] = useState(false);
  
  // Draw states
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawColor, setDrawColor] = useState('#ff0000');
  const [drawSize, setDrawSize] = useState(3);
  const [drawHistory, setDrawHistory] = useState<Array<{ x: number; y: number; color: string; size: number }>>([]);
  const [drawHistoryIndex, setDrawHistoryIndex] = useState(-1);
  
  // Text overlay states
  const [textOverlays, setTextOverlays] = useState<Array<{ id: string; text: string; x: number; y: number; color: string; size: number }>>([]);
  const [isAddingText, setIsAddingText] = useState(false);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset na ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isModalFullscreen) {
          setIsModalFullscreen(false);
        } else {
          onClose();
        }
      } else if (e.key === 'f' || e.key === 'F') {
        handleModalFullscreen();
      } else if (e.key === 'ArrowRight' && hasNext) {
        onNext?.();
      } else if (e.key === 'ArrowLeft' && hasPrevious) {
        onPrevious?.();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, onNext, onPrevious, hasNext, hasPrevious]);

  // Reset state kada se promeni slika
  useEffect(() => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
    setImageError(false);
    setImageLoading(true);
    setIsModalFullscreen(false); // Reset fullscreen kada se promeni slika
  }, [src]);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isDrawing) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      addDrawPoint(x, y);
    } else if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDrawing) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      addDrawPoint(x, y);
    } else if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(prev => Math.max(0.1, Math.min(5, prev * delta)));
  };

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = src;
    link.download = alt || 'image';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter functions
  const applyFilter = (filterType: string, value: number) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  };

  const resetFilters = () => {
    setFilters({ grayscale: 0, sepia: 0, brightness: 1, contrast: 1 });
  };

  // Crop functions
  const startCrop = () => {
    setIsCropping(true);
    setIsDrawing(false);
    setIsAddingText(false);
  };

  const applyCrop = () => {
    // Implementacija crop-a sa canvas API
    setIsCropping(false);
    setCropArea({ x: 0, y: 0, width: 0, height: 0 });
  };

  const cancelCrop = () => {
    setIsCropping(false);
    setCropArea({ x: 0, y: 0, width: 0, height: 0 });
  };

  // Draw functions
  const startDrawing = () => {
    setIsDrawing(true);
    setIsCropping(false);
    setIsAddingText(false);
  };

  const addDrawPoint = useCallback((x: number, y: number) => {
    if (!isDrawing) return;
    
    const newPoint = { x, y, color: drawColor, size: drawSize };
    setDrawHistory(prev => [...prev.slice(0, drawHistoryIndex + 1), newPoint]);
    setDrawHistoryIndex(prev => prev + 1);
  }, [isDrawing, drawColor, drawSize, drawHistoryIndex]);

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

  // Text overlay functions
  const addTextOverlay = (x: number, y: number) => {
    const newText = {
      id: Date.now().toString(),
      text: 'Novi tekst',
      x,
      y,
      color: '#ffffff',
      size: 16
    };
    setTextOverlays(prev => [...prev, newText]);
    setSelectedTextId(newText.id);
  };

  const updateTextOverlay = (id: string, updates: Partial<{ text: string; color: string; size: number }>) => {
    setTextOverlays(prev => prev.map(text => 
      text.id === id ? { ...text, ...updates } : text
    ));
  };

  const removeTextOverlay = (id: string) => {
    setTextOverlays(prev => prev.filter(text => text.id !== id));
    setSelectedTextId(null);
  };

  const buttonClass = `
    p-3 bg-gray-700/80 backdrop-blur-sm border border-gray-600 rounded-lg
    hover:bg-gray-600 hover:shadow-lg transition-all duration-200
    text-white hover:text-gray-100
  `;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className={`fixed inset-0 z-50 bg-black/80 flex items-center justify-center ${isModalFullscreen ? 'p-0' : 'p-4'}`}
          ref={containerRef}
        >
          <div className={`relative bg-white shadow-2xl flex items-center justify-center transition-all duration-300 ${
            isModalFullscreen 
              ? 'w-full h-full rounded-none' 
              : 'rounded-xl max-w-3xl w-auto h-auto max-h-[90vh]'
          }`}>
            {/* Kontrole u gornjem desnom uglu */}
            <div className="absolute top-2 right-2 z-10 flex gap-2">
              <button onClick={handleZoomOut} disabled={scale <= 0.1} className={buttonClass} title="Umanji (Ctrl -)"><ZoomOut className="w-5 h-5" /></button>
              <button onClick={handleZoomIn} disabled={scale >= 5} className={buttonClass} title="Uvećaj (Ctrl +)"><ZoomIn className="w-5 h-5" /></button>
              <button onClick={handleRotate} className={buttonClass} title="Rotiraj (R)"><RotateCcw className="w-5 h-5" /></button>
              <button onClick={handleReset} className={buttonClass} title="Resetuj (Ctrl 0)"><span className="text-sm font-medium">Reset</span></button>
              <button onClick={handleModalFullscreen} className={`${buttonClass} ${isModalFullscreen ? 'bg-blue-600 hover:bg-blue-700' : ''}`} title={isModalFullscreen ? "Izađi iz fullscreen-a (F)" : "Fullscreen modal (F)"}>
                {isModalFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button onClick={handleFullscreen} className={`${buttonClass} ${isFullscreen ? 'bg-green-600 hover:bg-green-700' : ''}`} title="Browser fullscreen">
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
              </button>
              <button onClick={handleDownload} className={buttonClass} title="Preuzmi"><Download className="w-5 h-5" /></button>
              <button onClick={onClose} className={buttonClass + ' !bg-red-600 hover:!bg-red-700 text-white'} title="Zatvori (ESC)"><X className="w-5 h-5" /></button>
            </div>

            {/* Toolbar za filtere i alate - na dnu */}
            <div className="absolute bottom-2 left-2 z-10 flex gap-2">
              {/* Filter dugmad */}
              <div className="flex gap-1">
                <button onClick={() => applyFilter('grayscale', filters.grayscale === 0 ? 1 : 0)} className={`${buttonClass} ${filters.grayscale > 0 ? 'bg-purple-600 hover:bg-purple-700' : ''}`} title="Grayscale">
                  <Filter className="w-5 h-5" />
                </button>
                <button onClick={() => applyFilter('sepia', filters.sepia === 0 ? 1 : 0)} className={`${buttonClass} ${filters.sepia > 0 ? 'bg-yellow-600 hover:bg-yellow-700' : ''}`} title="Sepia">
                  <Palette className="w-5 h-5" />
                </button>
                <button onClick={resetFilters} className={buttonClass} title="Resetuj filtere">
                  <Undo2 className="w-5 h-5" />
                </button>
              </div>

              {/* Crop dugme */}
              <button onClick={startCrop} className={`${buttonClass} ${isCropping ? 'bg-green-600 hover:bg-green-700' : ''}`} title="Crop">
                <Crop className="w-5 h-5" />
              </button>

              {/* Draw dugmad */}
              <div className="flex gap-1">
                <button onClick={startDrawing} className={`${buttonClass} ${isDrawing ? 'bg-red-600 hover:bg-red-700' : ''}`} title="Crtaj">
                  <PenTool className="w-5 h-5" />
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

              {/* Text overlay dugme */}
              <button onClick={() => setIsAddingText(!isAddingText)} className={`${buttonClass} ${isAddingText ? 'bg-blue-600 hover:bg-blue-700' : ''}`} title="Dodaj tekst">
                <Type className="w-5 h-5" />
              </button>
            </div>
            {/* Slika */}
            <div className="flex items-center justify-center w-full h-full">
              {imageLoading && (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
                  <span className="ml-3 text-black">Učitavanje slike...</span>
                </div>
              )}
              <div className="relative">
                <motion.img
                  ref={imageRef}
                  src={src}
                  alt={alt}
                  className={`object-contain select-none ${imageLoading ? 'hidden' : ''} ${
                    isModalFullscreen ? 'max-w-full max-h-full' : 'max-w-full max-h-[80vh]'
                  }`}
                  style={{
                    transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
                    transformOrigin: 'center',
                    transition: isDragging ? 'none' : 'transform 0.1s ease-out',
                    filter: `grayscale(${filters.grayscale}) sepia(${filters.sepia}) brightness(${filters.brightness}) contrast(${filters.contrast})`
                  }}
                  drag={scale > 1}
                  dragConstraints={containerRef}
                  dragElastic={0.1}
                  onLoad={() => {
                    setImageLoading(false);
                    setImageError(false);
                  }}
                  onError={() => {
                    setImageLoading(false);
                    setImageError(true);
                  }}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onWheel={handleWheel}
                  onClick={(e) => {
                    if (isAddingText) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const x = e.clientX - rect.left;
                      const y = e.clientY - rect.top;
                      addTextOverlay(x, y);
                    }
                  }}
                />

                {/* Crop overlay */}
                {isCropping && (
                  <div 
                    className="absolute inset-0 border-2 border-blue-500 border-dashed cursor-crosshair"
                    style={{
                      left: cropArea.x,
                      top: cropArea.y,
                      width: cropArea.width,
                      height: cropArea.height
                    }}
                  />
                )}

                {/* Draw overlay */}
                <svg 
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
                    transformOrigin: 'center'
                  }}
                >
                  {drawHistory.slice(0, drawHistoryIndex + 1).map((point, index) => (
                    <circle
                      key={index}
                      cx={point.x}
                      cy={point.y}
                      r={point.size}
                      fill={point.color}
                    />
                  ))}
                </svg>

                {/* Text overlays */}
                {textOverlays.map((textOverlay) => (
                  <div
                    key={textOverlay.id}
                    className={`absolute cursor-pointer ${selectedTextId === textOverlay.id ? 'ring-2 ring-blue-500' : ''}`}
                    style={{
                      left: textOverlay.x,
                      top: textOverlay.y,
                      color: textOverlay.color,
                      fontSize: `${textOverlay.size}px`,
                      transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
                      transformOrigin: 'center'
                    }}
                    onClick={() => setSelectedTextId(textOverlay.id)}
                  >
                    {selectedTextId === textOverlay.id ? (
                      <input
                        type="text"
                        value={textOverlay.text}
                        onChange={(e) => updateTextOverlay(textOverlay.id, { text: e.target.value })}
                        className="bg-transparent border-none outline-none"
                        style={{ color: textOverlay.color, fontSize: `${textOverlay.size}px` }}
                        autoFocus
                      />
                    ) : (
                      <span>{textOverlay.text}</span>
                    )}
                    {selectedTextId === textOverlay.id && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTextOverlay(textOverlay.id);
                        }}
                        className="ml-2 text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {imageError && (
                <div className="flex flex-col items-center justify-center text-red-600 mt-4">
                  <div className="text-6xl mb-2">❌</div>
                  <div className="text-base font-bold mb-1">Greška pri učitavanju slike</div>
                  <div className="text-xs break-all max-w-md">{src}</div>
                </div>
              )}
            </div>
            {/* Zoom info bottom right */}
            <div className="absolute bottom-2 right-2 z-10 bg-gray-800/90 text-white rounded-lg px-3 py-1 text-xs">
              {Math.round(scale * 100)}% | Rotacija: {rotation}° {isModalFullscreen && '| Fullscreen'}
              {isDrawing && ' | Crtanje'}
              {isCropping && ' | Crop'}
              {isAddingText && ' | Tekst'}
            </div>

            {/* Crop controls */}
            {isCropping && (
              <div className="absolute bottom-2 left-2 z-10 flex gap-2 ml-64">
                <button onClick={applyCrop} className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-semibold">
                  Primeni Crop
                </button>
                <button onClick={cancelCrop} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold">
                  Otkaži
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImagePreview; 