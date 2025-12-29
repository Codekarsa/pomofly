import { useState, useEffect, useCallback, useRef } from 'react';

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

  // Use ref for onComplete to prevent dependency changes from resetting timer
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

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
    updateSettings
  };
}
