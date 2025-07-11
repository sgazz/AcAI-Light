'use client';

import React from 'react';
import MindMapping from './MindMapping';
import { MindMapNode, MindMapConnection } from './types';

const sampleData = {
  nodes: [
    {
      id: 'root',
      content: 'AcAIA Projekt',
      position: { x: 400, y: 300 },
      color: '#6366f1',
      size: 'large' as const,
      parentId: null
    },
    {
      id: 'frontend',
      content: 'Frontend',
      position: { x: 200, y: 200 },
      color: '#8b5cf6',
      size: 'medium' as const,
      parentId: 'root'
    },
    {
      id: 'backend',
      content: 'Backend',
      position: { x: 600, y: 200 },
      color: '#ec4899',
      size: 'medium' as const,
      parentId: 'root'
    },
    {
      id: 'react',
      content: 'React',
      position: { x: 100, y: 100 },
      color: '#06b6d4',
      size: 'small' as const,
      parentId: 'frontend'
    },
    {
      id: 'typescript',
      content: 'TypeScript',
      position: { x: 300, y: 100 },
      color: '#3b82f6',
      size: 'small' as const,
      parentId: 'frontend'
    },
    {
      id: 'fastapi',
      content: 'FastAPI',
      position: { x: 500, y: 100 },
      color: '#22c55e',
      size: 'small' as const,
      parentId: 'backend'
    },
    {
              id: 'database',
        content: 'Database',
      position: { x: 700, y: 100 },
      color: '#f97316',
      size: 'small' as const,
      parentId: 'backend'
    }
  ] as MindMapNode[],
  
  connections: [
    {
      id: 'conn1',
      from: 'root',
      to: 'frontend',
      type: 'solid',
      color: '#6366f1',
      thickness: 3
    },
    {
      id: 'conn2',
      from: 'root',
      to: 'backend',
      type: 'solid',
      color: '#6366f1',
      thickness: 3
    },
    {
      id: 'conn3',
      from: 'frontend',
      to: 'react',
      type: 'dashed',
      color: '#8b5cf6',
      thickness: 2
    },
    {
      id: 'conn4',
      from: 'frontend',
      to: 'typescript',
      type: 'dashed',
      color: '#8b5cf6',
      thickness: 2
    },
    {
      id: 'conn5',
      from: 'backend',
      to: 'fastapi',
      type: 'dashed',
      color: '#ec4899',
      thickness: 2
    },
    {
      id: 'conn6',
      from: 'backend',
              to: 'database',
      type: 'dashed',
      color: '#ec4899',
      thickness: 2
    }
  ] as MindMapConnection[]
};

export default function MindMappingTest() {
  const handleSave = (data: { nodes: MindMapNode[]; connections: MindMapConnection[] }) => {
    console.log('Saving mind map:', data);
    // Ovde bi se implementiralo čuvanje u bazu
  };

  const handleExport = (format: 'png' | 'svg' | 'json') => {
    console.log(`Exporting mind map as ${format}`);
    // Ovde bi se implementiralo export funkcionalnost
  };

  return (
    <div className="h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <MindMapping
        initialData={sampleData}
        onSave={handleSave}
        onExport={handleExport}
      />
    </div>
  );
} 