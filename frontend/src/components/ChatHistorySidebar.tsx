'use client';

import { useState, useEffect } from 'react';
import { FaHistory, FaTrash, FaEye, FaTimes } from 'react-icons/fa';
import { formatDate } from '../utils/dateUtils';
import { CHAT_SESSIONS_ENDPOINT, CHAT_HISTORY_ENDPOINT, apiRequest } from '../utils/api';
import { useErrorToast } from './ErrorToastProvider';

interface Session {
  session_id: string;
  message_count: number;
  first_message: string;
  last_message: string;
}

interface Message {
  id: number;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
}

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ChatHistorySidebar({ isOpen, onClose }: ChatHistorySidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showError, showSuccess } = useErrorToast();

  useEffect(() => {
    if (isOpen) {
      console.log('ChatHistorySidebar: Otvaram sidebar, učitavam sesije');
      loadSessions();
    }
  }, [isOpen]);

  const loadSessions = async () => {
    console.log('ChatHistorySidebar: Pozivam loadSessions');
    try {
      const data = await apiRequest(CHAT_SESSIONS_ENDPOINT);
      console.log('ChatHistorySidebar: API odgovor:', data);
      if (data.status === 'success') {
        setSessions(data.sessions);
      } else {
        throw new Error(data.message || 'Greška pri učitavanju sesija');
      }
    } catch (error: any) {
      console.error('ChatHistorySidebar: Greška pri učitavanju sesija:', error);
      showError(
        error.message || 'Greška pri učitavanju sesija',
        'Greška učitavanja',
        true,
        loadSessions
      );
    }
  };

  const loadSessionMessages = async (sessionId: string) => {
    setIsLoading(true);
    try {
      const data = await apiRequest(`${CHAT_HISTORY_ENDPOINT}/${sessionId}`);
      if (data.status === 'success') {
        setSessionMessages(data.messages);
        setSelectedSession(sessionId);
        showSuccess('Poruke uspešno učitane', 'Učitavanje');
      } else {
        throw new Error(data.message || 'Greška pri učitavanju poruka');
      }
    } catch (error: any) {
      showError(
        error.message || 'Greška pri učitavanju poruka',
        'Greška učitavanja',
        true,
        () => loadSessionMessages(sessionId)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!confirm('Da li ste sigurni da želite da obrišete ovu sesiju?')) return;
    
    try {
      const data = await apiRequest(`${CHAT_SESSIONS_ENDPOINT}/${sessionId}`, {
        method: 'DELETE',
      });
      if (data.status === 'success') {
        await loadSessions();
        if (selectedSession === sessionId) {
          setSelectedSession(null);
          setSessionMessages([]);
        }
        showSuccess('Sesija uspešno obrisana', 'Brisanje');
      } else {
        throw new Error(data.message || 'Greška pri brisanju sesije');
      }
    } catch (error: any) {
      showError(
        error.message || 'Greška pri brisanju sesije',
        'Greška brisanja',
        true,
        () => deleteSession(sessionId)
      );
    }
  };

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed top-0 right-0 h-full w-1/2 bg-[#151c2c] shadow-2xl border-l border-gray-700 transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-700">
            <div className="flex items-center gap-2">
              <div className="text-blue-400"><FaHistory size={20} /></div>
              <h3 className="text-lg font-semibold text-white">Istorija razgovora</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-white transition-colors"
              title="Zatvori"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* Dvokolonski prikaz */}
          <div className="flex-1 flex flex-row min-h-0">
            {/* Leva kolona: Sesije */}
            <div className="flex-1 min-w-0 border-r border-gray-700 p-4 flex flex-col">
              <h4 className="text-sm font-medium text-blue-300 mb-3">
                Sesije ({sessions.length})
              </h4>
              <div className="flex-1 overflow-y-auto space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.session_id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedSession === session.session_id
                        ? 'border-blue-500 bg-blue-900/20'
                        : 'border-gray-600 hover:border-blue-400'
                    }`}
                    onClick={() => loadSessionMessages(session.session_id)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="text-sm text-white font-medium">
                          {session.session_id.slice(0, 8)}...
                        </div>
                        <div className="text-xs text-blue-300">
                          {session.message_count} poruka
                        </div>
                        <div className="text-xs text-gray-400">
                          {formatDate(session.last_message)}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            loadSessionMessages(session.session_id);
                          }}
                          className="p-1 text-blue-400 hover:text-blue-300"
                          title="Pogledaj poruke"
                        >
                          <FaEye size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.session_id);
                          }}
                          className="p-1 text-red-400 hover:text-red-300"
                          title="Obriši sesiju"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Desna kolona: Poruke */}
            <div className="flex-1 min-w-0 p-4 flex flex-col">
              <h4 className="text-sm font-medium text-blue-300 mb-3">
                Poruke {selectedSession ? `(${sessionMessages.length})` : ''}
              </h4>
              <div className="flex-1 overflow-y-auto space-y-2">
                {isLoading ? (
                  <div className="text-center text-blue-300">Učitavanje...</div>
                ) : selectedSession ? (
                  sessionMessages.map((message) => (
                    <div
                      key={message.id}
                      className={`p-3 rounded-lg ${
                        message.sender === 'user'
                          ? 'bg-blue-900/30 border border-blue-700'
                          : 'bg-gray-700/30 border border-gray-600'
                      }`}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className={`text-xs font-medium ${
                          message.sender === 'user' ? 'text-blue-300' : 'text-green-300'
                        }`}>
                          {message.sender === 'user' ? 'Vi' : 'AI'}
                        </span>
                        <span className="text-xs text-gray-400">
                          {formatDate(message.timestamp)}
                        </span>
                      </div>
                      <div className="text-sm text-white">
                        {message.content.length > 100
                          ? `${message.content.substring(0, 100)}...`
                          : message.content}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-400 text-sm">
                    Izaberite sesiju da vidite poruke
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 