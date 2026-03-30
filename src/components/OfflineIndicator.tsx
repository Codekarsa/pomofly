import React from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
  showOnlineStatus?: boolean;
}

export function OfflineIndicator({ className, showOnlineStatus = false }: OfflineIndicatorProps) {
  const isOnline = useOnlineStatus();

  if (isOnline && !showOnlineStatus) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all',
        isOnline
          ? 'bg-green-50 text-green-700 border border-green-200'
          : 'bg-orange-50 text-orange-700 border border-orange-200',
        className
      )}
    >
      {isOnline ? (
        <Wifi className="w-4 h-4" />
      ) : (
        <WifiOff className="w-4 h-4" />
      )}
      <span>
        {isOnline ? 'Online' : 'Offline - Using local data'}
      </span>
    </div>
  );
}

export function OfflineToast() {
  const isOnline = useOnlineStatus();

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 transition-all duration-300 transform',
        isOnline ? 'translate-y-0 opacity-100' : 'translate-y-0 opacity-100'
      )}
    >
      {!isOnline && (
        <div className="bg-orange-500 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 max-w-sm">
          <WifiOff className="w-5 h-5 flex-shrink-0" />
          <div>
            <p className="font-medium">You&apos;re offline</p>
            <p className="text-sm opacity-90">Changes will sync when connection is restored</p>
          </div>
        </div>
      )}
    </div>
  );
}