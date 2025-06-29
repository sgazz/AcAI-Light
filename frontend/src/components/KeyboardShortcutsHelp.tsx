'use client';

import { FaTimes, FaKeyboard } from 'react-icons/fa';
import { SHORTCUTS } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutWithCategory {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  category: string;
}

export default function KeyboardShortcutsHelp({ isOpen, onClose }: KeyboardShortcutsHelpProps) {
  if (!isOpen) return null;

  const shortcuts: ShortcutWithCategory[] = [
    { ...SHORTCUTS.SEND_MESSAGE, category: 'Chat' },
    { ...SHORTCUTS.NEW_LINE, category: 'Chat' },
    { ...SHORTCUTS.NEW_SESSION, category: 'Sesije' },
    { ...SHORTCUTS.CLEAR_CHAT, category: 'Sesije' },
    { ...SHORTCUTS.FOCUS_CHAT, category: 'Navigacija' },
    { ...SHORTCUTS.UPLOAD_FILE, category: 'Dokumenti' },
    { ...SHORTCUTS.TOGGLE_DOCUMENTS, category: 'Dokumenti' },
    { ...SHORTCUTS.SEARCH, category: 'Pretraga' },
    { ...SHORTCUTS.HELP, category: 'Sistemske' },
    { ...SHORTCUTS.ESCAPE, category: 'Sistemske' },
  ];

  const categories = [...new Set(shortcuts.map(s => s.category))];

  const formatShortcut = (shortcut: ShortcutWithCategory): string => {
    const parts: string[] = [];
    
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.meta) parts.push('⌘');
    
    parts.push(shortcut.key.toUpperCase());
    
    return parts.join(' + ');
  };

  return (
    <>
      {/* Premium Overlay sa Glassmorphism */}
      <div 
        className="fixed inset-0 bg-gradient-to-br from-black/60 via-purple-900/20 to-blue-900/30 backdrop-blur-xl z-50"
        onClick={onClose}
      />
      
      {/* Premium Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-gradient-to-br from-slate-900/95 via-slate-800/90 to-slate-900/95 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/10 z-[9999] w-full max-w-2xl max-h-[85vh] flex flex-col">
        {/* Animated Background Pattern */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-pink-500/20 animate-pulse"></div>
          <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-blue-400/10 rounded-full blur-xl animate-bounce"></div>
        </div>

        <div className="relative flex flex-col h-full">
          {/* Premium Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-r from-slate-800/50 via-slate-700/30 to-slate-800/50 backdrop-blur-sm flex-shrink-0">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                  <FaKeyboard className="text-white" size={24} />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
                  Keyboard Shortcuts
                </h2>
                <p className="text-sm text-slate-400 font-medium">Brzi pristup funkcionalnostima</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl icon-hover-profi"
              title="Zatvori"
            >
              <FaTimes size={20} className="group-hover:rotate-90 transition-transform duration-300" />
            </button>
          </div>

          {/* Premium Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <div className="p-1 bg-blue-500/20 rounded-lg">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                </div>
                Chat
              </h3>
              <div className="space-y-3">
                <div className="group relative p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl border border-white/10 hover:border-blue-500/30 transition-all duration-300 hover:scale-[1.02]">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Pošalji poruku</span>
                    <kbd className="px-3 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white rounded-xl text-sm border border-blue-500/30 font-mono shadow-lg">
                      Ctrl + Enter
                    </kbd>
                  </div>
                </div>
                <div className="group relative p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl border border-white/10 hover:border-blue-500/30 transition-all duration-300 hover:scale-[1.02]">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Nova sesija</span>
                    <kbd className="px-3 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white rounded-xl text-sm border border-blue-500/30 font-mono shadow-lg">
                      Ctrl + N
                    </kbd>
                  </div>
                </div>
                <div className="group relative p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl border border-white/10 hover-border-subtle card-hover-profi">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Fokus na input</span>
                    <kbd className="px-3 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white rounded-xl text-sm border border-blue-500/30 font-mono shadow-lg">
                      Ctrl + K
                    </kbd>
                  </div>
                </div>
                <div className="group relative p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl border border-white/10 hover-border-subtle card-hover-profi">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Istorija razgovora</span>
                    <kbd className="px-3 py-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-white rounded-xl text-sm border border-blue-500/30 font-mono shadow-lg">
                      Ctrl + L
                    </kbd>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <div className="p-1 bg-purple-500/20 rounded-lg">
                  <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                </div>
                Navigacija
              </h3>
              <div className="space-y-3">
                <div className="group relative p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all duration-300 hover:scale-[1.02]">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Zatvori modal</span>
                    <kbd className="px-3 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white rounded-xl text-sm border border-purple-500/30 font-mono shadow-lg">
                      Esc
                    </kbd>
                  </div>
                </div>
                <div className="group relative p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl border border-white/10 hover:border-purple-500/30 transition-all duration-300 hover:scale-[1.02]">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Toggle tema</span>
                    <kbd className="px-3 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 text-white rounded-xl text-sm border border-purple-500/30 font-mono shadow-lg">
                      Ctrl + T
                    </kbd>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <div className="p-1 bg-green-500/20 rounded-lg">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
                Dokumenti
              </h3>
              <div className="space-y-3">
                <div className="group relative p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl border border-white/10 hover:border-green-500/30 transition-all duration-300 hover:scale-[1.02]">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Upload fajl</span>
                    <kbd className="px-3 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-white rounded-xl text-sm border border-green-500/30 font-mono shadow-lg">
                      Ctrl + U
                    </kbd>
                  </div>
                </div>
                <div className="group relative p-4 bg-gradient-to-r from-slate-800/50 to-slate-700/50 rounded-2xl border border-white/10 hover:border-green-500/30 transition-all duration-300 hover:scale-[1.02]">
                  <div className="flex items-center justify-between">
                    <span className="text-white font-medium">Pregledaj dokument</span>
                    <kbd className="px-3 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-white rounded-xl text-sm border border-green-500/30 font-mono shadow-lg">
                      Ctrl + D
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
} 