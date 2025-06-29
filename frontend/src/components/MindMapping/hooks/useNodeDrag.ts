import { useCallback, useRef } from 'react';
import { MindMapNode } from '../types';

export const useNodeDrag = (
  onNodeUpdate: (nodeId: string, updates: Partial<MindMapNode>) => void
) => {
  const dragState = useRef<{
    isDragging: boolean;
    nodeId: string | null;
    startPos: { x: number; y: number };
    startOffset: { x: number; y: number };
  }>({
    isDragging: false,
    nodeId: null,
    startPos: { x: 0, y: 0 },
    startOffset: { x: 0, y: 0 }
  });

  const startDrag = useCallback((nodeId: string, startPos: { x: number; y: number }, nodePos: { x: number; y: number }) => {
    dragState.current = {
      isDragging: true,
      nodeId,
      startPos,
      startOffset: { x: startPos.x - nodePos.x, y: startPos.y - nodePos.y }
    };
  }, []);

  const updateDrag = useCallback((currentPos: { x: number; y: number }) => {
    if (dragState.current.isDragging && dragState.current.nodeId) {
      const newX = currentPos.x - dragState.current.startOffset.x;
      const newY = currentPos.y - dragState.current.startOffset.y;
      
      onNodeUpdate(dragState.current.nodeId, {
        position: { x: newX, y: newY }
      });
    }
  }, [onNodeUpdate]);

  const endDrag = useCallback(() => {
    dragState.current.isDragging = false;
    dragState.current.nodeId = null;
  }, []);

  return {
    startDrag,
    updateDrag,
    endDrag,
    isDragging: dragState.current.isDragging
  };
}; 