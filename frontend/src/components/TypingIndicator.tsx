'use client';

import { FaGraduationCap } from 'react-icons/fa';

interface TypingIndicatorProps {
  message?: string;
}

export default function TypingIndicator({ message = "AI piše..." }: TypingIndicatorProps) {
  return (
    <div className="flex items-center gap-2 p-3 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)]">
      <div className="flex items-center gap-1">
        <div className="w-2 h-2 bg-[var(--accent-blue)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-[var(--accent-blue)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-[var(--accent-blue)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm text-[var(--text-secondary)]">{message}</span>
    </div>
  );
} 