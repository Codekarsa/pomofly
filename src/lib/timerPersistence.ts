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
  // New fields for edge case handling
  lastHeartbeat: number; // For detecting stale sessions
  sessionId: string; // Unique ID for multiple tab detection
  timeZone: string; // Track timezone for DST handling
  clockSnapshot: number; // System clock reference
  version: number; // Schema version for future migrations
}

const TIMER_SESSION_KEY = 'pomofly_timer_session';
const TIMER_LOCK_KEY = 'pomofly_timer_lock';
const TIMER_HEARTBEAT_KEY = 'pomofly_timer_heartbeat';
const MAX_SESSION_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const HEARTBEAT_INTERVAL = 5 * 1000; // 5 seconds
const MAX_STALE_TIME = 30 * 1000; // 30 seconds
const CURRENT_SCHEMA_VERSION = 1;
const MAX_CLOCK_DRIFT = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

// Recovery failure reasons for debugging
export enum RecoveryFailureReason {
  SESSION_TOO_OLD = 'SESSION_TOO_OLD',
  INVALID_DATA = 'INVALID_DATA',
  CORRUPTED_STORAGE = 'CORRUPTED_STORAGE',
  CLOCK_DRIFT_DETECTED = 'CLOCK_DRIFT_DETECTED',
  TIMEZONE_CHANGE = 'TIMEZONE_CHANGE',
  MULTIPLE_TABS_DETECTED = 'MULTIPLE_TABS_DETECTED',
  SCHEMA_VERSION_MISMATCH = 'SCHEMA_VERSION_MISMATCH',
}

export class TimerPersistence {
  private static currentSessionId: string | null = null;
  private static heartbeatInterval: number | null = null;
  private static cleanupInterval: number | null = null;
  static saveSession(session: Partial<PersistedTimerSession>) {
    try {
      // Generate session ID on first save
      if (!this.currentSessionId) {
        this.currentSessionId = this.generateSessionId();
      }

      // Check for multiple tab conflicts before saving
      if (session.isActive && this.hasMultipleActiveTimers()) {
        console.warn('Multiple active timers detected, refusing to save');
        throw new Error('Multiple active timers detected');
      }

      const sessionData: PersistedTimerSession = {
        ...session,
        sessionCreatedAt: session.sessionCreatedAt || Date.now(),
        lastHeartbeat: Date.now(),
        sessionId: this.currentSessionId,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        clockSnapshot: Date.now(),
        version: CURRENT_SCHEMA_VERSION,
      } as PersistedTimerSession;

      localStorage.setItem(TIMER_SESSION_KEY, JSON.stringify(sessionData));
      
      // Start heartbeat if session is active
      if (session.isActive && !this.heartbeatInterval) {
        this.startHeartbeat();
      } else if (!session.isActive && this.heartbeatInterval) {
        this.stopHeartbeat();
      }

      // Set up cleanup interval
      if (!this.cleanupInterval) {
        this.startCleanup();
      }
    } catch (error) {
      console.warn('Failed to save timer session:', error);
      throw error;
    }
  }

  static updateSessionTaskIds(selectedTaskIds: string[]) {
    try {
      const session = this.loadSession();
      if (session) {
        const updatedSession = {
          ...session,
          selectedTaskIds,
        };
        this.saveSession(updatedSession);
      }
    } catch (error) {
      console.warn('Failed to update session task IDs:', error);
    }
  }

  static loadSession(): { session: PersistedTimerSession | null; failures: RecoveryFailureReason[] } {
    const failures: RecoveryFailureReason[] = [];
    
    try {
      const stored = localStorage.getItem(TIMER_SESSION_KEY);
      if (!stored) {
        return { session: null, failures: [] };
      }

      let session: any;
      try {
        session = JSON.parse(stored);
      } catch (parseError) {
        failures.push(RecoveryFailureReason.CORRUPTED_STORAGE);
        this.clearSession();
        return { session: null, failures };
      }

      // Migrate old schema versions
      session = this.migrateSession(session);
      
      // Validate session age
      const sessionAge = Date.now() - (session.sessionCreatedAt || 0);
      if (sessionAge > MAX_SESSION_AGE) {
        failures.push(RecoveryFailureReason.SESSION_TOO_OLD);
        this.clearSession();
        return { session: null, failures };
      }

      // Validate basic structure
      if (!this.isValidSession(session)) {
        failures.push(RecoveryFailureReason.INVALID_DATA);
        this.clearSession();
        return { session: null, failures };
      }

      // Check for schema version compatibility
      if (session.version && session.version !== CURRENT_SCHEMA_VERSION) {
        failures.push(RecoveryFailureReason.SCHEMA_VERSION_MISMATCH);
        // Don't clear - attempt migration
      }

      // Check for timezone changes (DST detection)
      const currentTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (session.timeZone && session.timeZone !== currentTimeZone) {
        failures.push(RecoveryFailureReason.TIMEZONE_CHANGE);
        console.warn(`Timezone changed from ${session.timeZone} to ${currentTimeZone}`);
      }

      // Detect significant clock drift
      if (session.clockSnapshot) {
        const expectedNow = session.clockSnapshot + sessionAge;
        const actualNow = Date.now();
        const drift = Math.abs(actualNow - expectedNow);
        
        if (drift > MAX_CLOCK_DRIFT) {
          failures.push(RecoveryFailureReason.CLOCK_DRIFT_DETECTED);
          console.warn(`Significant clock drift detected: ${drift}ms`);
        }
      }

      // Check if session is stale (no recent heartbeat)
      if (session.lastHeartbeat) {
        const staleness = Date.now() - session.lastHeartbeat;
        if (session.isActive && staleness > MAX_STALE_TIME) {
          console.warn(`Stale active session detected: ${staleness}ms since last heartbeat`);
          // Convert to paused state to preserve data
          session.isActive = false;
          if (session.timerStartedAt) {
            session.pausedTimeRemaining = this.calculateRemainingTime(session);
            session.timerStartedAt = null;
          }
        }
      }

      // Check for multiple active timers
      if (session.isActive && this.hasMultipleActiveTimers()) {
        failures.push(RecoveryFailureReason.MULTIPLE_TABS_DETECTED);
        session.isActive = false; // Pause this session
        console.warn('Multiple active timers detected, pausing this session');
      }

      return { session, failures };
    } catch (error) {
      console.warn('Failed to load timer session:', error);
      failures.push(RecoveryFailureReason.CORRUPTED_STORAGE);
      this.clearSession();
      return { session: null, failures };
    }
  }

  static clearSession() {
    try {
      localStorage.removeItem(TIMER_SESSION_KEY);
      localStorage.removeItem(TIMER_LOCK_KEY);
      localStorage.removeItem(TIMER_HEARTBEAT_KEY);
      this.stopHeartbeat();
      this.stopCleanup();
    } catch (error) {
      console.warn('Failed to clear timer session:', error);
    }
  }

  private static generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private static startHeartbeat() {
    this.stopHeartbeat(); // Clear any existing interval
    this.heartbeatInterval = window.setInterval(() => {
      try {
        localStorage.setItem(TIMER_HEARTBEAT_KEY, JSON.stringify({
          sessionId: this.currentSessionId,
          timestamp: Date.now(),
        }));
      } catch (error) {
        console.warn('Failed to update heartbeat:', error);
      }
    }, HEARTBEAT_INTERVAL);
  }

  private static stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private static startCleanup() {
    this.stopCleanup(); // Clear any existing interval
    this.cleanupInterval = window.setInterval(() => {
      this.cleanupStaleData();
    }, CLEANUP_INTERVAL);
  }

  private static stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  private static cleanupStaleData() {
    try {
      // Clean up old heartbeats
      const heartbeat = localStorage.getItem(TIMER_HEARTBEAT_KEY);
      if (heartbeat) {
        const data = JSON.parse(heartbeat);
        if (Date.now() - data.timestamp > MAX_STALE_TIME * 2) {
          localStorage.removeItem(TIMER_HEARTBEAT_KEY);
        }
      }

      // Clean up stale sessions
      const { session, failures } = this.loadSession();
      if (session && failures.some(f => 
        f === RecoveryFailureReason.SESSION_TOO_OLD ||
        f === RecoveryFailureReason.CORRUPTED_STORAGE
      )) {
        this.clearSession();
      }
    } catch (error) {
      console.warn('Failed to cleanup stale data:', error);
    }
  }

  private static hasMultipleActiveTimers(): boolean {
    try {
      const heartbeat = localStorage.getItem(TIMER_HEARTBEAT_KEY);
      if (!heartbeat) return false;
      
      const data = JSON.parse(heartbeat);
      const isRecent = Date.now() - data.timestamp < MAX_STALE_TIME;
      const isDifferentSession = data.sessionId !== this.currentSessionId;
      
      return isRecent && isDifferentSession;
    } catch (error) {
      return false;
    }
  }

  private static migrateSession(session: any): any {
    // Handle sessions without version (v0)
    if (!session.version) {
      return {
        ...session,
        lastHeartbeat: Date.now(),
        sessionId: this.generateSessionId(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        clockSnapshot: Date.now(),
        version: CURRENT_SCHEMA_VERSION,
      };
    }
    
    // Add future migration logic here
    return session;
  }

  static isValidSession(session: any): session is PersistedTimerSession {
    return (
      session &&
      typeof session === 'object' &&
      ['pomodoro', 'shortBreak', 'longBreak'].includes(session.phase) &&
      typeof session.isActive === 'boolean' &&
      (session.timerStartedAt === null ||
        typeof session.timerStartedAt === 'number') &&
      (session.pausedTimeRemaining === null ||
        typeof session.pausedTimeRemaining === 'number') &&
      typeof session.sessionsCompleted === 'number' &&
      typeof session.sessionCreatedAt === 'number' &&
      session.settings &&
      typeof session.settings === 'object' &&
      typeof session.settings.pomodoro === 'number' &&
      typeof session.settings.shortBreak === 'number' &&
      typeof session.settings.longBreak === 'number' &&
      typeof session.settings.longBreakInterval === 'number' &&
      // New optional fields (added by migration)
      (session.lastHeartbeat === undefined || 
        typeof session.lastHeartbeat === 'number') &&
      (session.sessionId === undefined || 
        typeof session.sessionId === 'string') &&
      (session.timeZone === undefined || 
        typeof session.timeZone === 'string') &&
      (session.clockSnapshot === undefined || 
        typeof session.clockSnapshot === 'number') &&
      (session.version === undefined || 
        typeof session.version === 'number')
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
    const { session } = this.loadSession();
    return session !== null && session.isActive;
  }

  static getSessionAge(): number | null {
    const { session } = this.loadSession();
    if (!session) return null;
    return Date.now() - session.sessionCreatedAt;
  }

  // New utility methods for enhanced functionality
  static getRecoveryInfo(): { 
    session: PersistedTimerSession | null; 
    failures: RecoveryFailureReason[];
    isRecoverable: boolean;
    recommendStartFresh: boolean;
  } {
    const { session, failures } = this.loadSession();
    
    const criticalFailures = [
      RecoveryFailureReason.CORRUPTED_STORAGE,
      RecoveryFailureReason.INVALID_DATA,
      RecoveryFailureReason.SESSION_TOO_OLD,
    ];
    
    const hasCriticalFailures = failures.some(f => criticalFailures.includes(f));
    const hasClockIssues = failures.some(f => [
      RecoveryFailureReason.CLOCK_DRIFT_DETECTED,
      RecoveryFailureReason.TIMEZONE_CHANGE,
    ].includes(f));
    
    return {
      session,
      failures,
      isRecoverable: session !== null && !hasCriticalFailures,
      recommendStartFresh: hasCriticalFailures || hasClockIssues,
    };
  }

  static forceStartFresh(): void {
    this.clearSession();
    this.currentSessionId = null;
  }

  static getFailureReasonMessage(reason: RecoveryFailureReason): string {
    switch (reason) {
      case RecoveryFailureReason.SESSION_TOO_OLD:
        return 'The session is too old (more than 24 hours)';
      case RecoveryFailureReason.INVALID_DATA:
        return 'The saved session data is invalid or incomplete';
      case RecoveryFailureReason.CORRUPTED_STORAGE:
        return 'The saved session data is corrupted';
      case RecoveryFailureReason.CLOCK_DRIFT_DETECTED:
        return 'System clock changes detected during the session';
      case RecoveryFailureReason.TIMEZONE_CHANGE:
        return 'Timezone or daylight saving time changes detected';
      case RecoveryFailureReason.MULTIPLE_TABS_DETECTED:
        return 'Multiple active timer tabs detected';
      case RecoveryFailureReason.SCHEMA_VERSION_MISMATCH:
        return 'Session format has been updated';
      default:
        return 'Unknown recovery issue';
    }
  }

  // Clean up resources when tab is closed
  static cleanup(): void {
    this.stopHeartbeat();
    this.stopCleanup();
  }

  // Initialize the persistence system (call on app start)
  static initialize(): void {
    // Set up beforeunload to clean up resources
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });
    }
  }
}
