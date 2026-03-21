import { 
  getBrowserTimezone, 
  getTimezoneInfo, 
  UserTimezoneManager,
  convertToUTC,
  convertFromUTC
} from './timezone';

export interface PersistedTimerSession {
  phase: 'pomodoro' | 'shortBreak' | 'longBreak';
  isActive: boolean;
  timerStartedAt: number | null;
  pausedTimeRemaining: number | null;
  sessionsCompleted: number;
  sessionCreatedAt: number;
  selectedTaskIds?: string[];
  settings: {
    pomodoro: number;
    shortBreak: number;
    longBreak: number;
    longBreakInterval: number;
  };
  // Enhanced timezone support
  timezone?: string;
  timezoneOffset?: number; // in minutes
  sessionCreatedAtLocal?: number; // local timestamp for display
}

const TIMER_SESSION_KEY = 'pomofly_timer_session';
const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export class TimerPersistence {
  static saveSession(session: PersistedTimerSession) {
    try {
      const now = Date.now();
      const effectiveTimezone = UserTimezoneManager.getEffectiveTimezone();
      const timezoneInfo = getTimezoneInfo(effectiveTimezone);
      
      const sessionData = {
        ...session,
        sessionCreatedAt: session.sessionCreatedAt || now,
        // Add timezone information
        timezone: effectiveTimezone,
        timezoneOffset: timezoneInfo.offset,
        sessionCreatedAtLocal: session.sessionCreatedAtLocal || now,
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
      
      // Check if session is too old
      const sessionAge = Date.now() - session.sessionCreatedAt;
      if (sessionAge > MAX_SESSION_AGE) {
        this.clearSession();
        return null;
      }

      // Validate required fields
      if (!this.isValidSession(session)) {
        console.warn('Invalid persisted timer session, clearing');
        this.clearSession();
        return null;
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
    return (
      session &&
      typeof session === 'object' &&
      ['pomodoro', 'shortBreak', 'longBreak'].includes(session.phase) &&
      typeof session.isActive === 'boolean' &&
      (session.timerStartedAt === null || typeof session.timerStartedAt === 'number') &&
      (session.pausedTimeRemaining === null || typeof session.pausedTimeRemaining === 'number') &&
      typeof session.sessionsCompleted === 'number' &&
      typeof session.sessionCreatedAt === 'number' &&
      session.settings &&
      typeof session.settings === 'object' &&
      typeof session.settings.pomodoro === 'number' &&
      typeof session.settings.shortBreak === 'number' &&
      typeof session.settings.longBreak === 'number' &&
      typeof session.settings.longBreakInterval === 'number'
    );
  }

  static calculateRemainingTime(session: PersistedTimerSession): number {
    if (session.pausedTimeRemaining !== null) {
      return session.pausedTimeRemaining;
    }

    if (!session.timerStartedAt) {
      return session.settings[session.phase] * 60;
    }

    const totalDuration = session.settings[session.phase] * 60;
    
    // Use UTC timestamps for calculation to avoid timezone issues
    const currentUTC = Date.now();
    const startedAtUTC = session.timerStartedAt;
    
    const elapsed = Math.floor((currentUTC - startedAtUTC) / 1000);
    const remaining = totalDuration - elapsed;

    return Math.max(0, remaining);
  }

  static hasActiveSession(): boolean {
    const session = this.loadSession();
    return session !== null && session.isActive;
  }

  static getSessionAge(): number | null {
    const session = this.loadSession();
    if (!session) return null;
    
    // Calculate age using UTC timestamps to ensure consistency
    return Date.now() - session.sessionCreatedAt;
  }

  /**
   * Get session age in user's local timezone for display purposes
   */
  static getSessionAgeInUserTimezone(): { 
    ageMs: number; 
    createdAtLocal: string; 
    timezone: string;
  } | null {
    const session = this.loadSession();
    if (!session) return null;
    
    const effectiveTimezone = session.timezone || UserTimezoneManager.getEffectiveTimezone();
    const ageMs = Date.now() - session.sessionCreatedAt;
    
    // Convert creation time to user's timezone for display
    const createdAtLocal = convertFromUTC(session.sessionCreatedAt, effectiveTimezone);
    
    return {
      ageMs,
      createdAtLocal: createdAtLocal.toLocaleString(),
      timezone: effectiveTimezone,
    };
  }
}