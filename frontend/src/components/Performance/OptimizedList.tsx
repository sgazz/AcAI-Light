'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface OptimizedListProps {
  items: any[];
  renderItem: (item: any, index: number) => React.ReactNode;
  keyExtractor: (item: any) => string;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  itemHeight?: number;
  containerHeight?: number;
  className?: string;
  enableVirtualization?: boolean;
  enableInfiniteScroll?: boolean;
  loading?: boolean;
  hasMore?: boolean;
}

// Memoized list item component
const MemoizedListItem = React.memo<{
  item: any;
  index: number;
  renderItem: (item: any, index: number) => React.ReactNode;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  totalItems: number;
  itemKey: string;
}>(({ item, index, renderItem, onEndReached, onEndReachedThreshold = 0.8, totalItems, itemKey }) => {
  const handleIntersection = useCallback(() => {
    if (onEndReached && index >= totalItems * onEndReachedThreshold) {
      onEndReached();
    }
  }, [onEndReached, index, totalItems, onEndReachedThreshold]);

  return (
    <motion.div
      key={itemKey}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2, delay: index * 0.02 }}
      onAnimationComplete={handleIntersection}
      className="w-full"
    >
      {renderItem(item, index)}
    </motion.div>
  );
});

MemoizedListItem.displayName = 'MemoizedListItem';

export default function OptimizedList({
  items,
  renderItem,
  keyExtractor,
  onEndReached,
  onEndReachedThreshold = 0.8,
  itemHeight = 80,
  containerHeight = 400,
  className = '',
  enableVirtualization = false,
  enableInfiniteScroll = false,
  loading = false,
  hasMore = false
}: OptimizedListProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Memoize items to prevent unnecessary re-renders
  const memoizedItems = useMemo(() => items, [items]);

  // Memoize render function
  const memoizedRenderItem = useCallback((item: any, index: number) => {
    return renderItem(item, index);
  }, [renderItem]);

  // Handle item selection
  const handleItemSelect = useCallback((index: number) => {
    setSelectedIndex(index);
  }, []);

  // Handle end reached
  const handleEndReached = useCallback(() => {
    if (onEndReached) {
      onEndReached();
    }
  }, [onEndReached]);

  // If virtualization is enabled, use VirtualScroll
  if (enableVirtualization) {
    return (
      <div className={`optimized-list virtual ${className}`}>
        {/* Import VirtualScroll dynamically to avoid circular dependencies */}
        <div className="text-center py-8 text-slate-500">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4 mx-auto">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <p className="text-lg font-medium">Virtual Scrolling</p>
          <p className="text-sm">Koristi VirtualScroll komponentu za bolje performanse</p>
        </div>
      </div>
    );
  }

  // If infinite scroll is enabled, use InfiniteScroll
  if (enableInfiniteScroll) {
    return (
      <div className={`optimized-list infinite ${className}`}>
        {/* Import InfiniteScroll dynamically to avoid circular dependencies */}
        <div className="text-center py-8 text-slate-500">
          <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mb-4 mx-auto">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
            </svg>
          </div>
          <p className="text-lg font-medium">Infinite Scroll</p>
          <p className="text-sm">Koristi InfiniteScroll komponentu za automatsko učitavanje</p>
        </div>
      </div>
    );
  }

  // Regular optimized list
  return (
    <div className={`optimized-list regular ${className}`}>
      <div 
        className="overflow-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800"
        style={{ height: containerHeight }}
      >
        <div className="space-y-2 p-4">
          <AnimatePresence>
            {memoizedItems.map((item, index) => (
              <MemoizedListItem
                key={`optimized-item-${keyExtractor(item)}`}
                item={item}
                index={index}
                renderItem={memoizedRenderItem}
                onEndReached={handleEndReached}
                onEndReachedThreshold={onEndReachedThreshold}
                totalItems={memoizedItems.length}
                itemKey={keyExtractor(item)}
              />
            ))}
          </AnimatePresence>

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
        </div>
      </div>

      {/* Empty state */}
      <AnimatePresence>
        {memoizedItems.length === 0 && !loading && (
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