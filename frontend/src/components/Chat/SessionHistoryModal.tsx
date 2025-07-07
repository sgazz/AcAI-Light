'use client';

import React, { useState, useEffect } from 'react';
import { 
  FaTimes, 
  FaSearch, 
  FaFilter, 
  FaEdit, 
  FaTrash, 
  FaArchive, 
  FaDownload,
  FaShare,
  FaClock,
  FaComments,
  FaSort,
  FaSortUp,
  FaSortDown,
  FaHistory
} from 'react-icons/fa';

interface Session {
  session_id: string;
  name?: string;
  message_count: number;
  last_message: string;
  first_message?: string;
  created_at?: string;
}

interface SessionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
  selectedSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  onArchiveSession: (sessionId: string) => void;
  onExportSession: (sessionId: string) => void;
  onShareSession: (sessionId: string) => void;
}

type SortField = 'name' | 'message_count' | 'last_message' | 'created_at';
type SortDirection = 'asc' | 'desc';

export default function SessionHistoryModal({
  isOpen,
  onClose,
  sessions,
  selectedSessionId,
  onSessionSelect,
  onDeleteSession,
  onRenameSession,
  onArchiveSession,
  onExportSession,
  onShareSession
}: SessionHistoryModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'named' | 'unnamed'>('all');
  const [sortField, setSortField] = useState<SortField>('last_message');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  // Filter and sort sessions
  const filteredAndSortedSessions = sessions
    .filter(session => {
      const matchesSearch = 
        session.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        session.first_message?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = 
        filterType === 'all' ||
        (filterType === 'named' && session.name) ||
        (filterType === 'unnamed' && !session.name);
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortField) {
        case 'name':
          aValue = a.name || '';
          bValue = b.name || '';
          break;
        case 'message_count':
          aValue = a.message_count;
          bValue = b.message_count;
          break;
        case 'last_message':
          aValue = new Date(a.last_message);
          bValue = new Date(b.last_message);
          break;
        case 'created_at':
          aValue = new Date(a.created_at || a.first_message || '');
          bValue = new Date(b.created_at || b.first_message || '');
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const handleRename = (sessionId: string, currentName: string) => {
    setEditingSessionId(sessionId);
    setEditName(currentName || '');
  };

  const handleSaveRename = () => {
    if (editingSessionId && editName.trim()) {
      onRenameSession(editingSessionId, editName.trim());
      setEditingSessionId(null);
      setEditName('');
    }
  };

  const handleCancelRename = () => {
    setEditingSessionId(null);
    setEditName('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Sada';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d`;
    } else {
      return date.toLocaleDateString('sr-RS');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <FaSort className="text-slate-400" size={12} />;
    return sortDirection === 'asc' 
      ? <FaSortUp className="text-blue-400" size={12} />
      : <FaSortDown className="text-blue-400" size={12} />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <FaHistory className="text-blue-400" size={20} />
            <h2 className="text-xl font-semibold text-white">Istorija sesija</h2>
            <span className="text-sm text-slate-400">
              {filteredAndSortedSessions.length} od {sessions.length} sesija
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Controls */}
        <div className="p-6 border-b border-white/10 space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Pretraži sesije..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="px-4 py-2 bg-slate-800 border border-white/10 rounded-lg text-white focus:outline-none focus:border-blue-500/50"
            >
              <option value="all">Sve sesije</option>
              <option value="named">Samo imenovane</option>
              <option value="unnamed">Samo neimenovane</option>
            </select>
          </div>
        </div>

        {/* Sessions Table */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-slate-800/90 backdrop-blur-sm border-b border-white/10">
                <tr>
                  <th className="text-left p-4">
                    <button
                      onClick={() => handleSort('name')}
                      className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                    >
                      Naziv {getSortIcon('name')}
                    </button>
                  </th>
                  <th className="text-left p-4">
                    <button
                      onClick={() => handleSort('message_count')}
                      className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                    >
                      Poruke {getSortIcon('message_count')}
                    </button>
                  </th>
                  <th className="text-left p-4">
                    <button
                      onClick={() => handleSort('last_message')}
                      className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                    >
                      Poslednja aktivnost {getSortIcon('last_message')}
                    </button>
                  </th>
                  <th className="text-left p-4">
                    <button
                      onClick={() => handleSort('created_at')}
                      className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                    >
                      Kreirana {getSortIcon('created_at')}
                    </button>
                  </th>
                  <th className="text-right p-4">
                    <span className="text-sm font-medium text-slate-300">Akcije</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedSessions.map((session) => (
                  <tr
                    key={session.session_id}
                    className={`
                      border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer
                      ${selectedSessionId === session.session_id ? 'bg-blue-500/10 border-blue-500/20' : ''}
                    `}
                    onClick={() => onSessionSelect(session.session_id)}
                  >
                    <td className="p-4">
                      {editingSessionId === session.session_id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename();
                              if (e.key === 'Escape') handleCancelRename();
                            }}
                            className="flex-1 px-2 py-1 bg-slate-700 border border-blue-500 rounded text-white text-sm focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSaveRename();
                            }}
                            className="p-1 text-green-400 hover:text-green-300"
                          >
                            ✓
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCancelRename();
                            }}
                            className="p-1 text-red-400 hover:text-red-300"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                          <span className="font-medium text-white">
                            {session.name || `Sesija ${session.session_id.slice(0, 8)}...`}
                          </span>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 text-slate-300">
                        <FaComments size={12} />
                        <span>{session.message_count}</span>
                      </div>
                    </td>
                    <td className="p-4 text-slate-300">
                      {formatDate(session.last_message)}
                    </td>
                                         <td className="p-4 text-slate-300">
                       {formatDate(session.created_at || session.first_message || '')}
                     </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRename(session.session_id, session.name || '');
                          }}
                          className="p-2 text-slate-400 hover:text-yellow-400 hover:bg-white/10 rounded-lg transition-colors"
                          title="Preimenuj"
                        >
                          <FaEdit size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onArchiveSession(session.session_id);
                          }}
                          className="p-2 text-slate-400 hover:text-orange-400 hover:bg-white/10 rounded-lg transition-colors"
                          title="Arhiviraj"
                        >
                          <FaArchive size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onExportSession(session.session_id);
                          }}
                          className="p-2 text-slate-400 hover:text-green-400 hover:bg-white/10 rounded-lg transition-colors"
                          title="Izvezi"
                        >
                          <FaDownload size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onShareSession(session.session_id);
                          }}
                          className="p-2 text-slate-400 hover:text-purple-400 hover:bg-white/10 rounded-lg transition-colors"
                          title="Podeli"
                        >
                          <FaShare size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('Da li ste sigurni da želite da obrišete ovu sesiju?')) {
                              onDeleteSession(session.session_id);
                            }
                          }}
                          className="p-2 text-slate-400 hover:text-red-400 hover:bg-white/10 rounded-lg transition-colors"
                          title="Obriši"
                        >
                          <FaTrash size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-white/10">
          <div className="flex items-center justify-between">
            <div className="text-sm text-slate-400">
              Ukupno: {sessions.length} sesija • Prikazano: {filteredAndSortedSessions.length}
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Zatvori
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 