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

  // Use ref for onComplete to prevent dependency changes from resetting timer
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Check for persisted session on mount
  useEffect(() => {
    const session = TimerPersistence.loadSession();
    if (session) {
      setPersistedSession(session);
      setShowRecoveryModal(true);
    }
  }, []);

  // Track session creation timestamp
  const [sessionCreatedAt] = useState(Date.now());

  // Persist session whenever state changes
  const persistCurrentSession = useCallback(() => {
    const session: PersistedTimerSession = {
      phase,
      isActive,
      timerStartedAt,
      pausedTimeRemaining,
      sessionsCompleted,
      sessionCreatedAt,
      lastUpdatedAt: Date.now(),
      settings,
      selectedTaskIds: undefined, // Will be updated by updateSessionTaskIds if needed
    };
    
    // Only persist if there's meaningful state to save
    if (isActive || timerStartedAt !== null || pausedTimeRemaining !== null || sessionsCompleted > 0) {
      TimerPersistence.saveSession(session);
    } else {
      TimerPersistence.clearSession();
    }
  }, [phase, isActive, timerStartedAt, pausedTimeRemaining, sessionsCompleted, sessionCreatedAt, settings]);

  // Auto-persist when state changes
  useEffect(() => {
    persistCurrentSession();
  }, [persistCurrentSession]);

  // Calculate remaining time from timestamp (accurate, no drift)
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

  const handlePhaseComplete = useCallback(() => {
    if (phase === 'pomodoro') {
      setSessionsCompleted(prev => prev + 1);
      if (sessionsCompleted + 1 >= settings.longBreakInterval) {
        setPhase('longBreak');
        setMinutes(settings.longBreak);
      } else {
        setPhase('shortBreak');
        setMinutes(settings.shortBreak);
      }
    } else {
      setPhase('pomodoro');
      setMinutes(settings.pomodoro);
    }
    setSeconds(0);
    setTimerStartedAt(null);
    setPausedTimeRemaining(null);
    onCompleteRef.current?.();
  }, [phase, sessionsCompleted, settings]);

  const updateSettings = useCallback((newSettings: PomodoroSettings) => {
    setSettings(newSettings);
    localStorage.setItem('pomodoroSettings', JSON.stringify(newSettings));
  }, []);

  // Timer display update effect - uses timestamp for accuracy
  useEffect(() => {
    if (!isActive) return;

    const updateDisplay = () => {
      const remaining = getRemainingTime();
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;

      setMinutes(mins);
      setSeconds(secs);

      if (remaining <= 0) {
        setIsActive(false);
        setTimerStartedAt(null);
        setPausedTimeRemaining(null);
        handlePhaseComplete();
      }
    };

    // Update immediately
    updateDisplay();

    // Then update every 100ms for smooth display
    const interval = setInterval(updateDisplay, 100);

    return () => clearInterval(interval);
  }, [isActive, getRemainingTime, handlePhaseComplete]);

  const toggleTimer = useCallback(() => {
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
    setIsActive(false);
    setTimerStartedAt(null);
    setPausedTimeRemaining(null);
    setMinutes(settings[phase]);
    setSeconds(0);
  }, [phase, settings]);

  const switchPhase = useCallback((newPhase: PomodoroPhase) => {
    setPhase(newPhase);
    setTimerStartedAt(null);
    setPausedTimeRemaining(null);
    setMinutes(settings[newPhase]);
    setSeconds(0);
    setIsActive(false);
  }, [settings]);

  // Recovery functions
  const restoreSession = useCallback((session: PersistedTimerSession) => {
    try {
      // Validate session one more time before restoring
      if (!TimerPersistence.isValidSession(session)) {
        console.warn('Cannot restore invalid session');
        startFresh();
        return;
      }

      // Calculate remaining time and validate it's reasonable
      const remaining = TimerPersistence.calculateRemainingTime(session);
      const totalDuration = session.settings[session.phase] * 60;
      
      if (remaining > totalDuration) {
        console.warn('Remaining time exceeds total duration, starting fresh');
        startFresh();
        return;
      }

      // Restore state
      setPhase(session.phase);
      setSessionsCompleted(session.sessionsCompleted);
      setSettings(session.settings);
      
      // Handle active vs paused state carefully
      if (session.isActive && session.timerStartedAt && !session.pausedTimeRemaining) {
        // Timer was active - check if it should still be running
        if (remaining > 0) {
          setIsActive(true);
          setTimerStartedAt(session.timerStartedAt);
          setPausedTimeRemaining(null);
        } else {
          // Timer should have completed, mark as finished
          setIsActive(false);
          setTimerStartedAt(null);
          setPausedTimeRemaining(null);
          // Note: We don't auto-complete here to avoid confusion
        }
      } else if (session.pausedTimeRemaining !== null) {
        // Timer was paused
        setIsActive(false);
        setTimerStartedAt(null);
        setPausedTimeRemaining(session.pausedTimeRemaining);
      } else {
        // Timer was stopped
        setIsActive(false);
        setTimerStartedAt(null);
        setPausedTimeRemaining(null);
      }
      
      // Update display
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;
      setMinutes(mins);
      setSeconds(secs);
      
      setShowRecoveryModal(false);
      setPersistedSession(null);
      
      console.info('Successfully restored timer session');
    } catch (error) {
      console.warn('Error restoring session:', error);
      startFresh();
    }
  }, []);

  const startFresh = useCallback(() => {
    setShowRecoveryModal(false);
    setPersistedSession(null);
    TimerPersistence.clearSession();
  }, []);

  useEffect(() => {
    // Only reset display when settings change and timer is not active
    if (!isActive && timerStartedAt === null && pausedTimeRemaining === null) {
      setMinutes(settings[phase]);
      setSeconds(0);
    }
  }, [settings, phase, isActive, timerStartedAt, pausedTimeRemaining]);

  // Function to update selected task IDs in current session
  const updateSelectedTasks = useCallback((taskIds: string[]) => {
    TimerPersistence.updateSessionTaskIds(taskIds);
  }, []);

  // Function to get recovery session metadata for better UX
  const getRecoverySessionInfo = useCallback(() => {
    if (!persistedSession) return null;
    
    const remaining = TimerPersistence.calculateRemainingTime(persistedSession);
    const sessionAge = Date.now() - persistedSession.sessionCreatedAt;
    const wasActive = persistedSession.isActive;
    const phase = persistedSession.phase;
    const taskCount = persistedSession.selectedTaskIds?.length || 0;
    
    return {
      remaining,
      sessionAge,
      wasActive,
      phase,
      taskCount,
      sessionCreatedAt: new Date(persistedSession.sessionCreatedAt)
    };
  }, [persistedSession]);

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
    startFresh,
    // Enhanced functionality
    updateSelectedTasks,
    getRecoverySessionInfo
  };
}
