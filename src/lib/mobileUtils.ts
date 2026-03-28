/**
 * Mobile utility functions for enhanced mobile experience
 */

// Haptic feedback patterns
export const HapticPatterns = {
  light: [50],
  medium: [100],
  heavy: [200],
  timerStart: [50, 100, 50],
  timerComplete: [100, 50, 100, 50, 200],
  taskComplete: [50, 50, 100],
  notification: [100, 50, 100],
  error: [200, 100, 200]
} as const;

// Wake lock reference
let wakeLock: WakeLockSentinel | null = null;

/**
 * Trigger haptic feedback on supported devices
 */
export const triggerHaptic = (pattern: keyof typeof HapticPatterns = 'light'): void => {
  try {
    // Use Vibration API if available
    if ('vibrate' in navigator && Array.isArray(HapticPatterns[pattern])) {
      navigator.vibrate(HapticPatterns[pattern]);
      return;
    }

    // Fallback for iOS with simplified patterns
    if ('vibrate' in navigator) {
      const duration = HapticPatterns[pattern][0] || 50;
      navigator.vibrate(duration);
    }
  } catch (error) {
    // Silently fail if haptic feedback is not supported
    console.debug('Haptic feedback not available:', error);
  }
};

/**
 * Check if device supports haptic feedback
 */
export const isHapticSupported = (): boolean => {
  return 'vibrate' in navigator;
};

/**
 * Request wake lock to keep screen awake during timer sessions
 */
export const requestWakeLock = async (): Promise<boolean> => {
  try {
    if ('wakeLock' in navigator && 'request' in navigator.wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      
      // Handle wake lock release on page visibility change
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && !wakeLock) {
          requestWakeLock();
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Release wake lock when it's released
      wakeLock.addEventListener('release', () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        wakeLock = null;
      });
      
      return true;
    }
  } catch (error) {
    console.debug('Wake lock not supported or denied:', error);
  }
  return false;
};

/**
 * Release wake lock
 */
export const releaseWakeLock = (): void => {
  if (wakeLock) {
    wakeLock.release();
    wakeLock = null;
  }
};

/**
 * Check if wake lock is currently active
 */
export const isWakeLockActive = (): boolean => {
  return wakeLock !== null;
};

/**
 * Detect if device is mobile
 */
export const isMobileDevice = (): boolean => {
  const userAgent = navigator.userAgent.toLowerCase();
  const mobileKeywords = ['android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
  
  return (
    mobileKeywords.some(keyword => userAgent.includes(keyword)) ||
    ('ontouchstart' in window) ||
    (navigator.maxTouchPoints > 0) ||
    window.innerWidth <= 768
  );
};

/**
 * Get optimal touch target size based on device
 */
export const getTouchTargetSize = (): { minSize: number; recommended: number } => {
  const isMobile = isMobileDevice();
  
  return {
    minSize: isMobile ? 44 : 32, // 44px minimum for mobile accessibility
    recommended: isMobile ? 56 : 40 // Comfortable touch size
  };
};

/**
 * Handle long press gestures
 */
export const createLongPressHandler = (
  onLongPress: () => void,
  onPress?: () => void,
  delay: number = 500
) => {
  let timeoutId: NodeJS.Timeout | null = null;
  let isLongPress = false;

  const handleStart = () => {
    isLongPress = false;
    timeoutId = setTimeout(() => {
      isLongPress = true;
      triggerHaptic('medium');
      onLongPress();
    }, delay);
  };

  const handleEnd = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    
    if (!isLongPress && onPress) {
      onPress();
    }
  };

  const handleCancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return {
    onTouchStart: handleStart,
    onTouchEnd: handleEnd,
    onTouchCancel: handleCancel,
    onMouseDown: handleStart,
    onMouseUp: handleEnd,
    onMouseLeave: handleCancel
  };
};

/**
 * Swipe gesture detection
 */
export interface SwipeHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
}

export const createSwipeHandler = (handlers: SwipeHandlers, threshold: number = 50) => {
  let startX: number | null = null;
  let startY: number | null = null;
  let startTime: number | null = null;

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    startTime = Date.now();
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!startX || !startY || !startTime) return;

    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    const endTime = Date.now();

    const deltaX = endX - startX;
    const deltaY = endY - startY;
    const duration = endTime - startTime;

    // Ignore if too slow (likely not a swipe)
    if (duration > 500) return;

    // Determine primary direction
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (absDeltaX > threshold && absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (deltaX > 0 && handlers.onSwipeRight) {
        triggerHaptic('light');
        handlers.onSwipeRight();
      } else if (deltaX < 0 && handlers.onSwipeLeft) {
        triggerHaptic('light');
        handlers.onSwipeLeft();
      }
    } else if (absDeltaY > threshold && absDeltaY > absDeltaX) {
      // Vertical swipe
      if (deltaY > 0 && handlers.onSwipeDown) {
        triggerHaptic('light');
        handlers.onSwipeDown();
      } else if (deltaY < 0 && handlers.onSwipeUp) {
        triggerHaptic('light');
        handlers.onSwipeUp();
      }
    }

    // Reset
    startX = null;
    startY = null;
    startTime = null;
  };

  return {
    onTouchStart: handleTouchStart,
    onTouchEnd: handleTouchEnd
  };
};