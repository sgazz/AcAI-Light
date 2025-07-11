'use client';

import React, { useState } from 'react';
import { FaUser, FaRobot, FaThumbsUp, FaThumbsDown, FaCopy, FaEdit, FaTrash } from 'react-icons/fa';
import { FaRegCopy } from 'react-icons/fa6';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
  sources?: any[];
  used_rag?: boolean;
  reaction?: 'like' | 'dislike' | null;
  // RAG specific fields
  reranking_applied?: boolean;
  reranker_info?: {
    model_name: string;
    model_loaded: boolean;
    model_type: string;
  };
  original_query?: string;
  enhanced_query?: string;
  query_rewriting_applied?: boolean;
  query_rewriter_info?: {
    model_name: string;
    confidence: number;
    improvements: string[];
  };
  fact_checking_applied?: boolean;
  fact_checker_info?: {
    verified: boolean;
    confidence: number;
    reasoning: string;
    sources: string[];
  };
}

interface MessageItemProps {
  message: Message;
  isLast: boolean;
}

export default function MessageItem({ message, isLast }: MessageItemProps) {
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);

  const isUser = message.sender === 'user';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('sr-RS', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div
      className={`group flex gap-4 ${isUser ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <FaRobot size={16} className="text-white" />
        </div>
      )}

      {/* Message Content */}
      <div className={`flex flex-col max-w-[80%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`
            relative px-3 py-2 rounded-2xl shadow-sm
            ${isUser 
              ? 'bg-blue-600 text-white' 
              : 'bg-slate-700/50 text-white border border-white/10'
            }
          `}
        >
          {/* Message Text */}
          <div className="whitespace-pre-wrap break-words">
            {message.content}
          </div>

          {/* RAG Indicators */}
          {!isUser && message.used_rag && (
            <div className="mt-2 space-y-1">
              {/* RAG Status */}
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span>Korišćeni dokumenti</span>
              </div>
              
              {/* Re-ranking indicator */}
              {message.reranking_applied && (
                <div className="flex items-center gap-2 text-xs text-purple-400">
                  <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                  <span>Re-ranking primenjen</span>
                </div>
              )}
              
              {/* Query Rewriting indicator */}
              {message.query_rewriting_applied && (
                <div className="flex items-center gap-2 text-xs text-orange-400">
                  <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                  <span>Query rewriting primenjen</span>
                </div>
              )}
              
              {/* Fact Checking indicator */}
              {message.fact_checking_applied && (
                <div className="flex items-center gap-2 text-xs text-green-400">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                  <span>Fact checking primenjen</span>
                </div>
              )}
            </div>
          )}

          {/* Sources */}
          {!isUser && message.sources && message.sources.length > 0 && (
            <div className="mt-3 pt-3 border-t border-white/10">
              <div className="text-xs text-slate-400 mb-2">Izvori:</div>
              <div className="space-y-1">
                {message.sources.slice(0, 3).map((source, index) => (
                  <div key={index} className="text-xs text-blue-400 hover:text-blue-300 cursor-pointer">
                    📄 {source.title || source.filename || `Dokument ${index + 1}`}
                  </div>
                ))}
                {message.sources.length > 3 && (
                  <div className="text-xs text-slate-500">
                    +{message.sources.length - 3} više izvora
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Message Footer */}
        <div className={`flex items-center gap-3 mt-2 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          {/* Timestamp */}
          <span className="text-xs text-slate-400">
            {formatTime(message.timestamp)}
          </span>

          {/* Actions */}
          <div className={`flex items-center gap-1 ${showActions ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
            {/* Copy Button */}
            <button
              onClick={handleCopy}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title="Kopiraj poruku"
            >
              {copied ? <FaCopy size={12} className="text-green-400" /> : <FaRegCopy size={12} />}
            </button>

            {/* Reaction Buttons (for AI messages) */}
            {!isUser && (
              <>
                <button
                  className={`p-1 transition-colors ${
                    message.reaction === 'like' 
                      ? 'text-green-400' 
                      : 'text-slate-400 hover:text-green-400'
                  }`}
                  title="Sviđa mi se"
                >
                  <FaThumbsUp size={12} />
                </button>
                <button
                  className={`p-1 transition-colors ${
                    message.reaction === 'dislike' 
                      ? 'text-red-400' 
                      : 'text-slate-400 hover:text-red-400'
                  }`}
                  title="Ne sviđa mi se"
                >
                  <FaThumbsDown size={12} />
                </button>
              </>
            )}

            {/* Edit/Delete (for user messages) */}
            {isUser && (
              <>
                <button
                  className="p-1 text-slate-400 hover:text-yellow-400 transition-colors"
                  title="Izmeni poruku"
                >
                  <FaEdit size={12} />
                </button>
                <button
                  className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                  title="Obriši poruku"
                >
                  <FaTrash size={12} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-r from-green-500 to-blue-600 rounded-full flex items-center justify-center">
          <FaUser size={16} className="text-white" />
        </div>
      )}
    </div>
  );
} 