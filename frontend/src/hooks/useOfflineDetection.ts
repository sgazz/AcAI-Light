'use client';

import { useState, useEffect } from 'react';
import { useErrorToast } from '../components/ErrorToastProvider';

export function useOfflineDetection() {
  const [isOffline, setIsOffline] = useState(false);
  const { showError, showSuccess } = useErrorToast();

  useEffect(() => {
    // Proveri početni status
    const checkOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOffline(!online);
      
      if (!online) {
        showError(
          'Nema internet konekcije. Neke funkcionalnosti možda neće raditi.',
          'Offline mod',
          false
        );
      }
    };

    // Event listeneri za promene konekcije
    const handleOnline = () => {
      setIsOffline(false);
      showSuccess('Internet konekcija uspostavljena', 'Online');
    };

    const handleOffline = () => {
      setIsOffline(true);
      showError(
        'Internet konekcija prekinuta. Neke funkcionalnosti možda neće raditi.',
        'Offline mod',
        false
      );
    };

    // Proveri početni status
    checkOnlineStatus();

    // Dodaj event listener-e
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showError, showSuccess]);

  return { isOffline };
} 