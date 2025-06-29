'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MindMapNode, MindMapConnection } from './types';
import MindMapNodeComponent from './MindMapNode';
import MindMapConnectionComponent from './MindMapConnection';
import { useNodeDrag } from './hooks/useNodeDrag';

interface MindMapCanvasProps {
  nodes: MindMapNode[];
  connections: MindMapConnection[];
  selectedNode: MindMapNode | null;
  onNodeSelect: (node: MindMapNode | null) => void;
  onNodeUpdate: (nodeId: string, updates: Partial<MindMapNode>) => void;
  onNodeDelete: (nodeId: string) => void;
  onConnectionDelete: (connectionId: string) => void;
  onAddNode?: (position: { x: number; y: number }) => void;
  theme: 'dark' | 'light' | 'colorful';
}

export default function MindMapCanvas({
  nodes,
  connections,
  selectedNode,
  onNodeSelect,
  onNodeUpdate,
  onNodeDelete,
  onConnectionDelete,
  onAddNode,
  theme
}: MindMapCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const { startDrag, updateDrag, endDrag } = useNodeDrag(onNodeUpdate);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target !== document.body) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          // Add node functionality handled by parent
          break;
        case 'Delete':
          e.preventDefault();
          if (selectedNode) {
            onNodeDelete(selectedNode.id);
          }
          break;
        case 'Escape':
          onNodeSelect(null);
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, onNodeDelete, onNodeSelect]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(3, scale * delta));
    setScale(newScale);
  }, [scale]);

  // Canvas drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) { // Middle click or Alt+Left click
      e.preventDefault();
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging) {
      setOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Double click to add node
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (e.target === canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - offset.x) / scale;
      const y = (e.clientY - rect.top - offset.y) / scale;
      
      if (onAddNode) {
        onAddNode({ x, y });
      }
    }
  }, [offset, scale, onAddNode]);

  const getNodePosition = (node: MindMapNode) => ({
    x: node.position.x * scale + offset.x,
    y: node.position.y * scale + offset.y
  });

  return (
    <div
      ref={canvasRef}
      className="w-full h-full relative overflow-hidden cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      {/* Background Grid */}
      <div 
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: `${20 * scale}px ${20 * scale}px`,
          transform: `translate(${offset.x % (20 * scale)}px, ${offset.y % (20 * scale)}px)`
        }}
      />

      {/* Connections */}
      <svg className="absolute inset-0 pointer-events-none">
        {connections.map(connection => {
          const fromNode = nodes.find(n => n.id === connection.from);
          const toNode = nodes.find(n => n.id === connection.to);
          
          if (!fromNode || !toNode) return null;
          
          const fromPos = getNodePosition(fromNode);
          const toPos = getNodePosition(toNode);
          
          return (
            <MindMapConnectionComponent
              key={connection.id}
              connection={connection}
              fromPos={fromPos}
              toPos={toPos}
              scale={scale}
              onDelete={() => onConnectionDelete(connection.id)}
            />
          );
        })}
      </svg>

      {/* Nodes */}
      {nodes.map(node => {
        const position = getNodePosition(node);
        
        return (
          <MindMapNodeComponent
            key={node.id}
            node={node}
            position={position}
            scale={scale}
            isSelected={selectedNode?.id === node.id}
            theme={theme}
            onSelect={() => onNodeSelect(node)}
            onUpdate={(updates: Partial<MindMapNode>) => onNodeUpdate(node.id, updates)}
            onDelete={() => onNodeDelete(node.id)}
            onDragStart={startDrag}
            onDragUpdate={updateDrag}
            onDragEnd={endDrag}
          />
        );
      })}

      {/* Zoom Controls */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <button
          onClick={() => setScale(Math.min(3, scale * 1.2))}
          className="p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-white/10 hover:border-white/20 transition-all"
          title="Zoom In"
        >
          <span className="text-white text-lg">+</span>
        </button>
        <button
          onClick={() => setScale(Math.max(0.1, scale * 0.8))}
          className="p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-white/10 hover:border-white/20 transition-all"
          title="Zoom Out"
        >
          <span className="text-white text-lg">−</span>
        </button>
        <button
          onClick={() => {
            setScale(1);
            setOffset({ x: 0, y: 0 });
          }}
          className="p-2 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-white/10 hover:border-white/20 transition-all"
          title="Reset View"
        >
          <span className="text-white text-sm">⌂</span>
        </button>
      </div>

      {/* Scale Indicator */}
      <div className="absolute top-4 right-4 text-xs text-slate-400 bg-slate-800/50 px-2 py-1 rounded border border-white/10">
        {Math.round(scale * 100)}%
      </div>
    </div>
  );
} 