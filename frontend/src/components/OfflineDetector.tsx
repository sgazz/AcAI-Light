'use client';

import { useOfflineDetection } from '../hooks/useOfflineDetection';

export function OfflineDetector() {
  const { isOffline } = useOfflineDetection();

  // Komponenta ne renderuje ništa, samo koristi hook za detekciju
  return null;
} 