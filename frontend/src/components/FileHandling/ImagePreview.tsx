'use client';

import React, { useState, useRef, useEffect } from 'react';
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
  ArrowRight
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
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset na ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
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

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
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
          className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          ref={containerRef}
        >
          <div className="bg-white rounded-xl max-w-7xl w-full h-[95vh] flex flex-col relative overflow-hidden">
          {/* Header Controls */}
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="flex items-center space-x-2 bg-gray-800/90 backdrop-blur-sm rounded-lg p-2 border border-gray-600">
              <button
                onClick={handleZoomOut}
                disabled={scale <= 0.1}
                className={`${buttonClass} ${scale <= 0.1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Umanji (Ctrl -)"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleZoomIn}
                disabled={scale >= 5}
                className={`${buttonClass} ${scale >= 5 ? 'opacity-50 cursor-not-allowed' : ''}`}
                title="Uvećaj (Ctrl +)"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleRotate}
                className={buttonClass}
                title="Rotiraj (R)"
              >
                <RotateCcw className="w-5 h-5" />
              </button>
              
              <button
                onClick={handleReset}
                className={buttonClass}
                title="Resetuj (Ctrl 0)"
              >
                <span className="text-sm font-medium">Reset</span>
              </button>
              
              <button
                onClick={handleFullscreen}
                className={buttonClass}
                title={isFullscreen ? "Izađi iz fullscreen" : "Fullscreen (F)"}
              >
                {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
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

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-3 bg-gray-800/90 backdrop-blur-sm border border-gray-600 rounded-lg hover:bg-gray-700 hover:shadow-lg transition-all duration-200 text-white hover:text-gray-100"
            title="Zatvori (ESC)"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation Arrows */}
          {hasPrevious && (
            <button
              onClick={onPrevious}
              className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10 p-4 bg-gray-800/90 backdrop-blur-sm border border-gray-600 rounded-lg hover:bg-gray-700 hover:shadow-lg transition-all duration-200 text-white hover:text-gray-100"
              title="Prethodna slika (←)"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
          )}

          {hasNext && (
            <button
              onClick={onNext}
              className="absolute right-4 top-1/2 transform -translate-y-1/2 z-10 p-4 bg-gray-800/90 backdrop-blur-sm border border-gray-600 rounded-lg hover:bg-gray-700 hover:shadow-lg transition-all duration-200 text-white hover:text-gray-100"
              title="Sledeća slika (→)"
            >
              <ArrowRight className="w-6 h-6" />
            </button>
          )}

          {/* Image Container */}
          <div
            className="flex items-center justify-center w-full h-full p-4"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={{ cursor: isDragging ? 'grabbing' : scale > 1 ? 'grab' : 'default' }}
          >
            {imageLoading && (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                <span className="ml-3 text-white">Učitavanje slike...</span>
              </div>
            )}
            
            {imageError && (
              <div className="flex flex-col items-center justify-center text-white">
                <div className="text-6xl mb-4">❌</div>
                <h3 className="text-lg font-bold mb-2">Greška pri učitavanju slike</h3>
                <p className="text-sm opacity-75 mb-4">Nije moguće učitati sliku sa URL-a:</p>
                <p className="text-xs opacity-50 break-all max-w-md">{src}</p>
                <button
                  onClick={() => {
                    setImageError(false);
                    setImageLoading(true);
                    if (imageRef.current) {
                      imageRef.current.src = src;
                    }
                  }}
                  className="mt-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                >
                  Pokušaj ponovo
                </button>
              </div>
            )}
            
            <motion.img
              ref={imageRef}
              src={src}
              alt={alt}
              className={`max-w-full max-h-full object-contain select-none ${imageLoading ? 'hidden' : ''}`}
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x}px, ${position.y}px)`,
                transformOrigin: 'center',
                transition: isDragging ? 'none' : 'transform 0.1s ease-out'
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
            />
          </div>

          {/* Zoom Info */}
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-600">
              <span className="text-sm font-medium text-white">
                {Math.round(scale * 100)}% | Rotacija: {rotation}°
              </span>
            </div>
          </div>

          {/* Keyboard Shortcuts Info */}
          <div className="absolute bottom-4 right-4 z-10">
            <div className="bg-gray-800/90 backdrop-blur-sm rounded-lg px-4 py-2 border border-gray-600">
              <div className="text-xs text-gray-300 space-y-1">
                <div>ESC - Zatvori</div>
                <div>← → - Navigacija</div>
                <div>Scroll - Zoom</div>
                <div>F - Fullscreen</div>
              </div>
            </div>
          </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImagePreview; 