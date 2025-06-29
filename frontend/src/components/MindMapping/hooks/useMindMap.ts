import { useState, useCallback, useRef } from 'react';
import { MindMapNode, MindMapConnection, MindMapState } from '../types';

export const useMindMap = (initialData?: { nodes: MindMapNode[]; connections: MindMapConnection[] }) => {
  const [state, setState] = useState<MindMapState>({
    nodes: initialData?.nodes || [],
    connections: initialData?.connections || [],
    selectedNode: null,
    history: [],
    historyIndex: -1
  });

  const maxHistorySize = useRef(50);
  const nodeIdCounter = useRef(0);
  const connectionIdCounter = useRef(0);

  // Funkcija za generisanje jedinstvenih ID-jeva
  const generateNodeId = useCallback(() => {
    nodeIdCounter.current += 1;
    return `node-${Date.now()}-${nodeIdCounter.current}`;
  }, []);

  const generateConnectionId = useCallback(() => {
    connectionIdCounter.current += 1;
    return `conn-${Date.now()}-${connectionIdCounter.current}`;
  }, []);

  const saveToHistory = useCallback((newState: Partial<MindMapState>) => {
    setState(prevState => {
      const newHistory = [...prevState.history.slice(0, prevState.historyIndex + 1), {
        nodes: prevState.nodes,
        connections: prevState.connections
      }].slice(-maxHistorySize.current);

      return {
        ...prevState,
        ...newState,
        history: newHistory,
        historyIndex: newHistory.length - 1
      };
    });
  }, []);

  const addNode = useCallback((node: MindMapNode) => {
    setState(prevState => {
      // Proveri da li čvor sa istim ID već postoji
      const existingNode = prevState.nodes.find(n => n.id === node.id);
      if (existingNode) {
        console.warn(`Čvor sa ID ${node.id} već postoji, preskačem dodavanje`);
        return prevState;
      }
      
      const newNodes = [...prevState.nodes, node];
      saveToHistory({ nodes: newNodes });
      return { ...prevState, nodes: newNodes };
    });
  }, [saveToHistory]);

  const updateNode = useCallback((nodeId: string, updates: Partial<MindMapNode>) => {
    setState(prevState => {
      const newNodes = prevState.nodes.map(node =>
        node.id === nodeId ? { ...node, ...updates } : node
      );
      saveToHistory({ nodes: newNodes });
      return { ...prevState, nodes: newNodes };
    });
  }, [saveToHistory]);

  const deleteNode = useCallback((nodeId: string) => {
    setState(prevState => {
      const newNodes = prevState.nodes.filter(node => node.id !== nodeId);
      const newConnections = prevState.connections.filter(
        conn => conn.from !== nodeId && conn.to !== nodeId
      );
      const newSelectedNode = prevState.selectedNode?.id === nodeId ? null : prevState.selectedNode;
      
      saveToHistory({ nodes: newNodes, connections: newConnections, selectedNode: newSelectedNode });
      return {
        ...prevState,
        nodes: newNodes,
        connections: newConnections,
        selectedNode: newSelectedNode
      };
    });
  }, [saveToHistory]);

  const addConnection = useCallback((connection: MindMapConnection) => {
    setState(prevState => {
      // Proveri da li veza sa istim ID već postoji
      const existingConnection = prevState.connections.find(c => c.id === connection.id);
      if (existingConnection) {
        console.warn(`Veza sa ID ${connection.id} već postoji, preskačem dodavanje`);
        return prevState;
      }
      
      const newConnections = [...prevState.connections, connection];
      saveToHistory({ connections: newConnections });
      return { ...prevState, connections: newConnections };
    });
  }, [saveToHistory]);

  const deleteConnection = useCallback((connectionId: string) => {
    setState(prevState => {
      const newConnections = prevState.connections.filter(conn => conn.id !== connectionId);
      saveToHistory({ connections: newConnections });
      return { ...prevState, connections: newConnections };
    });
  }, [saveToHistory]);

  const selectNode = useCallback((node: MindMapNode | null) => {
    setState(prevState => ({ ...prevState, selectedNode: node }));
  }, []);

  const undo = useCallback(() => {
    setState(prevState => {
      if (prevState.historyIndex > 0) {
        const newIndex = prevState.historyIndex - 1;
        const historyEntry = prevState.history[newIndex];
        return {
          ...prevState,
          nodes: historyEntry.nodes,
          connections: historyEntry.connections,
          historyIndex: newIndex
        };
      }
      return prevState;
    });
  }, []);

  const redo = useCallback(() => {
    setState(prevState => {
      if (prevState.historyIndex < prevState.history.length - 1) {
        const newIndex = prevState.historyIndex + 1;
        const historyEntry = prevState.history[newIndex];
        return {
          ...prevState,
          nodes: historyEntry.nodes,
          connections: historyEntry.connections,
          historyIndex: newIndex
        };
      }
      return prevState;
    });
  }, []);

  const clearMap = useCallback(() => {
    setState(prevState => {
      saveToHistory({ nodes: [], connections: [], selectedNode: null });
      return {
        ...prevState,
        nodes: [],
        connections: [],
        selectedNode: null
      };
    });
  }, [saveToHistory]);

  const exportToJSON = useCallback(() => {
    const data = {
      nodes: state.nodes,
      connections: state.connections,
      exportDate: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindmap-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [state.nodes, state.connections]);

  const importFromJSON = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.nodes && data.connections) {
          setState(prevState => {
            saveToHistory({ nodes: data.nodes, connections: data.connections, selectedNode: null });
            return {
              ...prevState,
              nodes: data.nodes,
              connections: data.connections,
              selectedNode: null
            };
          });
        }
      } catch (error) {
        console.error('Greška pri importu:', error);
      }
    };
    reader.readAsText(file);
  }, [saveToHistory]);

  const exportToImage = useCallback(async (format: 'png' | 'svg') => {
    // Implementacija export-a u sliku
    console.log(`Export u ${format} format`);
  }, []);

  return {
    nodes: state.nodes,
    connections: state.connections,
    selectedNode: state.selectedNode,
    addNode,
    updateNode,
    deleteNode,
    addConnection,
    deleteConnection,
    selectNode,
    undo,
    redo,
    canUndo: state.historyIndex > 0,
    canRedo: state.historyIndex < state.history.length - 1,
    exportToImage,
    exportToJSON,
    importFromJSON,
    clearMap,
    generateNodeId,
    generateConnectionId
  };
}; 