'use client';

import { useState, useEffect } from 'react';
import { FaHistory, FaTrash, FaEye } from 'react-icons/fa';
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

export default function ChatHistory() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showError, showSuccess } = useErrorToast();

  useEffect(() => {
    console.log('ChatHistory: Komponenta se učitava');
    loadSessions();
  }, []);

  const loadSessions = async () => {
    console.log('ChatHistory: Pozivam loadSessions');
    try {
      const data = await apiRequest(CHAT_SESSIONS_ENDPOINT);
      console.log('ChatHistory: API odgovor:', data);
      if (data.status === 'success') {
        // Backend vraća data.data.sessions, ne data.sessions
        setSessions(data.data?.sessions || []);
      } else {
        throw new Error(data.message || 'Greška pri učitavanju sesija');
      }
    } catch (error: any) {
      console.error('ChatHistory: Greška pri učitavanju sesija:', error);
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
    <div className="bg-[var(--bg-secondary)] rounded-2xl p-4 shadow-lg border border-[var(--border-color)]">
      <div className="flex items-center gap-2 mb-4">
        <div className="text-[var(--accent-blue)]"><FaHistory size={20} /></div>
        <h3 className="text-lg font-semibold text-[var(--text-primary)]">Istorija razgovora</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lista sesija */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-[var(--accent-blue)]">Sesije ({sessions.length})</h4>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {sessions.map((session) => (
              <div
                key={session.session_id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedSession === session.session_id
                    ? 'border-[var(--accent-blue)] bg-[var(--accent-blue)]/20'
                    : 'border-[var(--border-color)] hover:border-[var(--accent-blue)]'
                }`}
                onClick={() => loadSessionMessages(session.session_id)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="text-sm text-[var(--text-primary)] font-medium">
                      {session.session_id.slice(0, 8)}...
                    </div>
                    <div className="text-xs text-[var(--accent-blue)]">
                      {session.message_count} poruka
                    </div>
                    <div className="text-xs text-[var(--text-muted)]">
                      {formatDate(session.last_message)}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        loadSessionMessages(session.session_id);
                      }}
                      className="p-1 text-[var(--accent-blue)] hover:text-[var(--accent-blue)]/80"
                      title="Pogledaj poruke"
                    >
                      <FaEye size={14} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSession(session.session_id);
                      }}
                      className="p-1 text-[var(--accent-red)] hover:text-[var(--accent-red)]/80"
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

        {/* Lista poruka */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-[var(--accent-blue)]">
            Poruke {selectedSession ? `(${sessionMessages.length})` : ''}
          </h4>
          <div className="max-h-64 overflow-y-auto space-y-2">
            {isLoading ? (
              <div className="text-center text-[var(--accent-blue)]">Učitavanje...</div>
            ) : selectedSession ? (
              sessionMessages.map((message) => (
                <div
                  key={message.id}
                  className={`p-3 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-[var(--accent-blue)]/30 border border-[var(--accent-blue)]'
                      : 'bg-[var(--bg-tertiary)] border border-[var(--border-color)]'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-xs font-medium ${
                      message.sender === 'user' ? 'text-[var(--accent-blue)]' : 'text-[var(--accent-green)]'
                    }`}>
                      {message.sender === 'user' ? 'Vi' : 'AI'}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {formatDate(message.timestamp)}
                    </span>
                  </div>
                  <div className="text-sm text-[var(--text-primary)]">
                    {message.content.length > 100
                      ? `${message.content.substring(0, 100)}...`
                      : message.content}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-[var(--text-muted)] text-sm">
                Izaberite sesiju da vidite poruke
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 