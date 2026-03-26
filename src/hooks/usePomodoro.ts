import { useState, useEffect, useCallback, useRef } from 'react';
import { TimerPersistence, PersistedTimerSession } from '@/lib/timerPersistence';
import { 
  logTimerStarted, 
  logTimerCompleted,
  ActivityTypes,
  activityLogger,
} from '@/lib/activityLogger';
import { auth } from '@/lib/firebase';

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

export function usePomodoro(
  initialSettings: PomodoroSettings, 
  sessionId: string, 
  selectedTaskIds?: string[], 
  onComplete?: () => void
) {
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

  // Use ref for onComplete to prevent dependency changes from resetting timer
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

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

  const handlePhaseComplete = useCallback(async () => {
    const user = auth.currentUser;
    
    // Log timer completion
    if (user && sessionId) {
      try {
        await logTimerCompleted(user.uid, sessionId, selectedTaskIds?.[0], settings[phase] * 60);
        
        // Log specific completion type
        if (phase === 'pomodoro') {
          await activityLogger.log({
            userId: user.uid,
            sessionId,
            activityType: ActivityTypes.TIMER_COMPLETED,
            resourceId: selectedTaskIds?.[0],
            resourceType: 'task',
            metadata: {
              phase,
              duration: settings[phase] * 60,
              totalTaskIds: selectedTaskIds?.length || 0,
              taskIds: selectedTaskIds,
              sessionNumber: sessionsCompleted + 1,
              nextPhase: sessionsCompleted + 1 >= settings.longBreakInterval ? 'longBreak' : 'shortBreak',
            },
            severity: 'info',
          });
        }
      } catch (logError) {
        console.warn('Failed to log timer completion:', logError);
      }
    }
    
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
  }, [phase, sessionsCompleted, settings, sessionId, selectedTaskIds]);

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

  const toggleTimer = useCallback(async () => {
    const user = auth.currentUser;
    
    if (!isActive) {
      // Starting timer
      if (pausedTimeRemaining !== null) {
        // Resuming - calculate new start time based on remaining time
        const elapsedBeforePause = settings[phase] * 60 - pausedTimeRemaining;
        const newStartTime = Date.now() - (elapsedBeforePause * 1000);
        setTimerStartedAt(newStartTime);
        setPausedTimeRemaining(null);
        
        // Log timer resumed
        if (user && sessionId) {
          try {
            await activityLogger.log({
              userId: user.uid,
              sessionId,
              activityType: ActivityTypes.TIMER_RESUMED,
              resourceId: selectedTaskIds?.[0],
              resourceType: 'task',
              metadata: {
                phase,
                totalTaskIds: selectedTaskIds?.length || 0,
                remainingTime: pausedTimeRemaining,
              },
              severity: 'info',
            });
          } catch (logError) {
            console.warn('Failed to log timer resume:', logError);
          }
        }
      } else {
        // Fresh start
        setTimerStartedAt(Date.now());
        
        // Log timer started
        if (user && sessionId) {
          try {
            await logTimerStarted(user.uid, sessionId, selectedTaskIds?.[0], {
              phase,
              duration: settings[phase],
              totalTaskIds: selectedTaskIds?.length || 0,
              taskIds: selectedTaskIds,
            });
          } catch (logError) {
            console.warn('Failed to log timer start:', logError);
          }
        }
      }
    } else {
      // Pausing - save remaining time
      const remaining = getRemainingTime();
      setPausedTimeRemaining(remaining);
      setTimerStartedAt(null);
      
      // Log timer paused
      if (user && sessionId) {
        try {
          await activityLogger.log({
            userId: user.uid,
            sessionId,
            activityType: ActivityTypes.TIMER_PAUSED,
            resourceId: selectedTaskIds?.[0],
            resourceType: 'task',
            metadata: {
              phase,
              remainingTime: remaining,
              totalTaskIds: selectedTaskIds?.length || 0,
            },
            severity: 'info',
          });
        } catch (logError) {
          console.warn('Failed to log timer pause:', logError);
        }
      }
    }
    setIsActive(!isActive);
  }, [isActive, pausedTimeRemaining, settings, phase, getRemainingTime, sessionId, selectedTaskIds]);

  const resetTimer = useCallback(async () => {
    const user = auth.currentUser;
    
    // Log timer reset
    if (user && sessionId) {
      try {
        await activityLogger.log({
          userId: user.uid,
          sessionId,
          activityType: ActivityTypes.TIMER_RESET,
          resourceId: selectedTaskIds?.[0],
          resourceType: 'task',
          metadata: {
            phase,
            wasActive: isActive,
            remainingTime: getRemainingTime(),
            totalTaskIds: selectedTaskIds?.length || 0,
          },
          severity: 'info',
        });
      } catch (logError) {
        console.warn('Failed to log timer reset:', logError);
      }
    }
    
    setIsActive(false);
    setTimerStartedAt(null);
    setPausedTimeRemaining(null);
    setMinutes(settings[phase]);
    setSeconds(0);
  }, [phase, settings, sessionId, selectedTaskIds, isActive, getRemainingTime]);

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
    settings,
    updateSettings,
    // Recovery modal state
    showRecoveryModal,
    persistedSession,
    restoreSession,
    startFresh
  };
}
