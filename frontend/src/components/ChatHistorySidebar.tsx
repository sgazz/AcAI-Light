'use client';

import { useState, useEffect, useMemo } from 'react';
import { FaHistory, FaTrash, FaEye, FaTimes, FaSearch, FaFilter, FaCalendar, FaSort, FaDownload, FaComments, FaClock, FaUser, FaRobot, FaStar, FaBookmark, FaShare, FaEllipsisH, FaEdit, FaTags, FaArchive, FaPlay } from 'react-icons/fa';
import { formatDate } from '../utils/dateUtils';
import { CHAT_SESSIONS_ENDPOINT, CHAT_HISTORY_ENDPOINT, API_BASE, apiRequest } from '../utils/api';
import { useErrorToast } from './ErrorToastProvider';
import ExportModal from './ExportModal';
import SessionRenameModal from './SessionManagement/SessionRenameModal';
import SessionCategories from './SessionManagement/SessionCategories';
import SessionArchive from './SessionManagement/SessionArchive';
import SessionSharing from './SessionManagement/SessionSharing';

interface Session {
  session_id: string;
  message_count: number;
  first_message: string;
  last_message: string;
  name?: string;
  categories?: string[];
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
  onRestoreSession?: (sessionId: string, messages: any[]) => void;
}

type SortOption = 'date-desc' | 'date-asc' | 'messages-desc' | 'messages-asc';
type FilterOption = 'all' | 'today' | 'week' | 'month' | 'custom';

export default function ChatHistorySidebar({ isOpen, onClose, onRestoreSession }: ChatHistorySidebarProps) {
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
  
  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  
  // Session Management state
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [selectedSessionForManagement, setSelectedSessionForManagement] = useState<Session | null>(null);
  
  const { showError, showSuccess } = useErrorToast();

  useEffect(() => {
    if (isOpen) {
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
    try {
      const data = await apiRequest(CHAT_SESSIONS_ENDPOINT);
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
      const data = await apiRequest(`${API_BASE}/chat/session/${sessionId}`, {
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

  const handleResumeSession = async (sessionId: string) => {
    try {
      // Učitaj poruke iz sesije
      const data = await apiRequest(`${CHAT_HISTORY_ENDPOINT}/${sessionId}`);
      if (data.status === 'success' && data.messages) {
        // Pozovi callback funkciju sa session ID i porukama
        if (onRestoreSession) {
          onRestoreSession(sessionId, data.messages);
          showSuccess('Sesija povraćena', 'Povratak');
          onClose(); // Zatvori sidebar
        }
      } else {
        throw new Error(data.message || 'Greška pri povratku sesije');
      }
    } catch (error: any) {
      showError(
        error.message || 'Greška pri povratku sesije',
        'Greška povratka',
        true,
        () => handleResumeSession(sessionId)
      );
    }
  };

  const handleExport = () => {
    console.log('=== CHAT HISTORY SIDEBAR HANDLE EXPORT ===');
    console.log('ChatHistorySidebar handleExport pozvan:', { selectedSession, sessionMessages: sessionMessages.length });
    console.log('Trenutno showExportModal pre poziva:', showExportModal);
    
    if (!selectedSession || sessionMessages.length === 0) {
      console.log('Export nije moguć - nema sesije ili poruka');
      showError('Izaberite sesiju sa porukama za export', 'Export greška');
      return;
    }
    
    console.log('Otvaram ExportModal, trenutno showExportModal:', showExportModal);
    setShowExportModal(true);
    console.log('setShowExportModal(true) pozvan');
    
    // Dodajem timeout da proverim da li se state promenio
    setTimeout(() => {
      console.log('showExportModal nakon 100ms:', showExportModal);
    }, 100);
  };

  const getSelectedSessionData = () => {
    if (!selectedSession) return null;
    return sessions.find(s => s.session_id === selectedSession) || null;
  };

  // Session Management Functions
  const handleRenameSession = async (sessionId: string, newName: string) => {
    try {
      const data = await apiRequest(`${API_BASE}/chat/sessions/${sessionId}/rename`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newName }),
      });
      
      if (data.status === 'success') {
        // Refresh sessions list to show updated name
        await loadSessions();
        showSuccess('Sesija uspešno preimenovana', 'Preimenovanje');
      } else {
        throw new Error(data.message || 'Greška pri preimenovanju sesije');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri preimenovanju sesije', 'Greška');
      throw error;
    }
  };

  const handleUpdateCategories = async (sessionId: string, categories: string[]) => {
    try {
      const data = await apiRequest(`${CHAT_SESSIONS_ENDPOINT}/${sessionId}/categories`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categories),
      });
      
      if (data.status === 'success') {
        setSessions(prev => prev.map(s => 
          s.session_id === sessionId ? { ...s, categories } : s
        ));
        showSuccess('Kategorije uspešno ažurirane', 'Ažuriranje');
      } else {
        throw new Error(data.message || 'Greška pri ažuriranju kategorija');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri ažuriranju kategorija', 'Greška');
      throw error;
    }
  };

  const handleArchiveSession = async (sessionId: string) => {
    if (!confirm('Da li ste sigurni da želite da arhivirate ovu sesiju? Arhivirane sesije se mogu vratiti kasnije.')) return;
    
    try {
      const data = await apiRequest(`${API_BASE}/chat/sessions/${sessionId}/archive`, {
        method: 'POST',
      });
      
      if (data.status === 'success') {
        // Remove from current sessions list
        setSessions(prev => prev.filter(s => s.session_id !== sessionId));
        if (selectedSession === sessionId) {
          setSelectedSession(null);
          setSessionMessages([]);
        }
        showSuccess('Sesija uspešno arhivirana. Možete je vratiti iz arhive.', 'Arhiviranje');
      } else {
        throw new Error(data.message || 'Greška pri arhiviranju sesije');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri arhiviranju sesije', 'Greška');
      throw error;
    }
  };

  const handleRestoreSession = async (sessionId: string) => {
    try {
      const data = await apiRequest(`${CHAT_SESSIONS_ENDPOINT}/${sessionId}/restore`, {
        method: 'POST',
      });
      
      if (data.status === 'success') {
        // Učitaj ponovo sesije da uključimo vraćenu sesiju
        await loadSessions();
        showSuccess('Sesija uspešno vraćena iz arhive', 'Vraćanje');
      } else {
        throw new Error(data.message || 'Greška pri vraćanju sesije');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri vraćanju sesije', 'Greška');
      throw error;
    }
  };

  const handleShareSession = async (settings: any) => {
    try {
      const data = await apiRequest(`${CHAT_SESSIONS_ENDPOINT}/${selectedSession}/share?permissions=${settings.permissions || 'read'}&expires_in=${settings.expires_in || '7d'}`, {
        method: 'POST',
      });
      
      if (data.status === 'success') {
        showSuccess('Link za deljenje uspešno kreiran', 'Deljenje');
        return data.share_token;
      } else {
        throw new Error(data.message || 'Greška pri kreiranju linka za deljenje');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri kreiranju linka za deljenje', 'Greška');
      throw error;
    }
  };

  const handleRevokeShare = async (linkId: string) => {
    try {
      const data = await apiRequest(`${CHAT_SESSIONS_ENDPOINT}/share/${linkId}`, {
        method: 'DELETE',
      });
      
      if (data.status === 'success') {
        showSuccess('Link za deljenje uspešno opozvan', 'Opozivanje');
      } else {
        throw new Error(data.message || 'Greška pri opozivanju linka');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri opozivanju linka', 'Greška');
      throw error;
    }
  };

  const handleExportArchivedSession = async (sessionId: string) => {
    try {
      const data = await apiRequest(`${CHAT_SESSIONS_ENDPOINT}/${sessionId}/export`, {
        method: 'GET',
      });
      
      if (data.status === 'success') {
        showSuccess('Sesija uspešno eksportovana', 'Export');
      } else {
        throw new Error(data.message || 'Greška pri exportu sesije');
      }
    } catch (error: any) {
      showError(error.message || 'Greška pri exportu sesije', 'Greška');
      throw error;
    }
  };

  const openSessionManagement = (modal: 'rename' | 'categories' | 'archive' | 'sharing', session: Session) => {
    setSelectedSessionForManagement(session);
    switch (modal) {
      case 'rename':
        setShowRenameModal(true);
        break;
      case 'categories':
        setShowCategoriesModal(true);
        break;
      case 'archive':
        setShowArchiveModal(true);
        break;
      case 'sharing':
        setShowSharingModal(true);
        break;
    }
  };

  return (
    <>
      {/* Premium Overlay sa Glassmorphism */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gradient-to-br from-black/60 via-purple-900/20 to-blue-900/30 backdrop-blur-xl z-40"
          onClick={onClose}
        />
      )}
      {/* Centralni modal umesto sidebar-a */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="relative w-full max-w-7xl mx-auto rounded-[2rem] shadow-2xl bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 border border-white/10 flex flex-col h-[95vh] overflow-hidden">
            <div className="flex flex-col h-full relative overflow-hidden">
              {/* Animated Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-pulse"></div>
                <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-bounce"></div>
                <div className="absolute bottom-1/4 left-1/4 w-24 h-24 bg-purple-400/10 rounded-full blur-xl animate-pulse"></div>
              </div>

              {/* Premium Header */}
              <div className="relative flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-slate-800/50 via-slate-700/30 to-slate-800/50 backdrop-blur-sm">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                      <FaHistory className="text-white" size={24} />
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                      Istorija razgovora
                    </h3>
                    <p className="text-sm text-slate-400 font-medium">Pregledajte i upravljajte sesijama</p>
                  </div>
                  <button
                    onClick={() => openSessionManagement('archive', { session_id: 'archive-view' } as Session)}
                    className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-xl hover:bg-orange-500/30 hover:text-orange-300 transition-all duration-300 font-semibold border border-orange-500/30"
                    title="Pogledaj arhivu"
                  >
                    <FaArchive size={16} />
                    <span>Arhiva</span>
                  </button>
                </div>
                <button
                  onClick={onClose}
                  className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl icon-hover-profi"
                  title="Zatvori"
                >
                  <FaTimes size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                </button>
              </div>

              {/* Premium Search & Filter Bar */}
              <div className="relative p-6 border-b border-white/10 space-y-6">
                {/* Premium Search Box */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Pretraži sesije..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-16 pr-6 py-4 bg-slate-800/50 border border-white/10 rounded-2xl text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/20 backdrop-blur-sm transition-all duration-300"
                    />
                    <div className="absolute left-6 top-1/2 transform -translate-y-1/2 w-5 h-5 bg-slate-700/80 group-hover:bg-blue-500/80 rounded-full flex items-center justify-center z-10 transition-all duration-300">
                      <FaSearch className="text-white group-hover:text-white transition-colors duration-300" size={16} />
                    </div>
                  </div>
                </div>

                {/* Premium Filter Controls */}
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`relative overflow-hidden px-6 py-3 rounded-2xl transition-all duration-300 ${
                      showFilters 
                        ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-blue-500/25' 
                        : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-white border border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FaFilter size={16} />
                      <span className="font-semibold">Filter</span>
                    </div>
                    {showFilters && (
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 animate-pulse"></div>
                    )}
                  </button>

                  <select
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="px-6 py-3 bg-slate-800/50 border border-white/10 rounded-2xl text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/20 backdrop-blur-sm transition-all duration-300"
                  >
                    <option value="date-desc">Najnovije prvo</option>
                    <option value="date-asc">Najstarije prvo</option>
                    <option value="messages-desc">Najviše poruka</option>
                    <option value="messages-asc">Najmanje poruka</option>
                  </select>

                  {(searchQuery || filterOption !== 'all') && (
                    <button
                      onClick={clearFilters}
                      className="px-6 py-3 bg-red-500/20 text-red-400 rounded-2xl hover:bg-red-500/30 hover:text-red-300 transition-all duration-300 font-semibold border border-red-500/30"
                    >
                      Očisti
                    </button>
                  )}
                </div>

                {/* Premium Advanced Filters */}
                {showFilters && (
                  <div className="space-y-6 p-6 bg-slate-800/30 rounded-2xl border border-white/10 backdrop-blur-sm animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <FaCalendar size={18} className="text-blue-400" />
                      </div>
                      <span className="text-lg font-bold text-white">Filter po datumu</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      {(['all', 'today', 'week', 'month'] as FilterOption[]).map((option) => (
                        <button
                          key={option}
                          onClick={() => setFilterOption(option)}
                          className={`relative overflow-hidden px-6 py-4 rounded-xl text-sm font-semibold transition-all duration-300 ${
                            filterOption === option
                              ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg'
                              : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600/50 hover:text-white border border-white/10'
                          }`}
                        >
                          {option === 'all' && 'Sve sesije'}
                          {option === 'today' && 'Danas'}
                          {option === 'week' && 'Ova nedelja'}
                          {option === 'month' && 'Ovaj mesec'}
                          {filterOption === option && (
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 animate-pulse"></div>
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-4">
                      <label className="text-sm font-semibold text-white">Prilagođeni period:</label>
                      <div className="grid grid-cols-2 gap-4">
                        <input
                          type="date"
                          value={customDateRange.start}
                          onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                          className="px-4 py-3 bg-slate-700/50 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300"
                        />
                        <input
                          type="date"
                          value={customDateRange.end}
                          onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                          className="px-4 py-3 bg-slate-700/50 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/20 transition-all duration-300"
                        />
                      </div>
                      {customDateRange.start && customDateRange.end && (
                        <button
                          onClick={() => setFilterOption('custom')}
                          className="w-full px-6 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 text-sm font-semibold shadow-lg"
                        >
                          Primeni prilagođeni filter
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Premium Dvokolonski prikaz */}
              <div className="flex-1 flex flex-row min-h-0">
                {/* Premium Leva kolona: Sesije */}
                <div className="flex-1 min-w-0 border-r border-white/10 p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-bold text-white flex items-center gap-3">
                      <div className="p-2 bg-blue-500/20 rounded-lg">
                        <FaComments size={18} className="text-blue-400" />
                      </div>
                      Sesije ({filteredAndSortedSessions.length} od {sessions.length})
                    </h4>
                    <div className="text-xs text-slate-400 bg-slate-800/50 px-3 py-2 rounded-lg border border-white/10">
                      <span className="font-semibold">Action dugmad:</span> ▶️ Povrati | 👁️ Pogledaj | ✏️ Preimenuj | 🏷️ Kategorije | 🔗 Podeli | 📦 Arhiviraj | 🗑️ Obriši
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                    {filteredAndSortedSessions.length === 0 ? (
                      <div className="text-center text-slate-400 py-16">
                        <div className="relative mb-6">
                          <FaHistory size={64} className="mx-auto opacity-30" />
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-2xl animate-pulse"></div>
                        </div>
                        <p className="text-xl font-bold mb-3 text-white">
                          {searchQuery || filterOption !== 'all' ? 'Nema rezultata za vašu pretragu' : 'Nema sesija'}
                        </p>
                        <p className="text-sm opacity-75">
                          {searchQuery || filterOption !== 'all' ? 'Pokušajte sa drugim filterima' : 'Počnite razgovor da vidite istoriju'}
                        </p>
                      </div>
                    ) : (
                      filteredAndSortedSessions.map((session, index) => (
                        <div
                          key={session.session_id}
                          className={`group relative p-6 rounded-2xl border cursor-pointer card-hover-profi ${
                            selectedSession === session.session_id
                              ? 'border-blue-500/50 bg-gradient-to-r from-blue-500/10 to-purple-500/10 shadow-xl shadow-blue-500/20'
                              : 'border-white/10 hover-border-subtle hover-bg-subtle'
                          }`}
                          onClick={() => loadSessionMessages(session.session_id)}
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          {/* Suptilni hover glow effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/3 to-purple-500/3 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                          
                          <div className="relative flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-pulse"></div>
                                <div className="text-lg font-bold text-white">
                                  {session.name || `${session.session_id.slice(0, 8)}...`}
                                </div>
                                <div className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-semibold rounded-lg">
                                  {session.message_count} poruka
                                </div>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-slate-400 mb-3">
                                <div className="flex items-center gap-2">
                                  <FaClock size={14} />
                                  <span>{formatDate(session.last_message)}</span>
                                </div>
                              </div>
                              <div className="text-sm text-slate-300 leading-relaxed line-clamp-2">
                                {session.first_message.length > 100
                                  ? `${session.first_message.substring(0, 100)}...`
                                  : session.first_message}
                              </div>
                            </div>
                            <div className="flex gap-2 ml-4 opacity-100 transition-opacity duration-300">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleResumeSession(session.session_id);
                                }}
                                className="p-3 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded-xl icon-hover-profi"
                                title="Povrati sesiju u glavni chat za nastavak razgovora"
                              >
                                <FaPlay size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  loadSessionMessages(session.session_id);
                                }}
                                className="p-3 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded-xl icon-hover-profi"
                                title="Pogledaj sve poruke iz sesije"
                              >
                                <FaEye size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSessionManagement('rename', session);
                                }}
                                className="p-3 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/20 rounded-xl icon-hover-profi"
                                title="Preimenuj sesiju (promeni naziv)"
                              >
                                <FaEdit size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSessionManagement('categories', session);
                                }}
                                className="p-3 text-purple-400 hover:text-purple-300 hover:bg-purple-500/20 rounded-xl icon-hover-profi"
                                title="Upravljaj kategorijama sesije"
                              >
                                <FaTags size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSessionManagement('sharing', session);
                                }}
                                className="p-3 text-green-400 hover:text-green-300 hover:bg-green-500/20 rounded-xl icon-hover-profi"
                                title="Kreiraj link za deljenje sesije"
                              >
                                <FaShare size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openSessionManagement('archive', session);
                                }}
                                className="p-3 text-orange-400 hover:text-orange-300 hover:bg-orange-500/20 rounded-xl icon-hover-profi"
                                title="Arhiviraj sesiju (možete je vratiti kasnije)"
                              >
                                <FaArchive size={16} />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteSession(session.session_id);
                                }}
                                className="p-3 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-xl icon-hover-profi"
                                title="Trajno obriši sesiju (nema povratka)"
                              >
                                <FaTrash size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Premium Desna kolona: Poruke */}
                <div className="flex-1 min-w-0 p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <h4 className="text-lg font-bold text-white flex items-center gap-3">
                      <div className="p-2 bg-green-500/20 rounded-lg">
                        <FaComments size={18} className="text-green-400" />
                      </div>
                      Poruke {selectedSession ? `(${sessionMessages.length})` : ''}
                    </h4>
                    
                    {selectedSession && sessionMessages.length > 0 && (
                      <button
                        onClick={() => setShowExportModal(true)}
                        className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all duration-300 text-sm font-semibold shadow-lg"
                        title="Export chat history"
                        style={{ zIndex: 9999, position: 'relative' }}
                      >
                        <FaDownload size={16} />
                        Export
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar">
                    {isLoading ? (
                      <div className="text-center text-blue-400 py-16">
                        <div className="relative mb-6">
                          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto"></div>
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-xl animate-pulse"></div>
                        </div>
                        <p className="text-lg font-semibold">Učitavanje poruka...</p>
                      </div>
                    ) : selectedSession ? (
                      sessionMessages.map((message, index) => (
                        <div
                          key={message.id}
                          className={`group relative p-6 rounded-2xl border transition-all duration-300 hover:scale-[1.01] ${
                            message.sender === 'user'
                              ? 'bg-gradient-to-r from-blue-500/10 to-blue-600/10 border-blue-500/30'
                              : 'bg-gradient-to-r from-slate-800/50 to-slate-700/50 border-white/10'
                          }`}
                          style={{ animationDelay: `${index * 30}ms` }}
                        >
                          <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center gap-3">
                              {message.sender === 'user' ? (
                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                  <FaUser size={16} className="text-blue-400" />
                                </div>
                              ) : (
                                <div className="p-2 bg-green-500/20 rounded-lg">
                                  <FaRobot size={16} className="text-green-400" />
                                </div>
                              )}
                              <span className={`text-sm font-bold ${
                                message.sender === 'user' ? 'text-blue-400' : 'text-green-400'
                              }`}>
                                {message.sender === 'user' ? 'Vi' : 'AI Asistent'}
                              </span>
                            </div>
                            <span className="text-xs text-slate-400 flex items-center gap-2">
                              <FaClock size={12} />
                              {formatDate(message.timestamp)}
                            </span>
                          </div>
                          <div className="text-sm text-white leading-relaxed">
                            {message.content.length > 200
                              ? `${message.content.substring(0, 200)}...`
                              : message.content}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-slate-400 py-16">
                        <div className="relative mb-6">
                          <FaComments size={64} className="mx-auto opacity-30" />
                          <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-full blur-2xl animate-pulse"></div>
                        </div>
                        <p className="text-xl font-bold mb-3 text-white">Izaberite sesiju</p>
                        <p className="text-sm opacity-75">Da vidite poruke iz te sesije</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        session={getSelectedSessionData()}
        messages={sessionMessages}
      />

      {/* Session Management Modals */}
      {selectedSessionForManagement && (
        <>
          <SessionRenameModal
            isOpen={showRenameModal}
            onClose={() => setShowRenameModal(false)}
            sessionId={selectedSessionForManagement.session_id}
            currentName={selectedSessionForManagement.name || ''}
            onRename={handleRenameSession}
            onDelete={deleteSession}
          />
          
          <SessionCategories
            isOpen={showCategoriesModal}
            onClose={() => setShowCategoriesModal(false)}
            sessionId={selectedSessionForManagement.session_id}
            currentCategories={selectedSessionForManagement.categories || []}
            onUpdateCategories={handleUpdateCategories}
          />
          
          <SessionArchive
            isOpen={showArchiveModal}
            onClose={() => setShowArchiveModal(false)}
            onRestore={handleRestoreSession}
            onDelete={deleteSession}
            onExport={handleExportArchivedSession}
          />
          
          <SessionSharing
            isOpen={showSharingModal}
            onClose={() => setShowSharingModal(false)}
            sessionId={selectedSessionForManagement.session_id}
            sessionName={selectedSessionForManagement.name}
            onShare={handleShareSession}
            onRevoke={handleRevokeShare}
          />
        </>
      )}
    </>
  );
} 