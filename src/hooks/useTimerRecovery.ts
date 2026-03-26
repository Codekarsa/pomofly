import { useState, useEffect, useCallback, useRef } from 'react';
import { TimerState } from './useTimerStateMachine';
import { TimerSettings } from './useTimerStateMachine';

interface TimerSession {
  id: string;
  tabId: string;
  lastHeartbeat: number;
  timerState: TimerState;
  settings: TimerSettings;
  selectedTaskIds: string[];
}

interface RecoveryOptions {
  continueSession: boolean;
  restoreState: boolean;
  clearSession: boolean;
}

const STORAGE_KEY = 'pomofly_timer_sessions';
const HEARTBEAT_INTERVAL = 5000; // 5 seconds
const SESSION_TIMEOUT = 30000; // 30 seconds
const RECOVERY_MODAL_DELAY = 2000; // 2 seconds

export function useTimerRecovery(
  timerState: TimerState,
  settings: TimerSettings,
  selectedTaskIds: string[],
  onRestoreSession: (state: Partial<TimerState>) => void
) {
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [availableSession, setAvailableSession] = useState<TimerSession | null>(null);
  const [tabId] = useState(() => `tab_${Date.now()}_${Math.random()}`);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout>();
  const recoveryTimeoutRef = useRef<NodeJS.Timeout>();

  // Generate unique session ID
  const sessionId = useRef(`session_${Date.now()}_${Math.random()}`);

  // Get all sessions from localStorage
  const getSessions = useCallback((): TimerSession[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.warn('Failed to load timer sessions:', error);
      return [];
    }
  }, []);

  // Save sessions to localStorage
  const saveSessions = useCallback((sessions: TimerSession[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    } catch (error) {
      console.warn('Failed to save timer sessions:', error);
    }
  }, []);

  // Cleanup expired sessions
  const cleanupExpiredSessions = useCallback(() => {
    const now = Date.now();
    const sessions = getSessions();
    const activeSessions = sessions.filter(
      session => now - session.lastHeartbeat < SESSION_TIMEOUT
    );
    
    if (activeSessions.length !== sessions.length) {
      saveSessions(activeSessions);
    }
    
    return activeSessions;
  }, [getSessions, saveSessions]);

  // Update current session in storage
  const updateCurrentSession = useCallback(() => {
    const sessions = cleanupExpiredSessions();
    const now = Date.now();
    
    const currentSession: TimerSession = {
      id: sessionId.current,
      tabId,
      lastHeartbeat: now,
      timerState,
      settings,
      selectedTaskIds,
    };

    // Remove old session from this tab and add updated one
    const otherSessions = sessions.filter(s => s.tabId !== tabId);
    const updatedSessions = [...otherSessions, currentSession];
    
    saveSessions(updatedSessions);
  }, [cleanupExpiredSessions, tabId, timerState, settings, selectedTaskIds]);

  // Check for recoverable sessions from other tabs
  const checkForRecoverableSession = useCallback(() => {
    const sessions = cleanupExpiredSessions();
    const otherSessions = sessions.filter(s => s.tabId !== tabId);
    
    // Find the most recent active session from another tab
    const recoverableSession = otherSessions
      .filter(s => s.timerState.status === 'running' || s.timerState.status === 'paused')
      .sort((a, b) => b.lastHeartbeat - a.lastHeartbeat)[0];
    
    return recoverableSession || null;
  }, [cleanupExpiredSessions, tabId]);

  // Handle session recovery
  const handleRecovery = useCallback((options: RecoveryOptions) => {
    if (options.continueSession && availableSession) {
      // Restore the session state
      const stateToRestore: Partial<TimerState> = {
        phase: availableSession.timerState.phase,
        status: availableSession.timerState.status,
        startTime: availableSession.timerState.startTime,
        pausedAt: availableSession.timerState.pausedAt,
        remainingMs: calculateRemainingTime(availableSession),
        totalDurationMs: availableSession.timerState.totalDurationMs,
        sessionsCompleted: availableSession.timerState.sessionsCompleted,
      };
      
      onRestoreSession(stateToRestore);
      
      // Remove the old session since we're taking it over
      const sessions = getSessions();
      const updatedSessions = sessions.filter(s => s.id !== availableSession.id);
      saveSessions(updatedSessions);
    } else if (options.clearSession) {
      // Clear all sessions and start fresh
      const sessions = getSessions();
      const updatedSessions = sessions.filter(s => s.tabId !== tabId);
      saveSessions(updatedSessions);
    }
    
    setShowRecoveryModal(false);
    setAvailableSession(null);
  }, [availableSession, onRestoreSession, getSessions, saveSessions, tabId]);

  // Calculate remaining time for a session accounting for elapsed time
  const calculateRemainingTime = useCallback((session: TimerSession): number => {
    const state = session.timerState;
    
    if (state.pausedAt !== null) {
      return state.remainingMs;
    }
    
    if (state.startTime === null) {
      return state.totalDurationMs;
    }
    
    const elapsed = Date.now() - state.startTime;
    const remaining = state.totalDurationMs - elapsed;
    
    return Math.max(0, remaining);
  }, []);

  // Start heartbeat to maintain session presence
  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    heartbeatIntervalRef.current = setInterval(() => {
      updateCurrentSession();
    }, HEARTBEAT_INTERVAL);
    
    // Initial update
    updateCurrentSession();
  }, [updateCurrentSession]);

  // Stop heartbeat
  const stopHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = undefined;
    }
  }, []);

  // Initialize recovery system
  useEffect(() => {
    const initRecovery = () => {
      // Check for existing recoverable session
      const recoverableSession = checkForRecoverableSession();
      
      if (recoverableSession) {
        setAvailableSession(recoverableSession);
        
        // Delay showing modal to avoid UI flash on quick tab switches
        recoveryTimeoutRef.current = setTimeout(() => {
          setShowRecoveryModal(true);
        }, RECOVERY_MODAL_DELAY);
      }
      
      // Start heartbeat for this session
      startHeartbeat();
    };

    initRecovery();

    // Cleanup on unmount
    return () => {
      stopHeartbeat();
      if (recoveryTimeoutRef.current) {
        clearTimeout(recoveryTimeoutRef.current);
      }
    };
  }, [checkForRecoverableSession, startHeartbeat, stopHeartbeat]);

  // Update session when timer state changes
  useEffect(() => {
    updateCurrentSession();
  }, [updateCurrentSession]);

  // Handle visibility change (tab focus/blur)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Tab became visible - check for conflicts
        const recoverableSession = checkForRecoverableSession();
        
        if (recoverableSession && !showRecoveryModal) {
          setAvailableSession(recoverableSession);
          setShowRecoveryModal(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [checkForRecoverableSession, showRecoveryModal]);

  // Storage event listener for cross-tab communication
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && !showRecoveryModal) {
        // Another tab updated sessions - check for conflicts
        const recoverableSession = checkForRecoverableSession();
        
        if (recoverableSession) {
          setAvailableSession(recoverableSession);
          setShowRecoveryModal(true);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [checkForRecoverableSession, showRecoveryModal]);

  // Force cleanup on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Remove this session from storage
      const sessions = getSessions();
      const updatedSessions = sessions.filter(s => s.tabId !== tabId);
      saveSessions(updatedSessions);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [getSessions, saveSessions, tabId]);

  return {
    showRecoveryModal,
    availableSession,
    handleRecovery,
    remainingTimeMs: availableSession ? calculateRemainingTime(availableSession) : 0,
    
    // Utilities
    getActiveSessions: () => cleanupExpiredSessions().filter(s => s.tabId !== tabId),
    clearAllSessions: () => saveSessions([]),
  };
}