export interface PersistedTimerSession {
  phase: 'pomodoro' | 'shortBreak' | 'longBreak';
  isActive: boolean;
  timerStartedAt: number | null;
  pausedTimeRemaining: number | null;
  sessionsCompleted: number;
  sessionCreatedAt: number;
  lastUpdatedAt: number; // Track when session was last updated
  selectedTaskIds?: string[];
  settings: {
    pomodoro: number;
    shortBreak: number;
    longBreak: number;
    longBreakInterval: number;
  };
  // Add metadata for better recovery validation
  version?: string; // Schema version for future migrations
  browserSessionId?: string; // To detect browser restart scenarios
}

const TIMER_SESSION_KEY = 'pomofly_timer_session';
const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const MAX_PAUSE_DURATION = 2 * 60 * 60 * 1000; // 2 hours - max reasonable pause time
const SESSION_VERSION = '1.1.0';

// Generate a unique browser session ID to detect browser restarts
let browserSessionId: string;
try {
  browserSessionId = sessionStorage.getItem('pomofly_browser_session') || 
    `session_${Date.now()}_${Math.random().toString(36).substring(2)}`;
  sessionStorage.setItem('pomofly_browser_session', browserSessionId);
} catch (e) {
  browserSessionId = `fallback_${Date.now()}`;
}

export class TimerPersistence {
  static saveSession(session: PersistedTimerSession) {
    try {
      const now = Date.now();
      const sessionData = {
        ...session,
        sessionCreatedAt: session.sessionCreatedAt || now,
        lastUpdatedAt: now,
        version: SESSION_VERSION,
        browserSessionId,
      };
      localStorage.setItem(TIMER_SESSION_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.warn('Failed to save timer session:', error);
    }
  }

  static updateSessionTaskIds(selectedTaskIds: string[]) {
    try {
      const session = this.loadSession();
      if (session) {
        const updatedSession = {
          ...session,
          selectedTaskIds
        };
        this.saveSession(updatedSession);
      }
    } catch (error) {
      console.warn('Failed to update session task IDs:', error);
    }
  }

  static loadSession(): PersistedTimerSession | null {
    try {
      const stored = localStorage.getItem(TIMER_SESSION_KEY);
      if (!stored) return null;

      const session = JSON.parse(stored) as PersistedTimerSession;
      const now = Date.now();
      
      // Check if session is too old
      const sessionAge = now - session.sessionCreatedAt;
      if (sessionAge > MAX_SESSION_AGE) {
        console.warn('Timer session expired (age:', sessionAge, 'ms)');
        this.clearSession();
        return null;
      }

      // Check for extremely long pause duration (likely corrupted)
      if (session.isActive && session.timerStartedAt) {
        const activeTime = now - session.timerStartedAt;
        if (activeTime > MAX_PAUSE_DURATION) {
          console.warn('Timer session too old while active, likely corrupted');
          this.clearSession();
          return null;
        }
      }

      // Validate required fields and data integrity
      if (!this.isValidSession(session)) {
        console.warn('Invalid persisted timer session, clearing');
        this.clearSession();
        return null;
      }

      // Check for browser restart scenario
      const isDifferentBrowserSession = session.browserSessionId && 
        session.browserSessionId !== browserSessionId;
      
      // If it's a different browser session and timer was active, 
      // mark it as paused to prevent data loss
      if (isDifferentBrowserSession && session.isActive && session.timerStartedAt) {
        console.info('Different browser session detected, marking timer as paused');
        const remainingTime = this.calculateRemainingTime(session);
        session.isActive = false;
        session.pausedTimeRemaining = remainingTime;
        session.timerStartedAt = null;
      }

      // Validate timestamp sanity (not in future, not too far in past)
      if (session.timerStartedAt) {
        if (session.timerStartedAt > now + 1000 || // Allow 1s clock skew
            session.timerStartedAt < now - MAX_SESSION_AGE) {
          console.warn('Invalid timer start timestamp, clearing session');
          this.clearSession();
          return null;
        }
      }

      // Validate selected task IDs format
      if (session.selectedTaskIds && !Array.isArray(session.selectedTaskIds)) {
        console.warn('Invalid selectedTaskIds format, clearing');
        session.selectedTaskIds = undefined;
      }

      return session;
    } catch (error) {
      console.warn('Failed to load timer session:', error);
      this.clearSession();
      return null;
    }
  }

  static clearSession() {
    try {
      localStorage.removeItem(TIMER_SESSION_KEY);
    } catch (error) {
      console.warn('Failed to clear timer session:', error);
    }
  }

  static isValidSession(session: any): session is PersistedTimerSession {
    try {
      if (!session || typeof session !== 'object') {
        return false;
      }

      // Validate basic required fields
      if (!['pomodoro', 'shortBreak', 'longBreak'].includes(session.phase)) {
        return false;
      }

      if (typeof session.isActive !== 'boolean') {
        return false;
      }

      if (session.timerStartedAt !== null && typeof session.timerStartedAt !== 'number') {
        return false;
      }

      if (session.pausedTimeRemaining !== null && typeof session.pausedTimeRemaining !== 'number') {
        return false;
      }

      if (typeof session.sessionsCompleted !== 'number' || session.sessionsCompleted < 0) {
        return false;
      }

      if (typeof session.sessionCreatedAt !== 'number' || session.sessionCreatedAt <= 0) {
        return false;
      }

      // Validate settings object
      if (!session.settings || typeof session.settings !== 'object') {
        return false;
      }

      const { settings } = session;
      if (typeof settings.pomodoro !== 'number' || settings.pomodoro <= 0 || settings.pomodoro > 120) {
        return false;
      }

      if (typeof settings.shortBreak !== 'number' || settings.shortBreak <= 0 || settings.shortBreak > 60) {
        return false;
      }

      if (typeof settings.longBreak !== 'number' || settings.longBreak <= 0 || settings.longBreak > 120) {
        return false;
      }

      if (typeof settings.longBreakInterval !== 'number' || settings.longBreakInterval <= 0 || settings.longBreakInterval > 20) {
        return false;
      }

      // Validate logical consistency
      if (session.isActive && session.timerStartedAt === null && session.pausedTimeRemaining === null) {
        console.warn('Invalid state: timer active but no start time or pause time');
        return false;
      }

      if (session.pausedTimeRemaining !== null && session.pausedTimeRemaining < 0) {
        console.warn('Invalid pause time: negative value');
        return false;
      }

      if (session.timerStartedAt !== null && session.pausedTimeRemaining !== null) {
        console.warn('Invalid state: both timer started and pause time set');
        return false;
      }

      // Validate selectedTaskIds if present
      if (session.selectedTaskIds !== undefined) {
        if (!Array.isArray(session.selectedTaskIds)) {
          return false;
        }
        // Check that all task IDs are strings
        if (!session.selectedTaskIds.every((id: any) => typeof id === 'string')) {
          return false;
        }
      }

      return true;
    } catch (error) {
      console.warn('Error validating session:', error);
      return false;
    }
  }

  static calculateRemainingTime(session: PersistedTimerSession): number {
    try {
      // If paused, return the saved remaining time
      if (session.pausedTimeRemaining !== null) {
        return Math.max(0, session.pausedTimeRemaining);
      }

      // If not started, return full duration
      if (!session.timerStartedAt) {
        return session.settings[session.phase] * 60;
      }

      const totalDuration = session.settings[session.phase] * 60;
      const now = Date.now();
      
      // Validate timestamp is reasonable
      if (session.timerStartedAt > now + 1000) { // Allow 1s clock skew
        console.warn('Timer start time is in the future, using full duration');
        return totalDuration;
      }

      if (session.timerStartedAt < now - MAX_SESSION_AGE) {
        console.warn('Timer start time is too old, returning 0');
        return 0;
      }

      const elapsed = Math.floor((now - session.timerStartedAt) / 1000);
      
      // Sanity check elapsed time
      if (elapsed < 0) {
        console.warn('Negative elapsed time calculated, using full duration');
        return totalDuration;
      }

      if (elapsed > totalDuration + 60) { // Allow 1 minute buffer
        console.warn('Elapsed time exceeds total duration significantly');
        return 0;
      }

      const remaining = totalDuration - elapsed;
      return Math.max(0, remaining);
    } catch (error) {
      console.warn('Error calculating remaining time:', error);
      return session.settings[session.phase] * 60; // Fallback to full duration
    }
  }

  static hasActiveSession(): boolean {
    const session = this.loadSession();
    return session !== null && session.isActive;
  }

  static getSessionAge(): number | null {
    const session = this.loadSession();
    if (!session) return null;
    return Date.now() - session.sessionCreatedAt;
  }
}