import { format, formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import { parseISO, isValid, startOfDay, endOfDay } from 'date-fns';

/**
 * Timezone handling utilities for Pomofly
 * Provides consistent timezone handling across the application
 */

export interface TimezoneInfo {
  timezone: string;
  offset: number; // in minutes
  abbreviation: string;
  isDST: boolean;
}

/**
 * User timezone preferences
 */
export interface UserTimezoneSettings {
  timezone: string;
  autoDetect: boolean;
  lastUpdated: number;
}

/**
 * Get user's browser timezone
 */
export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch (error) {
    console.warn('Failed to detect browser timezone:', error);
    return 'UTC';
  }
}

/**
 * Get current timezone information
 */
export function getTimezoneInfo(timezone: string = getBrowserTimezone()): TimezoneInfo {
  try {
    const date = new Date();
    const formatter = new Intl.DateTimeFormat('en', {
      timeZone: timezone,
      timeZoneName: 'short',
    });
    
    const parts = formatter.formatToParts(date);
    const abbreviation = parts.find(part => part.type === 'timeZoneName')?.value || 'UTC';
    
    // Calculate offset in minutes (negative for timezones ahead of UTC)
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
    const targetTime = new Date(utcTime + (getTimezoneOffsetMinutes(timezone) * 60000));
    const offset = -(targetTime.getTimezoneOffset());
    
    // Check if currently in DST
    const january = new Date(date.getFullYear(), 0, 1);
    const july = new Date(date.getFullYear(), 6, 1);
    const isDST = Math.max(january.getTimezoneOffset(), july.getTimezoneOffset()) !== date.getTimezoneOffset();
    
    return {
      timezone,
      offset,
      abbreviation,
      isDST,
    };
  } catch (error) {
    console.warn('Failed to get timezone info for', timezone, error);
    return {
      timezone: 'UTC',
      offset: 0,
      abbreviation: 'UTC',
      isDST: false,
    };
  }
}

/**
 * Get timezone offset in minutes for a specific timezone
 */
export function getTimezoneOffsetMinutes(timezone: string): number {
  try {
    const date = new Date();
    const utcDate = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' }));
    const targetDate = new Date(date.toLocaleString('en-US', { timeZone: timezone }));
    return (targetDate.getTime() - utcDate.getTime()) / (1000 * 60);
  } catch (error) {
    console.warn('Failed to get timezone offset for', timezone, error);
    return 0;
  }
}

/**
 * Convert a UTC timestamp to user's timezone
 */
export function convertFromUTC(utcTimestamp: number, timezone: string = getBrowserTimezone()): Date {
  try {
    const utcDate = new Date(utcTimestamp);
    return toZonedTime(utcDate, timezone);
  } catch (error) {
    console.warn('Failed to convert from UTC:', error);
    return new Date(utcTimestamp);
  }
}

/**
 * Convert a local time to UTC timestamp
 */
export function convertToUTC(localDate: Date, timezone: string = getBrowserTimezone()): number {
  try {
    const utcDate = fromZonedTime(localDate, timezone);
    return utcDate.getTime();
  } catch (error) {
    console.warn('Failed to convert to UTC:', error);
    return localDate.getTime();
  }
}

/**
 * Format a timestamp in user's timezone
 */
export function formatInUserTimezone(
  timestamp: number,
  formatString: string = 'yyyy-MM-dd HH:mm:ss',
  timezone: string = getBrowserTimezone()
): string {
  try {
    return formatInTimeZone(new Date(timestamp), timezone, formatString);
  } catch (error) {
    console.warn('Failed to format timestamp in timezone:', error);
    return format(new Date(timestamp), formatString);
  }
}

/**
 * Get start and end of day in user's timezone, returned as UTC timestamps
 */
export function getDayBoundariesInTimezone(
  date: Date = new Date(),
  timezone: string = getBrowserTimezone()
): { start: number; end: number } {
  try {
    const zonedDate = toZonedTime(date, timezone);
    const startOfDayLocal = startOfDay(zonedDate);
    const endOfDayLocal = endOfDay(zonedDate);
    
    return {
      start: convertToUTC(startOfDayLocal, timezone),
      end: convertToUTC(endOfDayLocal, timezone),
    };
  } catch (error) {
    console.warn('Failed to get day boundaries in timezone:', error);
    const start = startOfDay(date);
    const end = endOfDay(date);
    return {
      start: start.getTime(),
      end: end.getTime(),
    };
  }
}

/**
 * User timezone settings management
 */
const TIMEZONE_SETTINGS_KEY = 'pomofly_timezone_settings';

export class UserTimezoneManager {
  /**
   * Get user's timezone settings
   */
  static getSettings(): UserTimezoneSettings {
    try {
      const stored = localStorage.getItem(TIMEZONE_SETTINGS_KEY);
      if (stored) {
        const settings = JSON.parse(stored) as UserTimezoneSettings;
        return {
          timezone: settings.timezone || getBrowserTimezone(),
          autoDetect: settings.autoDetect !== false, // default to true
          lastUpdated: settings.lastUpdated || Date.now(),
        };
      }
    } catch (error) {
      console.warn('Failed to load timezone settings:', error);
    }

    // Return default settings
    return {
      timezone: getBrowserTimezone(),
      autoDetect: true,
      lastUpdated: Date.now(),
    };
  }

  /**
   * Save user's timezone settings
   */
  static saveSettings(settings: UserTimezoneSettings): void {
    try {
      const settingsToSave = {
        ...settings,
        lastUpdated: Date.now(),
      };
      localStorage.setItem(TIMEZONE_SETTINGS_KEY, JSON.stringify(settingsToSave));
    } catch (error) {
      console.warn('Failed to save timezone settings:', error);
    }
  }

  /**
   * Update user's timezone (e.g., when they manually select one)
   */
  static setTimezone(timezone: string): void {
    const currentSettings = this.getSettings();
    this.saveSettings({
      ...currentSettings,
      timezone,
      autoDetect: false, // User explicitly chose a timezone
    });
  }

  /**
   * Enable auto-detection and update to browser timezone
   */
  static enableAutoDetection(): void {
    const browserTimezone = getBrowserTimezone();
    this.saveSettings({
      timezone: browserTimezone,
      autoDetect: true,
      lastUpdated: Date.now(),
    });
  }

  /**
   * Check if timezone has changed and update if auto-detection is enabled
   */
  static checkAndUpdateTimezone(): boolean {
    const settings = this.getSettings();
    if (!settings.autoDetect) {
      return false;
    }

    const currentBrowserTimezone = getBrowserTimezone();
    if (currentBrowserTimezone !== settings.timezone) {
      this.saveSettings({
        ...settings,
        timezone: currentBrowserTimezone,
      });
      return true;
    }

    return false;
  }

  /**
   * Get the effective timezone to use (user's setting or browser default)
   */
  static getEffectiveTimezone(): string {
    const settings = this.getSettings();
    return settings.timezone;
  }
}

/**
 * Common timezone list for user selection
 */
export const COMMON_TIMEZONES = [
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'London (GMT/BST)' },
  { value: 'Europe/Paris', label: 'Central Europe (CET/CEST)' },
  { value: 'Europe/Moscow', label: 'Moscow Time (MSK)' },
  { value: 'Asia/Dubai', label: 'Gulf Time (GST)' },
  { value: 'Asia/Kolkata', label: 'India Time (IST)' },
  { value: 'Asia/Shanghai', label: 'China Time (CST)' },
  { value: 'Asia/Tokyo', label: 'Japan Time (JST)' },
  { value: 'Australia/Sydney', label: 'Australian Eastern Time' },
  { value: 'Pacific/Auckland', label: 'New Zealand Time' },
];

/**
 * Get all available timezones for selection
 */
export function getAllTimezones(): Array<{ value: string; label: string }> {
  try {
    // Get all supported timezones from Intl
    const timezones = Intl.supportedValuesOf('timeZone');
    return timezones.map(tz => ({
      value: tz,
      label: tz.replace('_', ' '),
    }));
  } catch (error) {
    console.warn('Failed to get all timezones:', error);
    return COMMON_TIMEZONES;
  }
}

/**
 * Validate timezone string
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: timezone });
    return true;
  } catch (error) {
    return false;
  }
}