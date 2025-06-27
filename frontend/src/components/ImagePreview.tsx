'use client';

import { useState, useRef, useEffect } from 'react';
import { FaTimes, FaDownload, FaEye, FaEyeSlash, FaImage } from 'react-icons/fa';
import { useErrorToast } from './ErrorToastProvider';

interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  confidence: number;
}

interface ImagePreviewProps {
  imageUrl: string;
  ocrResult: Record<string, unknown> | undefined;
  filename: string;
  onClose: () => void;
}

export default function ImagePreview({ imageUrl, ocrResult, filename, onClose }: ImagePreviewProps) {
  const [showBoxes, setShowBoxes] = useState(true);
  const [selectedBox, setSelectedBox] = useState<BoundingBox | null>(null);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const { showError, showSuccess } = useErrorToast();

  useEffect(() => {
    if (canvasRef.current && imageRef.current && ocrResult?.boxes) {
      drawBoundingBoxes();
    }
  }, [ocrResult, showBoxes, zoom]);

  const drawBoundingBoxes = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !ocrResult) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showBoxes) return;

    // Parse bounding boxes from OCR result
    const boxes = parseBoundingBoxes(ocrResult.boxes as string);
    
    boxes.forEach((box) => {
      const x = box.x * zoom;
      const y = box.y * zoom;
      const width = box.width * zoom;
      const height = box.height * zoom;

      // Draw bounding box
      ctx.strokeStyle = box.confidence > 80 ? '#00ff00' : box.confidence > 60 ? '#ffff00' : '#ff0000';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, width, height);

      // Draw text background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      ctx.fillRect(x, y - 20, ctx.measureText(box.text).width + 10, 20);

      // Draw text
      ctx.fillStyle = '#ffffff';
      ctx.font = '12px Arial';
      ctx.fillText(box.text, x + 5, y - 5);
    });
  };

  const parseBoundingBoxes = (boxesData: string): BoundingBox[] => {
    // Tesseract format: char left bottom right top page
    const lines = boxesData.split('\n');
    const boxes: BoundingBox[] = [];
    
    lines.forEach(line => {
      const parts = line.trim().split(' ');
      if (parts.length >= 6) {
        const char = parts[0];
        const left = parseInt(parts[1]);
        const bottom = parseInt(parts[2]);
        const right = parseInt(parts[3]);
        const top = parseInt(parts[4]);
        
        boxes.push({
          x: left,
          y: top,
          width: right - left,
          height: bottom - top,
          text: char,
          confidence: 85 // Default confidence
        });
      }
    });
    
    return boxes;
  };

  const exportResults = (format: 'txt' | 'json' | 'csv') => {
    if (!ocrResult) {
      showError('Nema OCR rezultata za export', 'Greška exporta');
      return;
    }
    
    try {
      let content = '';
      let exportFilename = `ocr_result_${Date.now()}`;
      
      switch (format) {
        case 'txt':
          content = (ocrResult.text as string) || '';
          exportFilename += '.txt';
          break;
        case 'json':
          content = JSON.stringify(ocrResult, null, 2);
          exportFilename += '.json';
          break;
        case 'csv':
          content = 'Text,Confidence,X,Y,Width,Height\n';
          if (ocrResult.boxes) {
            const boxes = parseBoundingBoxes(ocrResult.boxes as string);
            boxes.forEach(box => {
              content += `"${box.text}",${box.confidence},${box.x},${box.y},${box.width},${box.height}\n`;
            });
          }
          exportFilename += '.csv';
          break;
      }
      
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportFilename;
      a.click();
      URL.revokeObjectURL(url);
      
      showSuccess(`OCR rezultat uspešno exportovan u ${format.toUpperCase()} formatu`, 'Export uspešan');
    } catch (error: any) {
      showError(
        `Greška pri exportu u ${format.toUpperCase()} format: ${error.message}`,
        'Greška exporta',
        true,
        () => exportResults(format)
      );
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'success':
        return 'text-[var(--accent-green)]';
      case 'low_confidence':
        return 'text-[var(--accent-yellow)]';
      case 'error':
        return 'text-[var(--accent-red)]';
      default:
        return 'text-[var(--text-muted)]';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'success':
        return 'Uspešno';
      case 'low_confidence':
        return 'Niska pouzdanost';
      case 'error':
        return 'Greška';
      default:
        return 'Nepoznato';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-tertiary)] rounded-xl max-w-6xl w-full h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-3">
            <div className="text-[var(--accent-blue)]"><FaImage size={24} /></div>
            <div>
              <h2 className="text-xl font-bold text-[var(--text-primary)]">{filename}</h2>
              <p className="text-sm text-[var(--text-secondary)]">OCR rezultat sa bounding boxovima</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowBoxes(!showBoxes)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                showBoxes
                  ? 'bg-[var(--accent-blue)] text-[var(--text-primary)]'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              {showBoxes ? 'Sakrij boxove' : 'Prikaži boxove'}
            </button>
            <button
              onClick={() => setZoom(Math.min(zoom + 0.2, 3))}
              className="px-3 py-1 bg-[var(--accent-blue)] text-[var(--text-primary)] rounded hover:bg-[var(--accent-blue)]/80"
            >
              +
            </button>
            <button
              onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))}
              className="px-3 py-1 bg-[var(--accent-blue)] text-[var(--text-primary)] rounded hover:bg-[var(--accent-blue)]/80"
            >
              -
            </button>
            <button
              onClick={() => exportResults('txt')}
              className="px-3 py-1 bg-[var(--accent-green)] text-[var(--text-primary)] rounded hover:bg-[var(--accent-green)]/80 flex items-center gap-1"
            >
              <FaDownload size={14} />
              TXT
            </button>
            <button
              onClick={() => exportResults('json')}
              className="px-3 py-1 bg-[var(--accent-green)] text-[var(--text-primary)] rounded hover:bg-[var(--accent-green)]/80 flex items-center gap-1"
            >
              <FaDownload size={14} />
              JSON
            </button>
            <button
              onClick={() => exportResults('csv')}
              className="px-3 py-1 bg-[var(--accent-green)] text-[var(--text-primary)] rounded hover:bg-[var(--accent-green)]/80 flex items-center gap-1"
            >
              <FaDownload size={14} />
              CSV
            </button>
            <button
              onClick={onClose}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] rounded-lg transition-colors"
              title="Zatvori"
            >
              <FaTimes size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex">
          {/* Image Section */}
          <div className="flex-1 p-6 overflow-auto">
            <div className="relative inline-block">
              <img
                src={imageUrl}
                alt={filename}
                className="max-w-full h-auto rounded-lg shadow-lg"
                onLoad={drawBoundingBoxes}
                ref={imageRef}
              />
              
              {/* Bounding Boxes Overlay */}
              {showBoxes && imageRef.current && ocrResult && typeof ocrResult.boxes === 'string' && (
                <div className="absolute top-0 left-0 w-full h-full">
                  {parseBoundingBoxes(ocrResult.boxes).map((box, index) => (
                    <div
                      key={index}
                      className="absolute border-2 border-[var(--accent-green)] bg-[var(--accent-green)]/20 cursor-pointer hover:bg-[var(--accent-green)]/40 transition-colors"
                      style={{
                        left: `${box.x * zoom}%`,
                        top: `${box.y * zoom}%`,
                        width: `${box.width * zoom}%`,
                        height: `${box.height * zoom}%`
                      }}
                      onClick={() => setSelectedBox(box)}
                      title={`Klikni za detalje: ${box.text}`}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* OCR Results Section */}
          <div className="w-96 border-l border-[var(--border-color)] flex flex-col">
            <div className="p-4 border-b border-[var(--border-color)]">
              <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">OCR Rezultat</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <span className="font-medium text-[var(--text-secondary)]">Confidence:</span>
                  <span className="ml-2 text-[var(--accent-green)]">
                    {ocrResult && typeof ocrResult.confidence === 'number' ? ocrResult.confidence.toFixed(1) : 'N/A'}%
                  </span>
                </div>
                {ocrResult?.languages && Array.isArray(ocrResult.languages) && (
                  <div>
                    <span className="font-medium text-[var(--text-secondary)]">Jezici:</span>
                    <span className="ml-2 text-[var(--text-primary)]">
                      {(ocrResult.languages as string[]).join(', ')}
                    </span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-[var(--text-secondary)]">Status:</span>
                  <span className={`ml-2 ${getStatusColor(typeof ocrResult?.status === 'string' ? ocrResult.status : undefined)}`}>
                    {getStatusText(typeof ocrResult?.status === 'string' ? ocrResult.status : undefined)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {selectedBox ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-md font-semibold text-[var(--text-primary)]">Izabrani tekst</h4>
                    <button
                      onClick={() => setSelectedBox(null)}
                      className="text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    >
                      <FaTimes size={14} />
                    </button>
                  </div>
                  <div className="bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border-color)]">
                    <p className="text-[var(--text-primary)] font-medium mb-2">{selectedBox.text}</p>
                    <div className="text-xs text-[var(--text-secondary)] space-y-1">
                      <div>Pouzdanost: {selectedBox.confidence?.toFixed(1)}%</div>
                      <div>Pozicija: ({selectedBox.x.toFixed(1)}%, {selectedBox.y.toFixed(1)}%)</div>
                      <div>Veličina: {selectedBox.width.toFixed(1)}% × {selectedBox.height.toFixed(1)}%</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className="text-md font-semibold text-[var(--text-primary)]">Svi pronađeni tekstovi</h4>
                  {ocrResult?.boxes && typeof ocrResult.boxes === 'string' && parseBoundingBoxes(ocrResult.boxes as string).map((box, index) => (
                    <div
                      key={index}
                      className="bg-[var(--bg-secondary)] rounded-lg p-3 border border-[var(--border-color)] cursor-pointer hover:border-[var(--accent-blue)] transition-colors"
                      onClick={() => setSelectedBox(box)}
                    >
                      <p className="text-[var(--text-primary)] text-sm mb-1">{box.text}</p>
                      <div className="text-xs text-[var(--text-secondary)]">
                        Pouzdanost: {box.confidence?.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 