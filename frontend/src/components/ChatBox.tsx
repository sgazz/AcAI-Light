'use client';

import { useState, useEffect, useRef } from 'react';
import { FaGraduationCap, FaToggleOn, FaToggleOff, FaBook, FaKeyboard, FaHistory } from 'react-icons/fa';
import SourcesDisplay from './SourcesDisplay';
import ChatHistorySidebar from './ChatHistorySidebar';
import MessageRenderer from './MessageRenderer';
import TypingIndicator from './TypingIndicator';
import ThemeToggle from './ThemeToggle';
import { CHAT_NEW_SESSION_ENDPOINT, CHAT_RAG_ENDPOINT, CHAT_RAG_ENHANCED_CONTEXT_ENDPOINT, QUERY_ENHANCE_ENDPOINT, FACT_CHECK_VERIFY_ENDPOINT, apiRequest } from '../utils/api';
import { useErrorToast } from './ErrorToastProvider';

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
  const [sessionId, setSessionId] = useState<string>('default');
  const [useRAG, setUseRAG] = useState(true);
  const [useRerank, setUseRerank] = useState(true);
  const [useEnhancedContext, setUseEnhancedContext] = useState(false);
  const [useQueryRewriting, setUseQueryRewriting] = useState(false);
  const [useFactChecking, setUseFactChecking] = useState(false);
  const [lastContextAnalysis, setLastContextAnalysis] = useState<any>(null);
  const [queryHistory, setQueryHistory] = useState<Array<{original: string, enhanced: string, timestamp: string}>>([]);
  const [isHistorySidebarOpen, setIsHistorySidebarOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { showError, showSuccess, showWarning } = useErrorToast();

  // Kreiraj novu sesiju kada se komponenta učita
  useEffect(() => {
    createNewSession();
  }, []);

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

  const createNewSession = async () => {
    try {
      const data = await apiRequest(CHAT_NEW_SESSION_ENDPOINT, {
        method: 'POST',
      });
      
      if (data.session_id) {
        setSessionId(data.session_id);
        setMessages([]); // Resetuj poruke za novu sesiju
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
      // Odaberi endpoint na osnovu Enhanced Context i RAG mode-a
      let endpoint = CHAT_RAG_ENDPOINT;
      let body: any = {
        message: enhancedMessage, // Koristi poboljšani upit
        session_id: sessionId,
        use_rerank: useRerank,
      };
      if (useEnhancedContext) {
        endpoint = CHAT_RAG_ENHANCED_CONTEXT_ENDPOINT;
        // Enhanced context backend ignoriše use_rerank, ali šaljemo za kompatibilnost
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
        if ((data.used_rag || data.context_selector_used) && data.sources && data.sources.length > 0) {
          showSuccess(`Pronađeno ${data.sources.length} relevantnih izvora`, 'RAG uspešan');
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
    console.log('Source clicked:', source);
    // Ovde bi mogli da implementiramo prikaz detalja izvora
    showSuccess(`Prikazan izvor: ${source.filename}`, 'Izvor');
  };

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

      <div className="relative flex flex-col h-full p-6">
        {/* Premium Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl p-4 backdrop-blur-sm">
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
            
            {/* Premium Toggle Controls */}
            <div className="flex items-center gap-3">
              {/* Query Rewriting Toggle */}
              <div className="group relative">
                <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-xl border border-white/10 hover:border-blue-500/30 transition-all duration-300">
                  <span className="text-xs text-slate-400 group-hover:text-white transition-colors">Query Rewriting</span>
                  <button
                    onClick={() => setUseQueryRewriting(!useQueryRewriting)}
                    className="flex items-center gap-1 text-sm transition-all duration-300 hover:scale-110"
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
                <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-xl border border-white/10 hover:border-yellow-500/30 transition-all duration-300">
                  <span className="text-xs text-slate-400 group-hover:text-white transition-colors">Fact Checking</span>
                  <button
                    onClick={() => setUseFactChecking(!useFactChecking)}
                    className="flex items-center gap-1 text-sm transition-all duration-300 hover:scale-110"
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
                <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-xl border border-white/10 hover:border-cyan-500/30 transition-all duration-300">
                  <span className="text-xs text-slate-400 group-hover:text-white transition-colors">Enhanced Context</span>
                  <button
                    onClick={() => setUseEnhancedContext(!useEnhancedContext)}
                    className="flex items-center gap-1 text-sm transition-all duration-300 hover:scale-110"
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
                  <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-xl border border-white/10 hover:border-purple-500/30 transition-all duration-300">
                    <span className="text-xs text-slate-400 group-hover:text-white transition-colors">Re-ranking</span>
                    <button
                      onClick={() => setUseRerank(!useRerank)}
                      className="flex items-center gap-1 text-sm transition-all duration-300 hover:scale-110"
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
                <div className="flex items-center gap-2 p-2 bg-slate-800/50 rounded-xl border border-white/10 hover:border-green-500/30 transition-all duration-300">
                  <span className="text-xs text-slate-400 group-hover:text-white transition-colors">RAG Mode</span>
                  <button
                    onClick={() => setUseRAG(!useRAG)}
                    className="flex items-center gap-1 text-sm transition-all duration-300 hover:scale-110"
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
        <div className="flex-1 overflow-y-auto pb-4 custom-scrollbar">
          {messages.length === 0 && !isLoading && (
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
          )}
          
          {messages.map((msg, idx) => {
            console.log('Rendering message:', { 
              id: msg.id, 
              sender: msg.sender, 
              content: msg.content.substring(0, 50),
              messageIdString: msg.id?.toString(),
              hasReaction: !!msg.reaction
            });
            return (
              <div key={idx} className="mb-4">
                <MessageRenderer
                  content={msg.content}
                  sender={msg.sender}
                  timestamp={msg.timestamp}
                  messageId={msg.id}
                  onReaction={handleReaction}
                  initialReaction={msg.reaction}
                />
                
                {/* Prikaži izvore za AI poruke */}
                {msg.sender === 'ai' && msg.sources && msg.sources.length > 0 && (
                  <div className="mt-2 ml-8">
                    <SourcesDisplay 
                      sources={msg.sources} 
                      isVisible={true} 
                      onSourceClick={handleSourceClick}
                    />
                  </div>
                )}
                
                {/* RAG indicator */}
                {msg.sender === 'ai' && msg.used_rag && (
                  <div className="mt-2 ml-8 flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs text-green-400">Koristi RAG</span>
                    
                    {/* Re-ranking indicator */}
                    {msg.reranking_applied && (
                      <>
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-xs text-purple-400">Re-ranking</span>
                        {msg.reranker_info && (
                          <span className="text-xs text-gray-500">
                            ({msg.reranker_info.model_name})
                          </span>
                        )}
                      </>
                    )}
                  </div>
                )}
                
                {/* Query Rewriting indicator */}
                {msg.sender === 'user' && msg.query_rewriting_applied && (
                  <div className="mt-2 ml-8 p-2 rounded-lg bg-orange-900/30 border border-orange-700">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                      <span className="text-xs text-orange-400 font-semibold">Query Rewriting</span>
                    </div>
                    <div className="text-xs text-orange-300">
                      <div><strong>Original:</strong> {msg.original_query}</div>
                      <div><strong>Poboljšan:</strong> {msg.enhanced_query}</div>
                    </div>
                  </div>
                )}
                
                {/* Fact Checking indicator */}
                {msg.sender === 'ai' && msg.fact_checking_applied && msg.fact_checker_info && (
                  <div className="mt-2 ml-8 p-2 rounded-lg bg-yellow-900/30 border border-yellow-700">
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-2 h-2 rounded-full ${msg.fact_checker_info.verified ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="text-xs text-yellow-400 font-semibold">Fact Checking</span>
                      <span className={`text-xs ${msg.fact_checker_info.verified ? 'text-green-400' : 'text-red-400'}`}>
                        {msg.fact_checker_info.verified ? 'Verifikovan' : 'Nije verifikovan'}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({Math.round(msg.fact_checker_info.confidence * 100)}% pouzdanost)
                      </span>
                    </div>
                    {msg.fact_checker_info.reasoning && (
                      <div className="text-xs text-yellow-300 mt-1">
                        <strong>Obrazloženje:</strong> {msg.fact_checker_info.reasoning}
                      </div>
                    )}
                    {msg.fact_checker_info.sources && msg.fact_checker_info.sources.length > 0 && (
                      <div className="text-xs text-yellow-300 mt-1">
                        <strong>Izvori:</strong> {msg.fact_checker_info.sources.join(', ')}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          
          {isLoading && <TypingIndicator />}
        </div>
        
        {/* Premium Input Form */}
        <form className="flex items-center gap-3 mt-4" onSubmit={sendMessage}>
          <div className="relative flex-1 group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"></div>
            <input
              className="relative w-full px-6 py-4 bg-slate-800/50 border border-white/10 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/20 backdrop-blur-sm transition-all duration-300"
              placeholder={useRAG ? "Pitajte o vašim dokumentima..." : "Upišite poruku..."}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={isLoading}
              ref={inputRef}
            />
          </div>
          <button 
            type="submit" 
            className={`group relative p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl hover:from-blue-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 transform rotate-180 group-hover:scale-110 transition-transform duration-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l15.75-7.5-4.5 7.5 4.5 7.5L2.25 12z" />
            </svg>
          </button>
        </form>
      </div>
      
      {/* ChatHistory Sidebar */}
      <ChatHistorySidebar 
        isOpen={isHistorySidebarOpen}
        onClose={() => setIsHistorySidebarOpen(false)}
      />
    </div>
  );
} 