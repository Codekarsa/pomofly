import React, { memo } from 'react';

interface TimerDisplayProps {
  minutes: number;
  seconds: number;
  className?: string;
}

/**
 * Optimized timer display component that only re-renders when time changes
 * Uses React.memo with shallow comparison since props are primitive numbers
 */
const TimerDisplay: React.FC<TimerDisplayProps> = memo(({ minutes, seconds, className = '' }) => {
  return (
    <div className={`text-8xl font-bold mb-4 text-center py-6 ${className}`}>
      {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
    </div>
  );
});

TimerDisplay.displayName = 'TimerDisplay';

export default TimerDisplay;