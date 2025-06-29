'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FaPlus, FaTrash, FaDownload, FaUndo, FaRedo, FaLightbulb, 
  FaLink, FaSearch, FaSearchMinus, 
  FaExpand, FaImage, FaFilePdf, FaSave, FaMousePointer, FaHandPaper, FaSearchPlus, FaUpload
} from 'react-icons/fa';
import { useErrorToast } from '../../ErrorToastProvider';
import html2canvas from 'html2canvas';

interface MindMapNode {
  id: string;
  content: string;
  position: { x: number; y: number };
  connections: string[];
  color: string;
  size: 'small' | 'medium' | 'large';
  isSelected?: boolean;
}

interface MindMapConnection {
  id: string;
  from: string;
  to: string;
  type: 'solid' | 'dashed' | 'dotted' | 'curved';
  color: string;
  label?: string;
  curveType: 'straight' | 'bezier' | 'orthogonal';
  arrowStyle: 'none' | 'arrow' | 'double-arrow';
}

interface MindMappingProps {
  className?: string;
}

const nodeColors = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#F59E0B', // Yellow
  '#EF4444', // Red
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#EC4899', // Pink
];

export default function MindMapping({ className = '' }: MindMappingProps) {
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [connections, setConnections] = useState<MindMapConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [history, setHistory] = useState<{ nodes: MindMapNode[]; connections: MindMapConnection[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [toolMode, setToolMode] = useState<'select' | 'pan' | 'connect'>('select');
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStart, setConnectionStart] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const { showError, showSuccess, showInfo } = useErrorToast();

  // Initialize with a central node
  useEffect(() => {
    if (nodes.length === 0) {
      const centralNode: MindMapNode = {
        id: 'central',
        content: 'Central Topic',
        position: { x: 400, y: 300 },
        connections: [],
        color: nodeColors[0],
        size: 'large',
      };
      setNodes([centralNode]);
      // We'll add to history after addToHistory is defined
    }
  }, [nodes.length]);

  // Add to history
  const addToHistory = useCallback((newNodes: MindMapNode[], newConnections: MindMapConnection[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ nodes: newNodes, connections: newConnections });
      return newHistory.slice(-20); // Keep last 20 states
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  // Initialize with a central node (moved after addToHistory)
  useEffect(() => {
    if (nodes.length === 0) {
      const centralNode: MindMapNode = {
        id: 'central',
        content: 'Central Topic',
        position: { x: 400, y: 300 },
        connections: [],
        color: nodeColors[0],
        size: 'large',
      };
      setNodes([centralNode]);
      addToHistory([centralNode], []);
    }
  }, [nodes.length, addToHistory]);

  // Mouse wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(3, scale * delta));
        setScale(newScale);
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener('wheel', handleWheel, { passive: false });
      return () => canvas.removeEventListener('wheel', handleWheel);
    }
  }, [scale]);

  // Pan functionality
  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (toolMode === 'pan' && e.button === 0) {
        setIsPanning(true);
        setPanStart({ x: e.clientX - canvasOffset.x, y: e.clientY - canvasOffset.y });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        setCanvasOffset({
          x: e.clientX - panStart.x,
          y: e.clientY - panStart.y,
        });
      }
    };

    const handleMouseUp = () => {
      setIsPanning(false);
    };

    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [toolMode, isPanning, panStart, canvasOffset]);

  // Undo
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      setNodes(state.nodes);
      setConnections(state.connections);
      setHistoryIndex(newIndex);
      showInfo('Undo completed', 'Mind Mapping');
    }
  }, [history, historyIndex, showInfo]);

  // Redo
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      setNodes(state.nodes);
      setConnections(state.connections);
      setHistoryIndex(newIndex);
      showInfo('Redo completed', 'Mind Mapping');
    }
  }, [history, historyIndex, showInfo]);

  // Zoom controls
  const zoomIn = useCallback(() => {
    setScale(prev => Math.min(3, prev * 1.2));
  }, []);

  const zoomOut = useCallback(() => {
    setScale(prev => Math.max(0.1, prev / 1.2));
  }, []);

  const fitToScreen = useCallback(() => {
    setScale(1);
    setCanvasOffset({ x: 0, y: 0 });
  }, []);

  // Add new node
  const addNode = useCallback((parentId?: string) => {
    const newNode: MindMapNode = {
      id: `node-${Date.now()}`,
      content: 'New Topic',
      position: parentId 
        ? { x: Math.random() * 200 + 300, y: Math.random() * 200 + 200 }
        : { x: Math.random() * 400 + 200, y: Math.random() * 400 + 100 },
      connections: [],
      color: nodeColors[Math.floor(Math.random() * nodeColors.length)],
      size: 'medium',
    };

    const newNodes = [...nodes, newNode];
    const newConnections = [...connections];

    // Connect to parent if provided
    if (parentId) {
      const newConnection: MindMapConnection = {
        id: `conn-${Date.now()}`,
        from: parentId,
        to: newNode.id,
        type: 'curved',
        color: '#6B7280',
        curveType: 'bezier',
        arrowStyle: 'none',
      };
      newConnections.push(newConnection);
      
      // Update parent node connections
      const updatedNodes = newNodes.map(node => 
        node.id === parentId 
          ? { ...node, connections: [...node.connections, newConnection.id] }
          : node
      );
      
      const updatedNewNode = { ...newNode, connections: [newConnection.id] };
      const finalNodes = updatedNodes.map(node => 
        node.id === newNode.id ? updatedNewNode : node
      );
      
      setNodes(finalNodes);
      setConnections(newConnections);
      addToHistory(finalNodes, newConnections);
    } else {
      setNodes(newNodes);
      setConnections(newConnections);
      addToHistory(newNodes, newConnections);
    }

    showSuccess('Node added successfully', 'Mind Mapping');
  }, [nodes, connections, addToHistory, showSuccess]);

  // Delete node
  const deleteNode = useCallback((nodeId: string) => {
    const nodeToDelete = nodes.find(n => n.id === nodeId);
    if (!nodeToDelete) return;

    // Remove all connections involving this node
    const newConnections = connections.filter(conn => 
      conn.from !== nodeId && conn.to !== nodeId
    );

    // Remove node
    const newNodes = nodes.filter(n => n.id !== nodeId);

    // Update other nodes' connections
    const updatedNodes = newNodes.map(node => ({
      ...node,
      connections: node.connections.filter(connId => 
        newConnections.some(conn => conn.id === connId)
      )
    }));

    setNodes(updatedNodes);
    setConnections(newConnections);
    addToHistory(updatedNodes, newConnections);
    setSelectedNode(null);

    showSuccess('Node deleted successfully', 'Mind Mapping');
  }, [nodes, connections, addToHistory, showSuccess]);

  // Update node content
  const updateNodeContent = useCallback((nodeId: string, content: string) => {
    const newNodes = nodes.map(node => 
      node.id === nodeId ? { ...node, content } : node
    );
    setNodes(newNodes);
    addToHistory(newNodes, connections);
  }, [nodes, connections, addToHistory]);

  // Update node color
  const updateNodeColor = useCallback((nodeId: string, color: string) => {
    const newNodes = nodes.map(node => 
      node.id === nodeId ? { ...node, color } : node
    );
    setNodes(newNodes);
    addToHistory(newNodes, connections);
  }, [nodes, connections, addToHistory]);

  // Update node size
  const updateNodeSize = useCallback((nodeId: string, size: 'small' | 'medium' | 'large') => {
    const newNodes = nodes.map(node => 
      node.id === nodeId ? { ...node, size } : node
    );
    setNodes(newNodes);
    addToHistory(newNodes, connections);
  }, [nodes, connections, addToHistory]);

  // Handle node drag
  const handleNodeDrag = useCallback((nodeId: string, newPosition: { x: number; y: number }) => {
    const newNodes = nodes.map(node => 
      node.id === nodeId ? { ...node, position: newPosition } : node
    );
    setNodes(newNodes);
  }, [nodes]);

  // Handle node drag end
  const handleNodeDragEnd = useCallback(() => {
    addToHistory(nodes, connections);
  }, [nodes, connections, addToHistory]);

  // Connection functionality
  // Add connection
  const addConnection = useCallback((fromId: string, toId: string) => {
    if (fromId === toId) return;

    const existingConnection = connections.find(conn => 
      (conn.from === fromId && conn.to === toId) || 
      (conn.from === toId && conn.to === fromId)
    );

    if (existingConnection) {
      showError('Connection already exists', 'Mind Mapping');
      return;
    }

    const newConnection: MindMapConnection = {
      id: `conn-${Date.now()}`,
      from: fromId,
      to: toId,
      type: 'curved',
      color: '#6B7280',
      curveType: 'bezier',
      arrowStyle: 'none',
    };

    const newConnections = [...connections, newConnection];
    
    // Update nodes' connections
    const newNodes = nodes.map(node => {
      if (node.id === fromId || node.id === toId) {
        return { ...node, connections: [...node.connections, newConnection.id] };
      }
      return node;
    });

    setConnections(newConnections);
    setNodes(newNodes);
    addToHistory(newNodes, newConnections);
    showSuccess('Connection added successfully', 'Mind Mapping');
  }, [nodes, connections, addToHistory, showError, showSuccess]);

  const finishConnection = useCallback((toId: string) => {
    if (connectionStart && connectionStart !== toId) {
      addConnection(connectionStart, toId);
    }
    setIsConnecting(false);
    setConnectionStart(null);
    setToolMode('select');
  }, [connectionStart, addConnection]);

  // AI suggestions
  const generateAiSuggestions = useCallback(async () => {
    if (nodes.length === 0) return;

    setIsLoading(true);
    try {
      // Simulate AI suggestions based on existing nodes
      const suggestions = nodes.map(node => {
        const topics = [
          'Benefits', 'Challenges', 'Examples', 'Applications',
          'History', 'Future', 'Types', 'Methods', 'Tools', 'Resources'
        ];
        return `${node.content} - ${topics[Math.floor(Math.random() * topics.length)]}`;
      }).slice(0, 3);

      setAiSuggestions(suggestions);
      showSuccess('AI suggestions generated', 'Mind Mapping');
    } catch {
      showError('Failed to generate AI suggestions', 'Mind Mapping');
    } finally {
      setIsLoading(false);
    }
  }, [nodes, showError, showSuccess]);

  // Export functionality
  const exportMindMap = useCallback(async (format: 'png' | 'pdf' | 'json') => {
    try {
      if (format === 'json') {
        const data = { nodes, connections };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mind-map.json';
        a.click();
        URL.revokeObjectURL(url);
        showSuccess('Mind map exported as JSON', 'Mind Mapping');
      } else if (format === 'png') {
        if (canvasRef.current) {
          const canvas = await html2canvas(canvasRef.current, {
            backgroundColor: '#1e293b',
            scale: 2,
            useCORS: true,
            allowTaint: true,
          });
          const link = document.createElement('a');
          link.download = 'mind-map.png';
          link.href = canvas.toDataURL();
          link.click();
          showSuccess('Mind map exported as PNG', 'Mind Mapping');
        }
      } else {
        showInfo('PDF export coming soon', 'Mind Mapping');
      }
    } catch {
      showError('Export failed', 'Mind Mapping');
    }
  }, [nodes, connections, showError, showSuccess, showInfo]);

  // Calculate curved path
  const calculateCurvedPath = useCallback((from: { x: number; y: number }, to: { x: number; y: number }, curveType: string) => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    
    if (curveType === 'bezier') {
      const controlPoint1 = {
        x: from.x + dx * 0.5,
        y: from.y + dy * 0.3
      };
      const controlPoint2 = {
        x: from.x + dx * 0.5,
        y: from.y + dy * 0.7
      };
      return `M ${from.x} ${from.y} C ${controlPoint1.x} ${controlPoint1.y} ${controlPoint2.x} ${controlPoint2.y} ${to.x} ${to.y}`;
    } else if (curveType === 'orthogonal') {
      const midX = from.x + dx * 0.5;
      return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
    } else {
      return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
    }
  }, []);

  return (
    <div className={`h-full flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl">
            <FaLightbulb className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              Mind Mapping
            </h1>
            <p className="text-sm text-slate-400">
              {nodes.length} nodes, {connections.length} connections
            </p>
          </div>
        </div>

        {/* Advanced Toolbar */}
        <div className="flex items-center gap-2">
          {/* Tool Mode Selector */}
          <div className="flex bg-slate-700 rounded-lg p-1 mr-2">
            <button
              onClick={() => setToolMode('select')}
              className={`p-2 rounded-md icon-hover-profi ${
                toolMode === 'select'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-600'
              }`}
              title="Select Mode"
            >
              <FaMousePointer size={16} />
            </button>
            <button
              onClick={() => setToolMode('pan')}
              className={`p-2 rounded-md icon-hover-profi ${
                toolMode === 'pan'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-600'
              }`}
              title="Pan Mode"
            >
              <FaHandPaper size={16} />
            </button>
            <button
              onClick={() => setToolMode('connect')}
              className={`p-2 rounded-md icon-hover-profi ${
                toolMode === 'connect'
                  ? 'bg-blue-500 text-white'
                  : 'text-slate-300 hover:text-white hover:bg-slate-600'
              }`}
              title="Connect Mode"
            >
              <FaLink size={16} />
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex bg-slate-700 rounded-lg p-1 mr-2">
            <button
              onClick={() => setScale(scale * 1.2)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-600 rounded-md icon-hover-profi"
              title="Zoom In"
            >
              <FaSearchPlus size={16} />
            </button>
            <span className="px-2 py-2 text-slate-300 text-sm font-medium">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={() => setScale(scale / 1.2)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-600 rounded-md icon-hover-profi"
              title="Zoom Out"
            >
              <FaSearchMinus size={16} />
            </button>
            <button
              onClick={() => setScale(1)}
              className="p-2 text-slate-300 hover:text-white hover:bg-slate-600 rounded-md icon-hover-profi"
              title="Reset Zoom"
            >
              <FaExpand size={16} />
            </button>
          </div>

          {/* Action Buttons */}
          <button
            onClick={() => addNode()}
            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg btn-hover-profi"
            title="Add Node"
          >
            <FaPlus size={16} />
          </button>
          
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg btn-hover-profi"
            title="Undo"
          >
            <FaUndo size={16} />
          </button>
          
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg btn-hover-profi"
            title="Redo"
          >
            <FaRedo size={16} />
          </button>
          
          <button
            onClick={generateAiSuggestions}
            disabled={isLoading}
            className="p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg btn-hover-profi"
            title="AI Suggestions"
          >
            <FaLightbulb size={16} />
          </button>

          {/* Export Menu */}
          <div className="relative group">
            <button className="p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg btn-hover-profi">
              <FaDownload size={16} />
            </button>
            <div className="absolute top-full left-0 mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
              <button
                onClick={() => exportMindMap('png')}
                className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 flex items-center gap-2 icon-hover-profi"
              >
                <FaImage size={14} />
                Export as PNG
              </button>
              <button
                onClick={() => exportMindMap('pdf')}
                className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 flex items-center gap-2 icon-hover-profi"
              >
                <FaFilePdf size={14} />
                Export as PDF
              </button>
              <button
                onClick={() => exportMindMap('json')}
                className="w-full px-4 py-2 text-left text-white hover:bg-slate-700 flex items-center gap-2 icon-hover-profi"
              >
                <FaSave size={14} />
                Export as JSON
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={canvasRef}
            className={`w-full h-full relative ${toolMode === 'pan' ? 'cursor-grab' : 'cursor-default'} ${isPanning ? 'cursor-grabbing' : ''}`}
            style={{
              transform: `scale(${scale}) translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
              transformOrigin: 'center',
            }}
          >
            {/* Connections */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {connections.map(connection => {
                const fromNode = nodes.find(n => n.id === connection.from);
                const toNode = nodes.find(n => n.id === connection.to);
                
                if (!fromNode || !toNode) return null;

                const isSelected = selectedConnection === connection.id;
                const path = calculateCurvedPath(fromNode.position, toNode.position, connection.curveType);
                
                return (
                  <g key={connection.id}>
                    <path
                      d={path}
                      stroke={isSelected ? '#3B82F6' : connection.color}
                      strokeWidth={isSelected ? 3 : 2}
                      strokeDasharray={connection.type === 'dashed' ? '5,5' : connection.type === 'dotted' ? '2,2' : 'none'}
                      fill="none"
                      className="cursor-pointer"
                      onClick={() => setSelectedConnection(connection.id)}
                    />
                    {/* Arrow */}
                    {connection.arrowStyle !== 'none' && (
                      <polygon
                        points="0,0 -5,-2 -5,2"
                        fill={connection.color}
                        transform={`translate(${toNode.position.x}, ${toNode.position.y}) rotate(${Math.atan2(toNode.position.y - fromNode.position.y, toNode.position.x - fromNode.position.x) * 180 / Math.PI})`}
                      />
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Nodes */}
            <AnimatePresence>
              {nodes.map(node => (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  drag={toolMode === 'select'}
                  dragMomentum={false}
                  dragElastic={0.1}
                  onDragStart={() => {}}
                  onDrag={(e, info) => handleNodeDrag(node.id, { x: info.point.x, y: info.point.y })}
                  onDragEnd={() => {
                    handleNodeDragEnd();
                  }}
                  className={`absolute cursor-move select-none ${
                    node.size === 'small' ? 'w-24 h-24' :
                    node.size === 'medium' ? 'w-32 h-32' : 'w-40 h-40'
                  }`}
                  style={{
                    left: node.position.x - (node.size === 'small' ? 48 : node.size === 'medium' ? 64 : 80),
                    top: node.position.y - (node.size === 'small' ? 48 : node.size === 'medium' ? 64 : 80),
                  }}
                  onClick={() => {
                    if (toolMode === 'connect' && connectionStart && connectionStart !== node.id) {
                      finishConnection(node.id);
                    } else {
                      setSelectedNode(node.id);
                    }
                  }}
                >
                  <div
                    className={`w-full h-full rounded-2xl border-2 backdrop-blur-sm hover-border-subtle ${
                      selectedNode === node.id
                        ? 'border-blue-400 shadow-lg shadow-blue-500/50'
                        : 'border-white/20'
                    } ${isConnecting && connectionStart === node.id ? 'ring-2 ring-purple-400' : ''}`}
                    style={{
                      backgroundColor: `${node.color}20`,
                      borderColor: selectedNode === node.id ? '#60A5FA' : `${node.color}60`,
                    }}
                  >
                    <div className="w-full h-full flex items-center justify-center p-2">
                      <textarea
                        value={node.content}
                        onChange={(e) => updateNodeContent(node.id, e.target.value)}
                        className="w-full h-full bg-transparent border-none outline-none resize-none text-center text-white font-medium text-sm"
                        style={{ color: node.color }}
                        placeholder="Enter topic..."
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-80 bg-slate-800/50 border-l border-white/10 p-4 space-y-4">
          {/* Selected Node Controls */}
          {selectedNode && (
            <div className="bg-slate-700/50 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-3">Node Properties</h3>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Size</label>
                  <select
                    value={nodes.find(n => n.id === selectedNode)?.size || 'medium'}
                    onChange={(e) => updateNodeSize(selectedNode, e.target.value as 'small' | 'medium' | 'large')}
                    className="w-full bg-slate-600 border border-slate-500 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Color</label>
                  <div className="grid grid-cols-4 gap-2">
                    {nodeColors.map(color => (
                      <button
                        key={color}
                        onClick={() => updateNodeColor(selectedNode, color)}
                        className={`w-8 h-8 rounded-lg border-2 hover-scale-subtle ${
                          nodes.find(n => n.id === selectedNode)?.color === color
                            ? 'border-white scale-110'
                            : 'border-slate-600 hover-border-subtle'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => addNode(selectedNode)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium btn-hover-profi"
                  >
                    Add Child
                  </button>
                  <button
                    onClick={() => deleteNode(selectedNode)}
                    className="bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-lg text-sm font-medium btn-hover-profi"
                  >
                    <FaTrash size={14} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI Suggestions */}
          {aiSuggestions.length > 0 && (
            <div className="bg-slate-700/50 rounded-xl p-4">
              <h3 className="text-lg font-semibold text-white mb-3">AI Suggestions</h3>
              <div className="space-y-2">
                {aiSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => addNode()}
                    className="w-full text-left p-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-sm text-white icon-hover-profi"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-slate-700/50 rounded-xl p-4">
            <h3 className="text-lg font-semibold text-white mb-3">Instructions</h3>
            <div className="text-sm text-slate-300 space-y-2">
              <p>• <strong>Select Mode:</strong> Drag nodes, edit content</p>
              <p>• <strong>Pan Mode:</strong> Move canvas around</p>
              <p>• <strong>Connect Mode:</strong> Create connections</p>
              <p>• <strong>Ctrl+Scroll:</strong> Zoom in/out</p>
              <p>• <strong>Double-click:</strong> Edit node content</p>
              <p>• <strong>Export:</strong> PNG, PDF, or JSON</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
