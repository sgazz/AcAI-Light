'use client';

import React, { useRef } from 'react';
import { FaPlus, FaTrash, FaDownload, FaUndo, FaRedo, FaSave, FaFolderOpen, FaEraser, FaPalette } from 'react-icons/fa';

interface MindMapToolbarProps {
  onAddNode: () => void;
  onDeleteNode: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: (format: 'png' | 'svg' | 'json') => void;
  onSave: () => void;
  onImport: (file: File) => void;
  onClear: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelectedNode: boolean;
}

export default function MindMapToolbar({
  onAddNode,
  onDeleteNode,
  onUndo,
  onRedo,
  onExport,
  onSave,
  onImport,
  onClear,
  canUndo,
  canRedo,
  hasSelectedNode
}: MindMapToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImport(file);
    }
  };

  return (
    <div className="w-16 bg-gradient-to-b from-slate-800/50 to-slate-900/50 backdrop-blur-sm border-r border-white/10 flex flex-col items-center py-4 gap-3">
      {/* Add Node */}
      <button
        onClick={onAddNode}
        className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110"
        title="Dodaj čvor (Space)"
      >
        <FaPlus className="text-white" size={16} />
      </button>

      {/* Delete Node */}
      <button
        onClick={onDeleteNode}
        disabled={!hasSelectedNode}
        className="p-3 bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 disabled:from-gray-600 disabled:to-gray-700 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
        title="Obriši čvor (Delete)"
      >
        <FaTrash className="text-white" size={16} />
      </button>

      {/* Separator */}
      <div className="w-8 h-px bg-white/20"></div>

      {/* Undo */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-700 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
        title="Undo (Ctrl+Z)"
      >
        <FaUndo className="text-white" size={16} />
      </button>

      {/* Redo */}
      <button
        onClick={onRedo}
        disabled={!canRedo}
        className="p-3 bg-gradient-to-r from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 disabled:from-gray-600 disabled:to-gray-700 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110 disabled:cursor-not-allowed disabled:opacity-50"
        title="Redo (Ctrl+Y)"
      >
        <FaRedo className="text-white" size={16} />
      </button>

      {/* Separator */}
      <div className="w-8 h-px bg-white/20"></div>

      {/* Save */}
      <button
        onClick={onSave}
        className="p-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110"
        title="Sačuvaj"
      >
        <FaSave className="text-white" size={16} />
      </button>

      {/* Import */}
      <button
        onClick={() => fileInputRef.current?.click()}
        className="p-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110"
        title="Import"
      >
        <FaFolderOpen className="text-white" size={16} />
      </button>

      {/* Export Dropdown */}
      <div className="relative group">
        <button className="p-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110">
          <FaDownload className="text-white" size={16} />
        </button>
        
        {/* Export Menu */}
        <div className="absolute left-full ml-2 top-0 bg-slate-800/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 min-w-[120px]">
          <div className="p-2">
            <button
              onClick={() => onExport('png')}
              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              PNG Export
            </button>
            <button
              onClick={() => onExport('svg')}
              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              SVG Export
            </button>
            <button
              onClick={() => onExport('json')}
              className="w-full text-left px-3 py-2 text-sm text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              JSON Export
            </button>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div className="w-8 h-px bg-white/20"></div>

      {/* Clear */}
      <button
        onClick={onClear}
        className="p-3 bg-gradient-to-r from-gray-500 to-slate-600 hover:from-gray-600 hover:to-slate-700 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-110"
        title="Obriši sve"
      >
        <FaEraser className="text-white" size={16} />
      </button>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        className="hidden"
      />
    </div>
  );
} 