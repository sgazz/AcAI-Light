'use client';

import { FaGraduationCap } from 'react-icons/fa';

interface TypingIndicatorProps {
  message?: string;
}

export default function TypingIndicator({ message = "AI piše..." }: TypingIndicatorProps) {
  return (
    <div className="group relative p-6 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl border border-white/10 shadow-lg backdrop-blur-sm">
      {/* Hover glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      
      <div className="relative flex items-center gap-4">
        {/* Premium AI Icon */}
        <div className="relative">
          <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg">
            <FaGraduationCap className="text-white" size={20} />
          </div>
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
        </div>
        
        {/* Premium Typing Animation */}
        <div className="flex items-center gap-2">
          <div className="flex space-x-1">
            <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
          <span className="text-sm font-medium text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            {message}
          </span>
        </div>
      </div>
    </div>
  );
} 