'use client';

import { FaExternalLinkAlt } from 'react-icons/fa';
import { getFileIcon } from '../utils/fileUtils';

interface Source {
  filename: string;
  page: number;
  score: number;
  content: string;
  rerank_score?: number;
  original_score?: number;
}

interface SourcesDisplayProps {
  sources: Source[];
  isVisible: boolean;
}

export default function SourcesDisplay({ sources, isVisible }: SourcesDisplayProps) {
  if (!isVisible || sources.length === 0) {
    return null;
  }

  const formatScore = (score: number) => {
    return Math.round(score * 100);
  };

  const getFileIconForSource = (filename: string) => {
    const extension = '.' + filename.split('.').pop()?.toLowerCase();
    return getFileIcon(extension, 14);
  };

  return (
    <div className="mt-4 p-4 bg-[#1a2236] rounded-lg border border-blue-900/30">
      <div className="flex items-center gap-2 mb-3">
        <FaExternalLinkAlt className="text-blue-400" size={14} />
        <h4 className="text-sm font-medium text-blue-300">Izvori iz dokumenata</h4>
        <span className="text-xs text-gray-500">({sources.length} rezultat)</span>
      </div>
      
      <div className="space-y-3">
        {sources.map((source, index) => (
          <div
            key={index}
            className="p-3 bg-[#151c2c] rounded-lg border border-gray-700"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {getFileIconForSource(source.filename)}
                <span className="text-sm font-medium text-white">
                  {source.filename}
                </span>
                <span className="text-xs text-gray-400">
                  (stranica {source.page})
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-gray-400">
                    {formatScore(source.score)}% relevantnost
                  </span>
                  
                  {/* Prikaži re-ranking informacije ako postoje */}
                  {source.rerank_score !== undefined && source.original_score !== undefined && (
                    <div className="flex items-center gap-1 ml-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                      <span className="text-xs text-purple-400">
                        Re-rank: {formatScore(source.rerank_score)}%
                      </span>
                      <span className="text-xs text-gray-500">
                        (Original: {formatScore(source.original_score)}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="text-sm text-gray-400 mb-2">
              <strong>Izvor:</strong> {source.filename} (stranica {source.page})
            </div>
            <div className="text-sm text-gray-300">
              <strong>Sadržaj:</strong> {source.content}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-700">
        <p className="text-xs text-gray-500">
          AI asistent je koristio ove izvore iz vaših dokumenata za generisanje odgovora.
        </p>
      </div>
    </div>
  );
} 