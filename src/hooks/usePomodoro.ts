import { useState, useEffect, useCallback } from 'react';

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
    if (onComplete) {
      onComplete();
    }
  }, [phase, sessionsCompleted, settings, onComplete]);

  const updateSettings = useCallback((newSettings: PomodoroSettings) => {
    setSettings(newSettings);
    localStorage.setItem('pomodoroSettings', JSON.stringify(newSettings));
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isActive) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (minutes > 0) {
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          clearInterval(interval!);
          setIsActive(false);
          handlePhaseComplete();
        }
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval!);
    }
    return () => clearInterval(interval!);
  }, [isActive, minutes, seconds, settings, handlePhaseComplete]);

  const toggleTimer = useCallback(() => {
    setIsActive(!isActive);
  }, [isActive]);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setMinutes(settings[phase]);
    setSeconds(0);
  }, [phase, settings]);

  const switchPhase = useCallback((newPhase: PomodoroPhase) => {
    setPhase(newPhase);
    setMinutes(settings[newPhase]);
    setSeconds(0);
    setIsActive(false);
  }, [settings]);

  useEffect(() => {
    setMinutes(settings[phase]);
    setSeconds(0);
  }, [settings, phase]);

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