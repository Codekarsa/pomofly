import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createLongPressHandler, getTouchTargetSize } from '@/lib/mobileUtils';

interface MobileButtonProps extends ButtonProps {
  onLongPress?: () => void;
  longPressDelay?: number;
  hapticFeedback?: boolean;
  touchOptimized?: boolean;
}

export const MobileButton = React.forwardRef<HTMLButtonElement, MobileButtonProps>(
  ({ 
    onLongPress, 
    longPressDelay = 500, 
    hapticFeedback = true,
    touchOptimized = true,
    onClick, 
    className, 
    children, 
    ...props 
  }, ref) => {
    const touchTargetSize = getTouchTargetSize();
    
    const longPressHandlers = onLongPress 
      ? createLongPressHandler(
          onLongPress, 
          onClick as (() => void) | undefined, 
          longPressDelay
        )
      : {};

    const handleClick = onLongPress ? undefined : onClick;

    return (
      <Button
        ref={ref}
        onClick={handleClick}
        className={cn(
          touchOptimized && [
            'relative',
            // Ensure minimum touch target size
            'min-h-11 min-w-11',
            // Better visual feedback for touch
            'active:scale-95 transition-transform duration-75',
            // Improved touch area
            'touch-manipulation',
            // Better spacing for mobile
            'px-4 py-3',
          ],
          className
        )}
        style={{
          minHeight: touchOptimized ? touchTargetSize.minSize : undefined,
          minWidth: touchOptimized ? touchTargetSize.minSize : undefined,
        }}
        {...longPressHandlers}
        {...props}
      >
        {children}
      </Button>
    );
  }
);

MobileButton.displayName = 'MobileButton';