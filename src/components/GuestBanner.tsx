'use client'
import React from 'react';
import { Cloud, X } from 'lucide-react';

interface GuestBannerProps {
  onDismiss: () => void;
}

const GuestBanner: React.FC<GuestBannerProps> = ({ onDismiss }) => {
  return (
    <div className="shrink-0 border-b bg-secondary/40 px-4 py-2">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Cloud className="w-4 h-4 shrink-0" />
          <span>
            Guest mode: Your data is saved on this browser.{' '}
            <span className="hidden sm:inline">Use Sign In to sync across devices.</span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onDismiss}
            className="rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestBanner;
