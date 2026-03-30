'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useErrorHandling } from '@/hooks/useErrorHandling';

interface OfflineHandlerProps {
  children: React.ReactNode;
}

export function OfflineHandler({ children }: OfflineHandlerProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [wasOffline, setWasOffline] = useState(false);
  const [pendingData, setPendingData] = useState<any[]>([]);
  const { handleError } = useErrorHandling();

  useEffect(() => {
    // Set initial online status
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        // User came back online after being offline
        handleReconnect();
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      handleError('You are currently offline. Some features may not work properly.', {
        component: 'OfflineHandler',
        action: 'offline',
        metadata: { offline: true }
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline, handleError]);

  const handleReconnect = async () => {
    try {
      // Try to sync any pending data
      if (pendingData.length > 0) {
        // This would typically sync with your backend
        console.log('Syncing pending data:', pendingData);
        setPendingData([]);
      }

      // Show success message
      if (wasOffline) {
        // You could show a toast here about successful reconnection
        setWasOffline(false);
      }
    } catch (error) {
      handleError('Failed to sync data after reconnection.', {
        component: 'OfflineHandler',
        action: 'reconnect',
        metadata: { syncError: true }
      });
    }
  };

  const handleRetry = async () => {
    if (navigator.onLine) {
      await handleReconnect();
    } else {
      handleError('Still offline. Please check your connection.', {
        component: 'OfflineHandler',
        action: 'retry',
        metadata: { retryWhileOffline: true }
      });
    }
  };

  const saveDataLocally = (data: any) => {
    setPendingData(prev => [...prev, { ...data, timestamp: new Date() }]);
    
    // Save to localStorage as backup
    try {
      const stored = localStorage.getItem('pomofly_offline_data') || '[]';
      const offlineData = JSON.parse(stored);
      offlineData.push({ ...data, timestamp: new Date().toISOString() });
      localStorage.setItem('pomofly_offline_data', JSON.stringify(offlineData));
    } catch (error) {
      console.error('Failed to save data locally:', error);
    }
  };

  return (
    <div className="relative">
      {/* Offline Warning Banner */}
      {!isOnline && (
        <Alert className="mb-4 border-amber-200 bg-amber-50">
          <WifiOff className="h-4 w-4" />
          <AlertTitle className="text-amber-900">You're offline</AlertTitle>
          <AlertDescription className="text-amber-800">
            Some features are limited while offline. Your changes will be saved locally and synced when you reconnect.
            <div className="mt-2 flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleRetry}
                className="h-8 border-amber-300 text-amber-700 hover:bg-amber-100"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Check Connection
              </Button>
              {pendingData.length > 0 && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => {}} // Could show pending data dialog
                  className="h-8 border-amber-300 text-amber-700 hover:bg-amber-100"
                >
                  <Save className="w-3 h-3 mr-1" />
                  {pendingData.length} Changes Pending
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Reconnection Success Banner */}
      {isOnline && wasOffline && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <Wifi className="h-4 w-4" />
          <AlertTitle className="text-green-900">Back online!</AlertTitle>
          <AlertDescription className="text-green-800">
            Your connection has been restored. 
            {pendingData.length > 0 && ' Syncing your offline changes...'}
          </AlertDescription>
        </Alert>
      )}

      {children}
    </div>
  );
}

// Hook for offline data management
export function useOfflineData() {
  const [pendingSync, setPendingSync] = useState<any[]>([]);

  const queueForSync = (data: any) => {
    setPendingSync(prev => [...prev, { ...data, id: Date.now() }]);
    
    // Save to localStorage
    try {
      const stored = localStorage.getItem('pomofly_pending_sync') || '[]';
      const pendingData = JSON.parse(stored);
      pendingData.push({ ...data, id: Date.now(), timestamp: new Date().toISOString() });
      localStorage.setItem('pomofly_pending_sync', JSON.stringify(pendingData));
    } catch (error) {
      console.error('Failed to queue data for sync:', error);
    }
  };

  const clearSyncQueue = () => {
    setPendingSync([]);
    localStorage.removeItem('pomofly_pending_sync');
  };

  const syncPendingData = async (syncFunction: (data: any[]) => Promise<void>) => {
    if (pendingSync.length === 0) return;

    try {
      await syncFunction(pendingSync);
      clearSyncQueue();
    } catch (error) {
      throw new Error('Failed to sync pending data');
    }
  };

  // Load pending data on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pomofly_pending_sync');
      if (stored) {
        setPendingSync(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load pending sync data:', error);
    }
  }, []);

  return {
    pendingSync,
    queueForSync,
    clearSyncQueue,
    syncPendingData,
    hasPendingData: pendingSync.length > 0
  };
}

// Component for displaying offline capabilities
export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    
    setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  return (
    <div className="flex items-center gap-2 text-sm">
      {isOnline ? (
        <div className="flex items-center gap-1 text-green-600">
          <Wifi className="w-3 h-3" />
          <span>Online</span>
        </div>
      ) : (
        <div className="flex items-center gap-1 text-amber-600">
          <WifiOff className="w-3 h-3" />
          <span>Offline</span>
        </div>
      )}
    </div>
  );
}