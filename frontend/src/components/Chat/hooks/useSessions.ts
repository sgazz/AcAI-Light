'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiRequest } from '../../../utils/api';

interface Session {
  session_id: string;
  name?: string;
  message_count: number;
  last_message: string;
  first_message?: string;
  created_at?: string;
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await apiRequest('/chat/sessions');
      if (data.status === 'success') {
        setSessions(data.sessions);
        
        // Set selected session if none is selected
        if (!selectedSession && data.sessions.length > 0) {
          setSelectedSession(data.sessions[0]);
        }
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedSession]);

  const selectSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.session_id === sessionId);
    if (session) {
      setSelectedSession(session);
    }
  }, [sessions]);

  const deleteSession = useCallback(async (sessionId: string) => {
    if (!confirm('Da li ste sigurni da želite da obrišete ovu sesiju?')) {
      return;
    }

    try {
      const data = await apiRequest(`/chat/session/${sessionId}`, {
        method: 'DELETE',
      });
      
      if (data.status === 'success') {
        setSessions(prev => prev.filter(s => s.session_id !== sessionId));
        
        // Clear selected session if it was deleted
        if (selectedSession?.session_id === sessionId) {
          setSelectedSession(null);
        }
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }, [selectedSession]);

  const renameSession = useCallback(async (sessionId: string, newName: string) => {
    try {
      const data = await apiRequest(`/chat/sessions/${sessionId}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName })
      });
      
      if (data.status === 'success') {
        setSessions(prev => prev.map(s => 
          s.session_id === sessionId 
            ? { ...s, name: newName }
            : s
        ));
        
        // Update selected session if it was renamed
        if (selectedSession?.session_id === sessionId) {
          setSelectedSession(prev => prev ? { ...prev, name: newName } : null);
        }
      }
    } catch (error) {
      console.error('Error renaming session:', error);
      throw error;
    }
  }, [selectedSession]);

  const archiveSession = useCallback(async (sessionId: string) => {
    try {
      const data = await apiRequest(`/chat/sessions/${sessionId}/archive`, {
        method: 'POST',
      });
      
      if (data.status === 'success') {
        setSessions(prev => prev.filter(s => s.session_id !== sessionId));
        
        // Update selected session if it was archived
        if (selectedSession?.session_id === sessionId) {
          setSelectedSession(null);
        }
      }
    } catch (error) {
      console.error('Error archiving session:', error);
      throw error;
    }
  }, [selectedSession]);

  const restoreSession = useCallback(async (sessionId: string) => {
    try {
      const data = await apiRequest(`/chat/sessions/${sessionId}/restore`, {
        method: 'POST',
      });
      
      if (data.status === 'success') {
        // Reload sessions to get the restored session
        await loadSessions();
      }
    } catch (error) {
      console.error('Error restoring session:', error);
      throw error;
    }
  }, [loadSessions]);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  return {
    sessions,
    selectedSession,
    isLoading,
    loadSessions,
    selectSession,
    deleteSession,
    renameSession,
    archiveSession,
    restoreSession
  };
} 