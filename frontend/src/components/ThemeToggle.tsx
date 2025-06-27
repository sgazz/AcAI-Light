'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { FaSun, FaMoon } from 'react-icons/fa';

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button className="p-2 rounded-lg bg-gray-600 text-gray-300 transition-colors">
        <FaSun size={16} />
      </button>
    );
  }

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-lg bg-[var(--bg-secondary)] text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors border border-[var(--border-color)]"
      title={`Prebaci na ${theme === 'dark' ? 'svetlu' : 'tamnu'} temu`}
    >
      {theme === 'dark' ? (
        <FaSun size={16} className="text-[var(--accent-yellow)]" />
      ) : (
        <FaMoon size={16} className="text-[var(--accent-blue)]" />
      )}
    </button>
  );
} 