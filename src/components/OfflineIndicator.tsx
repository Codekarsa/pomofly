import React from 'react';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
  showOnlineStatus?: boolean;
}

export function OfflineIndicator({
  className,
  showOnlineStatus = false,
}: OfflineIndicatorProps) {
  const isOnline = useOnlineStatus();

  if (isOnline && !showOnlineStatus) {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-all',
        isOnline
          ? 'border border-green-200 bg-green-50 text-green-700'
          : 'border border-orange-200 bg-orange-50 text-orange-700',
        className
      )}
    >
      {isOnline ? (
        <Wifi className="h-4 w-4" />
      ) : (
        <WifiOff className="h-4 w-4" />
      )}
      <span>{isOnline ? 'Online' : 'Offline - Using local data'}</span>
    </div>
  );
}

export function OfflineToast() {
  const isOnline = useOnlineStatus();

  return (
    <div
      className={cn(
        'fixed right-4 top-4 z-50 transform transition-all duration-300',
        isOnline ? 'translate-y-0 opacity-100' : 'translate-y-0 opacity-100'
      )}
    >
      {!isOnline && (
        <div className="flex max-w-sm items-center gap-2 rounded-lg bg-orange-500 px-4 py-3 text-white shadow-lg">
          <WifiOff className="h-5 w-5 flex-shrink-0" />
          <div>
            <p className="font-medium">You're offline</p>
            <p className="text-sm opacity-90">
              Changes will sync when connection is restored
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
