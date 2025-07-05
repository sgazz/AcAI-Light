import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaMagic, FaTimes, FaLanguage, FaCheck, FaExclamationTriangle } from 'react-icons/fa';

interface OcrPreviewModalProps {
  ocrModal: { ocr: Record<string, any> | undefined, doc: any, rect?: DOMRect };
  onClose: () => void;
}

const modalW = 600;
const modalH = 480;

const OcrPreviewModal: React.FC<OcrPreviewModalProps> = ({ ocrModal, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  // Izračunaj centar ekrana
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 1080;
  const centerX = vw / 2 - modalW / 2;
  const centerY = vh / 2 - modalH / 2;

  // Početna animacija iz dugmeta
  const rect = ocrModal.rect;
  let initial = { scale: 0.5, x: 0, y: 0, opacity: 0 };
  if (rect) {
    const btnCenterX = rect.left + rect.width / 2;
    const btnCenterY = rect.top + rect.height / 2;
    const modalCenterX = centerX + modalW / 2;
    const modalCenterY = centerY + modalH / 2;
    initial = {
      scale: rect.width / modalW,
      x: btnCenterX - modalCenterX,
      y: btnCenterY - modalCenterY,
      opacity: 0
    };
  }
  const animate = { scale: 1, x: 0, y: 0, opacity: 1, transition: { type: "spring" as const, stiffness: 200, damping: 25 } };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={initial}
        animate={animate}
        exit={{ opacity: 0, scale: 0.5, transition: { duration: 0.2 } }}
        style={{ position: 'fixed', zIndex: 9999, top: centerY, left: centerX, width: modalW, height: modalH }}
        className="shadow-2xl"
        ref={modalRef}
      >
        <div className="bg-gradient-to-br from-white/80 via-slate-100/90 to-blue-100/80 backdrop-blur-2xl rounded-2xl shadow-2xl w-full h-full max-w-full max-h-[90vh] flex flex-col border border-blue-200/40">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-blue-200/30 bg-white/60 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <FaMagic className="text-blue-400" size={20} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-blue-900">OCR rezultat - {ocrModal.doc.filename}</h2>
                <p className="text-sm text-blue-600">Tekst prepoznat iz slike</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-100/60 rounded-lg transition-colors"
              title="Zatvori"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* OCR Info */}
          <div className="p-4 border-b border-blue-200/30 bg-blue-50/40 flex flex-wrap gap-4 items-center">
            {ocrModal.ocr && typeof ocrModal.ocr === 'object' && 'confidence' in ocrModal.ocr && typeof ocrModal.ocr.confidence === 'number' && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-200/60 text-blue-900 font-semibold text-xs">
                <FaMagic className="text-blue-400" size={14} />
                Pouzdanost: {ocrModal.ocr.confidence.toFixed(1)}%
              </span>
            )}
            {ocrModal.ocr && typeof ocrModal.ocr === 'object' && 'languages' in ocrModal.ocr && Array.isArray(ocrModal.ocr.languages) && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-200/60 text-green-900 font-semibold text-xs">
                <FaLanguage className="text-green-400" size={14} />
                Jezici: {ocrModal.ocr.languages.join(', ')}
              </span>
            )}
            {ocrModal.ocr && typeof ocrModal.ocr === 'object' && 'status' in ocrModal.ocr && typeof ocrModal.ocr.status === 'string' && (
              <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full font-semibold text-xs ${ocrModal.ocr.status === 'success' ? 'bg-emerald-200/60 text-emerald-900' : 'bg-yellow-200/60 text-yellow-900'}`}>
                <FaCheck className="text-emerald-400" size={14} />
                Status: {ocrModal.ocr.status}
              </span>
            )}
            {ocrModal.ocr && typeof ocrModal.ocr === 'object' && 'message' in ocrModal.ocr && typeof ocrModal.ocr.message === 'string' && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-200/60 text-yellow-900 font-semibold text-xs">
                <FaExclamationTriangle className="text-yellow-400" size={14} />
                {ocrModal.ocr.message}
              </span>
            )}
          </div>

          {/* OCR Text Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="bg-white/80 rounded-lg p-4 shadow-inner flex flex-col gap-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-blue-900">Prepoznati tekst:</h3>
                <button
                  onClick={() => {
                    if (ocrModal.ocr && typeof ocrModal.ocr === 'object' && 'text' in ocrModal.ocr && typeof ocrModal.ocr.text === 'string') {
                      navigator.clipboard.writeText(ocrModal.ocr.text);
                    }
                  }}
                  className="px-3 py-1 bg-blue-200/60 hover:bg-blue-300/80 text-blue-900 rounded-lg text-xs font-semibold transition-colors"
                >
                  Kopiraj tekst
                </button>
              </div>
              <div className="text-blue-900 whitespace-pre-line leading-relaxed text-sm max-h-40 overflow-y-auto font-mono bg-blue-50/60 rounded p-3">
                {ocrModal.ocr && typeof ocrModal.ocr === 'object' && 'text' in ocrModal.ocr && typeof ocrModal.ocr.text === 'string' 
                  ? ocrModal.ocr.text 
                  : 'Nema prepoznatog teksta'}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default OcrPreviewModal; 