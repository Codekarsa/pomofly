import { useEffect } from 'react';

type PomodoroPhase = 'pomodoro' | 'shortBreak' | 'longBreak';

interface PersistedTimerState {
  phase: PomodoroPhase;
  minutes: number;
  seconds: number;
  isActive: boolean;
  sessionsCompleted: number;
  timerStartedAt: number | null;
  pausedTimeRemaining: number | null;
  lastActiveTimestamp?: number; // For detecting crashes/long inactivity
}

const TIMER_STATE_KEY = 'pomofly_timer_state';
const MAX_INACTIVE_TIME = 60 * 60 * 1000; // 1 hour - assume crash if longer

export function useTimerPersistence(
  phase: PomodoroPhase,
  minutes: number,
  seconds: number,
  isActive: boolean,
  sessionsCompleted: number,
  timerStartedAt: number | null,
  pausedTimeRemaining: number | null,
  onStateRestore?: (state: PersistedTimerState) => void
) {
  // Save state to localStorage whenever it changes
  useEffect(() => {
    const state: PersistedTimerState = {
      phase,
      minutes,
      seconds,
      isActive,
      sessionsCompleted,
      timerStartedAt,
      pausedTimeRemaining,
      lastActiveTimestamp: Date.now(),
    };

    try {
      localStorage.setItem(TIMER_STATE_KEY, JSON.stringify(state));
    } catch (error) {
      console.warn('Failed to persist timer state:', error);
    }
  }, [phase, minutes, seconds, isActive, sessionsCompleted, timerStartedAt, pausedTimeRemaining]);

  // Restore state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(TIMER_STATE_KEY);
      if (!saved) return;

      const state: PersistedTimerState = JSON.parse(saved);
      const now = Date.now();
      
      // Check if too much time has passed (likely a crash or long inactivity)
      if (state.lastActiveTimestamp && (now - state.lastActiveTimestamp) > MAX_INACTIVE_TIME) {
        console.log('Timer state too old, clearing...');
        localStorage.removeItem(TIMER_STATE_KEY);
        return;
      }

      // If timer was active when saved, we need to handle it carefully
      if (state.isActive && state.timerStartedAt) {
        const elapsed = Math.floor((now - state.timerStartedAt) / 1000);
        const totalDuration = state.minutes * 60 + state.seconds;
        
        if (elapsed >= totalDuration) {
          // Timer should have completed while away - don't restore active state
          state.isActive = false;
          state.timerStartedAt = null;
          state.pausedTimeRemaining = null;
          // Note: We don't auto-advance to next phase as that could be confusing
        }
      }

      onStateRestore?.(state);
    } catch (error) {
      console.warn('Failed to restore timer state:', error);
      localStorage.removeItem(TIMER_STATE_KEY);
    }
  }, []); // Only run on mount

  // Clear persisted state (useful for manual reset)
  const clearPersistedState = () => {
    try {
      localStorage.removeItem(TIMER_STATE_KEY);
    } catch (error) {
      console.warn('Failed to clear timer state:', error);
    }
  };

  return { clearPersistedState };
}