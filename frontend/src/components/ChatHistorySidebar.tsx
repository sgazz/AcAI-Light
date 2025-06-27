'use client';

import { useState, useEffect, useMemo } from 'react';
import { FaHistory, FaTrash, FaEye, FaTimes, FaSearch, FaFilter, FaCalendar, FaSort } from 'react-icons/fa';
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

type SortOption = 'date-desc' | 'date-asc' | 'messages-desc' | 'messages-asc';
type FilterOption = 'all' | 'today' | 'week' | 'month' | 'custom';

export default function ChatHistorySidebar({ isOpen, onClose }: ChatHistorySidebarProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [sessionMessages, setSessionMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOption, setFilterOption] = useState<FilterOption>('all');
  const [sortOption, setSortOption] = useState<SortOption>('date-desc');
  const [showFilters, setShowFilters] = useState(false);
  const [customDateRange, setCustomDateRange] = useState({
    start: '',
    end: ''
  });
  
  const { showError, showSuccess } = useErrorToast();

  useEffect(() => {
    if (isOpen) {
      console.log('ChatHistorySidebar: Otvaram sidebar, učitavam sesije');
      loadSessions();
    }
  }, [isOpen]);

  // Filtriranje i sortiranje sesija
  const filteredAndSortedSessions = useMemo(() => {
    let filtered = sessions.filter(session => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        session.session_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.first_message.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.last_message.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Date filter
      const sessionDate = new Date(session.last_message);
      const now = new Date();
      
      switch (filterOption) {
        case 'today':
          return sessionDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return sessionDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return sessionDate >= monthAgo;
        case 'custom':
          if (customDateRange.start && customDateRange.end) {
            const startDate = new Date(customDateRange.start);
            const endDate = new Date(customDateRange.end);
            return sessionDate >= startDate && sessionDate <= endDate;
          }
          return true;
        default:
          return true;
      }
    });

    // Sortiranje
    filtered.sort((a, b) => {
      switch (sortOption) {
        case 'date-desc':
          return new Date(b.last_message).getTime() - new Date(a.last_message).getTime();
        case 'date-asc':
          return new Date(a.last_message).getTime() - new Date(b.last_message).getTime();
        case 'messages-desc':
          return b.message_count - a.message_count;
        case 'messages-asc':
          return a.message_count - b.message_count;
        default:
          return 0;
      }
    });

    return filtered;
  }, [sessions, searchQuery, filterOption, sortOption, customDateRange]);

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

  const clearFilters = () => {
    setSearchQuery('');
    setFilterOption('all');
    setSortOption('date-desc');
    setCustomDateRange({ start: '', end: '' });
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
      <div className={`fixed top-0 right-0 h-full w-1/2 bg-[var(--bg-secondary)] shadow-2xl border-l border-[var(--border-color)] transform transition-transform duration-300 ease-in-out z-50 ${
        isOpen ? 'translate-x-0' : 'translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <div className="text-[var(--accent-blue)]"><FaHistory size={20} /></div>
              <h3 className="text-lg font-semibold text-[var(--text-primary)]">Istorija razgovora</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title="Zatvori"
            >
              <FaTimes size={20} />
            </button>
          </div>

          {/* Search & Filter Bar */}
          <div className="p-4 border-b border-[var(--border-color)] space-y-3">
            {/* Search Box */}
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--text-muted)]" size={14} />
              <input
                type="text"
                placeholder="Pretraži sesije..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-3 py-1 rounded-lg transition-colors ${
                  showFilters 
                    ? 'bg-[var(--accent-blue)] text-white' 
                    : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--accent-blue)]/20'
                }`}
              >
                <FaFilter size={14} />
                <span className="text-sm">Filter</span>
              </button>

              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as SortOption)}
                className="px-3 py-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)] transition-colors"
              >
                <option value="date-desc">Najnovije prvo</option>
                <option value="date-asc">Najstarije prvo</option>
                <option value="messages-desc">Najviše poruka</option>
                <option value="messages-asc">Najmanje poruka</option>
              </select>

              {(searchQuery || filterOption !== 'all') && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1 bg-[var(--accent-red)]/20 text-[var(--accent-red)] rounded-lg hover:bg-[var(--accent-red)]/30 transition-colors text-sm"
                >
                  Očisti
                </button>
              )}
            </div>

            {/* Advanced Filters */}
            {showFilters && (
              <div className="space-y-3 p-3 bg-[var(--bg-tertiary)] rounded-lg border border-[var(--border-color)]">
                <div className="flex items-center gap-2">
                  <FaCalendar size={14} className="text-[var(--accent-blue)]" />
                  <span className="text-sm font-medium text-[var(--text-primary)]">Filter po datumu:</span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {(['all', 'today', 'week', 'month'] as FilterOption[]).map((option) => (
                    <button
                      key={option}
                      onClick={() => setFilterOption(option)}
                      className={`px-3 py-1 rounded text-sm transition-colors ${
                        filterOption === option
                          ? 'bg-[var(--accent-blue)] text-white'
                          : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--accent-blue)]/20'
                      }`}
                    >
                      {option === 'all' && 'Sve'}
                      {option === 'today' && 'Danas'}
                      {option === 'week' && 'Nedelja'}
                      {option === 'month' && 'Mesec'}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-sm text-[var(--text-primary)]">Prilagođeni period:</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                    />
                    <input
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="px-2 py-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded text-sm text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-blue)]"
                    />
                  </div>
                  {customDateRange.start && customDateRange.end && (
                    <button
                      onClick={() => setFilterOption('custom')}
                      className="w-full px-3 py-1 bg-[var(--accent-green)]/20 text-[var(--accent-green)] rounded hover:bg-[var(--accent-green)]/30 transition-colors text-sm"
                    >
                      Primeni prilagođeni filter
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Dvokolonski prikaz */}
          <div className="flex-1 flex flex-row min-h-0">
            {/* Leva kolona: Sesije */}
            <div className="flex-1 min-w-0 border-r border-[var(--border-color)] p-4 flex flex-col">
              <h4 className="text-sm font-medium text-[var(--accent-blue)] mb-3">
                Sesije ({filteredAndSortedSessions.length} od {sessions.length})
              </h4>
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                {filteredAndSortedSessions.length === 0 ? (
                  <div className="text-center text-[var(--text-muted)] py-8">
                    {searchQuery || filterOption !== 'all' ? 'Nema rezultata za vašu pretragu' : 'Nema sesija'}
                  </div>
                ) : (
                  filteredAndSortedSessions.map((session) => (
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
                  ))
                )}
              </div>
            </div>

            {/* Desna kolona: Poruke */}
            <div className="flex-1 min-w-0 p-4 flex flex-col">
              <h4 className="text-sm font-medium text-[var(--accent-blue)] mb-3">
                Poruke {selectedSession ? `(${sessionMessages.length})` : ''}
              </h4>
              <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
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
      </div>
    </>
  );
} 