'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FaPlus, FaTrash, FaDownload, FaUndo, FaRedo, FaExpand, FaCompress, FaPalette, FaSave, FaFolderOpen } from 'react-icons/fa';
import { useMindMap } from './hooks/useMindMap';
import MindMapCanvas from './MindMapCanvas';
import MindMapToolbar from './MindMapToolbar';
import { MindMapNode, MindMapConnection } from './types';

interface MindMappingProps {
  initialData?: {
    nodes: MindMapNode[];
    connections: MindMapConnection[];
  };
  onSave?: (data: { nodes: MindMapNode[]; connections: MindMapConnection[] }) => void;
  onExport?: (format: 'png' | 'svg' | 'json') => void;
}

export default function MindMapping({ initialData, onSave, onExport }: MindMappingProps) {
  const {
    nodes,
    connections,
    selectedNode,
    addNode,
    updateNode,
    deleteNode,
    addConnection,
    deleteConnection,
    selectNode,
    undo,
    redo,
    canUndo,
    canRedo,
    exportToImage,
    exportToJSON,
    importFromJSON,
    clearMap,
    generateNodeId,
    generateConnectionId
  } = useMindMap(initialData);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showToolbar, setShowToolbar] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light' | 'colorful'>('dark');

  const handleAddNode = () => {
    const newNodeId = generateNodeId();
    console.log('Kreiram novi čvor sa ID:', newNodeId);
    
    const newNode: MindMapNode = {
      id: newNodeId,
      content: 'Novi čvor',
      position: { x: 300, y: 200 },
      color: getRandomColor(),
      size: 'medium',
      parentId: selectedNode?.id || null
    };
    
    console.log('Dodajem čvor:', newNode);
    addNode(newNode);
    
    if (selectedNode) {
      const connectionId = generateConnectionId();
      console.log('Kreiram vezu sa ID:', connectionId);
      
      addConnection({
        id: connectionId,
        from: selectedNode.id,
        to: newNode.id,
        type: 'solid',
        color: '#6366f1'
      });
    }
  };

  const handleAddNodeAtPosition = (position: { x: number; y: number }) => {
    const newNodeId = generateNodeId();
    console.log('Kreiram novi čvor na poziciji sa ID:', newNodeId, position);
    
    const newNode: MindMapNode = {
      id: newNodeId,
      content: 'Novi čvor',
      position: position,
      color: getRandomColor(),
      size: 'medium',
      parentId: selectedNode?.id || null
    };
    
    console.log('Dodajem čvor na poziciji:', newNode);
    addNode(newNode);
    
    if (selectedNode) {
      const connectionId = generateConnectionId();
      console.log('Kreiram vezu sa ID:', connectionId);
      
      addConnection({
        id: connectionId,
        from: selectedNode.id,
        to: newNode.id,
        type: 'solid',
        color: '#6366f1'
      });
    }
  };

  const handleDeleteNode = () => {
    if (selectedNode) {
      deleteNode(selectedNode.id);
    }
  };

  const handleExport = async (format: 'png' | 'svg' | 'json') => {
    switch (format) {
      case 'png':
        await exportToImage('png');
        break;
      case 'svg':
        await exportToImage('svg');
        break;
      case 'json':
        exportToJSON();
        break;
    }
    onExport?.(format);
  };

  const getRandomColor = () => {
    const colors = [
      '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
      '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#84cc16'
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50' : 'h-full'} bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-slate-900/50 to-slate-800/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl">
            <FaPalette className="text-white" size={20} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Mind Mapping</h2>
            <p className="text-sm text-slate-400">
              {nodes.length} čvorova, {connections.length} veza
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as any)}
            className="px-3 py-2 bg-slate-800/50 border border-white/10 rounded-lg text-white text-sm focus:ring-2 focus:ring-purple-500"
          >
            <option value="dark">Tamna tema</option>
            <option value="light">Svetla tema</option>
            <option value="colorful">Colorful</option>
          </select>
          
          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-white/10 hover:border-white/20 transition-all"
            title={isFullscreen ? 'Izađi iz fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <FaCompress className="text-white" size={16} /> : <FaExpand className="text-white" size={16} />}
          </button>
          
          {/* Toolbar Toggle */}
          <button
            onClick={() => setShowToolbar(!showToolbar)}
            className="p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-white/10 hover:border-white/20 transition-all"
            title={showToolbar ? 'Sakrij toolbar' : 'Prikaži toolbar'}
          >
            <FaPalette className="text-white" size={16} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex h-[calc(100%-80px)]">
        {/* Toolbar */}
        {showToolbar && (
          <MindMapToolbar
            onAddNode={handleAddNode}
            onDeleteNode={handleDeleteNode}
            onUndo={undo}
            onRedo={redo}
            onExport={handleExport}
            onSave={() => onSave?.({ nodes, connections })}
            onImport={importFromJSON}
            onClear={clearMap}
            canUndo={canUndo}
            canRedo={canRedo}
            hasSelectedNode={!!selectedNode}
          />
        )}
        
        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <MindMapCanvas
            nodes={nodes}
            connections={connections}
            selectedNode={selectedNode}
            onNodeSelect={selectNode}
            onNodeUpdate={updateNode}
            onNodeDelete={deleteNode}
            onConnectionDelete={deleteConnection}
            onAddNode={handleAddNodeAtPosition}
            theme={theme}
          />
        </div>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="absolute bottom-4 right-4 text-xs text-slate-400 bg-slate-800/50 px-3 py-2 rounded-lg border border-white/10">
        <div className="font-medium mb-1">Prečice:</div>
        <div>Space - Dodaj čvor</div>
        <div>Delete - Obriši čvor</div>
        <div>Ctrl+Z - Undo</div>
        <div>Ctrl+Y - Redo</div>
      </div>
    </div>
  );
} 