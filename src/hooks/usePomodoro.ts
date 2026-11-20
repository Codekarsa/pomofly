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

export function usePomodoro(initialSettings: PomodoroSettings, onComplete?: (completed: boolean) => void) {
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
  const [recoveryChecked, setRecoveryChecked] = useState(false);
  const previousSettingsRef = useRef(initialSettings);

  // Use ref for onComplete to prevent dependency changes from resetting timer
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Check for persisted session on mount
  useEffect(() => {
    const session = TimerPersistence.loadSession();
    if (session) {
      if (session.isActive || session.timerStartedAt !== null || session.pausedTimeRemaining !== null) {
        setPersistedSession(session);
        setShowRecoveryModal(true);
      } else {
        setPhase(session.phase);
        setSessionsCompleted(session.sessionsCompleted);
      }
    }
    setRecoveryChecked(true);
  }, []);

  // Persist session whenever state changes
  const persistCurrentSession = useCallback(() => {
    const session: PersistedTimerSession = {
      phase,
      isActive,
      timerStartedAt,
      pausedTimeRemaining,
      sessionsCompleted,
      sessionCreatedAt: Date.now(),
      settings,
    };
    
    // Keep cycle progress between sessions, including across route changes.
    if (isActive || timerStartedAt !== null || pausedTimeRemaining !== null || sessionsCompleted > 0 || phase !== 'pomodoro') {
      TimerPersistence.saveSession(session);
    } else {
      TimerPersistence.clearSession();
    }
  }, [phase, isActive, timerStartedAt, pausedTimeRemaining, sessionsCompleted, settings]);

  // Auto-persist when state changes
  useEffect(() => {
    if (!recoveryChecked || showRecoveryModal) return;
    persistCurrentSession();
  }, [persistCurrentSession, recoveryChecked, showRecoveryModal]);

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

  const handlePhaseComplete = useCallback((completed = true) => {
    if (phase === 'pomodoro') {
      const nextSession = completed ? (sessionsCompleted % settings.longBreakInterval) + 1 : sessionsCompleted;
      setSessionsCompleted(completed && nextSession >= settings.longBreakInterval ? 0 : nextSession);
      if (completed && nextSession >= settings.longBreakInterval) {
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
    setIsActive(false);
    setSeconds(0);
    setTimerStartedAt(null);
    setPausedTimeRemaining(null);
    onCompleteRef.current?.(completed);
  }, [phase, sessionsCompleted, settings]);

  const endPhase = useCallback(() => {
    handlePhaseComplete(getRemainingTime() <= 0);
  }, [getRemainingTime, handlePhaseComplete]);

  const updateSettings = useCallback((newSettings: PomodoroSettings) => {
    setSettings(newSettings);
    setIsActive(false);
    setTimerStartedAt(null);
    setPausedTimeRemaining(null);
    setMinutes(newSettings[phase]);
    setSeconds(0);
    setShowRecoveryModal(false);
    setPersistedSession(null);
  }, [phase]);

  useEffect(() => {
    if (previousSettingsRef.current !== initialSettings) {
      previousSettingsRef.current = initialSettings;
      updateSettings(initialSettings);
    }
  }, [initialSettings, updateSettings]);

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

  return {
    phase,
    minutes,
    seconds,
    isActive,
    toggleTimer,
    resetTimer,
    switchPhase,
    endPhase,
    settings,
    updateSettings,
    // Recovery modal state
    showRecoveryModal,
    persistedSession,
    restoreSession,
    startFresh
  };
}
