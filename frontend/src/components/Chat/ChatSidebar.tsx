'use client';

import React, { useState } from 'react';
import { 
  FaPlus, 
  FaTrash, 
  FaEdit, 
  FaEye, 
  FaClock, 
  FaComments,
  FaSearch,
  FaFilter,
  FaTimes
} from 'react-icons/fa';

interface Session {
  session_id: string;
  name?: string;
  message_count: number;
  last_message: string;
  first_message?: string;
  created_at?: string;
}

interface ChatSidebarProps {
  sessions: Session[];
  selectedSessionId?: string;
  onSessionSelect: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newName: string) => void;
  onClose?: () => void;
}

export default function ChatSidebar({
  sessions,
  selectedSessionId,
  onSessionSelect,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  onClose
}: ChatSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const filteredSessions = sessions.filter(session =>
    session.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    session.first_message?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  return (
    <div className="w-80 h-full bg-slate-800/90 backdrop-blur-sm border-r border-white/10 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FaComments size={18} className="text-blue-400" />
            Sesije
          </h2>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <FaTimes size={16} />
            </button>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Pretraži sesije..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-700/50 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        {/* New Session Button */}
        <button
          onClick={onNewSession}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
        >
          <FaPlus size={14} />
          Nova sesija
        </button>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {filteredSessions.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            <FaComments size={32} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">
              {searchQuery ? 'Nema rezultata za pretragu' : 'Nema sesija'}
            </p>
          </div>
        ) : (
          filteredSessions.map((session) => (
            <div
              key={session.session_id}
              className={`
                group relative p-3 rounded-lg border cursor-pointer transition-all duration-200
                ${selectedSessionId === session.session_id
                  ? 'border-blue-500 bg-blue-500/20'
                  : 'border-white/10 hover:border-blue-500/50 hover:bg-white/5'
                }
              `}
              onClick={() => onSessionSelect(session.session_id)}
            >
              {/* Session Content */}
              <div className="flex-1 min-w-0">
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
                      onClick={handleSaveRename}
                      className="p-1 text-green-400 hover:text-green-300"
                    >
                      ✓
                    </button>
                    <button
                      onClick={handleCancelRename}
                      className="p-1 text-red-400 hover:text-red-300"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white truncate">
                        {session.name || `Sesija ${session.session_id.slice(0, 8)}...`}
                      </h3>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                        {session.first_message || 'Nema poruka'}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <FaComments size={10} />
                          {session.message_count}
                        </span>
                        <span className="flex items-center gap-1">
                          <FaClock size={10} />
                          {formatDate(session.last_message)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {editingSessionId !== session.session_id && (
                <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRename(session.session_id, session.name || '');
                    }}
                    className="p-1 text-slate-400 hover:text-yellow-400 transition-colors"
                    title="Preimenuj"
                  >
                    <FaEdit size={12} />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.session_id);
                    }}
                    className="p-1 text-slate-400 hover:text-red-400 transition-colors"
                    title="Obriši"
                  >
                    <FaTrash size={12} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-white/10">
        <div className="text-xs text-slate-400 text-center">
          {filteredSessions.length} sesija
        </div>
      </div>
    </div>
  );
} 