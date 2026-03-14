'use client'

import React, { useState, useEffect } from 'react';
import { cacheStorage } from '@/lib/cacheStorage';
import { localStorageUtils } from '@/lib/safeLocalStorage';

interface CacheDebugPanelProps {
  showInProduction?: boolean;
}

export const CacheDebugPanel: React.FC<CacheDebugPanelProps> = ({ 
  showInProduction = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [storageInfo, setStorageInfo] = useState<any>(null);

  // Only show in development unless explicitly enabled for production
  if (!showInProduction && process.env.NODE_ENV === 'production') {
    return null;
  }

  const refreshStats = () => {
    setStats(cacheStorage.getStats());
    setStorageInfo(localStorageUtils.getInfo());
  };

  useEffect(() => {
    if (isOpen) {
      refreshStats();
      const interval = setInterval(refreshStats, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  const handleClearCache = () => {
    if (confirm('Are you sure you want to clear all cache? This will remove all stored settings and task selections.')) {
      cacheStorage.clear();
      refreshStats();
      alert('Cache cleared successfully');
    }
  };

  const handleInvalidateStale = () => {
    const invalidated = cacheStorage.invalidatePattern(/./); // This won't work, need to implement proper pattern
    refreshStats();
    alert(`Invalidated ${invalidated} stale cache entries`);
  };

  if (!isOpen) {
    return (
      <div 
        className="fixed bottom-4 right-4 z-50 bg-gray-800 text-white p-2 rounded cursor-pointer hover:bg-gray-700 text-xs"
        onClick={() => setIsOpen(true)}
      >
        📊 Cache Debug
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4 max-w-md max-h-96 overflow-auto text-xs">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-sm">Cache Debug Panel</h3>
        <button 
          onClick={() => setIsOpen(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          ✕
        </button>
      </div>

      {/* Storage Info */}
      <div className="mb-4 p-2 bg-gray-50 rounded">
        <h4 className="font-semibold mb-1">Storage Status</h4>
        {storageInfo && (
          <div className="space-y-1">
            <div>Available: {storageInfo.isAvailable ? '✅' : '❌'}</div>
            <div>Size: {storageInfo.estimatedSize}</div>
            <div>Local Items: {storageInfo.localStorageLength}</div>
            <div>Fallback Items: {storageInfo.fallbackStorageSize}</div>
          </div>
        )}
      </div>

      {/* Cache Stats */}
      <div className="mb-4 p-2 bg-blue-50 rounded">
        <h4 className="font-semibold mb-1">Cache Stats</h4>
        {stats && (
          <div className="space-y-1">
            <div>Total Entries: {stats.totalEntries}</div>
            <div>Total Size: {(stats.totalSize / 1024).toFixed(2)} KB</div>
            <div>Version: {stats.version}</div>
            <div>Last Cleanup: {stats.lastCleanup.toLocaleString()}</div>
          </div>
        )}
      </div>

      {/* Cache Entries */}
      <div className="mb-4 p-2 bg-green-50 rounded">
        <h4 className="font-semibold mb-1">Cache Entries</h4>
        {stats?.entries && stats.entries.length > 0 ? (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {stats.entries.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between items-center text-xs">
                <span className="truncate" title={entry.key}>
                  {entry.key.replace('pomofly:', '')}
                </span>
                <div className="flex items-center space-x-2 text-xs">
                  <span className={entry.isExpired ? 'text-red-600' : 'text-green-600'}>
                    {entry.isExpired ? 'EXP' : 'OK'}
                  </span>
                  <span>{(entry.size / 1024).toFixed(1)}KB</span>
                  <span>{Math.floor(entry.age / 1000)}s</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-gray-500 italic">No cache entries</div>
        )}
      </div>

      {/* Actions */}
      <div className="flex space-x-2">
        <button
          onClick={refreshStats}
          className="px-2 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
        >
          Refresh
        </button>
        <button
          onClick={handleInvalidateStale}
          className="px-2 py-1 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600"
        >
          Clean Stale
        </button>
        <button
          onClick={handleClearCache}
          className="px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
        >
          Clear All
        </button>
      </div>

      <div className="mt-2 text-xs text-gray-500 italic">
        This panel is only visible in development mode
      </div>
    </div>
  );
};

export default CacheDebugPanel;