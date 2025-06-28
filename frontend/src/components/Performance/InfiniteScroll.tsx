'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface InfiniteScrollProps {
  onLoadMore: () => Promise<void>;
  hasMore: boolean;
  loading: boolean;
  children: React.ReactNode;
  threshold?: number;
  className?: string;
}

export default function InfiniteScroll({
  onLoadMore,
  hasMore,
  loading,
  children,
  threshold = 0.8,
  className = ''
}: InfiniteScrollProps) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  // Setup intersection observer
  useEffect(() => {
    if (!triggerRef.current) return;

    // Check if IntersectionObserver is supported
    if (typeof IntersectionObserver === 'undefined') {
      console.warn('IntersectionObserver is not supported in this browser');
      return;
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold,
        rootMargin: '100px'
      }
    );

    observerRef.current.observe(triggerRef.current);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [threshold]);

  // Load more when intersecting and conditions are met
  useEffect(() => {
    if (isIntersecting && hasMore && !loading) {
      onLoadMore();
    }
  }, [isIntersecting, hasMore, loading, onLoadMore]);

  return (
    <div className={`relative ${className}`}>
      {/* Main content */}
      <div className="relative">
        {children}
      </div>

      {/* Intersection trigger */}
      <div
        ref={triggerRef}
        className="h-4 w-full"
        aria-hidden="true"
      />

      {/* Loading indicator */}
      <AnimatePresence>
        {loading && hasMore && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex justify-center items-center py-6"
          >
            <div className="flex items-center gap-3 text-slate-400">
              <div className="relative">
                <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 w-6 h-6 border-2 border-transparent border-r-purple-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
              </div>
              <span className="text-sm font-medium">Učitavanje novog sadržaja...</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* End of content indicator */}
      <AnimatePresence>
        {!hasMore && !loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="flex justify-center items-center py-8"
          >
            <div className="flex flex-col items-center gap-2 text-slate-500">
              <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-sm font-medium">Dostigli ste kraj sadržaja</span>
              <span className="text-xs">Svi podaci su učitani</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      <AnimatePresence>
        {!hasMore && loading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="flex justify-center items-center py-6"
          >
            <div className="flex flex-col items-center gap-2 text-red-400">
              <div className="w-8 h-8 bg-red-900/20 rounded-full flex items-center justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-sm font-medium">Greška pri učitavanju</span>
              <button
                onClick={onLoadMore}
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                Pokušaj ponovo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      <AnimatePresence>
        {React.Children.count(children) === 0 && !loading && (
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
            <h3 className="text-lg font-semibold mb-2">Nema podataka</h3>
            <p className="text-sm text-center max-w-md">
              Trenutno nema stavki za prikaz. Dodajte podatke ili učitajte sadržaj.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 