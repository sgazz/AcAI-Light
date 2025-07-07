'use client';

import React from 'react';
import { FaRobot } from 'react-icons/fa';

export default function TypingIndicator() {
  return (
    <div className="flex gap-4 justify-start">
      {/* AI Avatar */}
      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
        <FaRobot size={16} className="text-white" />
      </div>

      {/* Typing Animation */}
      <div className="flex flex-col">
        <div className="px-4 py-3 bg-slate-700/50 border border-white/10 rounded-2xl">
          <div className="flex items-center gap-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm text-slate-400">AI kuca...</span>
          </div>
        </div>
      </div>
    </div>
  );
} 