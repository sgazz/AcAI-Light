'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, PanInfo } from 'framer-motion';
import { FaEdit, FaTrash, FaLink, FaPlus } from 'react-icons/fa';

interface MindMapNodeProps {
  content: string;
  position: { x: number; y: number };
  color: string;
  size: 'small' | 'medium' | 'large';
  isSelected: boolean;
  isDragging: boolean;
  isConnecting: boolean;
  isConnectionStart: boolean;
  toolMode: 'select' | 'pan' | 'connect';
  onContentChange: (content: string) => void;
  onDelete: () => void;
  onSelect: () => void;
  onDragStart: () => void;
  onDrag: (position: { x: number; y: number }) => void;
  onDragEnd: () => void;
  onAddConnection: () => void;
  onStartConnection: () => void;
  onFinishConnection: () => void;
  onAddChild: () => void;
  className?: string;
}

const nodeSizes = {
  small: { width: 96, height: 96, fontSize: 'text-xs' },
  medium: { width: 128, height: 128, fontSize: 'text-sm' },
  large: { width: 160, height: 160, fontSize: 'text-base' },
};

export default function MindMapNode({
  content,
  position,
  color,
  size,
  isSelected,
  isDragging,
  isConnecting,
  isConnectionStart,
  toolMode,
  onContentChange,
  onDelete,
  onSelect,
  onDragStart,
  onDrag,
  onDragEnd,
  onAddConnection,
  onStartConnection,
  onFinishConnection,
  onAddChild,
  className = '',
}: MindMapNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sizeConfig = nodeSizes[size];

  useEffect(() => {
    setEditContent(content);
  }, [content]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = () => {
    if (toolMode === 'select') {
      setIsEditing(true);
    }
  };

  const handleContentSave = () => {
    if (editContent.trim() !== content) {
      onContentChange(editContent.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleContentSave();
    } else if (e.key === 'Escape') {
      setEditContent(content);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    handleContentSave();
  };

  const handleClick = () => {
    if (toolMode === 'connect') {
      if (isConnectionStart) {
        onFinishConnection();
      } else {
        onStartConnection();
      }
    } else {
      onSelect();
    }
  };

  const handleDragStart = () => {
    if (toolMode === 'select') {
      onDragStart();
    }
  };

  const handleDrag = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (toolMode === 'select') {
      onDrag({ x: info.point.x, y: info.point.y });
    }
  };

  const handleDragEnd = () => {
    if (toolMode === 'select') {
      onDragEnd();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ 
        opacity: 1, 
        scale: isDragging ? 1.05 : 1,
        x: position.x - sizeConfig.width / 2,
        y: position.y - sizeConfig.height / 2,
      }}
      exit={{ opacity: 0, scale: 0.8 }}
      drag={toolMode === 'select'}
      dragMomentum={false}
      dragElastic={0.1}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      className={`absolute cursor-move select-none ${className}`}
      style={{
        width: sizeConfig.width,
        height: sizeConfig.height,
      }}
    >
      {/* Node Background */}
      <div
        className={`w-full h-full rounded-2xl border-2 backdrop-blur-sm transition-all duration-200 ${
          isSelected
            ? 'border-blue-400 shadow-lg shadow-blue-500/50'
            : isConnectionStart
            ? 'border-purple-400 shadow-lg shadow-purple-500/50'
            : 'border-white/20 hover:border-white/40'
        } ${isConnecting && isConnectionStart ? 'ring-2 ring-purple-400' : ''}`}
        style={{
          backgroundColor: `${color}20`,
          borderColor: isSelected ? '#60A5FA' : isConnectionStart ? '#A78BFA' : `${color}60`,
        }}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        {/* Content Area */}
        <div className="w-full h-full flex items-center justify-center p-2 relative">
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              className={`w-full h-full bg-transparent border-none outline-none resize-none text-center font-medium ${sizeConfig.fontSize} text-white`}
              style={{ color: color }}
              placeholder="Enter topic..."
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <div 
              className={`w-full h-full flex items-center justify-center text-center font-medium ${sizeConfig.fontSize} text-white break-words`}
              style={{ color: color }}
            >
              {content || 'Enter topic...'}
            </div>
          )}
        </div>

        {/* Selection Indicator */}
        {isSelected && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-400 rounded-full animate-pulse" />
        )}

        {/* Connection Start Indicator */}
        {isConnectionStart && (
          <div className="absolute -top-1 -left-1 w-3 h-3 bg-purple-400 rounded-full animate-pulse" />
        )}

        {/* Quick Actions (visible on hover or selection) */}
        {(isSelected || isEditing) && toolMode === 'select' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute -top-2 -right-2 flex gap-1"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddChild();
              }}
              className="p-1 bg-green-500 hover:bg-green-600 text-white rounded-full transition-colors"
              title="Add Child Node"
            >
              <FaPlus size={10} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onAddConnection();
              }}
              className="p-1 bg-blue-500 hover:bg-blue-600 text-white rounded-full transition-colors"
              title="Add Connection"
            >
              <FaLink size={10} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
              className="p-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-full transition-colors"
              title="Edit"
            >
              <FaEdit size={10} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors"
              title="Delete"
            >
              <FaTrash size={10} />
            </button>
          </motion.div>
        )}
      </div>

      {/* Size Indicator */}
      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-slate-400 rounded-full opacity-50" />
    </motion.div>
  );
} 