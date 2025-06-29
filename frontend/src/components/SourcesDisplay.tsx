'use client';

import { FaExternalLinkAlt, FaFileAlt, FaEye } from 'react-icons/fa';
import { getFileIcon } from '../utils/fileUtils';

interface Source {
  filename: string;
  page: number;
  score: number;
  content: string;
  rerank_score?: number;
  original_score?: number;
  file_type: string;
  page_number: number;
  chunk_index: number;
}

interface SourcesDisplayProps {
  sources: Source[];
  isVisible: boolean;
  onSourceClick: (source: Source) => void;
}

export default function SourcesDisplay({ sources, isVisible, onSourceClick }: SourcesDisplayProps) {
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
    <div className="relative group">
      {/* Premium Glassmorphism Background */}
      <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-2xl rounded-2xl p-6 border border-white/10 shadow-2xl">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-pulse"></div>
          <div className="absolute top-1/4 right-1/4 w-16 h-16 bg-blue-400/10 rounded-full blur-xl animate-bounce"></div>
        </div>

        <div className="relative">
          {/* Premium Header */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <FaFileAlt className="text-white" size={16} />
              </div>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h3 className="text-lg font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                Izvori
              </h3>
              <p className="text-xs text-slate-400 font-medium">Dokumenti korišćeni za odgovor</p>
            </div>
            <span className="ml-auto text-xs text-slate-400 bg-slate-800/50 px-3 py-1 rounded-xl border border-white/10">
              {sources.length}
            </span>
          </div>

          {sources.length === 0 ? (
            <div className="text-center text-slate-400 text-sm py-8 bg-slate-800/30 rounded-2xl border border-white/10">
              Nema dostupnih izvora
            </div>
          ) : (
            <div className="space-y-3 max-h-48 overflow-y-auto custom-scrollbar">
              {sources.map((source, index) => (
                <div
                  key={index}
                  className="group/source relative p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl border border-white/10 hover-border-subtle card-hover-profi cursor-pointer"
                  onClick={() => onSourceClick(source)}
                >
                  {/* Suptilni hover glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 to-purple-500/3 rounded-2xl opacity-0 group-hover/source:opacity-100 transition-opacity duration-300"></div>
                  
                  <div className="relative">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-700/50 rounded-xl border border-white/10">
                          {getFileIconForSource(source.filename)}
                        </div>
                        <span className="text-sm font-medium text-white truncate max-w-32">
                          {source.filename}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 text-xs font-bold rounded-xl border ${
                          source.score >= 0.8 
                            ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                          source.score >= 0.6 
                            ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                            'bg-red-500/20 text-red-400 border-red-500/30'
                        }`}>
                          {(source.score * 100).toFixed(0)}%
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSourceClick(source);
                          }}
                          className="p-2 text-blue-400 hover:text-white hover:bg-blue-500/20 rounded-xl icon-hover-profi group/eye"
                          title="Pogledaj izvor"
                        >
                          <FaEye size={12} className="group-hover/eye:scale-110 transition-transform duration-300" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="text-xs text-slate-400 mb-3 bg-slate-800/30 px-3 py-2 rounded-xl border border-white/10">
                      Stranica {source.page_number} • Chunk {source.chunk_index}
                    </div>
                    
                    <div className="text-sm text-white leading-relaxed line-clamp-2 bg-slate-800/30 p-3 rounded-xl border border-white/10">
                      {source.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 