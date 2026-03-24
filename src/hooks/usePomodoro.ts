import { useState, useEffect, useCallback, useRef } from 'react';
import { TimerPersistence, PersistedTimerSession } from '@/lib/timerPersistence';

type PomodoroPhase = 'pomodoro' | 'shortBreak' | 'longBreak';

interface PomodoroSettings {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
}

export const defaultSettings: PomodoroSettings = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4
};

export function usePomodoro(initialSettings: PomodoroSettings, onComplete?: () => void) {
  const [phase, setPhase] = useState<PomodoroPhase>('pomodoro');
  const [minutes, setMinutes] = useState(initialSettings[phase]);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);
  const [settings, setSettings] = useState(initialSettings);

  // Timestamp-based timing state
  const [timerStartedAt, setTimerStartedAt] = useState<number | null>(null);
  const [pausedTimeRemaining, setPausedTimeRemaining] = useState<number | null>(null);

  // Session recovery state
  const [persistedSession, setPersistedSession] = useState<PersistedTimerSession | null>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  // Refs for cleanup and preventing stale closures
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const persistTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Use ref for onComplete to prevent dependency changes from resetting timer
  const onCompleteRef = useRef(onComplete);
  
  // Update onComplete ref without causing re-renders
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Clear interval
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      // Clear persist timeout
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = null;
      }
      
      // Clear refs
      onCompleteRef.current = undefined;
    };
  }, []);

  // Check for persisted session on mount only
  useEffect(() => {
    const session = TimerPersistence.loadSession();
    if (session && isMountedRef.current) {
      setPersistedSession(session);
      setShowRecoveryModal(true);
    }
  }, []); // Empty dependency array - run only once on mount

  // Debounced persist function to avoid excessive localStorage writes
  const persistCurrentSession = useCallback(() => {
    // Clear any pending persist operations
    if (persistTimeoutRef.current) {
      clearTimeout(persistTimeoutRef.current);
    }

    persistTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;

      const session: PersistedTimerSession = {
        phase,
        isActive,
        timerStartedAt,
        pausedTimeRemaining,
        sessionsCompleted,
        sessionCreatedAt: Date.now(),
        settings,
      };
      
      // Only persist if there's meaningful state to save
      if (isActive || timerStartedAt !== null || pausedTimeRemaining !== null) {
        TimerPersistence.saveSession(session);
      } else {
        TimerPersistence.clearSession();
      }
    }, 100); // Debounce localStorage writes by 100ms
  }, [phase, isActive, timerStartedAt, pausedTimeRemaining, sessionsCompleted, settings]);

  // Auto-persist when state changes (debounced)
  useEffect(() => {
    persistCurrentSession();
    
    // Cleanup timeout on unmount or dependency change
    return () => {
      if (persistTimeoutRef.current) {
        clearTimeout(persistTimeoutRef.current);
        persistTimeoutRef.current = null;
      }
    };
  }, [persistCurrentSession]);

  // Stable getRemainingTime function to avoid unnecessary re-renders
  const getRemainingTime = useCallback((): number => {
    if (pausedTimeRemaining !== null) {
      return pausedTimeRemaining;
    }

    if (!timerStartedAt) {
      // Not started - return full duration
      return settings[phase] * 60; // in seconds
    }

    const totalDuration = settings[phase] * 60; // in seconds
    const elapsed = Math.floor((Date.now() - timerStartedAt) / 1000);
    const remaining = totalDuration - elapsed;

    return Math.max(0, remaining);
  }, [timerStartedAt, pausedTimeRemaining, settings, phase]);

  // Memoized handlePhaseComplete to prevent unnecessary re-creations
  const handlePhaseComplete = useCallback(() => {
    if (!isMountedRef.current) return;

    if (phase === 'pomodoro') {
      setSessionsCompleted(prev => {
        const newCount = prev + 1;
        if (newCount >= settings.longBreakInterval) {
          setPhase('longBreak');
          setMinutes(settings.longBreak);
        } else {
          setPhase('shortBreak');
          setMinutes(settings.shortBreak);
        }
        return newCount;
      });
    } else {
      setPhase('pomodoro');
      setMinutes(settings.pomodoro);
    }
    
    setSeconds(0);
    setTimerStartedAt(null);
    setPausedTimeRemaining(null);
    
    // Call completion callback if available
    const callback = onCompleteRef.current;
    if (callback) {
      try {
        callback();
      } catch (error) {
        console.error('Timer completion callback error:', error);
      }
    }
  }, [phase, settings]); // Removed sessionsCompleted from dependencies to avoid stale closure

  const updateSettings = useCallback((newSettings: PomodoroSettings) => {
    if (!isMountedRef.current) return;
    
    setSettings(newSettings);
    
    // Safely update localStorage
    try {
      localStorage.setItem('pomodoroSettings', JSON.stringify(newSettings));
    } catch (error) {
      console.warn('Failed to save pomodoro settings:', error);
    }
  }, []);

  // Optimized timer update effect with proper cleanup
  useEffect(() => {
    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isActive || !isMountedRef.current) return;

    const updateDisplay = () => {
      if (!isMountedRef.current) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      const remaining = getRemainingTime();
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;

      setMinutes(mins);
      setSeconds(secs);

      if (remaining <= 0) {
        setIsActive(false);
        setTimerStartedAt(null);
        setPausedTimeRemaining(null);
        
        // Clear interval before handling completion
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        handlePhaseComplete();
      }
    };

    // Update immediately
    updateDisplay();

    // Set up interval with proper cleanup
    intervalRef.current = setInterval(updateDisplay, 100);

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isActive, getRemainingTime, handlePhaseComplete]);

  const toggleTimer = useCallback(() => {
    if (!isMountedRef.current) return;

    if (!isActive) {
      // Starting timer
      if (pausedTimeRemaining !== null) {
        // Resuming - calculate new start time based on remaining time
        const elapsedBeforePause = settings[phase] * 60 - pausedTimeRemaining;
        const newStartTime = Date.now() - (elapsedBeforePause * 1000);
        setTimerStartedAt(newStartTime);
        setPausedTimeRemaining(null);
      } else {
        // Fresh start
        setTimerStartedAt(Date.now());
      }
    } else {
      // Pausing - save remaining time
      const remaining = getRemainingTime();
      setPausedTimeRemaining(remaining);
      setTimerStartedAt(null);
    }
    setIsActive(!isActive);
  }, [isActive, pausedTimeRemaining, settings, phase, getRemainingTime]);

  const resetTimer = useCallback(() => {
    if (!isMountedRef.current) return;
    
    // Clear interval first
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setIsActive(false);
    setTimerStartedAt(null);
    setPausedTimeRemaining(null);
    setMinutes(settings[phase]);
    setSeconds(0);
  }, [phase, settings]);

  const switchPhase = useCallback((newPhase: PomodoroPhase) => {
    if (!isMountedRef.current) return;
    
    // Clear interval when switching phases
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setPhase(newPhase);
    setTimerStartedAt(null);
    setPausedTimeRemaining(null);
    setMinutes(settings[newPhase]);
    setSeconds(0);
    setIsActive(false);
  }, [settings]);

  // Recovery functions with memory safety
  const restoreSession = useCallback((session: PersistedTimerSession) => {
    if (!isMountedRef.current) return;
    
    setPhase(session.phase);
    setIsActive(session.isActive);
    setTimerStartedAt(session.timerStartedAt);
    setPausedTimeRemaining(session.pausedTimeRemaining);
    setSessionsCompleted(session.sessionsCompleted);
    setSettings(session.settings);
    
    // Update display from restored state
    const remaining = TimerPersistence.calculateRemainingTime(session);
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    setMinutes(mins);
    setSeconds(secs);
    
    setShowRecoveryModal(false);
    setPersistedSession(null);
  }, []);

  const startFresh = useCallback(() => {
    if (!isMountedRef.current) return;
    
    setShowRecoveryModal(false);
    setPersistedSession(null);
    TimerPersistence.clearSession();
  }, []);

  // Settings-based display update with proper dependency management
  useEffect(() => {
    // Only reset display when settings change and timer is not active
    if (!isActive && timerStartedAt === null && pausedTimeRemaining === null && isMountedRef.current) {
      setMinutes(settings[phase]);
      setSeconds(0);
    }
  }, [settings, phase, isActive, timerStartedAt, pausedTimeRemaining]);

  return {
    phase,
    minutes,
    seconds,
    isActive,
    toggleTimer,
    resetTimer,
    switchPhase,
    settings,
    updateSettings,
    // Recovery modal state
    showRecoveryModal,
    persistedSession,
    restoreSession,
    startFresh
  };
}