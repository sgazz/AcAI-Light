'use client';

import { useEffect, useState } from 'react';
import WelcomeScreen from '../components/WelcomeScreen';
import Sidebar from '../components/Sidebar';
import ChatLayout from '../components/Chat/ChatLayout';
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
import { FaBars, FaTimes } from 'react-icons/fa';
import ChatBox from '../components/ChatBox';

export default function Home() {
  const [selectedMenu, setSelectedMenu] = useState(-1);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
      action: () => {
        setShowShortcutsHelp(false);
        setIsSidebarOpen(false);
      }
    }
  ];

  useKeyboardShortcuts(shortcuts);

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const sidebar = document.getElementById('sidebar');
      const hamburger = document.getElementById('hamburger');
      
      if (isSidebarOpen && sidebar && !sidebar.contains(event.target as Node) && 
          hamburger && !hamburger.contains(event.target as Node)) {
        setIsSidebarOpen(false);
      }
    };

    if (isSidebarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarOpen]);

  // Close sidebar when menu is selected on mobile
  const handleMenuSelect = (index: number) => {
    setSelectedMenu(index);
    if (window.innerWidth < 1024) { // lg breakpoint
      setIsSidebarOpen(false);
    }
  };

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
        return <ChatLayout />;
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
            <div className="flex-1 p-4 overflow-hidden">
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
            <div className="flex-1 p-4 overflow-hidden">
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
        
        {/* Mobile Header with Hamburger Menu */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-slate-900/95 to-slate-800/95 backdrop-blur-xl border-b border-white/10 p-4">
          <div className="flex items-center justify-between">
            <button
              id="hamburger"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
              aria-label="Toggle menu"
            >
              {isSidebarOpen ? <FaTimes size={20} /> : <FaBars size={20} />}
            </button>
            <h1 className="text-lg font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
              AI Study Assistant
            </h1>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </div>

        <div className="flex min-h-screen lg:gap-4 pt-16 lg:pt-4">
          {/* Responsive Sidebar */}
          <div 
            id="sidebar"
            className={`
              fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out
              ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
              lg:relative lg:translate-x-0 lg:static
              w-80 lg:w-80
            `}
          >
            <Sidebar selectedMenu={selectedMenu} onMenuSelect={handleMenuSelect} />
          </div>

          {/* Overlay for mobile */}
          {isSidebarOpen && (
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto lg:ml-0 w-full">
            {renderContent()}
          </main>
        </div>

        {/* Toast notifications - Responsive positioning */}
        <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm lg:max-w-md">
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
