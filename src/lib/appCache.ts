/**
 * Application-specific cache utilities using LocalStorageCache
 * Provides type-safe caching for Pomofly data with automatic cleanup
 */

import { LocalStorageCache, CacheConfig } from './localStorageCache';

// Cache keys
export const CACHE_KEYS = {
  SELECTED_TASK_IDS: 'pomofly_selected_task_ids',
  POMODORO_SETTINGS: 'pomofly_pomodoro_settings',
  TIMER_SESSION: 'pomofly_timer_session',
  GUEST_TASKS: 'pomofly_guest_tasks',
  GUEST_PROJECTS: 'pomofly_guest_projects',
  GUEST_LABELS: 'pomofly_guest_labels',
  MONITORING_ERRORS: 'pomofly_errors',
  MONITORING_METRICS: 'pomofly_metrics',
  THEME_PREFERENCE: 'pomofly_theme',
  USER_PREFERENCES: 'pomofly_user_preferences',
} as const;

// Cache TTL configurations
export const CACHE_TTL = {
  SELECTED_TASK_IDS: 7 * 24 * 60 * 60 * 1000, // 7 days
  SETTINGS: 30 * 24 * 60 * 60 * 1000, // 30 days
  TIMER_SESSION: 24 * 60 * 60 * 1000, // 24 hours
  GUEST_DATA: 365 * 24 * 60 * 60 * 1000, // 1 year
  MONITORING_DATA: 7 * 24 * 60 * 60 * 1000, // 7 days
  USER_PREFERENCES: 90 * 24 * 60 * 60 * 1000, // 90 days
} as const;

// Type definitions
export interface PomodoroSettings {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
}

export interface UserPreferences {
  soundEnabled: boolean;
  soundVolume: number;
  notificationsEnabled: boolean;
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  showTaskProgress: boolean;
}

// Cache utilities for Selected Task IDs
export class SelectedTaskIdsCache {
  private static readonly KEY = CACHE_KEYS.SELECTED_TASK_IDS;
  private static readonly CONFIG: CacheConfig = {
    ttl: CACHE_TTL.SELECTED_TASK_IDS,
    version: '2.0.0', // Bumped for new validation
    migrate: (oldData: string[], oldVersion: string) => {
      // Migration logic for task IDs
      if (oldVersion === '1.0.0') {
        // Remove any invalid task ID formats from v1
        return Array.isArray(oldData) 
          ? oldData.filter(id => typeof id === 'string' && id.length > 0)
          : [];
      }
      return oldData;
    }
  };

  static get(): string[] {
    const cached = LocalStorageCache.get<string[]>(this.KEY, this.CONFIG);
    return cached ?? [];
  }

  static set(taskIds: string[]): boolean {
    // Validate task IDs before caching
    const validTaskIds = taskIds.filter(id => 
      typeof id === 'string' && 
      id.length > 0 && 
      !id.includes(' ') // Basic validation
    );
    
    return LocalStorageCache.set(this.KEY, validTaskIds, this.CONFIG);
  }

  static clear(): boolean {
    return LocalStorageCache.remove(this.KEY);
  }

  static validateAgainstTasks(availableTaskIds: string[]): string[] {
    const cached = this.get();
    const valid = cached.filter(id => availableTaskIds.includes(id));
    
    if (valid.length !== cached.length) {
      this.set(valid); // Update cache with only valid IDs
    }
    
    return valid;
  }

  static removeDeletedTasks(deletedTaskIds: string[]): boolean {
    const cached = this.get();
    const updated = cached.filter(id => !deletedTaskIds.includes(id));
    
    if (updated.length !== cached.length) {
      return this.set(updated);
    }
    
    return true;
  }
}

// Cache utilities for Pomodoro Settings
export class PomodoroSettingsCache {
  private static readonly KEY = CACHE_KEYS.POMODORO_SETTINGS;
  private static readonly CONFIG: CacheConfig = {
    ttl: CACHE_TTL.SETTINGS,
    version: '1.1.0',
    migrate: (oldData: any, oldVersion: string) => {
      const defaults: PomodoroSettings = {
        pomodoro: 25,
        shortBreak: 5,
        longBreak: 15,
        longBreakInterval: 4
      };

      if (oldVersion === '1.0.0') {
        // Ensure all required fields exist
        return {
          ...defaults,
          ...oldData
        };
      }
      
      return oldData;
    }
  };

  static get(): PomodoroSettings | null {
    return LocalStorageCache.get<PomodoroSettings>(this.KEY, this.CONFIG);
  }

  static set(settings: PomodoroSettings): boolean {
    // Validate settings
    const validated = this.validateSettings(settings);
    return LocalStorageCache.set(this.KEY, validated, this.CONFIG);
  }

  static clear(): boolean {
    return LocalStorageCache.remove(this.KEY);
  }

  private static validateSettings(settings: PomodoroSettings): PomodoroSettings {
    const defaults: PomodoroSettings = {
      pomodoro: 25,
      shortBreak: 5,
      longBreak: 15,
      longBreakInterval: 4
    };

    return {
      pomodoro: Math.max(1, Math.min(60, settings.pomodoro || defaults.pomodoro)),
      shortBreak: Math.max(1, Math.min(30, settings.shortBreak || defaults.shortBreak)),
      longBreak: Math.max(1, Math.min(60, settings.longBreak || defaults.longBreak)),
      longBreakInterval: Math.max(1, Math.min(10, settings.longBreakInterval || defaults.longBreakInterval))
    };
  }
}

// Cache utilities for User Preferences
export class UserPreferencesCache {
  private static readonly KEY = CACHE_KEYS.USER_PREFERENCES;
  private static readonly CONFIG: CacheConfig = {
    ttl: CACHE_TTL.USER_PREFERENCES,
    version: '1.0.0'
  };

  static get(): UserPreferences | null {
    return LocalStorageCache.get<UserPreferences>(this.KEY, this.CONFIG);
  }

  static set(preferences: UserPreferences): boolean {
    return LocalStorageCache.set(this.KEY, preferences, this.CONFIG);
  }

  static clear(): boolean {
    return LocalStorageCache.remove(this.KEY);
  }
}

// Cache utilities for Theme
export class ThemeCache {
  private static readonly KEY = CACHE_KEYS.THEME_PREFERENCE;
  private static readonly CONFIG: CacheConfig = {
    ttl: CACHE_TTL.USER_PREFERENCES,
    version: '1.0.0'
  };

  static get(): 'light' | 'dark' | 'system' | null {
    return LocalStorageCache.get<'light' | 'dark' | 'system'>(this.KEY, this.CONFIG);
  }

  static set(theme: 'light' | 'dark' | 'system'): boolean {
    return LocalStorageCache.set(this.KEY, theme, this.CONFIG);
  }

  static clear(): boolean {
    return LocalStorageCache.remove(this.KEY);
  }
}

// Application-wide cache management
export class AppCacheManager {
  private static cleanupInterval: (() => void) | null = null;

  /**
   * Initialize cache management with periodic cleanup
   */
  static initialize(): void {
    if (typeof window === 'undefined') return;

    // Start periodic cleanup
    this.cleanupInterval = LocalStorageCache.startPeriodicCleanup();

    // Run initial cleanup
    this.performMaintenance();

    // Listen for page visibility changes to clean up when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.performMaintenance();
      }
    });

    console.log('[AppCache] Cache management initialized');
  }

  /**
   * Cleanup expired entries and log stats
   */
  static performMaintenance(): void {
    const cleaned = LocalStorageCache.cleanupExpired();
    const stats = LocalStorageCache.getStats();
    
    if (cleaned > 0) {
      console.log(`[AppCache] Cleaned ${cleaned} expired entries`);
    }

    // Log cache stats in development
    if (process.env.NODE_ENV === 'development') {
      console.log('[AppCache] Stats:', {
        validEntries: stats.validEntries,
        expiredEntries: stats.expiredEntries,
        totalSizeKB: Math.round(stats.totalSize / 1024)
      });
    }
  }

  /**
   * Clear all application cache
   */
  static clearAll(): number {
    return LocalStorageCache.clearAll();
  }

  /**
   * Cleanup when app is destroyed
   */
  static destroy(): void {
    if (this.cleanupInterval) {
      this.cleanupInterval();
      this.cleanupInterval = null;
    }
  }

  /**
   * Invalidate cache when user logs out
   */
  static onUserLogout(): void {
    SelectedTaskIdsCache.clear();
    // Keep settings and preferences for guest mode
  }

  /**
   * Invalidate cache when user logs in
   */
  static onUserLogin(): void {
    SelectedTaskIdsCache.clear(); // Clear guest selections
  }

  /**
   * Handle task deletion - remove from selections
   */
  static onTasksDeleted(deletedTaskIds: string[]): void {
    SelectedTaskIdsCache.removeDeletedTasks(deletedTaskIds);
  }

  /**
   * Validate and clean task-related caches
   */
  static validateTaskRelatedCaches(availableTaskIds: string[]): void {
    SelectedTaskIdsCache.validateAgainstTasks(availableTaskIds);
  }

  /**
   * Get cache statistics for debugging
   */
  static getCacheStats() {
    return LocalStorageCache.getStats();
  }
}

// Legacy localStorage migration
export class LegacyMigration {
  /**
   * Migrate from old localStorage format to new cache system
   */
  static migrateLegacyData(): void {
    if (typeof window === 'undefined') return;

    try {
      // Migrate selectedTaskIds
      const oldSelectedTaskIds = localStorage.getItem('selectedTaskIds');
      if (oldSelectedTaskIds && !LocalStorageCache.has(CACHE_KEYS.SELECTED_TASK_IDS)) {
        const parsed = JSON.parse(oldSelectedTaskIds);
        SelectedTaskIdsCache.set(parsed);
        localStorage.removeItem('selectedTaskIds');
      }

      // Migrate pomodoroSettings
      const oldSettings = localStorage.getItem('pomodoroSettings');
      if (oldSettings && !LocalStorageCache.has(CACHE_KEYS.POMODORO_SETTINGS)) {
        const parsed = JSON.parse(oldSettings);
        PomodoroSettingsCache.set(parsed);
        localStorage.removeItem('pomodoroSettings');
      }

      console.log('[AppCache] Legacy data migration completed');
    } catch (error) {
      console.warn('[AppCache] Legacy migration failed:', error);
    }
  }
}