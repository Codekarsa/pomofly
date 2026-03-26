/**
 * Improved Pomodoro Hook using state machine for race condition prevention
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { TimerStateMachine, TimerPhase, TimerContext, TimerConfig } from '@/lib/timerStateMachine';
import { taskSynchronizer } from '@/lib/taskSynchronizer';
import { TimerPersistence, PersistedTimerSession } from '@/lib/timerPersistence';

export interface PomodoroSettings {
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

export interface UsePomodoroReturn {
  // Timer state
  phase: TimerPhase;
  minutes: number;
  seconds: number;
  isActive: boolean;
  
  // Timer controls
  toggleTimer: () => Promise<void>;
  resetTimer: () => Promise<void>;
  switchPhase: (phase: TimerPhase) => Promise<void>;
  
  // Task integration
  selectedTaskIds: string[];
  updateSelectedTasks: (taskIds: string[]) => Promise<void>;
  addTask: (taskId: string) => Promise<void>;
  removeTask: (taskId: string) => Promise<void>;
  
  // Session recovery
  showRecoveryModal: boolean;
  persistedSession: PersistedTimerSession | null;
  restoreSession: (session: PersistedTimerSession) => Promise<void>;
  startFresh: () => Promise<void>;
  
  // Status
  isOperationInProgress: boolean;
  sessionsCompleted: number;
}

export function usePomodoroV2(
  settings: PomodoroSettings,
  onComplete?: (phase: TimerPhase, taskIds: string[]) => Promise<void>
): UsePomodoroReturn {
  // Initialize state machine
  const stateMachineRef = useRef<TimerStateMachine | null>(null);
  const [timerContext, setTimerContext] = useState<TimerContext | null>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [persistedSession, setPersistedSession] = useState<PersistedTimerSession | null>(null);
  const onCompleteRef = useRef(onComplete);

  // Update callback ref
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Initialize state machine
  useEffect(() => {
    if (!stateMachineRef.current) {
      const config: TimerConfig = {
        pomodoro: settings.pomodoro,
        shortBreak: settings.shortBreak,
        longBreak: settings.longBreak,
        longBreakInterval: settings.longBreakInterval
      };

      stateMachineRef.current = new TimerStateMachine(config);
      
      // Subscribe to context changes
      const unsubscribe = stateMachineRef.current.subscribe((context) => {
        setTimerContext(context);
        persistTimerState(context);
      });

      // Set initial context
      setTimerContext(stateMachineRef.current.getContext());

      return unsubscribe;
    }
  }, [settings]);

  // Check for persisted session on mount
  useEffect(() => {
    const session = TimerPersistence.loadSession();
    if (session && stateMachineRef.current) {
      setPersistedSession(session);
      setShowRecoveryModal(true);
    }
  }, []);

  // Update settings when they change
  useEffect(() => {
    if (stateMachineRef.current) {
      stateMachineRef.current.updateConfig(settings);
    }
  }, [settings]);

  // Timer completion handler
  const handleTimerComplete = useCallback(async () => {
    if (!timerContext || !stateMachineRef.current) return;

    const { phase, selectedTaskIds } = timerContext;
    
    try {
      // Handle phase completion in state machine
      await stateMachineRef.current.dispatch({ type: 'COMPLETE' });
      
      // Execute completion callback
      if (onCompleteRef.current) {
        await onCompleteRef.current(phase, selectedTaskIds);
      }
      
      // Handle task operations if in pomodoro phase
      if (phase === 'pomodoro' && selectedTaskIds.length > 0) {
        // Stop tracking for all tasks
        await Promise.all(
          selectedTaskIds.map(taskId =>
            taskSynchronizer.queueOperation({
              taskId,
              operation: 'stop-tracking',
              timestamp: Date.now(),
              metadata: { elapsedSeconds: settings.pomodoro * 60 }
            })
          )
        );
        
        // Increment sessions for all tasks
        await Promise.all(
          selectedTaskIds.map(taskId =>
            taskSynchronizer.queueOperation({
              taskId,
              operation: 'increment-session',
              timestamp: Date.now(),
              metadata: { duration: settings.pomodoro }
            })
          )
        );
      }
    } catch (error) {
      console.error('Timer completion error:', error);
      if (stateMachineRef.current) {
        await stateMachineRef.current.dispatch({ 
          type: 'ERROR', 
          error: 'Completion failed' 
        });
      }
    }
  }, [timerContext, settings.pomodoro]);

  // Auto-complete timer when time runs out
  useEffect(() => {
    if (!timerContext || !stateMachineRef.current) return;
    
    if (timerContext.state === 'running') {
      const remaining = stateMachineRef.current.getRemainingTime();
      
      if (remaining <= 0) {
        handleTimerComplete();
      }
    }
  }, [timerContext, handleTimerComplete]);

  // Display timer update effect
  useEffect(() => {
    if (!timerContext || !stateMachineRef.current) return;
    
    if (timerContext.state === 'running') {
      const interval = setInterval(() => {
        // Force re-render to update display
        setTimerContext(stateMachineRef.current!.getContext());
      }, 100);
      
      return () => clearInterval(interval);
    }
  }, [timerContext?.state]);

  // Persist timer state
  const persistTimerState = useCallback((context: TimerContext) => {
    const session: PersistedTimerSession = {
      phase: context.phase,
      isActive: context.state === 'running',
      timerStartedAt: context.startTime,
      pausedTimeRemaining: context.pausedTime,
      sessionsCompleted: context.sessionsCompleted,
      sessionCreatedAt: Date.now(),
      selectedTaskIds: context.selectedTaskIds,
      settings: settings
    };

    if (context.state !== 'idle' || context.selectedTaskIds.length > 0) {
      TimerPersistence.saveSession(session);
    } else {
      TimerPersistence.clearSession();
    }
  }, [settings]);

  // Timer control functions
  const toggleTimer = useCallback(async () => {
    if (!stateMachineRef.current || !timerContext) return;

    try {
      if (timerContext.state === 'running') {
        await stateMachineRef.current.dispatch({ type: 'PAUSE' });
        
        // Stop tracking for all tasks if in pomodoro phase
        if (timerContext.phase === 'pomodoro' && timerContext.selectedTaskIds.length > 0) {
          const elapsed = stateMachineRef.current.getElapsedTime();
          await Promise.all(
            timerContext.selectedTaskIds.map(taskId =>
              taskSynchronizer.queueOperation({
                taskId,
                operation: 'stop-tracking',
                timestamp: Date.now(),
                metadata: { elapsedSeconds: elapsed }
              })
            )
          );
        }
      } else if (timerContext.state === 'paused') {
        await stateMachineRef.current.dispatch({ type: 'RESUME' });
        
        // Resume tracking for all tasks if in pomodoro phase
        if (timerContext.phase === 'pomodoro' && timerContext.selectedTaskIds.length > 0) {
          await Promise.all(
            timerContext.selectedTaskIds.map(taskId =>
              taskSynchronizer.queueOperation({
                taskId,
                operation: 'start-tracking',
                timestamp: Date.now()
              })
            )
          );
        }
      } else {
        await stateMachineRef.current.dispatch({ type: 'START' });
        
        // Start tracking for all tasks if in pomodoro phase
        if (timerContext.phase === 'pomodoro' && timerContext.selectedTaskIds.length > 0) {
          await Promise.all(
            timerContext.selectedTaskIds.map(taskId =>
              taskSynchronizer.queueOperation({
                taskId,
                operation: 'start-tracking',
                timestamp: Date.now()
              })
            )
          );
        }
      }
    } catch (error) {
      console.error('Timer toggle error:', error);
    }
  }, [timerContext]);

  const resetTimer = useCallback(async () => {
    if (!stateMachineRef.current || !timerContext) return;

    try {
      // Stop tracking for all tasks if in pomodoro phase
      if (timerContext.phase === 'pomodoro' && timerContext.selectedTaskIds.length > 0) {
        const elapsed = stateMachineRef.current.getRemainingTime();
        await Promise.all(
          timerContext.selectedTaskIds.map(taskId =>
            taskSynchronizer.queueOperation({
              taskId,
              operation: 'stop-tracking',
              timestamp: Date.now(),
              metadata: { elapsedSeconds: elapsed }
            })
          )
        );
      }

      await stateMachineRef.current.dispatch({ type: 'RESET' });
    } catch (error) {
      console.error('Timer reset error:', error);
    }
  }, [timerContext]);

  const switchPhase = useCallback(async (phase: TimerPhase) => {
    if (!stateMachineRef.current) return;

    try {
      await stateMachineRef.current.dispatch({ type: 'SWITCH_PHASE', phase });
    } catch (error) {
      console.error('Phase switch error:', error);
    }
  }, []);

  // Task management functions
  const updateSelectedTasks = useCallback(async (taskIds: string[]) => {
    if (!stateMachineRef.current) return;

    try {
      await stateMachineRef.current.dispatch({ 
        type: 'UPDATE_TASKS', 
        taskIds: [...taskIds] 
      });
    } catch (error) {
      console.error('Update tasks error:', error);
    }
  }, []);

  const addTask = useCallback(async (taskId: string) => {
    if (!timerContext) return;

    const newTaskIds = [...timerContext.selectedTaskIds, taskId];
    await updateSelectedTasks(newTaskIds);

    // Start tracking if timer is active and in pomodoro phase
    if (timerContext.state === 'running' && timerContext.phase === 'pomodoro') {
      await taskSynchronizer.queueOperation({
        taskId,
        operation: 'start-tracking',
        timestamp: Date.now()
      });
    }
  }, [timerContext, updateSelectedTasks]);

  const removeTask = useCallback(async (taskId: string) => {
    if (!timerContext) return;

    const newTaskIds = timerContext.selectedTaskIds.filter(id => id !== taskId);
    await updateSelectedTasks(newTaskIds);

    // Stop tracking if timer is active and in pomodoro phase
    if (timerContext.state === 'running' && timerContext.phase === 'pomodoro') {
      const elapsed = stateMachineRef.current?.getElapsedTime() || 0;
      await taskSynchronizer.queueOperation({
        taskId,
        operation: 'stop-tracking',
        timestamp: Date.now(),
        metadata: { elapsedSeconds: elapsed }
      });
    }
  }, [timerContext, updateSelectedTasks]);

  // Recovery functions
  const restoreSession = useCallback(async (session: PersistedTimerSession) => {
    if (!stateMachineRef.current) return;

    try {
      // Update state machine with restored state
      const context = stateMachineRef.current.getContext();
      stateMachineRef.current = new TimerStateMachine(session.settings, {
        phase: session.phase,
        state: session.isActive ? 'running' : (session.pausedTimeRemaining !== null ? 'paused' : 'idle'),
        startTime: session.timerStartedAt,
        pausedTime: session.pausedTimeRemaining,
        duration: session.settings[session.phase] * 60,
        selectedTaskIds: session.selectedTaskIds || [],
        sessionsCompleted: session.sessionsCompleted,
        lastUpdate: Date.now()
      });

      setTimerContext(stateMachineRef.current.getContext());
      setShowRecoveryModal(false);
      setPersistedSession(null);
    } catch (error) {
      console.error('Session restore error:', error);
    }
  }, []);

  const startFresh = useCallback(async () => {
    setShowRecoveryModal(false);
    setPersistedSession(null);
    TimerPersistence.clearSession();
  }, []);

  // Compute display values
  const displayValues = timerContext && stateMachineRef.current ? (() => {
    const remaining = stateMachineRef.current!.getRemainingTime();
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return { minutes, seconds };
  })() : { minutes: settings.pomodoro, seconds: 0 };

  return {
    // Timer state
    phase: timerContext?.phase || 'pomodoro',
    minutes: displayValues.minutes,
    seconds: displayValues.seconds,
    isActive: timerContext?.state === 'running',
    
    // Timer controls
    toggleTimer,
    resetTimer,
    switchPhase,
    
    // Task integration
    selectedTaskIds: timerContext?.selectedTaskIds || [],
    updateSelectedTasks,
    addTask,
    removeTask,
    
    // Session recovery
    showRecoveryModal,
    persistedSession,
    restoreSession,
    startFresh,
    
    // Status
    isOperationInProgress: stateMachineRef.current?.isOperationInProgress() || false,
    sessionsCompleted: timerContext?.sessionsCompleted || 0
  };
}