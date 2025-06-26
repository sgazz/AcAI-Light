'use client';

import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  action: () => void;
  description: string;
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Ignoriši ako je korisnik u input polju
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }

    for (const shortcut of shortcuts) {
      const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();
      const ctrlMatch = !!shortcut.ctrl === event.ctrlKey;
      const shiftMatch = !!shortcut.shift === event.shiftKey;
      const altMatch = !!shortcut.alt === event.altKey;
      const metaMatch = !!shortcut.meta === event.metaKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch && metaMatch) {
        event.preventDefault();
        shortcut.action();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Helper funkcija za formatiranje shortcut-a
  const formatShortcut = (shortcut: KeyboardShortcut): string => {
    const parts: string[] = [];
    
    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');
    if (shortcut.meta) parts.push('⌘');
    
    parts.push(shortcut.key.toUpperCase());
    
    return parts.join(' + ');
  };

  return { formatShortcut };
}

// Predefinisani shortcuts
export const SHORTCUTS = {
  SEND_MESSAGE: { key: 'Enter', ctrl: true, description: 'Pošalji poruku' },
  NEW_LINE: { key: 'Enter', shift: true, description: 'Nova linija' },
  NEW_SESSION: { key: 'n', ctrl: true, description: 'Nova sesija' },
  CLEAR_CHAT: { key: 'k', ctrl: true, description: 'Obriši chat' },
  FOCUS_CHAT: { key: 'l', ctrl: true, description: 'Fokusiraj chat' },
  UPLOAD_FILE: { key: 'u', ctrl: true, description: 'Upload fajl' },
  TOGGLE_DOCUMENTS: { key: 'd', ctrl: true, description: 'Prikaži dokumente' },
  SEARCH: { key: 'f', ctrl: true, description: 'Pretraga' },
  HELP: { key: 'h', ctrl: true, description: 'Pomoć' },
  ESCAPE: { key: 'Escape', description: 'Zatvori modal/otkaži' },
} as const; 