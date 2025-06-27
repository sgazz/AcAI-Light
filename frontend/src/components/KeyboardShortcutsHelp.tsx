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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--bg-tertiary)] rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-2 text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <FaTimes size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Chat</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                <span className="text-[var(--text-primary)]">Pošalji poruku</span>
                <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded text-sm border border-[var(--border-color)]">
                  Ctrl + Enter
                </kbd>
              </div>
              <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                <span className="text-[var(--text-primary)]">Nova sesija</span>
                <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded text-sm border border-[var(--border-color)]">
                  Ctrl + N
                </kbd>
              </div>
              <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                <span className="text-[var(--text-primary)]">Fokus na input</span>
                <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded text-sm border border-[var(--border-color)]">
                  Ctrl + K
                </kbd>
              </div>
              <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                <span className="text-[var(--text-primary)]">Istorija razgovora</span>
                <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded text-sm border border-[var(--border-color)]">
                  Ctrl + L
                </kbd>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Navigacija</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                <span className="text-[var(--text-primary)]">Zatvori modal</span>
                <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded text-sm border border-[var(--border-color)]">
                  Esc
                </kbd>
              </div>
              <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                <span className="text-[var(--text-primary)]">Toggle tema</span>
                <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded text-sm border border-[var(--border-color)]">
                  Ctrl + T
                </kbd>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-3">Dokumenti</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                <span className="text-[var(--text-primary)]">Upload fajl</span>
                <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded text-sm border border-[var(--border-color)]">
                  Ctrl + U
                </kbd>
              </div>
              <div className="flex items-center justify-between p-3 bg-[var(--bg-secondary)] rounded-lg">
                <span className="text-[var(--text-primary)]">Pregledaj dokument</span>
                <kbd className="px-2 py-1 bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded text-sm border border-[var(--border-color)]">
                  Ctrl + D
                </kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 