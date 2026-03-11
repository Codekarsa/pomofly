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
}

const TIMER_SESSION_KEY = 'pomofly_timer_session';
const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export class TimerPersistence {
  static saveSession(session: PersistedTimerSession) {
    try {
      const sessionData = {
        ...session,
        sessionCreatedAt: session.sessionCreatedAt || Date.now(),
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

  static isValidSession(session: unknown): session is PersistedTimerSession {
    if (!session || typeof session !== 'object') {
      return false;
    }
    
    const s = session as Record<string, unknown>;
    
    // Check phase
    if (!['pomodoro', 'shortBreak', 'longBreak'].includes(s.phase as string)) {
      return false;
    }
    
    // Check basic properties
    if (typeof s.isActive !== 'boolean') return false;
    if (s.timerStartedAt !== null && typeof s.timerStartedAt !== 'number') return false;
    if (s.pausedTimeRemaining !== null && typeof s.pausedTimeRemaining !== 'number') return false;
    if (typeof s.sessionsCompleted !== 'number') return false;
    if (typeof s.sessionCreatedAt !== 'number') return false;
    
    // Check settings
    if (!s.settings || typeof s.settings !== 'object') return false;
    const settings = s.settings as Record<string, unknown>;
    if (typeof settings.pomodoro !== 'number') return false;
    if (typeof settings.shortBreak !== 'number') return false;
    if (typeof settings.longBreak !== 'number') return false;
    if (typeof settings.longBreakInterval !== 'number') return false;
    
    return true;
  }

  static calculateRemainingTime(session: PersistedTimerSession): number {
    if (session.pausedTimeRemaining !== null) {
      return session.pausedTimeRemaining;
    }

    if (!session.timerStartedAt) {
      return session.settings[session.phase] * 60;
    }

    const totalDuration = session.settings[session.phase] * 60;
    const elapsed = Math.floor((Date.now() - session.timerStartedAt) / 1000);
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
    return Date.now() - session.sessionCreatedAt;
  }
}