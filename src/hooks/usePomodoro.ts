import { useState, useEffect, useCallback, useRef } from 'react';
import { TimerPersistence, PersistedTimerSession } from '@/lib/timerPersistence';
import { PrecisionTimer, validateTimerPrecision } from '@/lib/timerPrecision';

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

  // Precision timer state
  const precisionTimer = useRef<PrecisionTimer>(new PrecisionTimer());
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

  // Cleanup ref on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      onCompleteRef.current = undefined;
    };
  }, []);

  // Check for persisted session on mount
  useEffect(() => {
    const session = TimerPersistence.loadSession();
    if (session) {
      setPersistedSession(session);
      setShowRecoveryModal(true);
    }
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
    
    // Only persist if there's meaningful state to save
    if (isActive || timerStartedAt !== null || pausedTimeRemaining !== null) {
      TimerPersistence.saveSession(session);
    } else {
      TimerPersistence.clearSession();
    }
  }, [phase, isActive, timerStartedAt, pausedTimeRemaining, sessionsCompleted, settings]);

  // Auto-persist when state changes
  useEffect(() => {
    persistCurrentSession();
  }, [persistCurrentSession]);

  // Calculate remaining time with precision compensation
  const getRemainingTime = useCallback((): number => {
    if (pausedTimeRemaining !== null) {
      return pausedTimeRemaining;
    }

    if (!timerStartedAt) {
      // Not started - return full duration
      return settings[phase] * 60; // in seconds
    }

    const totalDuration = settings[phase] * 60; // in seconds
    const elapsed = precisionTimer.current.getElapsedTime();
    const remaining = totalDuration - elapsed;

    // Validate precision periodically
    if (Math.random() < 0.1) { // 10% chance to validate
      validateTimerPrecision(precisionTimer.current);
    }

    return Math.max(0, remaining);
  }, [timerStartedAt, pausedTimeRemaining, settings, phase]);

  const handlePhaseComplete = useCallback(() => {
    // Get final precision metrics before completing
    const metrics = precisionTimer.current.getMetrics();
    console.log('Phase completed with precision metrics:', metrics);
    
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
    precisionTimer.current.reset();
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
        // Resuming - start precision timer with remaining time
        const totalDuration = settings[phase] * 60;
        const elapsedBeforePause = totalDuration - pausedTimeRemaining;
        precisionTimer.current.start(elapsedBeforePause);
        setTimerStartedAt(Date.now());
        setPausedTimeRemaining(null);
      } else {
        // Fresh start
        precisionTimer.current.start();
        setTimerStartedAt(Date.now());
      }
    } else {
      // Pausing - save remaining time and pause precision timer
      const remaining = precisionTimer.current.pause();
      const totalDuration = settings[phase] * 60;
      const remainingTime = Math.max(0, totalDuration - remaining);
      setPausedTimeRemaining(remainingTime);
      setTimerStartedAt(null);
    }
    setIsActive(!isActive);
  }, [isActive, pausedTimeRemaining, settings, phase]);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    precisionTimer.current.reset();
    setTimerStartedAt(null);
    setPausedTimeRemaining(null);
    setMinutes(settings[phase]);
    setSeconds(0);
  }, [phase, settings]);

  const switchPhase = useCallback((newPhase: PomodoroPhase) => {
    setPhase(newPhase);
    precisionTimer.current.reset();
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
    settings,
    updateSettings,
    // Recovery modal state
    showRecoveryModal,
    persistedSession,
    restoreSession,
    startFresh
  };
}
