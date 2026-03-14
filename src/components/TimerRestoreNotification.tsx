'use client'

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Clock, X } from 'lucide-react';

interface TimerRestoreNotificationProps {
  show: boolean;
  onDismiss: () => void;
}

export const TimerRestoreNotification: React.FC<TimerRestoreNotificationProps> = ({
  show,
  onDismiss
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      // Auto-dismiss after 5 seconds
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [show, onDismiss]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Card className="bg-blue-50 border-blue-200 text-blue-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-2" />
            <span className="text-sm">Timer session restored from previous visit</span>
          </div>
          <button
            onClick={() => {
              setIsVisible(false);
              onDismiss();
            }}
            className="ml-2 hover:bg-blue-100 rounded p-1"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </Card>
    </div>
  );
};