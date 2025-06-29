'use client';

import React, { useState } from 'react';
import { FaTrash } from 'react-icons/fa';
import { MindMapConnection } from './types';

interface MindMapConnectionProps {
  connection: MindMapConnection;
  fromPos: { x: number; y: number };
  toPos: { x: number; y: number };
  scale: number;
  onDelete: () => void;
}

export default function MindMapConnectionComponent({
  connection,
  fromPos,
  toPos,
  scale,
  onDelete
}: MindMapConnectionProps) {
  const [isHovered, setIsHovered] = useState(false);

  // Calculate connection path
  const dx = toPos.x - fromPos.x;
  const dy = toPos.y - fromPos.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  
  // Adjust start and end points to node boundaries
  const angle = Math.atan2(dy, dx);
  const nodeRadius = 25 * scale; // Approximate node radius
  
  const startX = fromPos.x + Math.cos(angle) * nodeRadius;
  const startY = fromPos.y + Math.sin(angle) * nodeRadius;
  const endX = toPos.x - Math.cos(angle) * nodeRadius;
  const endY = toPos.y - Math.sin(angle) * nodeRadius;

  // Create curved path
  const midX = (startX + endX) / 2;
  const midY = (startY + endY) / 2;
  const curveOffset = Math.min(distance * 0.1, 30);
  
  const controlX1 = startX + (midX - startX) * 0.5 + curveOffset * Math.sin(angle + Math.PI/2);
  const controlY1 = startY + (midY - startY) * 0.5 + curveOffset * Math.sin(angle + Math.PI/2);
  const controlX2 = endX - (endX - midX) * 0.5 + curveOffset * Math.sin(angle + Math.PI/2);
  const controlY2 = endY - (endY - midY) * 0.5 + curveOffset * Math.sin(angle + Math.PI/2);

  const pathData = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;

  // Get stroke style based on connection type
  const getStrokeStyle = () => {
    const thickness = connection.thickness || 2;
    const baseStyle = {
      stroke: connection.color,
      strokeWidth: thickness * scale,
      fill: 'none',
      opacity: isHovered ? 0.8 : 0.6
    };

    switch (connection.type) {
      case 'dashed':
        return { ...baseStyle, strokeDasharray: `${5 * scale} ${3 * scale}` };
      case 'dotted':
        return { ...baseStyle, strokeDasharray: `${2 * scale} ${2 * scale}` };
      default:
        return baseStyle;
    }
  };

  // Create hit area for interaction
  const hitAreaPath = `M ${startX} ${startY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${endX} ${endY}`;

  return (
    <g>
      {/* Hit area for interaction */}
      <path
        d={hitAreaPath}
        stroke="transparent"
        strokeWidth={20 * scale}
        fill="none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        style={{ cursor: 'pointer' }}
      />
      
      {/* Main connection line */}
      <path
        d={pathData}
        style={getStrokeStyle()}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      />
      
      {/* Arrow head */}
      <defs>
        <marker
          id={`arrowhead-${connection.id}`}
          markerWidth="10"
          markerHeight="7"
          refX="9"
          refY="3.5"
          orient="auto"
        >
          <polygon
            points="0 0, 10 3.5, 0 7"
            fill={connection.color}
            opacity={isHovered ? 0.8 : 0.6}
          />
        </marker>
      </defs>
      
      {/* Connection with arrow */}
      <path
        d={pathData}
        style={{
          ...getStrokeStyle(),
          markerEnd: `url(#arrowhead-${connection.id})`
        }}
      />
      
      {/* Delete button on hover */}
      {isHovered && (
        <g>
          <circle
            cx={midX}
            cy={midY}
            r={15 * scale}
            fill="rgba(239, 68, 68, 0.9)"
            stroke="white"
            strokeWidth={2 * scale}
            style={{ cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          />
          <text
            x={midX}
            y={midY}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="white"
            fontSize={12 * scale}
            style={{ pointerEvents: 'none' }}
          >
            <FaTrash size={12 * scale} />
          </text>
        </g>
      )}
      
      {/* Connection label */}
      {connection.label && (
        <text
          x={midX}
          y={midY - 20 * scale}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="white"
          fontSize={10 * scale}
          style={{
            pointerEvents: 'none',
            textShadow: '1px 1px 2px rgba(0,0,0,0.8)'
          }}
        >
          {connection.label}
        </text>
      )}
    </g>
  );
} 