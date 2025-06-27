'use client';

import { FaGraduationCap } from 'react-icons/fa';

interface TypingIndicatorProps {
  message?: string;
}

export default function TypingIndicator({ message = "AI piše..." }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-3 p-4 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] shadow-lg">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-4 h-4 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-4 h-4 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm font-medium text-[var(--text-secondary)]">{message}</span>
    </div>
  );
} 