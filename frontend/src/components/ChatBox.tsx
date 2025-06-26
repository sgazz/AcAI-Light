'use client';

import { useState, useEffect, useRef } from 'react';
import { FaGraduationCap, FaToggleOn, FaToggleOff, FaBook, FaKeyboard } from 'react-icons/fa';
import SourcesDisplay from './SourcesDisplay';
import { CHAT_NEW_SESSION_ENDPOINT, CHAT_RAG_ENDPOINT, CHAT_RAG_ENHANCED_CONTEXT_ENDPOINT, apiRequest } from '../utils/api';
import { useErrorToast } from './ErrorToastProvider';

interface Message {
  id?: number;
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
}

export default function ChatBox() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>('default');
  const [useRAG, setUseRAG] = useState(true);
  const [useRerank, setUseRerank] = useState(true);
  const [useEnhancedContext, setUseEnhancedContext] = useState(false);
  const [lastContextAnalysis, setLastContextAnalysis] = useState<any>(null);
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

  const handleSendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Dodaj korisničku poruku odmah
    const newUserMessage: Message = {
      sender: 'user',
      content: userMessage,
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      // Odaberi endpoint na osnovu Enhanced Context i RAG mode-a
      let endpoint = CHAT_RAG_ENDPOINT;
      let body: any = {
        message: userMessage,
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
        // Dodaj AI odgovor sa izvorima ako postoje
        const aiMessage: Message = {
          sender: 'ai',
          content: data.response,
          sources: data.sources || [],
          used_rag: data.used_rag || false,
          reranking_applied: data.reranking_applied || false,
          reranker_info: data.reranker_info || null,
        };
        setMessages(prev => [...prev, aiMessage]);
        setLastContextAnalysis(data.context_analysis || null);
        // Prikaži success toast ako je RAG korišćen
        if ((data.used_rag || data.context_selector_used) && data.sources && data.sources.length > 0) {
          showSuccess(`Pronađeno ${data.sources.length} relevantnih izvora`, 'RAG uspešan');
        }
      } else {
        // Dodaj error poruku
        const errorMessage: Message = {
          sender: 'ai',
          content: 'Izvinjavam se, došlo je do greške. Pokušajte ponovo.',
        };
        setMessages(prev => [...prev, errorMessage]);
        setLastContextAnalysis(null);
        showError(data.message || 'Greška pri slanju poruke', 'Greška chat-a', true, () => handleSendMessage());
      }
    } catch (error: any) {
      console.error('Greška pri slanju poruke:', error);
      // Dodaj error poruku u chat
      const errorMessage: Message = {
        sender: 'ai',
        content: 'Greška u povezivanju sa serverom. Proverite da li je backend pokrenut.',
      };
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

  return (
    <div className="flex flex-col h-full bg-[#151c2c] rounded-2xl p-4 shadow-lg">
      {/* RAG & Enhanced Context Toggle Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <FaBook className="text-blue-400" size={16} />
          <span className="text-sm font-medium text-white">AI Chat</span>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <FaKeyboard size={12} />
            <span>Ctrl+Enter</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
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

      <div className="flex-1 overflow-y-auto pb-4">
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
        
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'} mb-2`}>
            <div className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm shadow-md ${msg.sender === 'user' ? 'bg-blue-900 text-white' : 'bg-[#1a2236] text-blue-100'}`}>
              <div className="flex items-start gap-2">
                {msg.sender === 'ai' && <div className="text-blue-400 mt-1"><FaGraduationCap size={16} /></div>}
                <div className="flex-1">
                  <span>{msg.content}</span>
                  
                  {/* Prikaži izvore za AI poruke */}
                  {msg.sender === 'ai' && msg.sources && msg.sources.length > 0 && (
                    <SourcesDisplay 
                      sources={msg.sources} 
                      isVisible={true} 
                    />
                  )}
                  
                  {/* RAG indicator */}
                  {msg.sender === 'ai' && msg.used_rag && (
                    <div className="mt-2 flex items-center gap-2">
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
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start mb-2">
            <div className="bg-[#1a2236] text-blue-100 px-4 py-2 rounded-2xl text-sm shadow-md flex items-center gap-2">
              <div className="text-blue-400 mr-2"><FaGraduationCap size={18} /></div>
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
              </div>
            </div>
          </div>
        )}
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
    </div>
  );
} 