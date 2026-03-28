import { useEffect, useCallback, useRef, useState } from 'react';
import { 
  triggerHaptic, 
  requestWakeLock, 
  releaseWakeLock, 
  isWakeLockActive,
  isMobileDevice,
  isHapticSupported 
} from '@/lib/mobileUtils';

export interface MobileTimerOptions {
  enableHaptics?: boolean;
  enableWakeLock?: boolean;
  enableAutoFocus?: boolean;
}

export interface MobileTimerState {
  isMobile: boolean;
  hasHapticSupport: boolean;
  hasWakeLock: boolean;
  isWakeLockActive: boolean;
}

export const useMobileTimer = (
  isActive: boolean,
  phase: 'pomodoro' | 'shortBreak' | 'longBreak',
  onComplete: () => void,
  options: MobileTimerOptions = {}
) => {
  const {
    enableHaptics = true,
    enableWakeLock = true,
    enableAutoFocus = true
  } = options;

  const [mobileState, setMobileState] = useState<MobileTimerState>({
    isMobile: false,
    hasHapticSupport: false,
    hasWakeLock: false,
    isWakeLockActive: false
  });

  const lastActiveRef = useRef(isActive);
  const lastPhaseRef = useRef(phase);
  const originalOnCompleteRef = useRef(onComplete);

  // Update refs
  useEffect(() => {
    originalOnCompleteRef.current = onComplete;
  }, [onComplete]);

  // Initialize mobile capabilities
  useEffect(() => {
    const initMobile = async () => {
      const isMobile = isMobileDevice();
      const hasHapticSupport = isHapticSupported();
      const hasWakeLock = 'wakeLock' in navigator;

      setMobileState({
        isMobile,
        hasHapticSupport,
        hasWakeLock,
        isWakeLockActive: isWakeLockActive()
      });
    };

    initMobile();
  }, []);

  // Handle timer start/stop with haptics and wake lock
  useEffect(() => {
    const wasActive = lastActiveRef.current;
    const wasPhase = lastPhaseRef.current;

    // Timer state change
    if (isActive && !wasActive) {
      // Timer started
      if (enableHaptics && mobileState.hasHapticSupport) {
        triggerHaptic('timerStart');
      }

      // Request wake lock if enabled and in pomodoro phase
      if (enableWakeLock && mobileState.hasWakeLock && phase === 'pomodoro') {
        requestWakeLock().then(success => {
          setMobileState(prev => ({ ...prev, isWakeLockActive: success }));
        });
      }
    } else if (!isActive && wasActive) {
      // Timer stopped/paused
      if (enableHaptics && mobileState.hasHapticSupport) {
        triggerHaptic('medium');
      }

      // Release wake lock when timer stops
      if (enableWakeLock && mobileState.isWakeLockActive) {
        releaseWakeLock();
        setMobileState(prev => ({ ...prev, isWakeLockActive: false }));
      }
    }

    // Phase change
    if (wasPhase !== phase && enableHaptics && mobileState.hasHapticSupport) {
      triggerHaptic('light');
    }

    lastActiveRef.current = isActive;
    lastPhaseRef.current = phase;
  }, [isActive, phase, enableHaptics, enableWakeLock, mobileState.hasHapticSupport, mobileState.hasWakeLock, mobileState.isWakeLockActive]);

  // Enhanced completion handler with haptics
  const handleTimerComplete = useCallback(() => {
    if (enableHaptics && mobileState.hasHapticSupport) {
      triggerHaptic('timerComplete');
    }

    // Release wake lock on completion
    if (enableWakeLock && mobileState.isWakeLockActive) {
      releaseWakeLock();
      setMobileState(prev => ({ ...prev, isWakeLockActive: false }));
    }

    // Call original completion handler
    originalOnCompleteRef.current();
  }, [enableHaptics, enableWakeLock, mobileState.hasHapticSupport, mobileState.isWakeLockActive]);

  // Cleanup wake lock on unmount
  useEffect(() => {
    return () => {
      if (enableWakeLock && mobileState.isWakeLockActive) {
        releaseWakeLock();
      }
    };
  }, [enableWakeLock, mobileState.isWakeLockActive]);

  // Mobile-specific actions
  const mobileActions = {
    triggerSuccessHaptic: () => {
      if (enableHaptics && mobileState.hasHapticSupport) {
        triggerHaptic('taskComplete');
      }
    },
    triggerErrorHaptic: () => {
      if (enableHaptics && mobileState.hasHapticSupport) {
        triggerHaptic('error');
      }
    },
    triggerNotificationHaptic: () => {
      if (enableHaptics && mobileState.hasHapticSupport) {
        triggerHaptic('notification');
      }
    },
    triggerLightHaptic: () => {
      if (enableHaptics && mobileState.hasHapticSupport) {
        triggerHaptic('light');
      }
    },
    requestFocus: enableAutoFocus && mobileState.isMobile,
    requestWakeLock: async () => {
      if (enableWakeLock && mobileState.hasWakeLock) {
        const success = await requestWakeLock();
        setMobileState(prev => ({ ...prev, isWakeLockActive: success }));
        return success;
      }
      return false;
    },
    releaseWakeLock: () => {
      if (enableWakeLock && mobileState.isWakeLockActive) {
        releaseWakeLock();
        setMobileState(prev => ({ ...prev, isWakeLockActive: false }));
      }
    }
  };

  return {
    ...mobileState,
    handleTimerComplete,
    mobileActions
  };
};