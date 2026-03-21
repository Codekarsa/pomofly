import { 
  UserTimezoneManager,
  getDayBoundariesInTimezone,
  convertToUTC,
  convertFromUTC,
  formatInUserTimezone,
  getBrowserTimezone
} from './timezone';

/**
 * Session completion data with timezone information
 */
export interface TimezoneAwareSession {
  id: string;
  completedAtUTC: number; // Always store in UTC
  completedAtLocal: number; // Local timestamp for display
  timezone: string;
  timezoneOffset: number;
  phase: 'pomodoro' | 'shortBreak' | 'longBreak';
  duration: number; // in seconds
  taskIds?: string[];
  userId?: string;
}

/**
 * Daily session aggregation with timezone awareness
 */
export interface DailySessionSummary {
  date: string; // YYYY-MM-DD in user's timezone
  timezone: string;
  sessions: TimezoneAwareSession[];
  totalPomodoros: number;
  totalTime: number; // in seconds
  dayStartUTC: number;
  dayEndUTC: number;
}

/**
 * Manager for timezone-aware session tracking and analytics
 */
export class TimezoneAwareSessionManager {
  private static readonly SESSION_STORAGE_KEY = 'pomofly_completed_sessions';
  private static readonly MAX_STORED_SESSIONS = 1000; // Keep last 1000 sessions

  /**
   * Record a completed session with timezone information
   */
  static recordSession(
    phase: 'pomodoro' | 'shortBreak' | 'longBreak',
    duration: number,
    taskIds?: string[],
    userId?: string
  ): TimezoneAwareSession {
    const timezone = UserTimezoneManager.getEffectiveTimezone();
    const now = Date.now();
    
    const session: TimezoneAwareSession = {
      id: `session_${now}_${Math.random().toString(36).substr(2, 9)}`,
      completedAtUTC: now,
      completedAtLocal: convertFromUTC(now, timezone).getTime(),
      timezone,
      timezoneOffset: this.getCurrentTimezoneOffset(timezone),
      phase,
      duration,
      taskIds: taskIds || [],
      userId,
    };

    // Store session locally
    this.storeSessionLocally(session);

    return session;
  }

  /**
   * Get sessions for a specific date in user's timezone
   */
  static getSessionsForDate(
    date: Date,
    timezone: string = UserTimezoneManager.getEffectiveTimezone()
  ): TimezoneAwareSession[] {
    const sessions = this.loadStoredSessions();
    const { start, end } = getDayBoundariesInTimezone(date, timezone);

    return sessions.filter(session => 
      session.completedAtUTC >= start && session.completedAtUTC <= end
    );
  }

  /**
   * Get daily summary for a specific date
   */
  static getDailySummary(
    date: Date,
    timezone: string = UserTimezoneManager.getEffectiveTimezone()
  ): DailySessionSummary {
    const sessions = this.getSessionsForDate(date, timezone);
    const { start, end } = getDayBoundariesInTimezone(date, timezone);

    const totalPomodoros = sessions.filter(s => s.phase === 'pomodoro').length;
    const totalTime = sessions.reduce((sum, s) => sum + s.duration, 0);

    return {
      date: formatInUserTimezone(date.getTime(), 'yyyy-MM-dd', timezone),
      timezone,
      sessions,
      totalPomodoros,
      totalTime,
      dayStartUTC: start,
      dayEndUTC: end,
    };
  }

  /**
   * Get weekly summary (last 7 days)
   */
  static getWeeklySummary(
    endDate: Date = new Date(),
    timezone: string = UserTimezoneManager.getEffectiveTimezone()
  ): DailySessionSummary[] {
    const summaries: DailySessionSummary[] = [];
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(endDate);
      date.setDate(date.getDate() - i);
      summaries.push(this.getDailySummary(date, timezone));
    }

    return summaries;
  }

  /**
   * Get current streak (consecutive days with completed pomodoros)
   */
  static getCurrentStreak(
    timezone: string = UserTimezoneManager.getEffectiveTimezone()
  ): number {
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) { // Check up to 1 year back
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      
      const summary = this.getDailySummary(checkDate, timezone);
      
      if (summary.totalPomodoros > 0) {
        streak++;
      } else {
        // If this is today and we haven't completed any pomodoros yet,
        // don't break the streak
        if (i === 0 && this.isToday(checkDate, timezone)) {
          continue;
        }
        break;
      }
    }

    return streak;
  }

  /**
   * Migrate existing session data to timezone-aware format
   */
  static migrateExistingSessions(
    existingSessions: Array<{ date: string; [key: string]: any }>,
    defaultTimezone: string = getBrowserTimezone()
  ): TimezoneAwareSession[] {
    return existingSessions.map((session, index) => {
      // Try to parse existing date format
      let completedAt: Date;
      
      if (session.date) {
        completedAt = new Date(session.date);
      } else if (session.completedAt) {
        completedAt = new Date(session.completedAt);
      } else {
        // Fallback to a reasonable default (spread sessions over the past days)
        completedAt = new Date(Date.now() - (index * 24 * 60 * 60 * 1000));
      }

      if (isNaN(completedAt.getTime())) {
        completedAt = new Date(Date.now() - (index * 24 * 60 * 60 * 1000));
      }

      const completedAtUTC = convertToUTC(completedAt, defaultTimezone);

      return {
        id: session.id || `migrated_${completedAtUTC}_${index}`,
        completedAtUTC,
        completedAtLocal: completedAt.getTime(),
        timezone: defaultTimezone,
        timezoneOffset: this.getCurrentTimezoneOffset(defaultTimezone),
        phase: session.phase || 'pomodoro',
        duration: session.duration || 25 * 60, // Default 25 minutes
        taskIds: session.taskIds || [],
        userId: session.userId,
      };
    });
  }

  /**
   * Private helper methods
   */
  private static storeSessionLocally(session: TimezoneAwareSession): void {
    try {
      const sessions = this.loadStoredSessions();
      sessions.push(session);

      // Keep only the most recent sessions
      sessions.sort((a, b) => b.completedAtUTC - a.completedAtUTC);
      const trimmedSessions = sessions.slice(0, this.MAX_STORED_SESSIONS);

      localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(trimmedSessions));
    } catch (error) {
      console.warn('Failed to store session locally:', error);
    }
  }

  private static loadStoredSessions(): TimezoneAwareSession[] {
    try {
      const stored = localStorage.getItem(this.SESSION_STORAGE_KEY);
      if (!stored) return [];

      const sessions = JSON.parse(stored) as TimezoneAwareSession[];
      
      // Validate and filter out invalid sessions
      return sessions.filter(this.isValidSession);
    } catch (error) {
      console.warn('Failed to load stored sessions:', error);
      return [];
    }
  }

  private static isValidSession(session: any): session is TimezoneAwareSession {
    return (
      session &&
      typeof session === 'object' &&
      typeof session.id === 'string' &&
      typeof session.completedAtUTC === 'number' &&
      typeof session.timezone === 'string' &&
      ['pomodoro', 'shortBreak', 'longBreak'].includes(session.phase) &&
      typeof session.duration === 'number' &&
      session.duration > 0
    );
  }

  private static getCurrentTimezoneOffset(timezone: string): number {
    try {
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const targetTime = new Date(utcTime);
      
      // Get the local time in the target timezone
      const localTime = new Date(targetTime.toLocaleString('en-US', { timeZone: timezone }));
      
      return (localTime.getTime() - utcTime) / (1000 * 60);
    } catch (error) {
      console.warn('Failed to get timezone offset:', error);
      return 0;
    }
  }

  private static isToday(date: Date, timezone: string): boolean {
    const today = new Date();
    const todayStr = formatInUserTimezone(today.getTime(), 'yyyy-MM-dd', timezone);
    const dateStr = formatInUserTimezone(date.getTime(), 'yyyy-MM-dd', timezone);
    return todayStr === dateStr;
  }

  /**
   * Clear all stored sessions (for testing or reset purposes)
   */
  static clearStoredSessions(): void {
    try {
      localStorage.removeItem(this.SESSION_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear stored sessions:', error);
    }
  }

  /**
   * Export sessions for backup or analysis
   */
  static exportSessions(): TimezoneAwareSession[] {
    return this.loadStoredSessions();
  }

  /**
   * Import sessions from backup
   */
  static importSessions(sessions: TimezoneAwareSession[]): void {
    try {
      const validSessions = sessions.filter(this.isValidSession);
      localStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(validSessions));
    } catch (error) {
      console.warn('Failed to import sessions:', error);
    }
  }
}