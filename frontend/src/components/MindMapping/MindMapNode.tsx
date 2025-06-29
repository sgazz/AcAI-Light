'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FaEdit, FaTrash, FaPalette } from 'react-icons/fa';
import { MindMapNode } from './types';

interface MindMapNodeProps {
  node: MindMapNode;
  position: { x: number; y: number };
  scale: number;
  isSelected: boolean;
  theme: 'dark' | 'light' | 'colorful';
  onSelect: () => void;
  onUpdate: (updates: Partial<MindMapNode>) => void;
  onDelete: () => void;
  onDragStart: (nodeId: string, startPos: { x: number; y: number }, nodePos: { x: number; y: number }) => void;
  onDragUpdate: (currentPos: { x: number; y: number }) => void;
  onDragEnd: () => void;
}

export default function MindMapNodeComponent({
  node,
  position,
  scale,
  isSelected,
  theme,
  onSelect,
  onUpdate,
  onDelete,
  onDragStart,
  onDragUpdate,
  onDragEnd
}: MindMapNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(node.content);
  const [showMenu, setShowMenu] = useState(false);
  const nodeRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const sizeMap = {
    small: { width: 80, height: 40, fontSize: 12 },
    medium: { width: 120, height: 50, fontSize: 14 },
    large: { width: 160, height: 60, fontSize: 16 }
  };

  const size = sizeMap[node.size];

  // Handle editing
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setEditContent(node.content);
  };

  const handleEditSave = () => {
    if (editContent.trim()) {
      onUpdate({ content: editContent.trim() });
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditContent(node.content);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  // Handle drag
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !isEditing) { // Left click only
      e.stopPropagation();
      onSelect();
      
      const startPos = { x: e.clientX, y: e.clientY };
      onDragStart(node.id, startPos, position);
      
      const handleMouseMove = (e: MouseEvent) => {
        onDragUpdate({ x: e.clientX, y: e.clientY });
      };
      
      const handleMouseUp = () => {
        onDragEnd();
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowMenu(true);
  };

  const handleColorChange = (color: string) => {
    onUpdate({ color });
    setShowMenu(false);
  };

  const handleSizeChange = (size: 'small' | 'medium' | 'large') => {
    onUpdate({ size });
    setShowMenu(false);
  };

  const getNodeStyle = () => {
    const baseStyle = {
      position: 'absolute' as const,
      left: position.x - size.width / 2,
      top: position.y - size.height / 2,
      width: size.width,
      height: size.height,
      fontSize: size.fontSize,
      transform: `scale(${scale})`,
      transformOrigin: 'center',
      cursor: 'grab',
      userSelect: 'none' as const,
      zIndex: isSelected ? 10 : 1
    };

    const themeStyles = {
      dark: {
        backgroundColor: node.color,
        border: isSelected ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.2)',
        color: '#ffffff',
        boxShadow: isSelected ? '0 0 20px rgba(99, 102, 241, 0.5)' : '0 4px 12px rgba(0,0,0,0.3)'
      },
      light: {
        backgroundColor: node.color,
        border: isSelected ? '2px solid #6366f1' : '1px solid rgba(0,0,0,0.2)',
        color: '#000000',
        boxShadow: isSelected ? '0 0 20px rgba(99, 102, 241, 0.5)' : '0 4px 12px rgba(0,0,0,0.1)'
      },
      colorful: {
        background: `linear-gradient(135deg, ${node.color}, ${node.color}dd)`,
        border: isSelected ? '2px solid #6366f1' : '1px solid rgba(255,255,255,0.3)',
        color: '#ffffff',
        boxShadow: isSelected ? '0 0 20px rgba(99, 102, 241, 0.5)' : '0 4px 12px rgba(0,0,0,0.2)'
      }
    };

    return { ...baseStyle, ...themeStyles[theme] };
  };

  return (
    <>
      <div
        ref={nodeRef}
        className="rounded-xl transition-all duration-200 hover:scale-105"
        style={getNodeStyle()}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleEditSave}
            className="w-full h-full bg-transparent border-none outline-none text-center text-inherit font-medium"
            style={{ fontSize: size.fontSize }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center px-2 text-center font-medium">
            {node.content}
          </div>
        )}
      </div>

      {/* Context Menu */}
      {showMenu && (
        <div className="absolute z-50 bg-slate-800/95 backdrop-blur-sm border border-white/10 rounded-xl shadow-2xl p-2 min-w-[150px]">
          <div className="text-xs text-slate-400 px-2 py-1 border-b border-white/10 mb-1">
            Čvor: {node.content}
          </div>
          
          <button
            onClick={() => setIsEditing(true)}
            className="w-full text-left px-2 py-1 text-sm text-white hover:bg-white/10 rounded transition-colors flex items-center gap-2"
          >
            <FaEdit size={12} />
            Uredi
          </button>
          
          <div className="px-2 py-1">
            <div className="text-xs text-slate-400 mb-1">Boja:</div>
            <div className="flex gap-1">
              {['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316', '#22c55e'].map(color => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className="w-6 h-6 rounded border border-white/20 hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          
          <div className="px-2 py-1">
            <div className="text-xs text-slate-400 mb-1">Veličina:</div>
            <div className="flex gap-1">
              {(['small', 'medium', 'large'] as const).map(size => (
                <button
                  key={size}
                  onClick={() => handleSizeChange(size)}
                  className="px-2 py-1 text-xs text-white hover:bg-white/10 rounded transition-colors"
                >
                  {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
                </button>
              ))}
            </div>
          </div>
          
          <button
            onClick={() => {
              onDelete();
              setShowMenu(false);
            }}
            className="w-full text-left px-2 py-1 text-sm text-red-400 hover:bg-red-500/10 rounded transition-colors flex items-center gap-2"
          >
            <FaTrash size={12} />
            Obriši
          </button>
        </div>
      )}
    </>
  );
} 