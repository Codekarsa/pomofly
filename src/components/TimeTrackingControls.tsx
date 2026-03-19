'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square } from 'lucide-react';

interface TimeTrackingControlsProps {
  hasActiveTracking: boolean;
  activeCount: number;
  onStartAll: () => void;
  onStopAll: () => void;
  disabled?: boolean;
}

const TimeTrackingControls: React.FC<TimeTrackingControlsProps> = ({
  hasActiveTracking,
  activeCount,
  onStartAll,
  onStopAll,
  disabled = false,
}) => {
  return (
    <div className="flex items-center">
      {!hasActiveTracking ? (
        <Button
          variant="outline"
          size="sm"
          onClick={onStartAll}
          disabled={disabled}
          className="border-blue-200 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
        >
          <Play className="mr-1 h-3 w-3" fill="currentColor" />
          Start All
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onStopAll}
          disabled={disabled}
          className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Square className="mr-1 h-3 w-3" fill="currentColor" />
          Stop All ({activeCount})
        </Button>
      )}
    </div>
  );
};

export default TimeTrackingControls;
