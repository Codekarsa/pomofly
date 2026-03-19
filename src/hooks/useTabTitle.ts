import { useEffect, useRef } from 'react';

interface TabTitleOptions {
  phase: 'pomodoro' | 'shortBreak' | 'longBreak';
  minutes: number;
  seconds: number;
  isActive: boolean;
  appName?: string;
}

export function useTabTitle({
  phase,
  minutes,
  seconds,
  isActive,
  appName = 'Pomofly',
}: TabTitleOptions) {
  const originalTitleRef = useRef<string | null>(null);

  // Store the original title on first mount
  useEffect(() => {
    if (originalTitleRef.current === null) {
      originalTitleRef.current = document.title;
    }
  }, []);

  useEffect(() => {
    // Don't update title on server side
    if (typeof document === 'undefined') return;

    const updateTitle = () => {
      // If timer is not active, restore original title
      if (!isActive) {
        document.title = originalTitleRef.current || appName;
        return;
      }

      // Get appropriate emoji and phase name
      const phaseConfig = {
        pomodoro: { emoji: '🍅', name: 'Pomodoro' },
        shortBreak: { emoji: '☕', name: 'Short Break' },
        longBreak: { emoji: '🛋️', name: 'Long Break' },
      };

      const { emoji, name } = phaseConfig[phase];

      // Format time as MM:SS
      const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

      // Create the dynamic title
      const dynamicTitle = `${emoji} ${timeString} - ${name} | ${appName}`;

      document.title = dynamicTitle;
    };

    updateTitle();

    // Cleanup function to restore original title when component unmounts
    return () => {
      if (originalTitleRef.current !== null) {
        document.title = originalTitleRef.current;
      }
    };
  }, [phase, minutes, seconds, isActive, appName]);

  // Also handle when the timer is paused but still has time remaining
  useEffect(() => {
    if (typeof document === 'undefined') return;

    // Show paused state in title when timer has remaining time but is not active
    const hasRemainingTime = minutes > 0 || seconds > 0;

    if (!isActive && hasRemainingTime) {
      const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      const pausedTitle = `⏸️ ${timeString} - Paused | ${appName}`;
      document.title = pausedTitle;
    }
  }, [minutes, seconds, isActive, appName]);

  // Return a function to manually reset title
  const resetTitle = () => {
    if (originalTitleRef.current !== null) {
      document.title = originalTitleRef.current;
    }
  };

  return { resetTitle };
}
