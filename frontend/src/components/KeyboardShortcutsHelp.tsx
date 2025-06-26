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
      <div className="bg-[#1a2332] rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <FaKeyboard className="text-blue-400" size={24} />
            <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FaTimes size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          <div className="space-y-6">
            {categories.map(category => (
              <div key={category}>
                <h3 className="text-lg font-semibold text-white mb-3">{category}</h3>
                <div className="space-y-2">
                  {shortcuts
                    .filter(shortcut => shortcut.category === category)
                    .map((shortcut, index) => (
                      <div key={index} className="flex items-center justify-between py-2 px-3 bg-[#151c2c] rounded-lg">
                        <span className="text-gray-300">{shortcut.description}</span>
                        <kbd className="px-2 py-1 bg-[#0f1419] text-blue-400 rounded text-sm font-mono border border-gray-600">
                          {formatShortcut(shortcut)}
                        </kbd>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

          {/* Tips */}
          <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <h4 className="text-blue-400 font-semibold mb-2">💡 Saveti</h4>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Shortcuts ne rade kada ste u input poljima</li>
              <li>• Koristite Ctrl+Enter za brzo slanje poruka</li>
              <li>• Escape zatvara modale i otkazuje akcije</li>
              <li>• Ctrl+H otvara ovu pomoć</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 