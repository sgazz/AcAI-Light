'use client';

import { useOfflineDetection } from '../hooks/useOfflineDetection';
import { FaWifi } from 'react-icons/fa';

export function OfflineDetector() {
  const { isOffline } = useOfflineDetection();

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
        isOffline ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'
      }`}
    >
      <div className="bg-[var(--accent-red)] text-[var(--text-primary)] px-4 py-2 rounded-lg shadow-lg border border-[var(--accent-red)]/20">
        <div className="flex items-center gap-2">
          <FaWifi className="text-[var(--text-primary)]" />
          <span className="text-sm font-medium">Nema internet konekcije</span>
        </div>
      </div>
    </div>
  );
} 