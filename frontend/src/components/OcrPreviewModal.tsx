import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaMagic, FaTimes, FaLanguage, FaCheck, FaExclamationTriangle, FaBolt, FaDatabase, FaChartLine, FaTrash, FaCog, FaPlay, FaPause } from 'react-icons/fa';
import { extractTextAsync, extractTextAdvanced, getOcrPerformanceStats, clearOcrCache } from '../utils/api';
import { useErrorToast } from './ErrorToastProvider';

interface OcrPreviewModalProps {
  ocrModal: { ocr: Record<string, any> | undefined, doc: any, rect?: DOMRect };
  onClose: () => void;
}

const modalW = 700;
const modalH = 600;

const OcrPreviewModal: React.FC<OcrPreviewModalProps> = ({ ocrModal, onClose }) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [performanceStats, setPerformanceStats] = useState<any>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState({
    languages: 'srp+eng',
    useCache: true,
    adaptivePreprocessing: true
  });
  
  const { showError, showSuccess, showWarning } = useErrorToast();
  
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

  useEffect(() => {
    // Učitaj performance statistike
    loadPerformanceStats();
  }, []);

  const loadPerformanceStats = async () => {
    try {
      const stats = await getOcrPerformanceStats();
      if (stats.status === 'success') {
        setPerformanceStats(stats);
      }
    } catch (error) {
      console.error('Greška pri učitavanju performance statistika:', error);
    }
  };

  const reprocessImage = async () => {
    if (!ocrModal.doc || !ocrModal.doc.file) {
      showError('Nema fajla za reprocessing', 'Greška');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);

    try {
      // Simuliraj progress
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const result = await extractTextAdvanced(ocrModal.doc.file, advancedOptions);
      
      clearInterval(progressInterval);
      setProcessingProgress(100);

      if (result.status === 'success') {
        // Ažuriraj modal sa novim rezultatom
        const updatedOcr = {
          ...ocrModal.ocr,
          text: result.text,
          confidence: result.confidence,
          processing_time: result.processing_time,
          from_cache: result.from_cache
        };
        
        // Ovo bi trebalo da ažurira parent komponentu
        showSuccess('OCR reprocessing uspešan', 'Uspeh');
        
        // Reload performance stats
        await loadPerformanceStats();
      } else {
        throw new Error(result.message || 'Greška pri reprocessing-u');
      }
    } catch (error: any) {
      showError(`Greška pri reprocessing-u: ${error.message}`, 'Greška');
    } finally {
      setIsProcessing(false);
      setProcessingProgress(0);
    }
  };

  const clearCache = async () => {
    try {
      const result = await clearOcrCache(24);
      if (result.status === 'success') {
        showSuccess(`Cache očišćen. Obrisano ${result.cleared_count} fajlova.`, 'Cache');
        await loadPerformanceStats();
      } else {
        throw new Error(result.message || 'Greška pri čišćenju cache-a');
      }
    } catch (error: any) {
      showError(`Greška pri čišćenju cache-a: ${error.message}`, 'Greška');
    }
  };

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
                <p className="text-sm text-blue-600">Optimizovana tekst ekstrakcija</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
                className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-100/60 rounded-lg transition-colors"
                title="Napredne opcije"
              >
                <FaCog size={16} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-100/60 rounded-lg transition-colors"
                title="Zatvori"
              >
                <FaTimes size={20} />
              </button>
            </div>
          </div>

          {/* Advanced Options */}
          {showAdvancedOptions && (
            <div className="p-4 border-b border-blue-200/30 bg-blue-50/40">
              <h3 className="text-sm font-bold text-blue-900 mb-3">Napredne opcije</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">Jezici</label>
                  <select
                    value={advancedOptions.languages}
                    onChange={(e) => setAdvancedOptions(prev => ({ ...prev, languages: e.target.value }))}
                    className="w-full px-3 py-1 text-sm border border-blue-200 rounded-lg bg-white/80"
                  >
                    <option value="srp+eng">Srpski + Engleski</option>
                    <option value="srp">Samo Srpski</option>
                    <option value="eng">Samo Engleski</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">Cache</label>
                  <select
                    value={advancedOptions.useCache.toString()}
                    onChange={(e) => setAdvancedOptions(prev => ({ ...prev, useCache: e.target.value === 'true' }))}
                    className="w-full px-3 py-1 text-sm border border-blue-200 rounded-lg bg-white/80"
                  >
                    <option value="true">Omogućen</option>
                    <option value="false">Onemogućen</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-blue-700 mb-1">Adaptive Preprocessing</label>
                  <select
                    value={advancedOptions.adaptivePreprocessing.toString()}
                    onChange={(e) => setAdvancedOptions(prev => ({ ...prev, adaptivePreprocessing: e.target.value === 'true' }))}
                    className="w-full px-3 py-1 text-sm border border-blue-200 rounded-lg bg-white/80"
                  >
                    <option value="true">Omogućen</option>
                    <option value="false">Onemogućen</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={reprocessImage}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  {isProcessing ? <FaPause size={12} /> : <FaPlay size={12} />}
                  {isProcessing ? 'Procesiranje...' : 'Reprocess'}
                </button>
                <button
                  onClick={clearCache}
                  className="flex items-center gap-2 px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <FaTrash size={12} />
                  Očisti Cache
                </button>
              </div>
            </div>
          )}

          {/* Processing Progress */}
          {isProcessing && (
            <div className="p-4 border-b border-blue-200/30 bg-blue-50/40">
              <div className="flex items-center gap-3">
                <FaBolt className="text-blue-400" size={16} />
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-blue-700 mb-1">
                    <span>Procesiranje OCR-a...</span>
                    <span>{processingProgress}%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${processingProgress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Performance Stats */}
          {performanceStats && (
            <div className="p-4 border-b border-blue-200/30 bg-green-50/40">
              <div className="flex items-center gap-2 mb-2">
                <FaChartLine className="text-green-400" size={14} />
                <span className="text-xs font-bold text-green-700">Performance Statistike</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                <div>
                  <div className="text-green-600 font-medium">Cache Hit Rate</div>
                  <div className="text-green-800 font-bold">{performanceStats.performance?.cache_hit_rate || 0}%</div>
                </div>
                <div>
                  <div className="text-green-600 font-medium">Avg Time</div>
                  <div className="text-green-800 font-bold">{performanceStats.performance?.avg_processing_time || 0}s</div>
                </div>
                <div>
                  <div className="text-green-600 font-medium">Total Processed</div>
                  <div className="text-green-800 font-bold">{performanceStats.performance?.total_processed || 0}</div>
                </div>
                <div>
                  <div className="text-green-600 font-medium">Cache Size</div>
                  <div className="text-green-800 font-bold">{performanceStats.cache?.cache_size_mb?.toFixed(2) || 0} MB</div>
                </div>
              </div>
            </div>
          )}

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
            {ocrModal.ocr && typeof ocrModal.ocr === 'object' && 'processing_time' in ocrModal.ocr && typeof ocrModal.ocr.processing_time === 'number' && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-200/60 text-purple-900 font-semibold text-xs">
                <FaBolt className="text-purple-400" size={14} />
                Vreme: {ocrModal.ocr.processing_time.toFixed(2)}s
              </span>
            )}
            {ocrModal.ocr && typeof ocrModal.ocr === 'object' && 'from_cache' in ocrModal.ocr && ocrModal.ocr.from_cache && (
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-200/60 text-yellow-900 font-semibold text-xs">
                <FaDatabase className="text-yellow-400" size={14} />
                Iz Cache-a
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
                      showSuccess('Tekst kopiran u clipboard', 'Kopiranje');
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