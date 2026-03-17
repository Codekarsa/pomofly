import { useState, useEffect, useCallback, useRef } from 'react';
import { TimerPersistence, PersistedTimerSession } from '@/lib/timerPersistence';
import { useTimerAccuracy, timerAccuracy } from '@/lib/timerAccuracy';

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

  // Timer accuracy and drift compensation state
  const [currentAccuracy, setCurrentAccuracy] = useState<number>(100);
  const [currentDrift, setCurrentDrift] = useState<number>(0);
  const [showAccuracyWarning, setShowAccuracyWarning] = useState(false);
  const [driftCompensationEnabled, setDriftCompensationEnabled] = useState(true);

  // Session recovery state
  const [persistedSession, setPersistedSession] = useState<PersistedTimerSession | null>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  // Timer accuracy hooks
  const {
    startMonitoring,
    stopMonitoring,
    measureAndCompensate,
    handleSystemEvent,
    getAccuracyStatus,
    resetAccuracy
  } = useTimerAccuracy();

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

  // Calculate remaining time from timestamp with drift compensation
  const getRemainingTime = useCallback((): { 
    remaining: number; 
    accuracy: number; 
    drift: number; 
    compensated: boolean;
  } => {
    if (pausedTimeRemaining !== null) {
      return {
        remaining: pausedTimeRemaining,
        accuracy: 100,
        drift: 0,
        compensated: false
      };
    }

    if (!timerStartedAt) {
      // Not started - return full duration
      return {
        remaining: settings[phase] * 60,
        accuracy: 100,
        drift: 0,
        compensated: false
      };
    }

    const totalDuration = settings[phase] * 60; // in seconds
    const currentTime = Date.now();
    
    if (driftCompensationEnabled && isActive) {
      // Use drift compensation
      const compensation = measureAndCompensate(
        timerStartedAt,
        totalDuration * 1000,
        currentTime
      );
      
      const compensatedElapsed = Math.floor(compensation.compensatedElapsed / 1000);
      const remaining = totalDuration - compensatedElapsed;
      
      // Update accuracy state
      setCurrentAccuracy(compensation.accuracy);
      setCurrentDrift(compensation.drift);
      setShowAccuracyWarning(compensation.shouldAlert);
      
      return {
        remaining: Math.max(0, remaining),
        accuracy: compensation.accuracy,
        drift: compensation.drift,
        compensated: true
      };
    } else {
      // Standard calculation without compensation
      const elapsed = Math.floor((currentTime - timerStartedAt) / 1000);
      const remaining = totalDuration - elapsed;
      
      return {
        remaining: Math.max(0, remaining),
        accuracy: 100,
        drift: 0,
        compensated: false
      };
    }
  }, [timerStartedAt, pausedTimeRemaining, settings, phase, driftCompensationEnabled, isActive, measureAndCompensate]);

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

  // Timer display update effect - uses timestamp with drift compensation
  useEffect(() => {
    if (!isActive) return;

    const updateDisplay = () => {
      const timeData = getRemainingTime();
      const remaining = timeData.remaining;
      const mins = Math.floor(remaining / 60);
      const secs = remaining % 60;

      setMinutes(mins);
      setSeconds(secs);

      // Update accuracy indicators
      if (timeData.compensated) {
        setCurrentAccuracy(timeData.accuracy);
        setCurrentDrift(timeData.drift);
      }

      if (remaining <= 0) {
        // Stop accuracy monitoring before completing
        const finalMetrics = stopMonitoring();
        console.log('📊 Final timer accuracy metrics:', finalMetrics);
        
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
  }, [isActive, getRemainingTime, handlePhaseComplete, stopMonitoring]);

  const toggleTimer = useCallback(() => {
    if (!isActive) {
      // Starting timer
      const currentTime = Date.now();
      
      if (pausedTimeRemaining !== null) {
        // Resuming - calculate new start time based on remaining time
        const elapsedBeforePause = settings[phase] * 60 - pausedTimeRemaining;
        const newStartTime = currentTime - (elapsedBeforePause * 1000);
        setTimerStartedAt(newStartTime);
        setPausedTimeRemaining(null);
        
        // Resume accuracy monitoring from the adjusted start time
        if (driftCompensationEnabled) {
          startMonitoring(newStartTime);
        }
      } else {
        // Fresh start
        setTimerStartedAt(currentTime);
        
        // Start accuracy monitoring
        if (driftCompensationEnabled) {
          startMonitoring(currentTime);
          console.log('🎯 Timer accuracy monitoring started');
        }
      }
      
      // Handle system event
      handleSystemEvent('focus', {
        startedAt: currentTime,
        remainingTime: pausedTimeRemaining || (settings[phase] * 60),
        isActive: true
      });
      
    } else {
      // Pausing - save remaining time
      const timeData = getRemainingTime();
      setPausedTimeRemaining(timeData.remaining);
      setTimerStartedAt(null);
      
      // Stop accuracy monitoring temporarily
      if (driftCompensationEnabled) {
        const metrics = stopMonitoring();
        console.log('⏸️  Timer paused, accuracy metrics:', metrics);
      }
      
      // Handle system event
      handleSystemEvent('blur', {
        startedAt: 0,
        remainingTime: timeData.remaining,
        isActive: false
      });
    }
    setIsActive(!isActive);
  }, [
    isActive, 
    pausedTimeRemaining, 
    settings, 
    phase, 
    getRemainingTime, 
    driftCompensationEnabled, 
    startMonitoring, 
    stopMonitoring,
    handleSystemEvent
  ]);

  const resetTimer = useCallback(() => {
    // Stop accuracy monitoring if active
    if (isActive && driftCompensationEnabled) {
      stopMonitoring();
    }
    
    setIsActive(false);
    setTimerStartedAt(null);
    setPausedTimeRemaining(null);
    setMinutes(settings[phase]);
    setSeconds(0);
    
    // Reset accuracy indicators
    setCurrentAccuracy(100);
    setCurrentDrift(0);
    setShowAccuracyWarning(false);
  }, [phase, settings, isActive, driftCompensationEnabled, stopMonitoring]);

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
    startFresh,
    // Timer accuracy and drift compensation
    currentAccuracy,
    currentDrift,
    showAccuracyWarning,
    driftCompensationEnabled,
    toggleDriftCompensation: () => setDriftCompensationEnabled(!driftCompensationEnabled),
    getAccuracyStatus,
    resetAccuracy: () => {
      resetAccuracy();
      setCurrentAccuracy(100);
      setCurrentDrift(0);
      setShowAccuracyWarning(false);
    }
  };
}
