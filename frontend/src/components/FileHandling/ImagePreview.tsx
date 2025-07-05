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
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center"
          ref={containerRef}
        >
          <div className="relative bg-white rounded-xl max-w-3xl w-auto h-auto max-h-[90vh] shadow-2xl flex items-center justify-center">
            {/* Kontrole u gornjem desnom uglu */}
            <div className="absolute top-2 right-2 z-10 flex gap-2">
              <button onClick={handleZoomOut} disabled={scale <= 0.1} className={buttonClass} title="Umanji (Ctrl -)"><ZoomOut className="w-5 h-5" /></button>
              <button onClick={handleZoomIn} disabled={scale >= 5} className={buttonClass} title="Uvećaj (Ctrl +)"><ZoomIn className="w-5 h-5" /></button>
              <button onClick={handleRotate} className={buttonClass} title="Rotiraj (R)"><RotateCcw className="w-5 h-5" /></button>
              <button onClick={handleReset} className={buttonClass} title="Resetuj (Ctrl 0)"><span className="text-sm font-medium">Reset</span></button>
              <button onClick={handleDownload} className={buttonClass} title="Preuzmi"><Download className="w-5 h-5" /></button>
              <button onClick={onClose} className={buttonClass + ' !bg-red-600 hover:!bg-red-700 text-white'} title="Zatvori (ESC)"><X className="w-5 h-5" /></button>
            </div>
            {/* Slika */}
            <div className="flex items-center justify-center w-full h-full">
              {imageLoading && (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-400"></div>
                  <span className="ml-3 text-black">Učitavanje slike...</span>
                </div>
              )}
              <motion.img
                ref={imageRef}
                src={src}
                alt={alt}
                className={`max-w-full max-h-[80vh] object-contain select-none ${imageLoading ? 'hidden' : ''}`}
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
              {Math.round(scale * 100)}% | Rotacija: {rotation}°
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImagePreview; 