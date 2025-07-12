'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../../utils/api';

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

interface ChatResponse {
  status: string;
  data?: {
    response: string;
    session_id: string;
    model?: string;
    response_time?: number;
    cached?: boolean;
    sources?: any[];
    used_rag?: boolean;
    // RAG specific fields
    reranking_applied?: boolean;
    reranker_info?: any;
    original_query?: string;
    enhanced_query?: string;
    query_rewriting_applied?: boolean;
    query_rewriter_info?: any;
    fact_checking_applied?: boolean;
    fact_checker_info?: any;
    context_analysis?: any;
    context_selector_used?: boolean;
    selected_context_length?: number;
    retrieval_results_count?: number;
    retrieval_steps?: number;
    query_type?: string;
  };
  // Fallback fields for backward compatibility
  response?: string;
  session_id?: string;
  model?: string;
  response_time?: number;
  cached?: boolean;
  sources?: any[];
  used_rag?: boolean;
  // RAG specific fields
  reranking_applied?: boolean;
  reranker_info?: any;
  original_query?: string;
  enhanced_query?: string;
  query_rewriting_applied?: boolean;
  query_rewriter_info?: any;
  fact_checking_applied?: boolean;
  fact_checker_info?: any;
  context_analysis?: any;
  context_selector_used?: boolean;
  selected_context_length?: number;
  retrieval_results_count?: number;
  retrieval_steps?: number;
  query_type?: string;
}

export function useChat(initialSessionId?: string) {
  const [currentSessionId, setCurrentSessionId] = useState<string | undefined>(initialSessionId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // RAG state-ovi
  const [useRAG, setUseRAG] = useState(true);
  const [useRerank, setUseRerank] = useState(true);
  const [useEnhancedContext, setUseEnhancedContext] = useState(false);
  const [useQueryRewriting, setUseQueryRewriting] = useState(false);
  const [useFactChecking, setUseFactChecking] = useState(false);

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    try {
      const data = await apiRequest(`/chat/history/${sessionId}`);
      if (data.status === 'success') {
        const formattedMessages = (Array.isArray(data.messages) ? data.messages : []).map((msg: any) => ({
          id: msg.id,
          sender: msg.sender,
          content: msg.content,
          timestamp: msg.timestamp,
          sources: msg.sources || [],
          used_rag: msg.used_rag || false,
          reaction: msg.reaction || null,
          // RAG specific fields
          reranking_applied: msg.reranking_applied || false,
          reranker_info: msg.reranker_info || null,
          original_query: msg.original_query || undefined,
          enhanced_query: msg.enhanced_query || undefined,
          query_rewriting_applied: msg.query_rewriting_applied || false,
          query_rewriter_info: msg.query_rewriter_info || null,
          fact_checking_applied: msg.fact_checking_applied || false,
          fact_checker_info: msg.fact_checker_info || null
        }));
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading session messages:', error);
    }
  }, []);

  // Load existing session from localStorage
  useEffect(() => {
    if (!initialSessionId) {
      const savedSessionId = localStorage.getItem('currentSessionId');
      if (savedSessionId) {
        setCurrentSessionId(savedSessionId);
        loadSessionMessages(savedSessionId);
      }
    }
  }, [initialSessionId, loadSessionMessages]);

  const createNewSession = useCallback(async (): Promise<string | undefined> => {
    try {
      const sessionId = crypto.randomUUID();
      setCurrentSessionId(sessionId);
      setMessages([]);
      localStorage.setItem('currentSessionId', sessionId);
      return sessionId;
    } catch (error) {
      console.error('Error creating new session:', error);
      return undefined;
    }
  }, []);

  const switchSession = useCallback(async (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setMessages([]);
    localStorage.setItem('currentSessionId', sessionId);
    await loadSessionMessages(sessionId);
  }, [loadSessionMessages]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !currentSessionId) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      sender: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      // Odaberi endpoint na osnovu RAG mode-a
      let endpoint = useRAG ? '/chat/rag' : '/chat';
      let body: any = {
        session_id: currentSessionId,
      };
      
      if (useRAG) {
        body.query = content.trim();
        body.use_rerank = useRerank;
        body.use_query_rewriting = useQueryRewriting;
        body.use_fact_checking = useFactChecking;
        
        if (useEnhancedContext) {
          endpoint = '/chat/rag-enhanced-context';
        } else if (useQueryRewriting || useFactChecking) {
          endpoint = '/chat/rag-optimized';
        }
      } else {
        body.content = content.trim();
        body.model = 'mistral:latest';
      }

      const response = await apiRequest(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }) as ChatResponse;

      if (response.status === 'success') {
        const responseData = response.data || response;
        const aiMessage: Message = {
          id: crypto.randomUUID(),
          sender: 'ai',
          content: responseData.response || 'Nema odgovora',
          timestamp: new Date().toISOString(),
          sources: responseData.sources || [],
          used_rag: responseData.used_rag || false,
          // RAG specific fields
          reranking_applied: responseData.reranking_applied || false,
          reranker_info: responseData.reranker_info || null,
          original_query: responseData.original_query || undefined,
          enhanced_query: responseData.enhanced_query || undefined,
          query_rewriting_applied: responseData.query_rewriting_applied || false,
          query_rewriter_info: responseData.query_rewriter_info || null,
          fact_checking_applied: responseData.fact_checking_applied || false,
          fact_checker_info: responseData.fact_checker_info || null
        };

        setMessages(prev => [...prev, aiMessage]);
      } else {
        // Add error message
        const errorMessage: Message = {
          id: crypto.randomUUID(),
          sender: 'ai',
          content: 'Greška u komunikaciji sa AI asistentom. Pokušajte ponovo.',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Add error message
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        sender: 'ai',
        content: 'Greška u povezivanju sa serverom. Proverite da li je backend pokrenut.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [currentSessionId, useRAG, useRerank, useEnhancedContext, useQueryRewriting, useFactChecking]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    currentSessionId,
    messages,
    isLoading,
    sendMessage,
    createNewSession,
    switchSession,
    clearMessages,
    loadSessionMessages,
    // RAG state-ovi i funkcije
    useRAG,
    setUseRAG,
    useRerank,
    setUseRerank,
    useEnhancedContext,
    setUseEnhancedContext,
    useQueryRewriting,
    setUseQueryRewriting,
    useFactChecking,
    setUseFactChecking
  };
} 