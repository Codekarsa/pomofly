'use client'
import React from 'react';
import { Button } from "@/components/ui/button";
import { Cloud, X } from 'lucide-react';

interface GuestBannerProps {
  onSignIn: () => void;
  onDismiss: () => void;
}

const GuestBanner: React.FC<GuestBannerProps> = ({ onSignIn, onDismiss }) => {
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2 text-sm text-amber-800">
          <Cloud className="w-4 h-4" />
          <span>
            <strong>Guest mode:</strong> Your data is saved locally.{' '}
            <span className="hidden sm:inline">Sign in to sync across devices and unlock AI features.</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSignIn}
            className="text-amber-800 border-amber-300 hover:bg-amber-100"
          >
            Sign in
          </Button>
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
