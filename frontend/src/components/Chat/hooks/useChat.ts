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
  
  // Streaming state-ovi
  const [useStreaming, setUseStreaming] = useState(true); // Ponovo uključeno
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  const loadSessionMessages = useCallback(async (sessionId: string) => {
    try {
      const data = await apiRequest(`/chat/history/${sessionId}`);
      if (data.status === 'success') {
        // Backend vraća data.data.messages, ne data.messages
        const messages = data.data?.messages || data.messages || [];
        const formattedMessages = (Array.isArray(messages) ? messages : []).map((msg: any) => ({
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
        console.log(`Učitano ${formattedMessages.length} poruka iz sesije ${sessionId}`);
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
      // Kreiraj sesiju preko backend-a
      const response = await apiRequest('/chat/new-session', { method: 'POST' });
      if (response.status === 'success' && response.data?.session_id) {
        const sessionId = response.data.session_id;
        setCurrentSessionId(sessionId);
        setMessages([]);
        localStorage.setItem('currentSessionId', sessionId);
        return sessionId;
      }
      return undefined;
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

  const sendMessageStreaming = useCallback(async (content: string) => {
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

    // Create AI message placeholder
    const aiMessageId = crypto.randomUUID();
    const aiMessage: Message = {
      id: aiMessageId,
      sender: 'ai',
      content: '',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, aiMessage]);
    setStreamingMessageId(aiMessageId);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.trim(),
          session_id: currentSessionId,
          user_id: 'default_user'
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body');
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'chunk') {
                fullContent += data.content;
                setMessages(prev => prev.map(msg => 
                  msg.id === aiMessageId 
                    ? { ...msg, content: fullContent }
                    : msg
                ));
              } else if (data.type === 'end') {
                // Streaming finished
                setStreamingMessageId(null);
                setIsLoading(false);
                return;
              } else if (data.type === 'error') {
                throw new Error(data.message);
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error in streaming chat:', error);
      
      // Update AI message with error
      setMessages(prev => prev.map(msg => 
        msg.id === aiMessageId 
          ? { ...msg, content: 'Greška u komunikaciji sa AI asistentom. Pokušajte ponovo.' }
          : msg
      ));
    } finally {
      setStreamingMessageId(null);
      setIsLoading(false);
    }
  }, [currentSessionId]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || !currentSessionId) return;

    // Use streaming if enabled
    if (useStreaming) {
      return sendMessageStreaming(content);
    }

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
        body.model = 'gpt-4';
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
  }, [currentSessionId, useRAG, useRerank, useEnhancedContext, useQueryRewriting, useFactChecking, useStreaming, sendMessageStreaming]);

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
    setUseFactChecking,
    // Streaming state-ovi i funkcije
    useStreaming,
    setUseStreaming,
    streamingMessageId,
    setStreamingMessageId
  };
} 