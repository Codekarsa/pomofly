import { useState, useEffect, useCallback } from 'react';

export function usePomodoro(initialMinutes: number = 25, onComplete?: () => void) {
  const [minutes, setMinutes] = useState(initialMinutes);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);

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
          if (onComplete) {
            onComplete();
          }
        }
      }, 1000);
    } else if (!isActive && seconds !== 0) {
      clearInterval(interval!);
    }
    return () => clearInterval(interval!);
  }, [isActive, minutes, seconds, onComplete]);

  const toggleTimer = useCallback(() => {
    setIsActive(!isActive);
  }, [isActive]);

  const resetTimer = useCallback(() => {
    setIsActive(false);
    setMinutes(initialMinutes);
    setSeconds(0);
  }, [initialMinutes]);

  return { 
    minutes, 
    seconds, 
    isActive, 
    toggleTimer, 
    resetTimer 
  };
}