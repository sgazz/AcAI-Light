'use client';

import { useState, useEffect } from 'react';
import { FaWifi } from 'react-icons/fa';

export function OfflineDetector() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    // Proveri početni status
    setIsOffline(!navigator.onLine);

    // Dodaj event listener-e
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
        isOffline ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div className="bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg border border-red-400/20">
        <div className="flex items-center gap-2">
          <FaWifi className="text-white" />
          <span className="text-sm font-medium">Nema internet konekcije</span>
        </div>
      </div>
    </div>
  );
} 