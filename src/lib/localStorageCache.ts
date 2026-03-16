/**
 * Enhanced localStorage cache management with TTL, versioning, and invalidation
 * Addresses issue #232: localStorage cache invalidation and stale data strategy
 */

export interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
  version: string;
  createdAt: number;
}

export interface CacheConfig {
  ttl?: number; // Time to live in milliseconds
  version?: string; // Schema version for migration
  migrate?: (oldData: any, oldVersion: string) => any; // Migration function
}

export class LocalStorageCache {
  private static readonly DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
  private static readonly CURRENT_VERSION = '1.0.0';
  private static readonly VERSION_KEY = 'pomofly_cache_version';
  private static readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour

  /**
   * Set a cache entry with TTL and versioning
   */
  static set<T>(
    key: string, 
    value: T, 
    config: CacheConfig = {}
  ): boolean {
    if (typeof window === 'undefined') return false;

    try {
      const ttl = config.ttl ?? this.DEFAULT_TTL;
      const version = config.version ?? this.CURRENT_VERSION;
      
      const entry: CacheEntry<T> = {
        value,
        expiresAt: Date.now() + ttl,
        version,
        createdAt: Date.now()
      };

      localStorage.setItem(key, JSON.stringify(entry));
      return true;
    } catch (error) {
      console.warn(`Failed to cache ${key}:`, error);
      return false;
    }
  }

  /**
   * Get a cache entry with expiration and version checking
   */
  static get<T>(
    key: string, 
    config: CacheConfig = {}
  ): T | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const entry: CacheEntry<T> = JSON.parse(stored);

      // Check if expired
      if (Date.now() > entry.expiresAt) {
        this.remove(key);
        return null;
      }

      // Check version compatibility
      const expectedVersion = config.version ?? this.CURRENT_VERSION;
      if (entry.version !== expectedVersion) {
        if (config.migrate && typeof config.migrate === 'function') {
          try {
            const migrated = config.migrate(entry.value, entry.version);
            this.set(key, migrated, config); // Save migrated data
            return migrated;
          } catch (migrationError) {
            console.warn(`Migration failed for ${key}:`, migrationError);
            this.remove(key);
            return null;
          }
        } else {
          // No migration available, remove stale data
          this.remove(key);
          return null;
        }
      }

      return entry.value;
    } catch (error) {
      console.warn(`Failed to read cache ${key}:`, error);
      this.remove(key); // Remove corrupted data
      return null;
    }
  }

  /**
   * Remove a cache entry
   */
  static remove(key: string): boolean {
    if (typeof window === 'undefined') return false;

    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove cache ${key}:`, error);
      return false;
    }
  }

  /**
   * Check if a cache entry exists and is valid
   */
  static has(key: string): boolean {
    return this.get(key) !== null;
  }

  /**
   * Get cache entry metadata without returning the value
   */
  static getMetadata(key: string): Omit<CacheEntry, 'value'> | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;

      const entry: CacheEntry = JSON.parse(stored);
      
      return {
        expiresAt: entry.expiresAt,
        version: entry.version,
        createdAt: entry.createdAt
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Clear all expired entries
   */
  static cleanupExpired(): number {
    if (typeof window === 'undefined') return 0;

    let cleanedCount = 0;
    const now = Date.now();
    const keysToRemove: string[] = [];

    // Find expired keys
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      try {
        const stored = localStorage.getItem(key);
        if (!stored) continue;

        const entry: CacheEntry = JSON.parse(stored);
        if (entry.expiresAt && now > entry.expiresAt) {
          keysToRemove.push(key);
        }
      } catch (error) {
        // If we can't parse it, it's not a cache entry or it's corrupted
        continue;
      }
    }

    // Remove expired keys
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        cleanedCount++;
      } catch (error) {
        console.warn(`Failed to remove expired key ${key}:`, error);
      }
    });

    return cleanedCount;
  }

  /**
   * Clear all cache entries (including non-expired)
   */
  static clearAll(): number {
    if (typeof window === 'undefined') return 0;

    let clearedCount = 0;
    const keysToRemove: string[] = [];

    // Find all cache entries
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      try {
        const stored = localStorage.getItem(key);
        if (!stored) continue;

        const entry: CacheEntry = JSON.parse(stored);
        if (entry.expiresAt && entry.version && entry.createdAt) {
          keysToRemove.push(key);
        }
      } catch (error) {
        continue;
      }
    }

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        clearedCount++;
      } catch (error) {
        console.warn(`Failed to clear key ${key}:`, error);
      }
    });

    return clearedCount;
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    totalEntries: number;
    expiredEntries: number;
    validEntries: number;
    totalSize: number;
    oldestEntry: number | null;
    newestEntry: number | null;
  } {
    if (typeof window === 'undefined') {
      return {
        totalEntries: 0,
        expiredEntries: 0,
        validEntries: 0,
        totalSize: 0,
        oldestEntry: null,
        newestEntry: null
      };
    }

    let totalEntries = 0;
    let expiredEntries = 0;
    let validEntries = 0;
    let totalSize = 0;
    let oldestEntry: number | null = null;
    let newestEntry: number | null = null;

    const now = Date.now();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      try {
        const stored = localStorage.getItem(key);
        if (!stored) continue;

        totalSize += stored.length;

        const entry: CacheEntry = JSON.parse(stored);
        if (entry.expiresAt && entry.version && entry.createdAt) {
          totalEntries++;

          if (now > entry.expiresAt) {
            expiredEntries++;
          } else {
            validEntries++;
          }

          if (oldestEntry === null || entry.createdAt < oldestEntry) {
            oldestEntry = entry.createdAt;
          }
          
          if (newestEntry === null || entry.createdAt > newestEntry) {
            newestEntry = entry.createdAt;
          }
        }
      } catch (error) {
        continue;
      }
    }

    return {
      totalEntries,
      expiredEntries,
      validEntries,
      totalSize,
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Schedule periodic cleanup
   */
  static startPeriodicCleanup(): () => void {
    if (typeof window === 'undefined') return () => {};

    const interval = setInterval(() => {
      const cleaned = this.cleanupExpired();
      if (cleaned > 0) {
        console.log(`[LocalStorageCache] Cleaned up ${cleaned} expired entries`);
      }
    }, this.CLEANUP_INTERVAL);

    return () => clearInterval(interval);
  }

  /**
   * Invalidate entries by pattern or predicate
   */
  static invalidatePattern(
    pattern: string | RegExp | ((key: string, value: any) => boolean)
  ): number {
    if (typeof window === 'undefined') return 0;

    let invalidated = 0;
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      try {
        const stored = localStorage.getItem(key);
        if (!stored) continue;

        const entry: CacheEntry = JSON.parse(stored);
        if (!entry.expiresAt || !entry.version) continue;

        let shouldInvalidate = false;

        if (typeof pattern === 'string') {
          shouldInvalidate = key.includes(pattern);
        } else if (pattern instanceof RegExp) {
          shouldInvalidate = pattern.test(key);
        } else if (typeof pattern === 'function') {
          shouldInvalidate = pattern(key, entry.value);
        }

        if (shouldInvalidate) {
          keysToRemove.push(key);
        }
      } catch (error) {
        continue;
      }
    }

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        invalidated++;
      } catch (error) {
        console.warn(`Failed to invalidate key ${key}:`, error);
      }
    });

    return invalidated;
  }
}