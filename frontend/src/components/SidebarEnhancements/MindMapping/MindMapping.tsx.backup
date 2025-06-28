'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlus, FaTrash, FaDownload, FaUndo, FaRedo, FaLightbulb, FaPalette, FaLink, FaUnlink } from 'react-icons/fa';
import { useErrorToast } from '../../ErrorToastProvider';

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
  type: 'solid' | 'dashed' | 'dotted';
  color: string;
  label?: string;
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

const connectionTypes = [
  { type: 'solid', label: 'Solid' },
  { type: 'dashed', label: 'Dashed' },
  { type: 'dotted', label: 'Dotted' },
];

export default function MindMapping({ className = '' }: MindMappingProps) {
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [connections, setConnections] = useState<MindMapConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [canvasOffset, setCanvasOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [history, setHistory] = useState<{ nodes: MindMapNode[]; connections: MindMapConnection[] }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

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
      addToHistory([centralNode], []);
    }
  }, []);

  // Add to history
  const addToHistory = useCallback((newNodes: MindMapNode[], newConnections: MindMapConnection[]) => {
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push({ nodes: newNodes, connections: newConnections });
      return newHistory.slice(-20); // Keep last 20 states
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

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
    let newConnections = [...connections];

    // Connect to parent if provided
    if (parentId) {
      const newConnection: MindMapConnection = {
        id: `conn-${Date.now()}`,
        from: parentId,
        to: newNode.id,
        type: 'solid',
        color: '#6B7280',
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
  const handleNodeDragEnd = useCallback((nodeId: string) => {
    addToHistory(nodes, connections);
  }, [nodes, connections, addToHistory]);

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
      type: 'solid',
      color: '#6B7280',
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

  // Delete connection
  const deleteConnection = useCallback((connectionId: string) => {
    const connectionToDelete = connections.find(c => c.id === connectionId);
    if (!connectionToDelete) return;

    const newConnections = connections.filter(c => c.id !== connectionId);
    
    // Update nodes' connections
    const newNodes = nodes.map(node => ({
      ...node,
      connections: node.connections.filter(connId => connId !== connectionId)
    }));

    setConnections(newConnections);
    setNodes(newNodes);
    addToHistory(newNodes, newConnections);
    setSelectedConnection(null);

    showSuccess('Connection deleted successfully', 'Mind Mapping');
  }, [nodes, connections, addToHistory, showSuccess]);

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
    } catch (error) {
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
      } else {
        // PNG/PDF export would require html2canvas or similar
        showInfo('Export functionality coming soon', 'Mind Mapping');
      }
    } catch (error) {
      showError('Export failed', 'Mind Mapping');
    }
  }, [nodes, connections, showError, showSuccess, showInfo]);

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

        {/* Toolbar */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => addNode()}
            className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            title="Add Node"
          >
            <FaPlus size={16} />
          </button>
          
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors"
            title="Undo"
          >
            <FaUndo size={16} />
          </button>
          
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white rounded-lg transition-colors"
            title="Redo"
          >
            <FaRedo size={16} />
          </button>
          
          <button
            onClick={generateAiSuggestions}
            disabled={isLoading}
            className="p-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors"
            title="AI Suggestions"
          >
            <FaLightbulb size={16} />
          </button>
          
          <button
            onClick={() => exportMindMap('json')}
            className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            title="Export"
          >
            <FaDownload size={16} />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          <div
            ref={canvasRef}
            className="w-full h-full relative"
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
                
                return (
                  <g key={connection.id}>
                    <line
                      x1={fromNode.position.x}
                      y1={fromNode.position.y}
                      x2={toNode.position.x}
                      y2={toNode.position.y}
                      stroke={isSelected ? '#3B82F6' : connection.color}
                      strokeWidth={isSelected ? 3 : 2}
                      strokeDasharray={connection.type === 'dashed' ? '5,5' : connection.type === 'dotted' ? '2,2' : 'none'}
                      className="cursor-pointer"
                      onClick={() => setSelectedConnection(connection.id)}
                    />
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
                  drag
                  dragMomentum={false}
                  dragElastic={0.1}
                  onDragStart={() => setIsDragging(true)}
                  onDrag={(e, info) => handleNodeDrag(node.id, { x: info.point.x, y: info.point.y })}
                  onDragEnd={() => {
                    setIsDragging(false);
                    handleNodeDragEnd(node.id);
                  }}
                  className={`absolute cursor-move select-none ${
                    node.size === 'small' ? 'w-24 h-24' :
                    node.size === 'medium' ? 'w-32 h-32' : 'w-40 h-40'
                  }`}
                  style={{
                    left: node.position.x - (node.size === 'small' ? 48 : node.size === 'medium' ? 64 : 80),
                    top: node.position.y - (node.size === 'small' ? 48 : node.size === 'medium' ? 64 : 80),
                  }}
                >
                  <div
                    className={`w-full h-full rounded-2xl border-2 backdrop-blur-sm transition-all duration-200 ${
                      selectedNode === node.id
                        ? 'border-blue-400 shadow-lg shadow-blue-500/50'
                        : 'border-white/20 hover:border-white/40'
                    }`}
                    style={{
                      backgroundColor: `${node.color}20`,
                      borderColor: selectedNode === node.id ? '#60A5FA' : `${node.color}60`,
                    }}
                    onClick={() => setSelectedNode(node.id)}
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
                    onChange={(e) => updateNodeSize(selectedNode, e.target.value as any)}
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
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          nodes.find(n => n.id === selectedNode)?.color === color
                            ? 'border-white scale-110'
                            : 'border-slate-600 hover:border-white/50'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => addNode(selectedNode)}
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                  >
                    Add Child
                  </button>
                  <button
                    onClick={() => deleteNode(selectedNode)}
                    className="bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
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
                    className="w-full text-left p-2 bg-slate-600 hover:bg-slate-500 rounded-lg text-sm text-white transition-colors"
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
              <p>• Drag nodes to reposition them</p>
              <p>• Click nodes to select and edit</p>
              <p>• Use toolbar buttons to add nodes</p>
              <p>• AI suggestions help expand your map</p>
              <p>• Export your mind map as JSON</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 