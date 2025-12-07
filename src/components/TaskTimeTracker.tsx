'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square } from 'lucide-react';

interface TaskTimeTrackerProps {
  formattedTime: string;
  elapsedTime: number;
  isTracking: boolean;
  onStart: () => void;
  onStop: () => void;
  disabled?: boolean;
}

const TaskTimeTracker: React.FC<TaskTimeTrackerProps> = ({
  formattedTime,
  elapsedTime,
  isTracking,
  onStart,
  onStop,
  disabled = false,
}) => {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={(e) => {
          e.stopPropagation();
          if (isTracking) {
            onStop();
          } else {
            onStart();
          }
        }}
        disabled={disabled}
        className={`h-6 w-6 ${isTracking ? 'text-red-500 hover:text-red-600 hover:bg-red-50' : 'text-blue-500 hover:text-blue-600 hover:bg-blue-50'}`}
        aria-label={isTracking ? "Stop tracking" : "Start tracking"}
      >
        {isTracking ? (
          <Square className="h-3 w-3" fill="currentColor" />
        ) : (
          <Play className="h-3 w-3" fill="currentColor" />
        )}
      </Button>
      <span
        className={`text-xs font-mono px-1.5 py-0.5 rounded min-w-[45px] text-center ${
          isTracking
            ? 'bg-blue-100 text-blue-700 animate-pulse'
            : elapsedTime > 0
              ? 'bg-gray-100 text-gray-700'
              : 'text-gray-400'
        }`}
      >
        {formattedTime}
      </span>
    </div>
  );
};

export default TaskTimeTracker;
