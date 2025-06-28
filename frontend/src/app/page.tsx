'use client';

import Sidebar from '../components/Sidebar';
import ChatBox from '../components/ChatBox';
import DocumentUpload from '../components/DocumentUpload';
import DocumentList from '../components/DocumentList';
import AudioMode from '../components/AudioMode';
import VoiceInputTest from '../components/VoiceInputTest';
import ErrorBoundary from '../components/ErrorBoundary';
import KeyboardShortcutsHelp from '../components/KeyboardShortcutsHelp';
import { useToast } from '../components/ErrorToast';
import { useKeyboardShortcuts, SHORTCUTS } from '../hooks/useKeyboardShortcuts';
import { useEffect, useState } from 'react';
import ErrorToast from '../components/ErrorToast';
import { HEALTH_CHECK_ENDPOINT } from '../utils/api';
import { OfflineDetector } from '../components/OfflineDetector';
import TestErrorHandling from '../components/TestErrorHandling';

export default function Home() {
  const [selectedMenu, setSelectedMenu] = useState(0);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const { toasts, showError, showSuccess, showInfo } = useToast();
  const [isOnline, setIsOnline] = useState(true);

  // Keyboard shortcuts
  const shortcuts = [
    {
      ...SHORTCUTS.HELP,
      action: () => setShowShortcutsHelp(!showShortcutsHelp)
    },
    {
      ...SHORTCUTS.FOCUS_CHAT,
      action: () => {
        const input = document.querySelector('textarea, input[type="text"]') as HTMLInputElement;
        if (input) input.focus();
      }
    },
    {
      ...SHORTCUTS.ESCAPE,
      action: () => setShowShortcutsHelp(false)
    }
  ];

  useKeyboardShortcuts(shortcuts);

  // Health check
  useEffect(() => {
    let isActive = true;
    
    const checkHealth = async () => {
      // Proveri da li je tab aktivan
      if (!document.hasFocus()) {
        return;
      }
      
      try {
        const response = await fetch(HEALTH_CHECK_ENDPOINT);
        if (!response.ok) {
          showError('Backend server nije dostupan', 'Connection Error');
        }
      } catch (error) {
        showError('Ne mogu da se povežem sa backend serverom', 'Connection Error');
      }
    };

    // Event listener za promenu fokusa
    const handleVisibilityChange = () => {
      isActive = !document.hidden;
    };

    const handleFocusChange = () => {
      isActive = document.hasFocus();
    };

    // Dodaj event listener-e
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocusChange);
    window.addEventListener('blur', handleFocusChange);

    checkHealth();
    const interval = setInterval(() => {
      if (isActive) {
        checkHealth();
      }
    }, 60000); // Check every 60 seconds only when active

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocusChange);
      window.removeEventListener('blur', handleFocusChange);
    };
  }, [showError]);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      showSuccess('Povezivanje uspostavljeno', 'Online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      showError('Izgubljena veza sa internetom', 'Offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showSuccess, showError]);

  const renderContent = () => {
    switch (selectedMenu) {
      case 0:
        return <ChatBox />;
      case 1:
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 p-6">
              <h2 className="text-2xl font-bold mb-4">Mind Mapping</h2>
              <p className="text-gray-300">Mind mapping funkcionalnost će biti implementirana ovde.</p>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 p-6">
              <AudioMode 
                onSendMessage={(message) => {
                  console.log('Audio message:', message);
                  // Handle audio message
                }}
                onTTSResponse={(text) => {
                  console.log('TTS response:', text);
                  // Handle TTS response
                }}
              />
            </div>
          </div>
        );
      case 3:
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 p-6">
              <h2 className="text-2xl font-bold mb-4">Study Room</h2>
              <p className="text-gray-300">Study room funkcionalnost će biti implementirana ovde.</p>
            </div>
          </div>
        );
      case 4:
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 p-6">
              <h2 className="text-2xl font-bold mb-4">Exam Simulation</h2>
              <p className="text-gray-300">Exam simulation funkcionalnost će biti implementirana ovde.</p>
            </div>
          </div>
        );
      case 5:
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 p-6">
              <h2 className="text-2xl font-bold mb-4">Problem Generator</h2>
              <p className="text-gray-300">Problem generator funkcionalnost će biti implementirana ovde.</p>
            </div>
          </div>
        );
      case 6:
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 p-6">
              <h2 className="text-2xl font-bold mb-4">Study Journal</h2>
              <p className="text-gray-300">Study journal funkcionalnost će biti implementirana ovde.</p>
            </div>
          </div>
        );
      case 7:
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 p-6">
              <h2 className="text-2xl font-bold mb-4">Career Guidance</h2>
              <p className="text-gray-300">Career guidance funkcionalnost će biti implementirana ovde.</p>
            </div>
          </div>
        );
      case 8:
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 p-6">
              <h2 className="text-2xl font-bold mb-4">Dokumenti</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <DocumentUpload />
                <DocumentList />
              </div>
            </div>
          </div>
        );
      default:
        return <ChatBox />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <OfflineDetector />
        <div className="flex h-screen p-4 gap-4">
          <Sidebar selectedMenu={selectedMenu} onMenuSelect={setSelectedMenu} />
          <main className="flex-1 overflow-hidden">
            {renderContent()}
          </main>
        </div>
        <TestErrorHandling />
      </div>

      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map(toast => (
          <ErrorToast
            key={toast.id}
            type={toast.type}
            message={toast.message}
            title={toast.title}
            duration={toast.duration}
            onClose={toast.onClose}
            showRetry={toast.showRetry}
            onRetry={toast.onRetry}
          />
        ))}
      </div>

      {/* Keyboard shortcuts help */}
      <KeyboardShortcutsHelp 
        isOpen={showShortcutsHelp} 
        onClose={() => setShowShortcutsHelp(false)} 
      />
    </ErrorBoundary>
  );
}
