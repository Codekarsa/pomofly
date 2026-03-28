import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { createSwipeHandler, triggerHaptic } from '@/lib/mobileUtils';
import { CheckCircle, X, Clock } from 'lucide-react';

interface SwipeableTaskProps {
  children: React.ReactNode;
  onSwipeComplete?: () => void;
  onSwipeRemove?: () => void;
  onSwipeAction?: () => void;
  className?: string;
  showSwipeActions?: boolean;
  disabled?: boolean;
}

export const SwipeableTask: React.FC<SwipeableTaskProps> = ({
  children,
  onSwipeComplete,
  onSwipeRemove,
  onSwipeAction,
  className,
  showSwipeActions = true,
  disabled = false
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null);

  const swipeHandlers = createSwipeHandler({
    onSwipeLeft: () => {
      if (disabled || !showSwipeActions) return;
      
      setIsRevealed(true);
      setSwipeDirection('left');
      triggerHaptic('light');
    },
    onSwipeRight: () => {
      if (disabled || !showSwipeActions) return;
      
      if (isRevealed) {
        // Close revealed state
        setIsRevealed(false);
        setSwipeDirection(null);
      } else if (onSwipeComplete) {
        // Complete action
        triggerHaptic('taskComplete');
        onSwipeComplete();
      }
    }
  }, 60);

  const handleActionClick = (action: () => void) => {
    triggerHaptic('medium');
    action();
    setIsRevealed(false);
    setSwipeDirection(null);
  };

  return (
    <div className={cn(
      "relative overflow-hidden bg-background rounded-lg",
      "touch-manipulation select-none",
      className
    )}>
      {/* Background action buttons */}
      {showSwipeActions && isRevealed && (
        <div className={cn(
          "absolute inset-y-0 flex items-center gap-2 px-4",
          swipeDirection === 'left' ? 'right-0' : 'left-0'
        )}>
          {onSwipeComplete && (
            <button
              onClick={() => handleActionClick(onSwipeComplete)}
              className="flex items-center justify-center w-12 h-12 bg-green-500 text-white rounded-full shadow-lg active:scale-95 transition-transform"
              aria-label="Complete task"
            >
              <CheckCircle size={24} />
            </button>
          )}
          {onSwipeAction && (
            <button
              onClick={() => handleActionClick(onSwipeAction)}
              className="flex items-center justify-center w-12 h-12 bg-blue-500 text-white rounded-full shadow-lg active:scale-95 transition-transform"
              aria-label="Timer action"
            >
              <Clock size={24} />
            </button>
          )}
          {onSwipeRemove && (
            <button
              onClick={() => handleActionClick(onSwipeRemove)}
              className="flex items-center justify-center w-12 h-12 bg-red-500 text-white rounded-full shadow-lg active:scale-95 transition-transform"
              aria-label="Remove task"
            >
              <X size={24} />
            </button>
          )}
        </div>
      )}

      {/* Main content */}
      <div
        className={cn(
          "relative bg-background transition-transform duration-200 ease-out",
          isRevealed && swipeDirection === 'left' && "-translate-x-24",
          isRevealed && swipeDirection === 'right' && "translate-x-24"
        )}
        {...swipeHandlers}
      >
        {children}
      </div>

      {/* Swipe hint overlay */}
      {!isRevealed && showSwipeActions && !disabled && (
        <div className="absolute inset-y-0 left-0 right-0 pointer-events-none">
          <div className="absolute inset-y-0 left-4 flex items-center opacity-30">
            <div className="text-xs text-muted-foreground">← Swipe</div>
          </div>
          <div className="absolute inset-y-0 right-4 flex items-center opacity-30">
            <div className="text-xs text-muted-foreground">Swipe →</div>
          </div>
        </div>
      )}
    </div>
  );
};