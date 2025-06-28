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
  const [selectedMenu, setSelectedMenu] = useState(8); // Dokumenti
  const [refreshDocuments, setRefreshDocuments] = useState(0); // Key za osvežavanje DocumentList
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);
  const [showVoiceTest, setShowVoiceTest] = useState(false);
  const { toasts, showError, showSuccess, showInfo } = useToast();

  // Debug selectedMenu promene
  useEffect(() => {
    console.log('Page: selectedMenu promenjen na:', selectedMenu);
  }, [selectedMenu]);

  useEffect(() => {
    fetch(HEALTH_CHECK_ENDPOINT)
      .then(res => res.json())
      .then(data => {
        console.log('Page: API response:', data);
      })
      .catch(() => {
        console.error('Page: Greška u povezivanju sa backendom!');
        showError('Nije moguće povezati se sa backend serverom', 'Povezivanje');
      });
  }, [showError]);

  const handleDocumentUploaded = () => {
    setRefreshDocuments(prev => prev + 1);
    showSuccess('Dokument je uspešno uploadovan', 'Upload');
  };

  // Audio Mode message handler
  const handleAudioMessage = (message: string) => {
    // Ovo će biti implementirano kroz ChatBox callback
    showInfo(`Audio poruka: ${message}`, 'Audio Mode');
  };

  // Audio Mode language handler
  const handleLanguageChange = (language: string) => {
    showSuccess(`Jezik promenjen na: ${language}`, 'Audio Mode');
  };

  // Keyboard shortcuts
  const shortcuts = [
    {
      ...SHORTCUTS.SEND_MESSAGE,
      action: () => {
        // Ovo će biti implementirano u ChatBox komponenti
        showInfo('Koristite Ctrl+Enter u chat polju za slanje', 'Keyboard Shortcut');
      }
    },
    {
      ...SHORTCUTS.NEW_SESSION,
      action: () => {
        // Ovo će biti implementirano u ChatBox komponenti
        showInfo('Nova sesija će biti kreirana', 'Keyboard Shortcut');
      }
    },
    {
      ...SHORTCUTS.TOGGLE_DOCUMENTS,
      action: () => {
        setSelectedMenu(8); // Prebaci na dokumente
        showInfo('Prebačeno na sekciju dokumenta', 'Keyboard Shortcut');
      }
    },
    {
      ...SHORTCUTS.HELP,
      action: () => {
        setShowShortcutsHelp(true);
      }
    },
    {
      ...SHORTCUTS.ESCAPE,
      action: () => {
        setShowShortcutsHelp(false);
        setShowVoiceTest(false);
      }
    }
  ];

  useKeyboardShortcuts(shortcuts);

  const renderContent = () => {
    console.log('Page: selectedMenu =', selectedMenu);
    switch (selectedMenu) {
      case 0: // Active Recall (Chat)
        console.log('Page: Renderujem ChatBox (sa sidebar istorijom)');
        return <ChatBox />;
      case 2: // Audio Mode
        console.log('Page: Renderujem Audio Mode');
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Audio Mode</h2>
              <button
                onClick={() => setShowVoiceTest(!showVoiceTest)}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm"
              >
                {showVoiceTest ? 'Sakrij Test' : 'Prikaži Test'}
              </button>
            </div>
            {showVoiceTest ? (
              <VoiceInputTest />
            ) : (
              <AudioMode onSendMessage={handleAudioMessage} isEnabled={true} />
            )}
          </div>
        );
      case 8: // Dokumenti
        console.log('Page: Renderujem Dokumenti');
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
            <DocumentUpload onDocumentUploaded={handleDocumentUploaded} />
            <DocumentList key={refreshDocuments} />
          </div>
        );
      default:
        console.log('Page: Renderujem default ChatBox');
        return <ChatBox />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#10182a] text-white">
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
