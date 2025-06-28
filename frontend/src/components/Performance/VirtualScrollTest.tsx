'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import VirtualScroll from './VirtualScroll';
import InfiniteScroll from './InfiniteScroll';
import OptimizedList from './OptimizedList';
import MemoryManager from './MemoryManager';

interface TestItem {
  id: string;
  title: string;
  description: string;
  timestamp: Date;
  category: string;
  priority: 'low' | 'medium' | 'high';
}

export default function VirtualScrollTest() {
  const [items, setItems] = useState<TestItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [viewMode, setViewMode] = useState<'virtual' | 'infinite' | 'optimized'>('virtual');
  const [itemCount, setItemCount] = useState(1000);

  // Generate test data
  const generateItems = useCallback((count: number, startIndex = 0): TestItem[] => {
    const categories = ['Dokumenti', 'Slike', 'Video', 'Audio', 'Kod', 'Dizajn'];
    const priorities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
    
    return Array.from({ length: count }, (_, index) => {
      const id = `item-${startIndex + index}`;
      const category = categories[Math.floor(Math.random() * categories.length)];
      const priority = priorities[Math.floor(Math.random() * priorities.length)];
      
      return {
        id,
        title: `Stavka ${startIndex + index + 1}`,
        description: `Ovo je opis za stavku ${startIndex + index + 1}. Kategorija: ${category}, Prioritet: ${priority}`,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date in last 30 days
        category,
        priority
      };
    });
  }, []);

  // Load more items
  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    
    setLoading(true);
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const newItems = generateItems(100, items.length);
    setItems(prev => [...prev, ...newItems]);
    
    // Stop loading more after 10,000 items
    if (items.length + newItems.length >= 10000) {
      setHasMore(false);
    }
    
    setLoading(false);
  }, [loading, hasMore, items.length, generateItems]);

  // Initialize with test data
  useEffect(() => {
    const initialItems = generateItems(itemCount);
    setItems(initialItems);
  }, [generateItems, itemCount]);

  // Render item component
  const renderItem = useCallback((item: TestItem, index: number) => {
    const priorityColors = {
      low: 'bg-green-500/20 text-green-300 border-green-500/30',
      medium: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
      high: 'bg-red-500/20 text-red-300 border-red-500/30'
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: index * 0.01 }}
        className={`p-4 rounded-xl border backdrop-blur-sm transition-all duration-200 hover:scale-[1.02] hover:shadow-lg ${
          priorityColors[item.priority]
        }`}
      >
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-lg">{item.title}</h3>
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
              item.priority === 'high' ? 'bg-red-500/30 text-red-200' :
              item.priority === 'medium' ? 'bg-yellow-500/30 text-yellow-200' :
              'bg-green-500/30 text-green-200'
            }`}>
              {item.priority.toUpperCase()}
            </span>
            <span className="text-xs opacity-75">{item.category}</span>
          </div>
        </div>
        
        <p className="text-sm opacity-90 mb-3">{item.description}</p>
        
        <div className="flex items-center justify-between text-xs opacity-75">
          <span>ID: {item.id}</span>
          <span>{item.timestamp.toLocaleDateString('sr-RS')}</span>
        </div>
      </motion.div>
    );
  }, []);

  // Memory cleanup function
  const handleMemoryCleanup = useCallback(() => {
    // Clear old items to free memory
    if (items.length > 5000) {
      setItems(prev => prev.slice(-3000)); // Keep only last 3000 items
    }
  }, [items.length]);

  return (
    <MemoryManager
      maxItems={5000}
      cleanupInterval={60000} // 1 minute
      onCleanup={handleMemoryCleanup}
      enableMonitoring={true}
      className="h-full"
    >
      <div className="h-full flex flex-col p-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Virtual Scrolling Test
          </h1>
          <p className="text-slate-400">
            Testiranje performansi sa {items.length.toLocaleString()} stavki
          </p>
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
          {/* View Mode Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Režim prikaza:</span>
            <div className="flex bg-slate-700 rounded-lg p-1">
              {[
                { key: 'virtual', label: 'Virtual Scroll' },
                { key: 'infinite', label: 'Infinite Scroll' },
                { key: 'optimized', label: 'Optimized List' }
              ].map((mode) => (
                <button
                  key={mode.key}
                  onClick={() => setViewMode(mode.key as any)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 ${
                    viewMode === mode.key
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'text-slate-300 hover:text-white hover:bg-slate-600'
                  }`}
                >
                  {mode.label}
                </button>
              ))}
            </div>
          </div>

          {/* Item Count Control */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Broj stavki:</span>
            <input
              type="number"
              value={itemCount}
              onChange={(e) => setItemCount(parseInt(e.target.value) || 1000)}
              min="100"
              max="10000"
              step="100"
              className="px-3 py-1 bg-slate-700 border border-slate-600 rounded-md text-sm w-24"
            />
            <button
              onClick={() => {
                const newItems = generateItems(itemCount);
                setItems(newItems);
                setHasMore(true);
              }}
              className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md text-sm font-medium transition-colors"
            >
              Generiši
            </button>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <span className="text-green-400">
              ✓ {items.length.toLocaleString()} stavki
            </span>
            <span className="text-blue-400">
              ⚡ {viewMode} mode
            </span>
            {loading && (
              <span className="text-yellow-400 animate-pulse">
                🔄 Učitavanje...
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl overflow-hidden">
          {viewMode === 'virtual' && (
            <VirtualScroll
              items={items}
              itemHeight={120}
              containerHeight={600}
              renderItem={renderItem}
              onLoadMore={loadMore}
              hasMore={hasMore}
              loading={loading}
              className="h-full"
            />
          )}

          {viewMode === 'infinite' && (
            <InfiniteScroll
              onLoadMore={loadMore}
              hasMore={hasMore}
              loading={loading}
              className="h-full"
            >
              <div className="space-y-2 p-4">
                {items.map((item, index) => (
                  <div key={item.id}>
                    {renderItem(item, index)}
                  </div>
                ))}
              </div>
            </InfiniteScroll>
          )}

          {viewMode === 'optimized' && (
            <OptimizedList
              items={items}
              renderItem={renderItem}
              keyExtractor={(item) => item.id}
              onEndReached={loadMore}
              containerHeight={600}
              loading={loading}
              hasMore={hasMore}
              className="h-full"
            />
          )}
        </div>

        {/* Performance Info */}
        <div className="mt-4 p-4 bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl">
          <h3 className="text-lg font-semibold mb-2">Performance Informacije</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-400">Ukupno stavki:</span>
              <span className="ml-2 font-medium">{items.length.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-400">Režim:</span>
              <span className="ml-2 font-medium capitalize">{viewMode}</span>
            </div>
            <div>
              <span className="text-slate-400">Status:</span>
              <span className={`ml-2 font-medium ${
                loading ? 'text-yellow-400' : 
                hasMore ? 'text-green-400' : 'text-blue-400'
              }`}>
                {loading ? 'Učitavanje...' : hasMore ? 'Ima još' : 'Kraj'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </MemoryManager>
  );
} 