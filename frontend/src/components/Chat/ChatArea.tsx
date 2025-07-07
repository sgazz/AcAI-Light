'use client';

import React, { useRef, useEffect, useState } from 'react';
import { FaToggleOn, FaToggleOff, FaCog, FaBook, FaMagic, FaBrain } from 'react-icons/fa';
import MessageList from './MessageList';
import ChatInput from './ChatInput';

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

interface ChatAreaProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (message: string) => Promise<void>;
  sessionId?: string;
  // RAG props
  useRAG?: boolean;
  setUseRAG?: (value: boolean) => void;
  useRerank?: boolean;
  setUseRerank?: (value: boolean) => void;
  useEnhancedContext?: boolean;
  setUseEnhancedContext?: (value: boolean) => void;
  useQueryRewriting?: boolean;
  setUseQueryRewriting?: (value: boolean) => void;
  useFactChecking?: boolean;
  setUseFactChecking?: (value: boolean) => void;
}

export default function ChatArea({
  messages,
  isLoading,
  onSendMessage,
  sessionId,
  // RAG props
  useRAG = true,
  setUseRAG,
  useRerank = true,
  setUseRerank,
  useEnhancedContext = false,
  setUseEnhancedContext,
  useQueryRewriting = false,
  setUseQueryRewriting,
  useFactChecking = false,
  setUseFactChecking
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close settings when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };

    if (isSettingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSettingsOpen]);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Messages Area */}
      <div className="flex-1 overflow-hidden">
        <MessageList 
          messages={messages} 
          isLoading={isLoading}
        />
        <div ref={messagesEndRef} />
      </div>

      {/* RAG Controls Bar */}
      <div className="border-t border-white/10 bg-slate-800/50 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-2">
          {/* RAG Status */}
          <div className="flex items-center gap-3">
            {useRAG && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <span className="text-blue-400 font-medium">RAG Aktivan</span>
                {useRerank && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
                    <span className="text-purple-400 text-xs">Re-rank</span>
                  </div>
                )}
                {useEnhancedContext && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></div>
                    <span className="text-cyan-400 text-xs">Enhanced</span>
                  </div>
                )}
                {useQueryRewriting && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-orange-400 rounded-full"></div>
                    <span className="text-orange-400 text-xs">Query Rewrite</span>
                  </div>
                )}
                {useFactChecking && (
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                    <span className="text-green-400 text-xs">Fact Check</span>
                  </div>
                )}
              </div>
            )}
            {!useRAG && (
              <div className="flex items-center gap-2 text-sm">
                <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                <span className="text-slate-400">Standardni Chat</span>
              </div>
            )}
          </div>

          {/* Settings Button */}
          <div className="relative" ref={settingsRef}>
            <button
              onClick={() => setIsSettingsOpen(!isSettingsOpen)}
              className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="RAG postavke"
            >
              <FaCog size={14} />
              <span className="text-sm">RAG</span>
            </button>

            {/* Settings Dropdown */}
            {isSettingsOpen && (
              <div className="absolute bottom-full right-0 mb-2 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-xl p-4 z-50">
                <div className="space-y-3">
                  {/* RAG Toggle */}
                  <div className="group relative">
                    <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-xl border border-white/10 hover:border-blue-500/30 transition-colors">
                      <FaBook className="text-blue-400" size={14} />
                      <span className="text-xs text-slate-400 group-hover:text-white">RAG Mode</span>
                      <button
                        onClick={() => setUseRAG?.(!useRAG)}
                        className="flex items-center gap-1 text-sm ml-auto"
                      >
                        {useRAG ? (
                          <>
                            <FaToggleOn className="text-green-500" size={16} />
                            <span className="text-green-400 font-medium">Uključen</span>
                          </>
                        ) : (
                          <>
                            <FaToggleOff className="text-slate-500" size={16} />
                            <span className="text-slate-400">Isključen</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Enhanced Context Toggle */}
                  {useRAG && (
                    <div className="group relative">
                      <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-xl border border-white/10 hover:border-cyan-500/30 transition-colors">
                        <FaBrain className="text-cyan-400" size={14} />
                        <span className="text-xs text-slate-400 group-hover:text-white">Enhanced Context</span>
                        <button
                          onClick={() => setUseEnhancedContext?.(!useEnhancedContext)}
                          className="flex items-center gap-1 text-sm ml-auto"
                        >
                          {useEnhancedContext ? (
                            <>
                              <FaToggleOn className="text-cyan-400" size={16} />
                              <span className="text-cyan-300 font-medium">Uključen</span>
                            </>
                          ) : (
                            <>
                              <FaToggleOff className="text-slate-500" size={16} />
                              <span className="text-slate-400">Isključen</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Re-ranking Toggle */}
                  {useRAG && (
                    <div className="group relative">
                      <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-xl border border-white/10 hover:border-purple-500/30 transition-colors">
                        <FaMagic className="text-purple-400" size={14} />
                        <span className="text-xs text-slate-400 group-hover:text-white">Re-ranking</span>
                        <button
                          onClick={() => setUseRerank?.(!useRerank)}
                          className="flex items-center gap-1 text-sm ml-auto"
                        >
                          {useRerank ? (
                            <>
                              <FaToggleOn className="text-purple-500" size={16} />
                              <span className="text-purple-400 font-medium">Uključen</span>
                            </>
                          ) : (
                            <>
                              <FaToggleOff className="text-slate-500" size={16} />
                              <span className="text-slate-400">Isključen</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Query Rewriting Toggle */}
                  {useRAG && (
                    <div className="group relative">
                      <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-xl border border-white/10 hover:border-orange-500/30 transition-colors">
                        <FaMagic className="text-orange-400" size={14} />
                        <span className="text-xs text-slate-400 group-hover:text-white">Query Rewriting</span>
                        <button
                          onClick={() => setUseQueryRewriting?.(!useQueryRewriting)}
                          className="flex items-center gap-1 text-sm ml-auto"
                        >
                          {useQueryRewriting ? (
                            <>
                              <FaToggleOn className="text-orange-400" size={16} />
                              <span className="text-orange-300 font-medium">Uključen</span>
                            </>
                          ) : (
                            <>
                              <FaToggleOff className="text-slate-500" size={16} />
                              <span className="text-slate-400">Isključen</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Fact Checking Toggle */}
                  {useRAG && (
                    <div className="group relative">
                      <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-xl border border-white/10 hover:border-green-500/30 transition-colors">
                        <FaBrain className="text-green-400" size={14} />
                        <span className="text-xs text-slate-400 group-hover:text-white">Fact Checking</span>
                        <button
                          onClick={() => setUseFactChecking?.(!useFactChecking)}
                          className="flex items-center gap-1 text-sm ml-auto"
                        >
                          {useFactChecking ? (
                            <>
                              <FaToggleOn className="text-green-500" size={16} />
                              <span className="text-green-400 font-medium">Uključen</span>
                            </>
                          ) : (
                            <>
                              <FaToggleOff className="text-slate-500" size={16} />
                              <span className="text-slate-400">Isključen</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-white/10 bg-slate-800/50 backdrop-blur-sm">
        <ChatInput 
          onSendMessage={onSendMessage}
          isLoading={isLoading}
          sessionId={sessionId}
          useRAG={useRAG}
        />
      </div>
    </div>
  );
} 