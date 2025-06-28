'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface MemoryManagerProps {
  maxItems?: number;
  cleanupInterval?: number;
  onCleanup?: () => void;
  children: React.ReactNode;
  className?: string;
  enableMonitoring?: boolean;
  warningThreshold?: number;
  criticalThreshold?: number;
}

interface MemoryInfo {
  used: number;
  total: number;
  percentage: number;
  status: 'normal' | 'warning' | 'critical';
  source?: 'performance.memory' | 'window.performance.memory' | 'navigator.memory' | 'estimated';
}

export default function MemoryManager({
  maxItems = 1000,
  cleanupInterval = 30000, // 30 seconds
  onCleanup,
  children,
  className = '',
  enableMonitoring = true,
  warningThreshold = 70,
  criticalThreshold = 90
}: MemoryManagerProps) {
  const [memoryInfo, setMemoryInfo] = useState<MemoryInfo | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);
  const [lastCleanup, setLastCleanup] = useState<Date | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const monitoringIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get memory information
  const getMemoryInfo = useCallback((): MemoryInfo | null => {
    // Try to get memory info from performance.memory (Chrome/Edge)
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      const memory = (performance as any).memory;
      const used = memory.usedJSHeapSize;
      const total = memory.totalJSHeapSize;
      const percentage = (used / total) * 100;

      let status: 'normal' | 'warning' | 'critical' = 'normal';
      if (percentage >= criticalThreshold) {
        status = 'critical';
      } else if (percentage >= warningThreshold) {
        status = 'warning';
      }

      return {
        used: Math.round(used / 1024 / 1024), // Convert to MB
        total: Math.round(total / 1024 / 1024), // Convert to MB
        percentage: Math.round(percentage),
        status,
        source: 'performance.memory'
      };
    }

    // Try to get memory info from window.performance.memory
    if (typeof window !== 'undefined' && (window as any).performance && (window as any).performance.memory) {
      const memory = (window as any).performance.memory;
      const used = memory.usedJSHeapSize;
      const total = memory.totalJSHeapSize;
      const percentage = (used / total) * 100;

      let status: 'normal' | 'warning' | 'critical' = 'normal';
      if (percentage >= criticalThreshold) {
        status = 'critical';
      } else if (percentage >= warningThreshold) {
        status = 'warning';
      }

      return {
        used: Math.round(used / 1024 / 1024), // Convert to MB
        total: Math.round(total / 1024 / 1024), // Convert to MB
        percentage: Math.round(percentage),
        status,
        source: 'window.performance.memory'
      };
    }

    // Try to get memory info from navigator.memory (Firefox)
    if (typeof navigator !== 'undefined' && (navigator as any).memory) {
      const memory = (navigator as any).memory;
      const used = memory.usedJSHeapSize;
      const total = memory.totalJSHeapSize;
      const percentage = (used / total) * 100;

      let status: 'normal' | 'warning' | 'critical' = 'normal';
      if (percentage >= criticalThreshold) {
        status = 'critical';
      } else if (percentage >= warningThreshold) {
        status = 'warning';
      }

      return {
        used: Math.round(used / 1024 / 1024), // Convert to MB
        total: Math.round(total / 1024 / 1024), // Convert to MB
        percentage: Math.round(percentage),
        status,
        source: 'navigator.memory'
      };
    }

    // Fallback: Estimate memory usage based on DOM elements and objects
    try {
      const domElements = document.querySelectorAll('*').length;
      const estimatedMemory = Math.round((domElements * 0.1) + (maxItems * 0.05));
      const totalMemory = Math.round(estimatedMemory * 1.5);
      const percentage = Math.min((estimatedMemory / totalMemory) * 100, 100);

      let status: 'normal' | 'warning' | 'critical' = 'normal';
      if (percentage >= criticalThreshold) {
        status = 'critical';
      } else if (percentage >= warningThreshold) {
        status = 'warning';
      }

      return {
        used: estimatedMemory,
        total: totalMemory,
        percentage: Math.round(percentage),
        status,
        source: 'estimated'
      };
    } catch (error) {
      console.warn('Memory estimation failed:', error);
      return {
        used: 0,
        total: 0,
        percentage: 0,
        status: 'normal' as const,
        source: 'estimated'
      };
    }
  }, [warningThreshold, criticalThreshold, maxItems]);

  // Perform cleanup
  const performCleanup = useCallback(async () => {
    setIsCleaning(true);
    
    try {
      // Force garbage collection if available
      if (typeof window !== 'undefined' && (window as any).gc) {
        try {
          (window as any).gc();
        } catch (error) {
          console.warn('Garbage collection failed:', error);
        }
      }

      // Call custom cleanup function
      if (onCleanup) {
        await onCleanup();
      }

      // Clear timeouts and intervals
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }

      setLastCleanup(new Date());
      
      // Show success message
      console.log('Memory cleanup completed successfully');
    } catch (error) {
      console.error('Memory cleanup failed:', error);
    } finally {
      setIsCleaning(false);
    }
  }, [onCleanup]);

  // Setup monitoring
  useEffect(() => {
    if (!enableMonitoring) return;

    const updateMemoryInfo = () => {
      const info = getMemoryInfo();
      setMemoryInfo(info);

      // Debug info
      console.log('Memory Info:', info);
      console.log('Performance.memory available:', !!(performance as any).memory);
      console.log('Window.performance.memory available:', !!(window as any).performance?.memory);
      console.log('Navigator.memory available:', !!(navigator as any).memory);
      
      // Instructions for enabling memory monitoring
      if (!(performance as any).memory && !(window as any).performance?.memory && !(navigator as any).memory) {
        console.log('💡 Memory monitoring tips:');
        console.log('1. Chrome: Start with --enable-precise-memory-info flag');
        console.log('2. Firefox: Enable dom.performance.memory.enabled in about:config');
        console.log('3. Safari: Memory monitoring not available');
        console.log('4. Using estimated memory based on DOM elements');
      }

      // Auto-cleanup if memory usage is critical
      if (info && info.status === 'critical') {
        performCleanup();
      }
    };

    // Initial check
    updateMemoryInfo();

    // Setup monitoring interval
    monitoringIntervalRef.current = setInterval(updateMemoryInfo, 5000); // Check every 5 seconds

    return () => {
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, [enableMonitoring, getMemoryInfo, performCleanup]);

  // Setup cleanup interval
  useEffect(() => {
    if (cleanupInterval <= 0) return;

    cleanupTimeoutRef.current = setTimeout(() => {
      performCleanup();
    }, cleanupInterval);

    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
    };
  }, [cleanupInterval, performCleanup, lastCleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (cleanupTimeoutRef.current) {
        clearTimeout(cleanupTimeoutRef.current);
      }
      if (monitoringIntervalRef.current) {
        clearInterval(monitoringIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className={`memory-manager ${className}`}>
      {/* Memory monitoring panel */}
      {enableMonitoring && memoryInfo && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-4 z-50 p-4 rounded-xl backdrop-blur-sm border transition-all duration-300 ${
              memoryInfo.status === 'critical'
                ? 'bg-red-900/20 border-red-500/30 text-red-300'
                : memoryInfo.status === 'warning'
                ? 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300'
                : 'bg-green-900/20 border-green-500/30 text-green-300'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  memoryInfo.status === 'critical'
                    ? 'border-red-500 bg-red-500/20'
                    : memoryInfo.status === 'warning'
                    ? 'border-yellow-500 bg-yellow-500/20'
                    : 'border-green-500 bg-green-500/20'
                }`}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                {memoryInfo.status === 'critical' && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                )}
              </div>
              
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Memorija</span>
                  <span className="text-xs opacity-75">{memoryInfo.percentage}%</span>
                </div>
                <div className="text-xs opacity-75">
                  {memoryInfo.used}MB / {memoryInfo.total}MB
                </div>
                {memoryInfo.source && (
                  <div className="text-xs opacity-50">
                    Source: {memoryInfo.source}
                  </div>
                )}
                {memoryInfo.source === 'estimated' && (
                  <div className="text-xs opacity-50">
                    Tip: Pročitaj konzolu za detalje
                  </div>
                )}
              </div>

              {/* Cleanup button */}
              <button
                onClick={performCleanup}
                disabled={isCleaning}
                className={`p-2 rounded-lg transition-all duration-200 ${
                  isCleaning
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-white/10 active:scale-95'
                }`}
                title="Očisti memoriju"
              >
                {isCleaning ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
              </button>
            </div>

            {/* Progress bar */}
            <div className="mt-2 w-full bg-white/10 rounded-full h-1">
              <div
                className={`h-1 rounded-full transition-all duration-300 ${
                  memoryInfo.status === 'critical'
                    ? 'bg-red-500'
                    : memoryInfo.status === 'warning'
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${memoryInfo.percentage}%` }}
              ></div>
            </div>

            {/* Last cleanup info */}
            {lastCleanup && (
              <div className="mt-2 text-xs opacity-75">
                Poslednje čišćenje: {lastCleanup.toLocaleTimeString()}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Empty state */}
      <AnimatePresence>
        {!memoryInfo && enableMonitoring && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center justify-center py-12 text-slate-500"
          >
            <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2">Nema podataka o memoriji</h3>
            <p className="text-sm text-center max-w-md">
              Informacije o memoriji nisu dostupne. Proverite da li je monitoring omogućen.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="relative">
        {children}
      </div>

      {/* Cleanup indicator */}
      <AnimatePresence>
        {isCleaning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 flex items-center justify-center"
          >
            <div className="bg-slate-800 rounded-xl p-6 border border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-white font-medium">Čišćenje memorije...</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 