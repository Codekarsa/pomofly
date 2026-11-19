'use client'
import React from 'react';
import { Cloud, X } from 'lucide-react';

interface GuestBannerProps {
  onDismiss: () => void;
}

const GuestBanner: React.FC<GuestBannerProps> = ({ onDismiss }) => {
  return (
    <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <Cloud className="w-4 h-4 shrink-0" />
          <span>
            <strong>Guest mode:</strong> Your data is saved locally.{' '}
            <span className="hidden sm:inline">Use Sign In to sync across devices.</span>
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            onClick={onDismiss}
            className="text-amber-600 hover:text-amber-800 p-1"
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
