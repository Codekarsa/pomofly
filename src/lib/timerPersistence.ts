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