/**
 * Enhanced localStorage cache management with TTL, versioning, and stale data cleanup
 * Addresses issue #232: Missing localStorage cache invalidation and stale data strategy
 */

import { safeLocalStorage } from './safeLocalStorage';

// Cache configuration
interface CacheConfig {
  version: string;
  defaultTTL: number; // Default time-to-live in milliseconds
  maxSize: number; // Maximum number of cached items
  compressionThreshold: number; // Compress data larger than this size
}

// Cache entry structure
interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time-to-live in milliseconds
  version: string;
  size: number; // Approximate size in bytes
  accessed: number; // Last access timestamp for LRU cleanup
}

// Cache metadata for tracking and cleanup
interface CacheMetadata {
  version: string;
  totalSize: number;
  totalEntries: number;
  lastCleanup: number;
  entries: { [key: string]: { size: number; accessed: number } };
}

// Default configuration
const DEFAULT_CONFIG: CacheConfig = {
  version: '1.0.0',
  defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
  maxSize: 100, // Max 100 cached items
  compressionThreshold: 5000, // 5KB
};

// Cache key prefixes for organization
export const CACHE_KEYS = {
  POMODORO_SETTINGS: 'pomofly:settings',
  SELECTED_TASK_IDS: 'pomofly:selectedTasks',
  GUEST_TASKS: 'pomofly:guestTasks',
  GUEST_PROJECTS: 'pomofly:guestProjects',
  USER_PREFERENCES: 'pomofly:userPrefs',
  TIMER_STATE: 'pomofly:timerState',
  SESSION_DATA: 'pomofly:sessionData',
} as const;

// Metadata key
const CACHE_METADATA_KEY = 'pomofly:cacheMetadata';

class CacheStorage {
  private config: CacheConfig;
  private metadata: CacheMetadata;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metadata = this.loadMetadata();
    
    // Perform version migration and cleanup on initialization
    this.performMaintenance();
  }

  /**
   * Set item in cache with TTL and validation
   */
  setItem<T>(key: string, data: T, ttl?: number): boolean {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.config.defaultTTL,
        version: this.config.version,
        size: this.estimateSize(data),
        accessed: Date.now(),
      };

      // Check if we need to compress large data
      let serializedData = JSON.stringify(entry);
      if (serializedData.length > this.config.compressionThreshold) {
        // Simple compression flag for future enhancement
        console.log(`Large cache entry for ${key}: ${serializedData.length} bytes`);
      }

      // Store the entry
      const success = safeLocalStorage.setItem(key, serializedData);
      
      if (success) {
        // Update metadata
        this.updateMetadata(key, entry.size, entry.accessed);
        
        // Check if cleanup is needed
        this.checkAndCleanup();
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error(`Failed to cache item ${key}:`, error);
      return false;
    }
  }

  /**
   * Get item from cache with freshness validation
   */
  getItem<T>(key: string): T | null {
    try {
      const cachedData = safeLocalStorage.getItem(key);
      
      if (!cachedData) {
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(cachedData);
      const now = Date.now();

      // Check if entry is expired
      if (now - entry.timestamp > entry.ttl) {
        console.log(`Cache entry expired for ${key}`);
        this.removeItem(key);
        return null;
      }

      // Check version compatibility
      if (entry.version !== this.config.version) {
        console.log(`Cache version mismatch for ${key}: ${entry.version} !== ${this.config.version}`);
        this.removeItem(key);
        return null;
      }

      // Update access time for LRU
      entry.accessed = now;
      this.setItem(key, entry.data, entry.ttl);

      return entry.data;
    } catch (error) {
      console.error(`Failed to retrieve cached item ${key}:`, error);
      // Remove corrupted entry
      this.removeItem(key);
      return null;
    }
  }

  /**
   * Remove item from cache
   */
  removeItem(key: string): void {
    try {
      safeLocalStorage.removeItem(key);
      
      // Update metadata
      if (this.metadata.entries[key]) {
        this.metadata.totalSize -= this.metadata.entries[key].size;
        this.metadata.totalEntries -= 1;
        delete this.metadata.entries[key];
        this.saveMetadata();
      }
    } catch (error) {
      console.error(`Failed to remove cached item ${key}:`, error);
    }
  }

  /**
   * Check if item exists and is fresh
   */
  hasItem(key: string): boolean {
    return this.getItem(key) !== null;
  }

  /**
   * Get item freshness info
   */
  getItemInfo(key: string): { age: number; ttl: number; isExpired: boolean } | null {
    try {
      const cachedData = safeLocalStorage.getItem(key);
      
      if (!cachedData) {
        return null;
      }

      const entry: CacheEntry = JSON.parse(cachedData);
      const age = Date.now() - entry.timestamp;
      const isExpired = age > entry.ttl;

      return {
        age,
        ttl: entry.ttl,
        isExpired,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    try {
      // Clear all pomofly cache keys
      Object.values(CACHE_KEYS).forEach(key => {
        safeLocalStorage.removeItem(key);
      });

      // Clear any additional cache entries by scanning localStorage
      this.clearStaleEntries();

      // Reset metadata
      this.metadata = {
        version: this.config.version,
        totalSize: 0,
        totalEntries: 0,
        lastCleanup: Date.now(),
        entries: {},
      };
      this.saveMetadata();

      console.log('Cache cleared successfully');
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Invalidate specific cache patterns
   */
  invalidatePattern(pattern: RegExp): number {
    let invalidated = 0;
    
    try {
      const keys = this.getAllCacheKeys();
      
      keys.forEach(key => {
        if (pattern.test(key)) {
          this.removeItem(key);
          invalidated++;
        }
      });
      
      console.log(`Invalidated ${invalidated} cache entries matching pattern:`, pattern);
    } catch (error) {
      console.error('Failed to invalidate cache pattern:', error);
    }
    
    return invalidated;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    totalEntries: number;
    totalSize: number;
    version: string;
    lastCleanup: Date;
    entries: Array<{ key: string; size: number; age: number; isExpired: boolean }>;
  } {
    const entries: Array<{ key: string; size: number; age: number; isExpired: boolean }> = [];
    const keys = this.getAllCacheKeys();
    
    keys.forEach(key => {
      const info = this.getItemInfo(key);
      if (info) {
        entries.push({
          key,
          size: this.metadata.entries[key]?.size || 0,
          age: info.age,
          isExpired: info.isExpired,
        });
      }
    });

    return {
      totalEntries: this.metadata.totalEntries,
      totalSize: this.metadata.totalSize,
      version: this.metadata.version,
      lastCleanup: new Date(this.metadata.lastCleanup),
      entries: entries.sort((a, b) => b.age - a.age), // Sort by age, newest first
    };
  }

  /**
   * Perform cache maintenance
   */
  private performMaintenance(): void {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;

    // Only run maintenance once per hour
    if (now - this.metadata.lastCleanup < oneHour) {
      return;
    }

    console.log('Performing cache maintenance...');

    // Clear expired entries
    this.clearExpiredEntries();

    // Clear stale entries from previous app versions
    this.clearStaleEntries();

    // Cleanup if cache is too large
    if (this.metadata.totalEntries > this.config.maxSize) {
      this.cleanupLRU();
    }

    // Update last cleanup time
    this.metadata.lastCleanup = now;
    this.saveMetadata();

    console.log('Cache maintenance completed');
  }

  /**
   * Clear expired cache entries
   */
  private clearExpiredEntries(): void {
    const keys = this.getAllCacheKeys();
    let cleaned = 0;

    keys.forEach(key => {
      const info = this.getItemInfo(key);
      if (info?.isExpired) {
        this.removeItem(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  /**
   * Clear stale entries not matching current version
   */
  private clearStaleEntries(): void {
    const keys = this.getAllCacheKeys();
    let cleaned = 0;

    keys.forEach(key => {
      try {
        const cachedData = safeLocalStorage.getItem(key);
        if (cachedData) {
          const entry = JSON.parse(cachedData);
          if (entry.version && entry.version !== this.config.version) {
            this.removeItem(key);
            cleaned++;
          }
        }
      } catch (error) {
        // Remove corrupted entries
        this.removeItem(key);
        cleaned++;
      }
    });

    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} stale cache entries`);
    }
  }

  /**
   * LRU cleanup when cache is too large
   */
  private cleanupLRU(): void {
    const entries = Object.entries(this.metadata.entries)
      .map(([key, meta]) => ({ key, ...meta }))
      .sort((a, b) => a.accessed - b.accessed); // Sort by access time, oldest first

    const toRemove = Math.ceil(this.config.maxSize * 0.2); // Remove 20% of cache
    const removedKeys: string[] = [];

    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.removeItem(entries[i].key);
      removedKeys.push(entries[i].key);
    }

    if (removedKeys.length > 0) {
      console.log(`LRU cleanup removed ${removedKeys.length} cache entries:`, removedKeys);
    }
  }

  /**
   * Load cache metadata
   */
  private loadMetadata(): CacheMetadata {
    try {
      const metadataStr = safeLocalStorage.getItem(CACHE_METADATA_KEY);
      if (metadataStr) {
        const metadata = JSON.parse(metadataStr);
        return {
          version: this.config.version,
          totalSize: metadata.totalSize || 0,
          totalEntries: metadata.totalEntries || 0,
          lastCleanup: metadata.lastCleanup || 0,
          entries: metadata.entries || {},
        };
      }
    } catch (error) {
      console.warn('Failed to load cache metadata, using defaults:', error);
    }

    return {
      version: this.config.version,
      totalSize: 0,
      totalEntries: 0,
      lastCleanup: 0,
      entries: {},
    };
  }

  /**
   * Save cache metadata
   */
  private saveMetadata(): void {
    try {
      safeLocalStorage.setItem(CACHE_METADATA_KEY, JSON.stringify(this.metadata));
    } catch (error) {
      console.error('Failed to save cache metadata:', error);
    }
  }

  /**
   * Update metadata for a cache entry
   */
  private updateMetadata(key: string, size: number, accessed: number): void {
    const existed = !!this.metadata.entries[key];
    const oldSize = existed ? this.metadata.entries[key].size : 0;

    this.metadata.entries[key] = { size, accessed };
    this.metadata.totalSize += (size - oldSize);
    
    if (!existed) {
      this.metadata.totalEntries += 1;
    }

    this.saveMetadata();
  }

  /**
   * Check if cleanup is needed and perform it
   */
  private checkAndCleanup(): void {
    if (this.metadata.totalEntries > this.config.maxSize) {
      console.log('Cache size limit reached, performing cleanup...');
      this.cleanupLRU();
    }
  }

  /**
   * Get all cache keys matching our pattern
   */
  private getAllCacheKeys(): string[] {
    try {
      const keys: string[] = [];
      
      // Get all pomofly cache keys
      Object.values(CACHE_KEYS).forEach(key => {
        if (safeLocalStorage.getItem(key) !== null) {
          keys.push(key);
        }
      });

      return keys;
    } catch (error) {
      console.error('Failed to get cache keys:', error);
      return [];
    }
  }

  /**
   * Estimate size of data in bytes
   */
  private estimateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch (error) {
      // Fallback estimation
      return JSON.stringify(data).length * 2; // Rough estimate: 2 bytes per character
    }
  }
}

// Export singleton instance
export const cacheStorage = new CacheStorage();

// Export utility functions for common operations
export const cacheHelpers = {
  /**
   * Set pomodoro settings with appropriate TTL
   */
  setPomodoroSettings: (settings: any) => 
    cacheStorage.setItem(CACHE_KEYS.POMODORO_SETTINGS, settings, 7 * 24 * 60 * 60 * 1000), // 7 days

  /**
   * Get pomodoro settings
   */
  getPomodoroSettings: () => 
    cacheStorage.getItem(CACHE_KEYS.POMODORO_SETTINGS),

  /**
   * Set selected task IDs with shorter TTL (they change frequently)
   */
  setSelectedTaskIds: (taskIds: string[]) => 
    cacheStorage.setItem(CACHE_KEYS.SELECTED_TASK_IDS, taskIds, 60 * 60 * 1000), // 1 hour

  /**
   * Get selected task IDs
   */
  getSelectedTaskIds: (): string[] => 
    cacheStorage.getItem(CACHE_KEYS.SELECTED_TASK_IDS) || [],

  /**
   * Invalidate task-related cache when tasks change
   */
  invalidateTaskCache: () => 
    cacheStorage.invalidatePattern(/pomofly:(selectedTasks|guestTasks|sessionData)/),

  /**
   * Invalidate user-specific cache on sign out
   */
  invalidateUserCache: () => 
    cacheStorage.invalidatePattern(/pomofly:(userPrefs|sessionData|selectedTasks)/),

  /**
   * Clear all guest data
   */
  clearGuestCache: () => 
    cacheStorage.invalidatePattern(/pomofly:(guestTasks|guestProjects)/),
};