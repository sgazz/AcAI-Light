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
      setIsLoading(false);
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

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)] rounded-2xl p-4 shadow-lg border border-[var(--border-color)]">
      {/* RAG & Enhanced Context Toggle Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          <FaBook className="text-[var(--accent-blue)]" size={16} />
          <span className="text-sm font-medium text-[var(--text-primary)]">AI Chat</span>
          <div className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <FaKeyboard size={12} />
            <span>Ctrl+Enter</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* History Button */}
          <button
            onClick={() => setIsHistorySidebarOpen(true)}
            className="flex items-center gap-2 px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-white text-sm"
            title="Prikaži istoriju razgovora"
          >
            <FaHistory size={14} />
            <span>Istorija</span>
          </button>
          
          {/* Query Rewriting Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Query Rewriting</span>
            <button
              onClick={() => setUseQueryRewriting(!useQueryRewriting)}
              className="flex items-center gap-1 text-sm"
            >
              {useQueryRewriting ? (
                <>
                  <FaToggleOn className="text-orange-400" size={16} />
                  <span className="text-orange-300">Uključen</span>
                </>
              ) : (
                <>
                  <FaToggleOff className="text-gray-500" size={16} />
                  <span className="text-gray-400">Isključen</span>
                </>
              )}
            </button>
          </div>
          
          {/* Fact Checking Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Fact Checking</span>
            <button
              onClick={() => setUseFactChecking(!useFactChecking)}
              className="flex items-center gap-1 text-sm"
            >
              {useFactChecking ? (
                <>
                  <FaToggleOn className="text-yellow-400" size={16} />
                  <span className="text-yellow-300">Uključen</span>
                </>
              ) : (
                <>
                  <FaToggleOff className="text-gray-500" size={16} />
                  <span className="text-gray-400">Isključen</span>
                </>
              )}
            </button>
          </div>
          
          {/* Enhanced Context Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Enhanced Context</span>
            <button
              onClick={() => setUseEnhancedContext(!useEnhancedContext)}
              className="flex items-center gap-1 text-sm"
            >
              {useEnhancedContext ? (
                <>
                  <FaToggleOn className="text-cyan-400" size={16} />
                  <span className="text-cyan-300">Uključen</span>
                </>
              ) : (
                <>
                  <FaToggleOff className="text-gray-500" size={16} />
                  <span className="text-gray-400">Isključen</span>
                </>
              )}
            </button>
          </div>
          {/* Re-ranking Toggle */}
          {useRAG && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Re-ranking</span>
              <button
                onClick={() => setUseRerank(!useRerank)}
                className="flex items-center gap-1 text-sm"
              >
                {useRerank ? (
                  <>
                    <FaToggleOn className="text-purple-500" size={16} />
                    <span className="text-purple-400">Uključen</span>
                  </>
                ) : (
                  <>
                    <FaToggleOff className="text-gray-500" size={16} />
                    <span className="text-gray-400">Isključen</span>
                  </>
                )}
              </button>
            </div>
          )}
          {/* RAG Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">RAG Mode</span>
            <button
              onClick={() => setUseRAG(!useRAG)}
              className="flex items-center gap-1 text-sm"
            >
              {useRAG ? (
                <>
                  <FaToggleOn className="text-green-500" size={16} />
                  <span className="text-green-400">Uključen</span>
                </>
              ) : (
                <>
                  <FaToggleOff className="text-gray-500" size={16} />
                  <span className="text-gray-400">Isključen</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      {/* Prikaz context analitike */}
      {useEnhancedContext && lastContextAnalysis && (
        <div className="mb-2 p-2 rounded-lg bg-[#1a2236] text-xs text-cyan-200 border border-cyan-700">
          <div className="mb-1 font-semibold text-cyan-300">Analitika konteksta:</div>
          <div>Tipovi: {lastContextAnalysis.context_types_used?.join(', ') || '-'}</div>
          <div>Dužina: {lastContextAnalysis.total_context_length} karaktera</div>
          <div>Složenost upita: {lastContextAnalysis.query_complexity}</div>
          <div>Relevantnost: {lastContextAnalysis.relevance_score?.toFixed(2)}</div>
        </div>
      )}

      {/* Query History */}
      {useQueryRewriting && queryHistory.length > 0 && (
        <div className="mb-2 p-2 rounded-lg bg-[#1a2236] text-xs text-orange-200 border border-orange-700">
          <div className="mb-1 font-semibold text-orange-300">Istorija poboljšanih upita:</div>
          <div className="max-h-20 overflow-y-auto">
            {queryHistory.slice(-3).map((item, idx) => (
              <div key={idx} className="mb-1 p-1 rounded bg-orange-900/30">
                <div className="text-orange-300"><strong>Original:</strong> {item.original}</div>
                <div className="text-orange-200"><strong>Poboljšan:</strong> {item.enhanced}</div>
              </div>
            ))}
          </div>
        </div>
      )}

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
      
      <form className="flex items-center gap-2 mt-2" onSubmit={sendMessage}>
        <input
          className="flex-1 rounded-xl px-4 py-2 bg-[#1a2236] text-white border border-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-400"
          placeholder={useRAG ? "Pitajte o vašim dokumentima..." : "Upišite poruku..."}
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={isLoading}
          ref={inputRef}
        />
        <button 
          type="submit" 
          className={`bg-blue-700 hover:bg-blue-800 text-white rounded-xl p-2 transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
          disabled={isLoading}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 transform rotate-180">
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l15.75-7.5-4.5 7.5 4.5 7.5L2.25 12z" />
          </svg>
        </button>
      </form>
      
      {/* ChatHistory Sidebar */}
      <ChatHistorySidebar 
        isOpen={isHistorySidebarOpen}
        onClose={() => setIsHistorySidebarOpen(false)}
      />
    </div>
  );
} 