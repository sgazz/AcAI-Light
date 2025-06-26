'use client';

import { useState, useRef, useEffect } from 'react';
import { FaTimes, FaDownload, FaEye, FaEyeSlash } from 'react-icons/fa';
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-[#1a2236] rounded-xl p-6 max-w-6xl max-h-[90vh] overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">{filename}</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBoxes(!showBoxes)}
              className="px-3 py-1 bg-gray-700 text-white rounded hover:bg-gray-600 flex items-center gap-1"
            >
              {showBoxes ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
              {showBoxes ? 'Sakrij boxove' : 'Prikaži boxove'}
            </button>
            <button
              onClick={() => setZoom(Math.min(zoom + 0.2, 3))}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              +
            </button>
            <button
              onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              -
            </button>
            <button
              onClick={() => exportResults('txt')}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
            >
              <FaDownload size={14} />
              TXT
            </button>
            <button
              onClick={() => exportResults('json')}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
            >
              <FaDownload size={14} />
              JSON
            </button>
            <button
              onClick={() => exportResults('csv')}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 flex items-center gap-1"
            >
              <FaDownload size={14} />
              CSV
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
            >
              <FaTimes size={14} />
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <div className="relative overflow-auto border border-gray-600 rounded">
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 pointer-events-none"
                style={{ transform: `scale(${zoom})` }}
              />
              <img
                ref={imageRef}
                src={imageUrl}
                alt={filename}
                className="max-w-full h-auto"
                style={{ transform: `scale(${zoom})` }}
                onLoad={drawBoundingBoxes}
              />
            </div>
          </div>

          <div className="w-80">
            <div className="bg-[#151c2c] rounded-lg p-4">
              <h4 className="text-white font-semibold mb-3">OCR Rezultat</h4>
              
              <div className="space-y-3">
                <div>
                  <label className="text-gray-400 text-sm">Confidence:</label>
                  <div className="text-white">
                    {ocrResult ? (ocrResult.confidence as number)?.toFixed(1) : 'N/A'}%
                  </div>
                </div>
                
                <div>
                  <label className="text-gray-400 text-sm">Jezici:</label>
                  <div className="text-white">
                    {ocrResult ? (ocrResult.languages as string[])?.join(', ') : 'N/A'}
                  </div>
                </div>
                
                <div>
                  <label className="text-gray-400 text-sm">Prepoznati tekst:</label>
                  <div className="text-white text-sm max-h-40 overflow-y-auto bg-gray-800 p-2 rounded">
                    {ocrResult ? (ocrResult.text as string) || 'Nema prepoznatog teksta' : 'Nema OCR rezultata'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 