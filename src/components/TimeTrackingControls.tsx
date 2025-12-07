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
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
        >
          <Play className="h-3 w-3 mr-1" fill="currentColor" />
          Start All
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={onStopAll}
          disabled={disabled}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
        >
          <Square className="h-3 w-3 mr-1" fill="currentColor" />
          Stop All ({activeCount})
        </Button>
      )}
    </div>
  );
};

export default TimeTrackingControls;
