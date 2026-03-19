'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { Cloud, X } from 'lucide-react';

interface GuestBannerProps {
  onSignIn: () => void;
  onDismiss: () => void;
}

const GuestBanner: React.FC<GuestBannerProps> = ({ onSignIn, onDismiss }) => {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-4 py-2">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <Cloud className="h-4 w-4" />
          <span>
            <strong>Guest mode:</strong> Your data is saved locally.{' '}
            <span className="hidden sm:inline">
              Sign in to sync across devices and unlock AI features.
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSignIn}
            className="border-amber-300 text-amber-800 hover:bg-amber-100"
          >
            Sign in
          </Button>
          <button
            onClick={onDismiss}
            className="p-1 text-amber-600 hover:text-amber-800"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestBanner;
