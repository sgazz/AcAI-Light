'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VirtualScrollProps {
  items: any[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loading?: boolean;
  overscan?: number;
  className?: string;
}

interface VirtualItem {
  index: number;
  offsetTop: number;
  height: number;
}

export default function VirtualScroll({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  onLoadMore,
  hasMore = false,
  loading = false,
  overscan = 5,
  className = ''
}: VirtualScrollProps) {
  const [scrollTop, setScrollTop] = useState(0);
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoize virtual items calculation
  const virtualItems = useMemo(() => {
    if (!items.length) return [];

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    );

    const virtualItems: VirtualItem[] = [];
    for (let i = startIndex; i <= endIndex; i++) {
      virtualItems.push({
        index: i,
        offsetTop: i * itemHeight,
        height: itemHeight
      });
    }

    return virtualItems;
  }, [items.length, scrollTop, containerHeight, itemHeight, overscan]);

  // Calculate total height
  const totalHeight = useMemo(() => items.length * itemHeight, [items.length, itemHeight]);

  // Handle scroll
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const newScrollTop = target.scrollTop;
    
    // Debounce scroll updates for better performance
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      setScrollTop(newScrollTop);
    }, 16); // ~60fps
  }, []);

  // Check if we need to load more items
  useEffect(() => {
    if (!onLoadMore || !hasMore || loading) return;

    const isNearBottom = scrollTop + containerHeight >= totalHeight - itemHeight * 2;
    if (isNearBottom) {
      onLoadMore();
    }
  }, [scrollTop, containerHeight, totalHeight, itemHeight, onLoadMore, hasMore, loading]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className={`relative ${className}`}>
      {/* Container with scroll */}
      <div
        ref={setContainerRef}
        style={{ height: containerHeight }}
        className="overflow-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800"
        onScroll={handleScroll}
      >
        {/* Spacer for total height */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Render only visible items */}
          <AnimatePresence>
            {virtualItems.map((virtualItem) => {
              const item = items[virtualItem.index];
              if (!item) return null;

              return (
                <motion.div
                  key={`virtual-item-${virtualItem.index}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    position: 'absolute',
                    top: virtualItem.offsetTop,
                    height: virtualItem.height,
                    width: '100%'
                  }}
                  className="px-4"
                >
                  {renderItem(item, virtualItem.index)}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

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

      {/* Empty state */}
      <AnimatePresence>
        {items.length === 0 && !loading && (
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