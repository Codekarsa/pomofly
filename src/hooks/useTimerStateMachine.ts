import { useReducer, useEffect, useRef, useCallback } from 'react';

// Timer State Machine - Prevents race conditions with explicit state management
export type TimerPhase = 'pomodoro' | 'shortBreak' | 'longBreak';
export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

export interface TimerState {
  phase: TimerPhase;
  status: TimerStatus;
  startTime: number | null;
  pausedAt: number | null;
  remainingMs: number;
  totalDurationMs: number;
  sessionsCompleted: number;
  isRecovering: boolean;
  lastTick: number;
}

export type TimerAction = 
  | { type: 'START'; timestamp: number }
  | { type: 'PAUSE'; timestamp: number }
  | { type: 'RESUME'; timestamp: number }
  | { type: 'RESET'; phase?: TimerPhase }
  | { type: 'TICK'; timestamp: number }
  | { type: 'COMPLETE'; timestamp: number }
  | { type: 'SWITCH_PHASE'; phase: TimerPhase; duration: number }
  | { type: 'RESTORE_SESSION'; state: Partial<TimerState> }
  | { type: 'SET_RECOVERING'; isRecovering: boolean };

export interface TimerSettings {
  pomodoro: number; // minutes
  shortBreak: number; // minutes  
  longBreak: number; // minutes
  longBreakInterval: number;
}

// State machine reducer - prevents invalid state transitions
function timerReducer(state: TimerState, action: TimerAction): TimerState {
  switch (action.type) {
    case 'START':
      if (state.status !== 'idle') return state;
      return {
        ...state,
        status: 'running',
        startTime: action.timestamp,
        pausedAt: null,
        lastTick: action.timestamp,
      };

    case 'PAUSE':
      if (state.status !== 'running') return state;
      const elapsedMs = action.timestamp - (state.startTime || action.timestamp);
      return {
        ...state,
        status: 'paused',
        pausedAt: action.timestamp,
        remainingMs: Math.max(0, state.totalDurationMs - elapsedMs),
        lastTick: action.timestamp,
      };

    case 'RESUME':
      if (state.status !== 'paused') return state;
      // Recalculate start time based on remaining time
      const newStartTime = action.timestamp - (state.totalDurationMs - state.remainingMs);
      return {
        ...state,
        status: 'running',
        startTime: newStartTime,
        pausedAt: null,
        lastTick: action.timestamp,
      };

    case 'RESET':
      return {
        ...state,
        status: 'idle',
        startTime: null,
        pausedAt: null,
        phase: action.phase || state.phase,
        remainingMs: state.totalDurationMs,
        lastTick: action.timestamp || Date.now(),
      };

    case 'TICK':
      if (state.status !== 'running') return state;
      
      const elapsed = action.timestamp - (state.startTime || action.timestamp);
      const remaining = Math.max(0, state.totalDurationMs - elapsed);
      
      // Auto-complete when time is up
      if (remaining === 0) {
        return {
          ...state,
          status: 'completed',
          remainingMs: 0,
          lastTick: action.timestamp,
        };
      }

      return {
        ...state,
        remainingMs: remaining,
        lastTick: action.timestamp,
      };

    case 'COMPLETE':
      if (state.status !== 'running' && state.status !== 'completed') return state;
      return {
        ...state,
        status: 'completed',
        remainingMs: 0,
        sessionsCompleted: state.phase === 'pomodoro' ? state.sessionsCompleted + 1 : state.sessionsCompleted,
        lastTick: action.timestamp,
      };

    case 'SWITCH_PHASE':
      return {
        ...state,
        phase: action.phase,
        status: 'idle',
        startTime: null,
        pausedAt: null,
        totalDurationMs: action.duration,
        remainingMs: action.duration,
        lastTick: Date.now(),
      };

    case 'RESTORE_SESSION':
      return {
        ...state,
        ...action.state,
        isRecovering: true,
      };

    case 'SET_RECOVERING':
      return {
        ...state,
        isRecovering: action.isRecovering,
      };

    default:
      return state;
  }
}

export function useTimerStateMachine(settings: TimerSettings, onComplete?: () => void) {
  const initialState: TimerState = {
    phase: 'pomodoro',
    status: 'idle',
    startTime: null,
    pausedAt: null,
    remainingMs: settings.pomodoro * 60 * 1000,
    totalDurationMs: settings.pomodoro * 60 * 1000,
    sessionsCompleted: 0,
    isRecovering: false,
    lastTick: Date.now(),
  };

  const [state, dispatch] = useReducer(timerReducer, initialState);
  const onCompleteRef = useRef(onComplete);
  const tickIntervalRef = useRef<NodeJS.Timeout>();

  // Update callback ref
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Handle phase completion
  useEffect(() => {
    if (state.status === 'completed' && !state.isRecovering) {
      onCompleteRef.current?.();
      
      // Auto-transition to next phase
      setTimeout(() => {
        const nextPhase = getNextPhase(state.phase, state.sessionsCompleted, settings);
        const nextDuration = settings[nextPhase] * 60 * 1000;
        dispatch({ type: 'SWITCH_PHASE', phase: nextPhase, duration: nextDuration });
      }, 100);
    }
  }, [state.status, state.isRecovering, state.phase, state.sessionsCompleted, settings]);

  // Tick interval management
  useEffect(() => {
    if (state.status === 'running') {
      tickIntervalRef.current = setInterval(() => {
        dispatch({ type: 'TICK', timestamp: Date.now() });
      }, 100);
    } else {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = undefined;
      }
    }

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
    };
  }, [state.status]);

  // Update total duration when settings change
  useEffect(() => {
    const newDuration = settings[state.phase] * 60 * 1000;
    if (newDuration !== state.totalDurationMs && state.status === 'idle') {
      dispatch({ type: 'SWITCH_PHASE', phase: state.phase, duration: newDuration });
    }
  }, [settings, state.phase, state.totalDurationMs, state.status]);

  // Timer control functions
  const startTimer = useCallback(() => {
    if (state.status === 'idle') {
      dispatch({ type: 'START', timestamp: Date.now() });
    } else if (state.status === 'paused') {
      dispatch({ type: 'RESUME', timestamp: Date.now() });
    }
  }, [state.status]);

  const pauseTimer = useCallback(() => {
    if (state.status === 'running') {
      dispatch({ type: 'PAUSE', timestamp: Date.now() });
    }
  }, [state.status]);

  const resetTimer = useCallback(() => {
    dispatch({ type: 'RESET', timestamp: Date.now() });
  }, []);

  const switchPhase = useCallback((phase: TimerPhase) => {
    const duration = settings[phase] * 60 * 1000;
    dispatch({ type: 'SWITCH_PHASE', phase, duration });
  }, [settings]);

  const restoreSession = useCallback((sessionState: Partial<TimerState>) => {
    dispatch({ type: 'RESTORE_SESSION', state: sessionState });
  }, []);

  const finishRecovery = useCallback(() => {
    dispatch({ type: 'SET_RECOVERING', isRecovering: false });
  }, []);

  // Display values
  const minutes = Math.floor(state.remainingMs / 60000);
  const seconds = Math.floor((state.remainingMs % 60000) / 1000);
  const isActive = state.status === 'running';
  const isPaused = state.status === 'paused';
  const isCompleted = state.status === 'completed';

  return {
    // State
    phase: state.phase,
    minutes,
    seconds,
    isActive,
    isPaused,
    isCompleted,
    sessionsCompleted: state.sessionsCompleted,
    isRecovering: state.isRecovering,
    remainingMs: state.remainingMs,
    
    // Actions
    startTimer,
    pauseTimer,
    resetTimer,
    switchPhase,
    restoreSession,
    finishRecovery,
    
    // Internal state for persistence
    _internalState: state,
  };
}

function getNextPhase(currentPhase: TimerPhase, sessionsCompleted: number, settings: TimerSettings): TimerPhase {
  if (currentPhase === 'pomodoro') {
    return (sessionsCompleted + 1) % settings.longBreakInterval === 0 ? 'longBreak' : 'shortBreak';
  }
  return 'pomodoro';
}