'use client';

import { useEffect, useState } from 'react';
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
import ErrorToast from '../components/ErrorToast';
import { HEALTH_CHECK_ENDPOINT } from '../utils/api';
import { OfflineDetector } from '../components/OfflineDetector';
import FileSharing from '../components/FileHandling/FileSharing';
import VirtualScrollTest from '../components/Performance/VirtualScrollTest';
import MindMapping from '../components/MindMapping/MindMapping';
import StudyRoom from '../components/StudyRoom';
import ExamSimulation from '../components/ExamSimulation';
import ProblemGenerator from '../components/ProblemGenerator';
import StudyJournal from '../components/StudyJournal';
import CareerGuidance from '../components/CareerGuidance';

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
        return <StudyRoom />;
      case 4:
        return <ExamSimulation />;
      case 5:
        return <ProblemGenerator />;
      case 6:
        return <StudyJournal />;
      case 7:
        return <CareerGuidance />;
      case 8:
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 p-4 lg:p-6 overflow-hidden">
              <div className="mb-4 lg:mb-6">
                <h2 className="text-xl lg:text-2xl font-bold mb-2">Dokumenti</h2>
                <p className="text-gray-300 text-sm lg:text-base">Upload, pregled i upravljanje dokumentima</p>
              </div>
              
              {/* Document Management - Responsive Layout */}
              <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 h-full">
                <div className="w-full lg:w-1/2 h-full min-h-0">
                  <DocumentUpload />
                </div>
                <div className="w-full lg:w-1/2 h-full min-h-0">
                  <DocumentList />
                </div>
              </div>
            </div>
          </div>
        );
      case 9:
        return (
          <div className="h-full flex flex-col">
            <div className="flex-1 p-4 lg:p-6 overflow-hidden">
              <div className="mb-4 lg:mb-6">
                <h2 className="text-xl lg:text-2xl font-bold mb-2">File Sharing</h2>
                <p className="text-gray-300 text-sm lg:text-base">Deljenje fajlova sa drag & drop funkcionalnostima</p>
              </div>
              <FileSharing 
                onFileUpload={(files) => {
                  console.log('Files uploaded:', files);
                  // Handle file upload
                }}
                onFileRemove={(fileId) => {
                  console.log('File removed:', fileId);
                  // Handle file removal
                }}
                maxFiles={10}
                maxSize={50}
                acceptedTypes={['image/*', 'application/pdf', 'text/*', 'application/vnd.openxmlformats-officedocument.*']}
              />
            </div>
          </div>
        );
      case 10:
        return <VirtualScrollTest />;
      default:
        return <ChatBox />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
        <OfflineDetector />
        <div className="flex min-h-screen p-4 gap-4">
          <div className="fixed left-4 top-4 h-[calc(100vh-2rem)] z-40">
            <Sidebar selectedMenu={selectedMenu} onMenuSelect={setSelectedMenu} />
          </div>
          <main className="flex-1 overflow-y-auto" style={{ marginLeft: 340 }}>
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
