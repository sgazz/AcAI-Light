'use client';

import React, { useState, useEffect } from 'react';
import { FaBars, FaTimes, FaHistory, FaPlus, FaCog } from 'react-icons/fa';
import ChatSidebar from './ChatSidebar';
import ChatArea from './ChatArea';
import SessionHistoryModal from './SessionHistoryModal';
import { useChat } from './hooks/useChat';
import { useSessions } from './hooks/useSessions';

interface ChatLayoutProps {
  initialSessionId?: string;
}

export default function ChatLayout({ initialSessionId }: ChatLayoutProps) {
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  
  const { 
    currentSessionId, 
    messages, 
    isLoading, 
    sendMessage, 
    createNewSession,
    switchSession,
    // RAG props
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
    // Streaming props
    useStreaming,
    setUseStreaming,
    streamingMessageId
  } = useChat(initialSessionId);
  
  const { 
    sessions, 
    selectedSession, 
    loadSessions, 
    selectSession,
    deleteSession,
    renameSession 
  } = useSessions();

  // Responsive handling
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleSessionSelect = (sessionId: string) => {
    selectSession(sessionId);
    switchSession(sessionId);
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleNewSession = async () => {
    const newSessionId = await createNewSession();
    if (newSessionId) {
      loadSessions(); // Refresh sessions list
    }
  };

  const handleResumeSession = async (sessionId: string) => {
    // Prebaci na sesiju i učitaj poruke
    await switchSession(sessionId);
    selectSession(sessionId);
    
    // Zatvori sidebar na mobilnim uređajima
    if (isMobile) {
      setIsSidebarOpen(false);
    }
  };

  const handleArchiveSession = (sessionId: string) => {
    // TODO: Implement archive functionality
    console.log('Archive session:', sessionId);
  };

  const handleExportSession = (sessionId: string) => {
    // TODO: Implement export functionality
    console.log('Export session:', sessionId);
  };

  const handleShareSession = (sessionId: string) => {
    // TODO: Implement share functionality
    console.log('Share session:', sessionId);
  };

  return (
    <div className="h-full flex bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" style={{ minHeight: '500px' }}>
      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:relative z-50 h-full
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        transition-transform duration-300 ease-in-out
      `}>
        <ChatSidebar
          sessions={sessions}
          selectedSessionId={selectedSession?.session_id}
          onSessionSelect={handleSessionSelect}
          onNewSession={handleNewSession}
          onDeleteSession={deleteSession}
          onRenameSession={renameSession}
          onResumeSession={handleResumeSession}
          onClose={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-white/10 bg-slate-800/50 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              {isSidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>

            {/* Session Info */}
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <h1 className="text-lg font-semibold text-white">
                {selectedSession?.name || 'Nova sesija'}
              </h1>
              {selectedSession && (
                <span className="text-sm text-slate-400">
                  {selectedSession.message_count} poruka
                </span>
              )}
            </div>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsHistoryModalOpen(true)}
              className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/10 transition-colors text-slate-300"
            >
              <FaHistory size={16} />
              <span className="text-sm">Istorija</span>
            </button>
            
            <button
              onClick={handleNewSession}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors text-white"
            >
              <FaPlus size={14} />
              <span className="text-sm">Nova sesija</span>
            </button>
          </div>
        </div>

        {/* Chat Area */}
        <ChatArea
          messages={messages}
          isLoading={isLoading}
          onSendMessage={sendMessage}
          sessionId={currentSessionId}
          // RAG props
          useRAG={useRAG}
          setUseRAG={setUseRAG}
          useRerank={useRerank}
          setUseRerank={setUseRerank}
          useEnhancedContext={useEnhancedContext}
          setUseEnhancedContext={setUseEnhancedContext}
          useQueryRewriting={useQueryRewriting}
          setUseQueryRewriting={setUseQueryRewriting}
          useFactChecking={useFactChecking}
          setUseFactChecking={setUseFactChecking}
          // Streaming props
          useStreaming={useStreaming}
          setUseStreaming={setUseStreaming}
          streamingMessageId={streamingMessageId}
        />
      </div>

      {/* Session History Modal */}
      <SessionHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        sessions={sessions}
        selectedSessionId={selectedSession?.session_id}
        onSessionSelect={handleSessionSelect}
        onDeleteSession={deleteSession}
        onRenameSession={renameSession}
        onArchiveSession={handleArchiveSession}
        onExportSession={handleExportSession}
        onShareSession={handleShareSession}
        onResumeSession={handleResumeSession}
      />
    </div>
  );
} 