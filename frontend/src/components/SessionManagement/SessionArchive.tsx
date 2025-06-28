'use client';

import { useState, useEffect } from 'react';
import { FaArchive, FaTrash, FaTimes, FaSave, FaCalendar, FaClock, FaEye, FaDownload, FaShare, FaTags, FaComment } from 'react-icons/fa';
import { formatDate } from '../../utils/dateUtils';
import { useErrorToast } from '../ErrorToastProvider';

interface ArchivedSession {
  session_id: string;
  name?: string;
  message_count: number;
  first_message: string;
  last_message: string;
  archived_at: string;
  categories?: string[];
  size_bytes: number;
}

interface SessionArchiveProps {
  isOpen: boolean;
  onClose: () => void;
  onRestore?: (sessionId: string) => Promise<void>;
  onDelete?: (sessionId: string) => Promise<void>;
  onExport?: (sessionId: string) => Promise<void>;
}

export default function SessionArchive({
  isOpen,
  onClose,
  onRestore,
  onDelete,
  onExport
}: SessionArchiveProps) {
  const [archivedSessions, setArchivedSessions] = useState<ArchivedSession[]>([]);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'size' | 'messages'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterBy, setFilterBy] = useState<'all' | 'recent' | 'old' | 'large'>('all');
  const { showError, showSuccess } = useErrorToast();

  useEffect(() => {
    if (isOpen) {
      loadArchivedSessions();
    }
  }, [isOpen]);

  const loadArchivedSessions = async () => {
    setIsLoading(true);
    try {
      // Simuliramo učitavanje arhiviranih sesija - u realnoj aplikaciji bi ovo bilo API poziv
      const mockArchivedSessions: ArchivedSession[] = [
        {
          session_id: 'arch-001',
          name: 'React Hooks analiza',
          message_count: 45,
          first_message: '2024-01-15T10:30:00Z',
          last_message: '2024-01-15T14:20:00Z',
          archived_at: '2024-01-20T09:00:00Z',
          categories: ['study', 'project'],
          size_bytes: 1024000
        },
        {
          session_id: 'arch-002',
          name: 'Business plan diskusija',
          message_count: 23,
          first_message: '2024-01-10T08:15:00Z',
          last_message: '2024-01-10T11:45:00Z',
          archived_at: '2024-01-18T16:30:00Z',
          categories: ['work', 'meeting'],
          size_bytes: 512000
        },
        {
          session_id: 'arch-003',
          name: 'TypeScript best practices',
          message_count: 67,
          first_message: '2024-01-05T13:00:00Z',
          last_message: '2024-01-05T17:30:00Z',
          archived_at: '2024-01-15T10:00:00Z',
          categories: ['study'],
          size_bytes: 2048000
        }
      ];
      setArchivedSessions(mockArchivedSessions);
    } catch (error: any) {
      showError('Greška pri učitavanju arhiviranih sesija', 'Greška');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAndSortedSessions = archivedSessions
    .filter(session => {
      // Search filter
      const matchesSearch = searchQuery === '' || 
        session.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.session_id.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Date filter
      const archivedDate = new Date(session.archived_at);
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      switch (filterBy) {
        case 'recent':
          return archivedDate >= thirtyDaysAgo;
        case 'old':
          return archivedDate < ninetyDaysAgo;
        case 'large':
          return session.size_bytes > 1024000; // > 1MB
        default:
          return true;
      }
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(a.archived_at).getTime() - new Date(b.archived_at).getTime();
          break;
        case 'name':
          comparison = (a.name || '').localeCompare(b.name || '');
          break;
        case 'size':
          comparison = a.size_bytes - b.size_bytes;
          break;
        case 'messages':
          comparison = a.message_count - b.message_count;
          break;
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const handleRestore = async (sessionId: string) => {
    if (!onRestore) return;

    setIsLoading(true);
    try {
      await onRestore(sessionId);
      setArchivedSessions(prev => prev.filter(s => s.session_id !== sessionId));
      setSelectedSessions(prev => prev.filter(id => id !== sessionId));
      showSuccess('Sesija uspešno vraćena iz arhive', 'Vraćanje');
    } catch (error: any) {
      showError(error.message || 'Greška pri vraćanju sesije', 'Greška');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (sessionId: string) => {
    if (!onDelete) return;

    if (!confirm('Da li ste sigurni da želite trajno obrisati ovu sesiju iz arhive?')) return;

    setIsLoading(true);
    try {
      await onDelete(sessionId);
      setArchivedSessions(prev => prev.filter(s => s.session_id !== sessionId));
      setSelectedSessions(prev => prev.filter(id => id !== sessionId));
      showSuccess('Sesija trajno obrisana iz arhive', 'Brisanje');
    } catch (error: any) {
      showError(error.message || 'Greška pri brisanju sesije', 'Greška');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (sessionId: string) => {
    if (!onExport) return;

    setIsLoading(true);
    try {
      await onExport(sessionId);
      showSuccess('Sesija uspešno eksportovana', 'Export');
    } catch (error: any) {
      showError(error.message || 'Greška pri exportu sesije', 'Greška');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSessionSelection = (sessionId: string) => {
    setSelectedSessions(prev => 
      prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    );
  };

  const selectAll = () => {
    setSelectedSessions(filteredAndSortedSessions.map(s => s.session_id));
  };

  const deselectAll = () => {
    setSelectedSessions([]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      work: '#3B82F6',
      study: '#10B981',
      personal: '#F59E0B',
      research: '#8B5CF6',
      project: '#EF4444',
      meeting: '#06B6D4',
      ideas: '#84CC16',
      archive: '#6B7280'
    };
    return colors[category] || '#6B7280';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-6xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            <FaArchive className="inline mr-2" />
            Arhiva sesija
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <FaTimes />
          </button>
        </div>

        <div className="space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {archivedSessions.length}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400">Ukupno arhivirano</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {formatFileSize(archivedSessions.reduce((sum, s) => sum + s.size_bytes, 0))}
              </div>
              <div className="text-sm text-green-600 dark:text-green-400">Ukupna veličina</div>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {archivedSessions.reduce((sum, s) => sum + s.message_count, 0)}
              </div>
              <div className="text-sm text-yellow-600 dark:text-yellow-400">Ukupno poruka</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {selectedSessions.length}
              </div>
              <div className="text-sm text-purple-600 dark:text-purple-400">Izabrano</div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Pretraži arhivu..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">Sve sesije</option>
                <option value="recent">Nedavno arhivirane</option>
                <option value="old">Stare sesije</option>
                <option value="large">Velike sesije</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="date">Po datumu</option>
                <option value="name">Po nazivu</option>
                <option value="size">Po veličini</option>
                <option value="messages">Po porukama</option>
              </select>
              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedSessions.length > 0 && (
            <div className="flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <div className="flex items-center gap-4">
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  {selectedSessions.length} sesija izabrano
                </span>
                <button
                  onClick={deselectAll}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Poništi izbor
                </button>
              </div>
              <div className="flex gap-2">
                {onRestore && (
                  <button
                    onClick={() => selectedSessions.forEach(handleRestore)}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-3 py-1 bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white rounded-lg text-sm transition-colors"
                  >
                    <FaArchive />
                    <span>Vrati izabrane</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => selectedSessions.forEach(handleDelete)}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-3 py-1 bg-red-500 hover:bg-red-600 disabled:bg-gray-400 text-white rounded-lg text-sm transition-colors"
                  >
                    <FaTrash />
                    <span>Obriši izabrane</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Sessions List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white">
                Arhivirane sesije ({filteredAndSortedSessions.length})
              </h3>
              <button
                onClick={selectAll}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Izaberi sve
              </button>
            </div>

            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-2 text-gray-600 dark:text-gray-400">Učitavanje...</p>
              </div>
            ) : filteredAndSortedSessions.length === 0 ? (
              <div className="text-center py-8">
                <FaArchive className="mx-auto text-gray-400 text-4xl mb-4" />
                <p className="text-gray-600 dark:text-gray-400">Nema arhiviranih sesija</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAndSortedSessions.map(session => (
                  <div
                    key={session.session_id}
                    className={`p-4 border rounded-lg transition-all ${
                      selectedSessions.includes(session.session_id)
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <input
                            type="checkbox"
                            checked={selectedSessions.includes(session.session_id)}
                            onChange={() => toggleSessionSelection(session.session_id)}
                            className="rounded border-gray-300 dark:border-gray-600"
                          />
                          <h4 className="font-medium text-gray-900 dark:text-white">
                            {session.name || session.session_id}
                          </h4>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {session.session_id}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400">
                          <div className="flex items-center gap-2">
                            <FaClock />
                            <span>Arhivirano: {formatDate(session.archived_at)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaComment />
                            <span>{session.message_count} poruka</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <FaDownload />
                            <span>{formatFileSize(session.size_bytes)}</span>
                          </div>
                        </div>

                        {session.categories && session.categories.length > 0 && (
                          <div className="flex items-center gap-2 mt-2">
                            <FaTags className="text-gray-400" />
                            <div className="flex gap-1">
                              {session.categories.map(category => (
                                <span
                                  key={category}
                                  className="px-2 py-1 rounded-full text-xs font-medium"
                                  style={{
                                    backgroundColor: getCategoryColor(category),
                                    color: '#ffffff'
                                  }}
                                >
                                  {category}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        {onRestore && (
                          <button
                            onClick={() => handleRestore(session.session_id)}
                            disabled={isLoading}
                            className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/20 rounded-lg transition-colors"
                            title="Vrati iz arhive"
                          >
                            <FaArchive />
                          </button>
                        )}
                        {onExport && (
                          <button
                            onClick={() => handleExport(session.session_id)}
                            disabled={isLoading}
                            className="p-2 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                            title="Export sesije"
                          >
                            <FaDownload />
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => handleDelete(session.session_id)}
                            disabled={isLoading}
                            className="p-2 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Trajno obriši"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-500 hover:bg-gray-600 disabled:bg-gray-400 text-white rounded-lg transition-colors"
            >
              Zatvori
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 