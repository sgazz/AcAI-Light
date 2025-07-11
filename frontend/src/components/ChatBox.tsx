'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FaGraduationCap, FaToggleOn, FaToggleOff, FaBook, FaKeyboard, FaHistory, FaPlus } from 'react-icons/fa';
import SourcesDisplay from './SourcesDisplay';
import ChatHistorySidebar from './ChatHistorySidebar';
import MessageRenderer from './MessageRenderer';
import TypingIndicator from './TypingIndicator';
import ThemeToggle from './ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';
import { CHAT_NEW_SESSION_ENDPOINT, CHAT_ENDPOINT, CHAT_RAG_ENDPOINT, CHAT_RAG_ENHANCED_CONTEXT_ENDPOINT, QUERY_ENHANCE_ENDPOINT, FACT_CHECK_VERIFY_ENDPOINT, createSessionMetadata, apiRequest } from '../utils/api';
import { useErrorToast } from './ErrorToastProvider';
import { FixedSizeList as List } from 'react-window';

interface Message {
  id?: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp?: string;
  sources?: Array<{
    filename: string;
    page: number;
    score: number;
    content: string;
    rerank_score?: number;
    original_score?: number;
    file_type: string;
    page_number: number;
    chunk_index: number;
  }>;
  used_rag?: boolean;
  reranking_applied?: boolean;
  reranker_info?: {
    model_name: string;
    model_loaded: boolean;
    model_type: string;
  };
  // Query Rewriting fields
  original_query?: string;
  enhanced_query?: string;
  query_rewriting_applied?: boolean;
  query_rewriter_info?: {
    model_name: string;
    confidence: number;
    improvements: string[];
  };
  // Fact Checking fields
  fact_checking_applied?: boolean;
  fact_checker_info?: {
    verified: boolean;
    confidence: number;
    reasoning: string;
    sources: string[];
  };
  // Reaction field
  reaction?: 'like' | 'dislike' | null;
}

export default function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [useRAG, setUseRAG] = useState(true);
  const [useRerank, setUseRerank] = useState(true);
  const [useEnhancedContext, setUseEnhancedContext] = useState(false);
  const [useQueryRewriting, setUseQueryRewriting] = useState(false);
  const [useFactChecking, setUseFactChecking] = useState(false);
  const [lastContextAnalysis, setLastContextAnalysis] = useState<any>(null);
  const [queryHistory, setQueryHistory] = useState<Array<{original: string, enhanced: string, timestamp: string}>>([]);
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);
  const [sourceModal, setSourceModal] = useState<{ open: boolean, source: any } | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editInput, setEditInput] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const { showError, showSuccess, showWarning } = useErrorToast();

  // Debounced input handling
  const [debouncedInput, setDebouncedInput] = useState(input);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedInput(input);
    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [input]);

  // Auto-resize textarea
  const resizeTextarea = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      const scrollHeight = inputRef.current.scrollHeight;
      const maxHeight = 200; // max height in pixels
      const newHeight = Math.min(scrollHeight, maxHeight);
      inputRef.current.style.height = `${newHeight}px`;
    }
  }, []);

  useEffect(() => {
    resizeTextarea();
  }, [input, resizeTextarea]);

  // Handle input change with debouncing
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  // Pročitaj session ID iz localStorage ili kreiraj novu sesiju
  useEffect(() => {
    const savedSessionId = localStorage.getItem('currentSessionId');
    const savedSessionTitle = localStorage.getItem('currentSessionTitle');
    
    if (savedSessionId && savedSessionTitle) {
      // Koristi postojeću sesiju
      setSessionId(savedSessionId);
      console.log('Using existing session:', { sessionId: savedSessionId, title: savedSessionTitle });
    } else if (!sessionId) {
      // Kreiraj novu sesiju samo ako nema postojeće
      createNewSession();
    }
  }, [sessionId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Enter za slanje poruke
      if (e.ctrlKey && e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (input.trim() && !isLoading) {
          handleSendMessage();
        }
      }
      
      // Ctrl+N za novu sesiju
      if (e.ctrlKey && e.key === 'n') {
        e.preventDefault();
        createNewSession();
      }
      
      // Ctrl+K za brisanje chat-a
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault();
        setMessages([]);
      }
      
      // Ctrl+L za fokusiranje na input
      if (e.ctrlKey && e.key === 'l') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [input, isLoading]);

  // Zatvori settings dropdown na klik van njega
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setIsSettingsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const createNewSession = async () => {
    try {
      const data = await apiRequest(CHAT_NEW_SESSION_ENDPOINT, {
        method: 'POST',
      });
      
      if (data.session_id) {
        setSessionId(data.session_id);
        setMessages([]); // Resetuj poruke za novu sesiju
        
        // Očisti localStorage
        localStorage.removeItem('currentSessionId');
        localStorage.removeItem('currentSessionTitle');
        localStorage.removeItem('currentSessionType');
        
        // Automatski kreiraj session metadata
        try {
          await createSessionMetadata(data.session_id, `Sesija ${new Date().toLocaleString('sr-RS')}`, 'Automatski kreirana sesija');
        } catch (metadataError) {
          console.warn('Greška pri kreiranju session metadata:', metadataError);
          // Ne prikazuj grešku korisniku jer je ovo opciono
        }
        
        showSuccess('Nova sesija kreirana', 'Sesija');
      }
    } catch (error: any) {
      console.error('Greška pri kreiranju sesije:', error);
      showError(
        error.message || 'Greška pri kreiranju nove sesije',
        'Greška sesije',
        true,
        createNewSession
      );
    }
  };

  const enhanceQuery = async (originalQuery: string): Promise<string> => {
    if (!useQueryRewriting) return originalQuery;
    
    try {
      const data = await apiRequest(QUERY_ENHANCE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: originalQuery,
          context: lastContextAnalysis ? JSON.stringify(lastContextAnalysis) : ""
        }),
      });

      if (data.status === 'success' && data.enhanced_query) {
        // Dodaj u istoriju
        setQueryHistory(prev => [...prev, {
          original: originalQuery,
          enhanced: data.enhanced_query,
          timestamp: new Date().toISOString()
        }]);
        
        showSuccess('Upit poboljšan', 'Query Rewriting');
        return data.enhanced_query;
      }
    } catch (error: any) {
      console.error('Greška pri poboljšanju upita:', error);
      showWarning('Query rewriting nije uspeo, koristi se originalni upit', 'Query Rewriting');
    }
    
    return originalQuery;
  };

  const verifyAnswer = async (answer: string, context: string): Promise<any> => {
    if (!useFactChecking) return null;
    
    try {
      const data = await apiRequest(FACT_CHECK_VERIFY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          answer: answer,
          context: context
        }),
      });

      if (data.status === 'success') {
        showSuccess('Odgovor verifikovan', 'Fact Checking');
        return data.verification_result;
      }
    } catch (error: any) {
      console.error('Greška pri verifikaciji odgovora:', error);
      showWarning('Fact checking nije uspeo', 'Fact Checking');
    }
    
    return null;
  };

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const originalMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Poboljšaj upit ako je query rewriting uključen
    const enhancedMessage = await enhanceQuery(originalMessage);
    
    // Dodaj korisničku poruku odmah
    const userMessageId = crypto.randomUUID();
    const newUserMessage: Message = {
      id: userMessageId,
      sender: 'user',
      content: originalMessage,
      original_query: originalMessage,
      enhanced_query: enhancedMessage !== originalMessage ? enhancedMessage : undefined,
      query_rewriting_applied: enhancedMessage !== originalMessage,
    };
    console.log('Creating user message with ID:', userMessageId);
    setMessages(prev => [...prev, newUserMessage]);

    try {
      // Odaberi endpoint na osnovu RAG mode-a
      let endpoint = useRAG ? CHAT_RAG_ENDPOINT : CHAT_ENDPOINT;
      let body: any = {
        message: enhancedMessage, // Koristi poboljšani upit
        session_id: sessionId,
      };
      
      if (useRAG) {
        body.use_rerank = useRerank;
        if (useEnhancedContext) {
          endpoint = CHAT_RAG_ENHANCED_CONTEXT_ENDPOINT;
          // Enhanced context backend ignoriše use_rerank, ali šaljemo za kompatibilnost
        }
      } else {
        // Za običan chat, dodaj model parametar
        body.model = "mistral:latest";
      }

      const data = await apiRequest(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (data.status === 'success') {
        // Verifikuj odgovor ako je fact checking uključen
        const factCheckResult = await verifyAnswer(data.response, JSON.stringify(data.sources || []));
        
        // Dodaj AI odgovor sa izvorima ako postoje
        const aiMessageId = crypto.randomUUID();
        const aiMessage: Message = {
          id: aiMessageId,
          sender: 'ai',
          content: data.response,
          sources: data.sources || [],
          used_rag: data.used_rag || false,
          reranking_applied: data.reranking_applied || false,
          reranker_info: data.reranker_info || null,
          fact_checking_applied: factCheckResult !== null,
          fact_checker_info: factCheckResult,
        };
        console.log('Creating AI message with ID:', aiMessageId);
        setMessages(prev => [...prev, aiMessage]);
        setLastContextAnalysis(data.context_analysis || null);
        
        // Prikaži success toast ako je RAG korišćen
        if (useRAG && (data.used_rag || data.context_selector_used) && data.sources && data.sources.length > 0) {
          showSuccess(`Pronađeno ${data.sources.length} relevantnih izvora`, 'RAG uspešan');
        } else if (!useRAG) {
          showSuccess('Odgovor uspešno generisan', 'Chat');
        }
      } else {
        // Dodaj error poruku
        const errorMessageId = crypto.randomUUID();
        const errorMessage: Message = {
          id: errorMessageId,
          sender: 'ai',
          content: 'Izvinjavam se, došlo je do greške. Pokušajte ponovo.',
        };
        console.log('Creating error message with ID:', errorMessageId);
        setMessages(prev => [...prev, errorMessage]);
        setLastContextAnalysis(null);
        showError(data.message || 'Greška pri slanju poruke', 'Greška chat-a', true, () => handleSendMessage());
      }
    } catch (error: any) {
      console.error('Greška pri slanju poruke:', error);
      // Dodaj error poruku u chat
      const errorMessageId = crypto.randomUUID();
      const errorMessage: Message = {
        id: errorMessageId,
        sender: 'ai',
        content: 'Greška u povezivanju sa serverom. Proverite da li je backend pokrenut.',
      };
      console.log('Creating error message with ID:', errorMessageId);
      setMessages(prev => [...prev, errorMessage]);
      setLastContextAnalysis(null);
      showError(
        error.message || 'Greška u povezivanju sa serverom',
        'Greška konekcije',
        true,
        () => handleSendMessage()
      );
    } finally {
      // Dodaj malo kašnjenja da se TypingIndicator vidi
      setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    await handleSendMessage();
  };

  const handleReaction = (messageId: string, reaction: 'like' | 'dislike') => {
    setMessages(prev => prev.map(msg => 
      msg.id === messageId 
        ? { ...msg, reaction: msg.reaction === reaction ? null : reaction }
        : msg
    ));
    
    // Ovde bi mogli da šaljemo reaction na backend
    console.log(`Reaction ${reaction} za poruku ${messageId}`);
  };

  const handleSourceClick = (source: any) => {
    setSourceModal({ open: true, source });
  };

  const handleRestoreSessionFromHistory = (sessionId: string, messages: any[]) => {
    console.log('Restoring session from history:', { sessionId, messageCount: messages.length });
    
    // Postavi session ID
    setSessionId(sessionId);
    
    // Konvertuj poruke u odgovarajući format
    const convertedMessages = messages.map((msg: any) => ({
      id: msg.id,
      sender: msg.sender,
      content: msg.content,
      timestamp: msg.timestamp,
      sources: msg.sources || [],
      used_rag: msg.used_rag || false,
      reranking_applied: msg.reranking_applied || false,
      reranker_info: msg.reranker_info,
      original_query: msg.original_query,
      enhanced_query: msg.enhanced_query,
      query_rewriting_applied: msg.query_rewriting_applied || false,
      query_rewriter_info: msg.query_rewriter_info,
      fact_checking_applied: msg.fact_checking_applied || false,
      fact_checker_info: msg.fact_checker_info,
      reaction: msg.reaction || null
    }));
    
    // Postavi poruke
    setMessages(convertedMessages);
    
    // Sačuvaj session ID u localStorage
    localStorage.setItem('currentSessionId', sessionId);
    
    // Prikaži toast
    showSuccess(`Sesija povraćena: ${sessionId.slice(0, 8)}...`, 'Povratak sesije');
  };

  const handleEditMessage = (messageId: string) => {
    const message = messages.find(msg => msg.id === messageId);
    if (message) {
      setEditingMessageId(messageId);
      setEditInput(message.content);
    }
  };

  const handleUndoMessage = (messageId: string) => {
    // Ukloni poslednju korisničku poruku
    setMessages(prev => prev.filter(msg => msg.id !== messageId));
    showSuccess('Poruka poništena', 'Undo');
  };

  const handleSaveEdit = () => {
    if (editingMessageId && editInput.trim()) {
      setMessages(prev => prev.map(msg => 
        msg.id === editingMessageId 
          ? { ...msg, content: editInput.trim() }
          : msg
      ));
      setEditingMessageId(null);
      setEditInput('');
      showSuccess('Poruka izmenjena', 'Edit');
    }
  };

  // Virtual scrolling setup
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(600);
  const [containerWidth, setContainerWidth] = useState(800);
  const ITEM_HEIGHT = 200; // Approximate height per message

  // Update container dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(rect.height);
        setContainerWidth(rect.width);
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Memoized message renderer for virtual scrolling
  const MessageRow = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const msg = messages[index];
    if (!msg) return null;

    const isLastUserMessage = msg.sender === 'user' && 
      index === messages.length - 1 && 
      !isLoading;

    return (
      <div style={style} className="px-4 lg:px-6">
        <div className="group">
          <MessageRenderer
            content={msg.content}
            sender={msg.sender}
            timestamp={msg.timestamp}
            messageId={msg.id}
            onReaction={handleReaction}
            initialReaction={msg.reaction}
            isLastUserMessage={isLastUserMessage}
            aiTyping={isLoading}
            onEdit={handleEditMessage}
            onUndo={handleUndoMessage}
            editing={editingMessageId === msg.id}
            editInput={editInput}
            setEditInput={setEditInput}
            saveEdit={handleSaveEdit}
          />
          
          {/* Prikaži izvore za AI poruke */}
          {msg.sender === 'ai' && msg.sources && msg.sources.length > 0 && (
            <div className="mt-2 ml-4 lg:ml-6">
              <SourcesDisplay 
                sources={msg.sources} 
                isVisible={true} 
                onSourceClick={handleSourceClick}
              />
            </div>
          )}
          
          {/* RAG indicator */}
          {msg.sender === 'ai' && msg.used_rag && (
            <div className="mt-2 ml-4 lg:ml-6 flex items-center gap-2 text-xs text-slate-400">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span>Korišćeni dokumenti</span>
            </div>
          )}
          
          {/* Re-ranking indicator */}
          {msg.sender === 'ai' && msg.reranking_applied && (
            <div className="mt-1 ml-4 lg:ml-6 flex items-center gap-2 text-xs text-slate-400">
              <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse"></div>
              <span>Re-ranking primenjen</span>
            </div>
          )}
          
          {/* Query Rewriting indicator */}
          {msg.sender === 'ai' && msg.query_rewriting_applied && (
            <div className="mt-1 ml-4 lg:ml-6 flex items-center gap-2 text-xs text-slate-400">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              <span>Query rewriting primenjen</span>
            </div>
          )}
          
          {/* Fact Checking indicator */}
          {msg.sender === 'ai' && msg.fact_checking_applied && (
            <div className="mt-1 ml-4 lg:ml-6 flex items-center gap-2 text-xs text-slate-400">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span>Fact checking primenjen</span>
            </div>
          )}
        </div>
      </div>
    );
  }, [messages, isLoading, editingMessageId, editInput, handleReaction, handleEditMessage, handleUndoMessage, setEditInput, handleSaveEdit, handleSourceClick]);

  // Memoized virtual list
  const VirtualizedMessageList = useMemo(() => {
    if (messages.length === 0 && !isLoading) {
      return (
        <div className="text-center text-blue-300 text-sm mt-8">
          <div className="mb-2">
            {useRAG ? (
              <p>Počnite razgovor sa AI asistentom koji koristi vaše dokumente!</p>
            ) : (
              <p>Počnite razgovor sa AI asistentom!</p>
            )}
          </div>
          {useRAG && (
            <p className="text-xs text-gray-500">
              Upload-ujte dokumente da biste omogućili RAG funkcionalnost
            </p>
          )}
        </div>
      );
    }

    return (
      <>
        <List
          height={containerHeight}
          width={containerWidth}
          itemCount={messages.length}
          itemSize={ITEM_HEIGHT}
          itemData={messages}
          className="custom-scrollbar"
        >
          {MessageRow}
        </List>
        
        {/* Typing indicator */}
        {isLoading && (
          <div className="w-full mb-6 flex justify-start">
            <div className="max-w-2xl mr-auto">
              <div className="group relative p-6 bg-gradient-to-br from-slate-800/50 to-slate-700/50 rounded-2xl border border-white/10 shadow-lg backdrop-blur-sm rounded-bl-md transition-all duration-300 hover:scale-[1.02]">
                <div className="relative flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-semibold">
                    🤖
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-sm font-medium text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                      AI piše...
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }, [messages, containerHeight, containerWidth, MessageRow, useRAG, isLoading]);

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      {/* Premium Glassmorphism Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10"></div>
      
      {/* Animated Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-pulse"></div>
        <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-bounce"></div>
        <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-purple-400/10 rounded-full blur-xl animate-pulse"></div>
      </div>

      <div className="relative flex flex-col h-full p-4">
        {/* Premium Header - sada sticky */}
        <div className="sticky top-0 z-30 flex items-center justify-between mb-4 pb-3 border-b border-white/10 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl p-3 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl shadow-lg">
                <FaBook className="text-white" size={16} />
              </div>
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            </div>
            <div>
              <h2 className="text-lg font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                AI Chat
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <FaKeyboard size={12} />
                <span>Ctrl+Enter</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Theme Toggle */}
            <ThemeToggle />
            
            {/* Nova Sesija Button */}
            <button
              onClick={createNewSession}
              className="group relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
              title="Kreiraj novu sesiju"
            >
              <FaPlus size={14} />
              <span>Nova sesija</span>
              <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            
            {/* Premium History Button */}
            <button
              onClick={() => setIsHistorySidebarOpen(true)}
              className="group relative flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl hover:scale-105"
              title="Prikaži istoriju razgovora"
            >
              <FaHistory size={14} />
              <span>Istorija</span>
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
            
            {/* Settings Dropdown */}
            <div className="relative" ref={settingsRef}>
              <button 
                onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                className="p-2 rounded-full bg-slate-800/60 hover:bg-slate-700 transition" 
                title="Podešavanja"
              >
                <svg width="20" height="20" fill="none" stroke="currentColor"><path d="M10 2a1 1 0 0 1 1 1v1.09a7.001 7.001 0 0 1 3.39 1.36l.77-.77a1 1 0 1 1 1.42 1.42l-.77.77A7.001 7.001 0 0 1 17.91 9H19a1 1 0 1 1 0 2h-1.09a7.001 7.001 0 0 1-1.36 3.39l.77.77a1 1 0 1 1-1.42 1.42l-.77-.77A7.001 7.001 0 0 1 11 17.91V19a1 1 0 1 1-2 0v-1.09a7.001 7.001 0 0 1-3.39-1.36l-.77.77a1 1 0 1 1-1.42-1.42l.77-.77A7.001 7.001 0 0 1 2.09 11H1a1 1 0 1 1 0-2h1.09a7.001 7.001 0 0 1 1.36-3.39l-.77-.77a1 1 0 1 1 1.42-1.42l.77.77A7.001 7.001 0 0 1 9 2.09V1a1 1 0 0 1 1-1z"/></svg>
              </button>
              {isSettingsOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-white/10 rounded-xl shadow-xl p-4 z-50">
                  {/* Toggle kontrole premeštene ovde */}
                  {/* Query Rewriting Toggle */}
                  <div className="group relative">
                    <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-xl border border-white/10 hover-border-subtle form-hover-profi">
                      <span className="text-xs text-slate-400 group-hover:text-white link-hover-profi">Query Rewriting</span>
                      <button
                        onClick={() => setUseQueryRewriting(!useQueryRewriting)}
                        className="flex items-center gap-1 text-sm icon-hover-profi"
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
                  
                  {/* Fact Checking Toggle */}
                  <div className="group relative">
                    <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-xl border border-white/10 hover-border-subtle form-hover-profi">
                      <span className="text-xs text-slate-400 group-hover:text-white link-hover-profi">Fact Checking</span>
                      <button
                        onClick={() => setUseFactChecking(!useFactChecking)}
                        className="flex items-center gap-1 text-sm icon-hover-profi"
                      >
                        {useFactChecking ? (
                          <>
                            <FaToggleOn className="text-yellow-400" size={16} />
                            <span className="text-yellow-300 font-medium">Uključen</span>
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
                  <div className="group relative">
                    <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-xl border border-white/10 hover-border-subtle form-hover-profi">
                      <span className="text-xs text-slate-400 group-hover:text-white link-hover-profi">Enhanced Context</span>
                      <button
                        onClick={() => setUseEnhancedContext(!useEnhancedContext)}
                        className="flex items-center gap-1 text-sm icon-hover-profi"
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

                  {/* Re-ranking Toggle */}
                  {useRAG && (
                    <div className="group relative">
                      <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-xl border border-white/10 hover-border-subtle form-hover-profi">
                        <span className="text-xs text-slate-400 group-hover:text-white link-hover-profi">Re-ranking</span>
                        <button
                          onClick={() => setUseRerank(!useRerank)}
                          className="flex items-center gap-1 text-sm icon-hover-profi"
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

                  {/* RAG Toggle */}
                  <div className="group relative">
                    <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-xl border border-white/10 hover-border-subtle form-hover-profi">
                      <span className="text-xs text-slate-400 group-hover:text-white link-hover-profi">RAG Mode</span>
                      <button
                        onClick={() => setUseRAG(!useRAG)}
                        className="flex items-center gap-1 text-sm icon-hover-profi"
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
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Premium Context Analytics */}
        {useEnhancedContext && lastContextAnalysis && (
          <div className="mb-4 p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-2xl border border-cyan-500/30 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1 bg-cyan-500/20 rounded-lg">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
              </div>
              <span className="text-sm font-semibold text-cyan-300">Analitika konteksta</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-cyan-200">
              <div>Tipovi: {lastContextAnalysis.context_types_used?.join(', ') || '-'}</div>
              <div>Dužina: {lastContextAnalysis.total_context_length} karaktera</div>
              <div>Složenost upita: {lastContextAnalysis.query_complexity}</div>
              <div>Relevantnost: {lastContextAnalysis.relevance_score?.toFixed(2)}</div>
            </div>
          </div>
        )}

        {/* Premium Query History */}
        {useQueryRewriting && queryHistory.length > 0 && (
          <div className="mb-4 p-4 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 rounded-2xl border border-orange-500/30 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1 bg-orange-500/20 rounded-lg">
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></div>
              </div>
              <span className="text-sm font-semibold text-orange-300">Istorija poboljšanih upita</span>
            </div>
            <div className="max-h-20 overflow-y-auto space-y-2">
              {queryHistory.slice(-3).map((item, idx) => (
                <div key={idx} className="p-2 bg-orange-900/30 rounded-xl border border-orange-700/50">
                  <div className="text-xs text-orange-300 font-medium">Original: {item.original}</div>
                  <div className="text-xs text-orange-200">Poboljšan: {item.enhanced}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar" ref={containerRef}>
          {VirtualizedMessageList}
        </div>
        
        {/* Premium Input Form */}
        <form className="flex items-end gap-3 mt-4" onSubmit={sendMessage}>
          <div className="relative flex-1 group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
            <textarea
              className="relative w-full px-6 py-4 bg-slate-800/50 border border-white/10 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/20 backdrop-blur-sm transition-all duration-300 resize-none overflow-hidden min-h-[60px] max-h-[200px]"
              placeholder={useRAG ? "Pitajte o vašim dokumentima..." : "Upišite poruku..."}
              value={input}
              onChange={handleInputChange}
              disabled={isLoading}
              ref={inputRef}
              rows={1}
              aria-label="Unesite poruku"
              aria-describedby="chat-input-help"
              aria-invalid={false}
              role="textbox"
              tabIndex={0}
            />
            <div id="chat-input-help" className="sr-only">
              Pritisnite Enter za slanje poruke ili Ctrl+Enter za novi red
            </div>
          </div>
          <button 
            type="submit" 
            className={`group relative p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 btn-hover-profi shadow-lg ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
            aria-label="Pošalji poruku"
            aria-describedby="send-button-help"
            tabIndex={0}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 transform rotate-180 group-hover:scale-110 icon-hover-profi" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l15.75-7.5-4.5 7.5 4.5 7.5L2.25 12z" />
            </svg>
            <div id="send-button-help" className="sr-only">
              Kliknite ili pritisnite Enter za slanje poruke
            </div>
          </button>
        </form>
      </div>
      
      {/* ChatHistory Modal */}
      {isHistorySidebarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsHistorySidebarOpen(false)} />
          {/* Modal */}
          <div className="relative w-full max-w-5xl mx-4 rounded-3xl shadow-2xl bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 border border-white/10 flex flex-col h-[90vh]">
            <ChatHistorySidebar 
              isOpen={isHistorySidebarOpen}
              onClose={() => setIsHistorySidebarOpen(false)}
              onRestoreSession={handleRestoreSessionFromHistory}
            />
          </div>
        </div>
      )}
      {/* Source Modal */}
      <AnimatePresence>
        {sourceModal?.open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
            onClick={() => setSourceModal(null)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                className="absolute top-4 right-4 text-slate-400 hover:text-blue-500 text-xl"
                onClick={() => setSourceModal(null)}
                title="Zatvori"
              >
                ×
              </button>
              <div className="mb-4">
                <div className="text-xs text-slate-500 mb-1">Izvor iz dokumenta</div>
                <div className="text-lg font-bold text-blue-900">{sourceModal.source.filename} (str. {sourceModal.source.page})</div>
              </div>
              <div className="mb-2 text-xs text-slate-500">Relevantnost: <span className="font-semibold text-blue-700">{Math.round((sourceModal.source.score || 0) * 100)}%</span></div>
              <div className="mb-4 text-xs text-slate-500">Chunk: <span className="font-semibold">{sourceModal.source.chunk_index}</span></div>
              <div className="bg-blue-50 rounded-lg p-4 text-slate-800 text-sm whitespace-pre-line max-h-60 overflow-y-auto">
                {sourceModal.source.content}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 