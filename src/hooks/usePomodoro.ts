import { useState, useEffect, useCallback, useRef } from 'react';
import { PreciseTimer } from '@/lib/preciseTiming';

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
  
  // Precision timing state
  const [lastUpdateTime, setLastUpdateTime] = useState<number | null>(null);
  const [timeJumpDetected, setTimeJumpDetected] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  // Use ref for onComplete to prevent dependency changes from resetting timer
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Handle visibility changes for better battery management
  useEffect(() => {
    const cleanup = PreciseTimer.createVisibilityChangeHandler((visible) => {
      setIsVisible(visible);
      if (visible && isActive) {
        // Tab became visible, reset time jump detection for recalibration
        setTimeJumpDetected(false);
        setLastUpdateTime(PreciseTimer.now());
      }
    });
    
    return cleanup;
  }, [isActive]);

  // Calculate remaining time from timestamp with high precision and drift protection
  const getRemainingTime = useCallback((): number => {
    if (!timerStartedAt) {
      // Not started - return full duration
      return settings[phase] * 60; // in seconds
    }

    const totalDuration = settings[phase] * 60; // in seconds
    const result = PreciseTimer.calculateRemainingTime(
      timerStartedAt, 
      totalDuration, 
      pausedTimeRemaining
    );

    // Handle time jumps (system sleep/wake, clock changes)
    if (result.timeJumpDetected && !timeJumpDetected) {
      console.warn('Timer: System time jump detected, recalibrating timer');
      setTimeJumpDetected(true);
      // Reset timer start time to current time minus expected elapsed
      const expectedElapsed = totalDuration - result.remaining;
      const newStartTime = PreciseTimer.now() - (expectedElapsed * 1000);
      setTimerStartedAt(newStartTime);
    }

    return result.remaining;
  }, [timerStartedAt, pausedTimeRemaining, settings, phase, timeJumpDetected]);

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

  // Timer display update effect - uses high-precision timestamp for accuracy
  useEffect(() => {
    if (!isActive) return;

    const updateDisplay = () => {
      const currentTime = PreciseTimer.now();
      const remaining = getRemainingTime();
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;

      // Update last check time for drift detection
      setLastUpdateTime(currentTime);

      setMinutes(mins);
      setSeconds(secs);

      if (remaining <= 0) {
        setIsActive(false);
        setTimerStartedAt(null);
        setPausedTimeRemaining(null);
        setTimeJumpDetected(false);
        handlePhaseComplete();
      }
    };

    // Update immediately
    updateDisplay();

    // Use adaptive update interval based on visibility and precision needs
    const updateInterval = PreciseTimer.getUpdateInterval();
    const interval = setInterval(updateDisplay, updateInterval);

    return () => clearInterval(interval);
  }, [isActive, getRemainingTime, handlePhaseComplete, isVisible]);

  const toggleTimer = useCallback(() => {
    const currentTime = PreciseTimer.now();
    
    if (!isActive) {
      // Starting timer
      if (pausedTimeRemaining !== null) {
        // Resuming - calculate new start time based on remaining time
        const elapsedBeforePause = settings[phase] * 60 - pausedTimeRemaining;
        const newStartTime = currentTime - (elapsedBeforePause * 1000);
        setTimerStartedAt(newStartTime);
        setPausedTimeRemaining(null);
      } else {
        // Fresh start
        setTimerStartedAt(currentTime);
      }
      setTimeJumpDetected(false); // Reset time jump detection on start
      setLastUpdateTime(currentTime);
    } else {
      // Pausing - save remaining time with high precision
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
    setTimeJumpDetected(false);
    setLastUpdateTime(null);
    setMinutes(settings[phase]);
    setSeconds(0);
  }, [phase, settings]);

  const switchPhase = useCallback((newPhase: PomodoroPhase) => {
    setPhase(newPhase);
    setTimerStartedAt(null);
    setPausedTimeRemaining(null);
    setTimeJumpDetected(false);
    setLastUpdateTime(null);
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
    updateSettings,
    // Precision timing information
    timeJumpDetected,
    isVisible,
    timerStartedAt
  };
}
