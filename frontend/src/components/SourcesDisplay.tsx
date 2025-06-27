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
    <div className="bg-[var(--bg-secondary)] rounded-lg p-4 border border-[var(--border-color)]">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-[var(--accent-blue)]"><FaFileAlt size={16} /></div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">Izvori</h3>
        <span className="text-xs text-[var(--text-muted)]">({sources.length})</span>
      </div>

      {sources.length === 0 ? (
        <div className="text-center text-[var(--text-muted)] text-sm py-4">
          Nema dostupnih izvora
        </div>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {sources.map((source, index) => (
            <div
              key={index}
              className="p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)] hover:border-[var(--accent-blue)] transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {getFileIconForSource(source.filename)}
                  <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                    {source.filename}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    source.score >= 0.8 ? 'bg-[var(--accent-green)]/20 text-[var(--accent-green)]' :
                    source.score >= 0.6 ? 'bg-[var(--accent-yellow)]/20 text-[var(--accent-yellow)]' :
                    'bg-[var(--accent-red)]/20 text-[var(--accent-red)]'
                  }`}>
                    {(source.score * 100).toFixed(0)}%
                  </span>
                  <button
                    onClick={() => onSourceClick(source)}
                    className="p-1 text-[var(--accent-blue)] hover:text-[var(--accent-blue)]/80 hover:bg-[var(--accent-blue)]/10 rounded transition-colors"
                    title="Pogledaj izvor"
                  >
                    <FaEye size={12} />
                  </button>
                </div>
              </div>
              
              <div className="text-xs text-[var(--text-secondary)] mb-2">
                Stranica {source.page_number} • {source.chunk_index} chunk
              </div>
              
              <div className="text-sm text-[var(--text-primary)] line-clamp-2">
                {source.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 