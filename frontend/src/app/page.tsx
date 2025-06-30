'use client';

import WelcomeScreen from '../components/WelcomeScreen';

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
import FileSharing from '../components/FileHandling/FileSharing';
import VirtualScrollTest from '../components/Performance/VirtualScrollTest';
import MindMapping from '../components/MindMapping/MindMapping';

export default function Home() {
  const [selectedMenu, setSelectedMenu] = useState(-1);
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
    if (selectedMenu === -1) {
      return <WelcomeScreen 
        onStartChat={() => setSelectedMenu(0)}
        onSelectFeature={(index) => setSelectedMenu(index)}
        hasRecentSessions={true}
        recentSessions={[
          {
            id: '1',
            title: 'Matematika - Diferencijalni račun',
            lastMessage: 'Možete li mi objasniti pravilo lanca?',
            timestamp: '2024-01-15T14:30:00Z',
            messageCount: 12
          },
          {
            id: '2', 
            title: 'Fizika - Mehanika',
            lastMessage: 'Kako se rešava problem sa silama?',
            timestamp: '2024-01-14T16:45:00Z',
            messageCount: 8
          },
          {
            id: '3',
            title: 'Programiranje - React Hooks',
            lastMessage: 'Kada koristiti useEffect vs useState?',
            timestamp: '2024-01-13T10:20:00Z', 
            messageCount: 15
          }
        ]}
      />;
    }
    
    switch (selectedMenu) {
      case 0:
        return <ChatBox />;
      case 1:
        return <MindMapping />;
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
              <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Dokumenti</h2>
                <p className="text-gray-300">Upload, pregled i upravljanje dokumentima</p>
              </div>
              
              {/* File Handling Section */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold mb-4 text-blue-300">📁 File Handling</h3>
                <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                  <FileSharing
                    onFileUpload={(files: File[]) => {
                      console.log('Files uploaded:', files);
                      showSuccess(`${files.length} fajlova uspešno uploadovano`, 'Upload');
                    }}
                    onFileRemove={(fileId: string) => {
                      console.log('File removed:', fileId);
                      showInfo('Fajl uklonjen', 'File Management');
                    }}
                    maxFiles={10}
                    maxSize={50}
                    acceptedTypes={[
                      'image/*', 
                      'application/pdf', 
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                      'text/*',
                      'application/json',
                      'application/xml'
                    ]}
                  />
                </div>
              </div>
              
              {/* Existing Document Management */}
              <div>
                <h3 className="text-lg font-semibold mb-4 text-green-300">📋 Document Management</h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <DocumentUpload />
                  <DocumentList />
                </div>
              </div>
            </div>
          </div>
        );
      case 9:
        return <VirtualScrollTest />;
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
      </div>
    </ErrorBoundary>
  );
}
