import React from 'react';
import { cn } from '@/lib/utils';

interface PomodoroProgressBarProps {
  completed: number;
  estimated: number;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

const PomodoroProgressBar: React.FC<PomodoroProgressBarProps> = ({
  completed,
  estimated,
  size = 'sm',
  showLabel = true
}) => {
  const percentage = estimated > 0 ? Math.min((completed / estimated) * 100, 100) : 0;
  const isComplete = completed >= estimated && estimated > 0;

  return (
    <div className="flex items-center gap-2 w-full">
      {/* Progress Bar Container */}
      <div
        role="progressbar"
        aria-valuenow={completed}
        aria-valuemin={0}
        aria-valuemax={estimated}
        aria-label={`${completed} of ${estimated} pomodoros completed`}
        className={cn(
          "flex-1 rounded-full bg-muted overflow-hidden",
          size === 'sm' ? 'h-1.5' : 'h-2'
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            isComplete
              ? "bg-green-500"
              : "bg-amber-500"
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Label */}
      {showLabel && (
        <span className={cn(
          "text-xs font-medium tabular-nums whitespace-nowrap",
          isComplete ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
        )}>
          {completed}/{estimated}
        </span>
      )}
    </div>
  );
};

export default PomodoroProgressBar;
