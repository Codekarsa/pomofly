/**
 * Safe localStorage wrapper that handles edge cases and provides graceful fallbacks
 * Prevents crashes in private browsing, quota exceeded, and other localStorage issues
 */

interface SafeLocalStorageInterface {
  getItem(key: string): string | null;
  setItem(key: string, value: string): boolean;
  removeItem(key: string): boolean;
  clear(): boolean;
  length(): number;
  key(index: number): string | null;
}

class SafeLocalStorageImpl implements SafeLocalStorageInterface {
  private isAvailable: boolean;
  private fallbackStorage: Map<string, string>;

  constructor() {
    this.fallbackStorage = new Map();
    this.isAvailable = this.checkAvailability();
    
    if (!this.isAvailable) {
      console.warn('localStorage is not available, using in-memory fallback');
    }
  }

  /**
   * Check if localStorage is available and working
   */
  private checkAvailability(): boolean {
    if (typeof window === 'undefined') {
      return false; // Server-side rendering
    }

    try {
      const testKey = '__localStorage_test__';
      const testValue = 'test';
      
      localStorage.setItem(testKey, testValue);
      const retrieved = localStorage.getItem(testKey);
      localStorage.removeItem(testKey);
      
      return retrieved === testValue;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get item from storage
   */
  getItem(key: string): string | null {
    try {
      if (this.isAvailable) {
        return localStorage.getItem(key);
      } else {
        return this.fallbackStorage.get(key) || null;
      }
    } catch (error) {
      console.warn(`Failed to get item "${key}" from localStorage:`, error);
      
      // Try fallback storage
      return this.fallbackStorage.get(key) || null;
    }
  }

  /**
   * Set item in storage
   */
  setItem(key: string, value: string): boolean {
    try {
      if (this.isAvailable) {
        localStorage.setItem(key, value);
        // Also store in fallback in case localStorage becomes unavailable
        this.fallbackStorage.set(key, value);
        return true;
      } else {
        this.fallbackStorage.set(key, value);
        return true;
      }
    } catch (error) {
      console.warn(`Failed to set item "${key}" in localStorage:`, error);
      
      // Handle quota exceeded error
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn('localStorage quota exceeded, attempting cleanup...');
        this.handleQuotaExceeded();
        
        // Try again after cleanup
        try {
          if (this.isAvailable) {
            localStorage.setItem(key, value);
            this.fallbackStorage.set(key, value);
            return true;
          }
        } catch (retryError) {
          console.error('Failed to set item even after cleanup:', retryError);
        }
      }
      
      // Fallback to in-memory storage
      this.fallbackStorage.set(key, value);
      return false;
    }
  }

  /**
   * Remove item from storage
   */
  removeItem(key: string): boolean {
    try {
      if (this.isAvailable) {
        localStorage.removeItem(key);
      }
      this.fallbackStorage.delete(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove item "${key}" from localStorage:`, error);
      this.fallbackStorage.delete(key);
      return false;
    }
  }

  /**
   * Clear all items from storage
   */
  clear(): boolean {
    try {
      if (this.isAvailable) {
        localStorage.clear();
      }
      this.fallbackStorage.clear();
      return true;
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
      this.fallbackStorage.clear();
      return false;
    }
  }

  /**
   * Get number of items in storage
   */
  length(): number {
    try {
      if (this.isAvailable) {
        return localStorage.length;
      } else {
        return this.fallbackStorage.size;
      }
    } catch (error) {
      console.warn('Failed to get localStorage length:', error);
      return this.fallbackStorage.size;
    }
  }

  /**
   * Get key at index
   */
  key(index: number): string | null {
    try {
      if (this.isAvailable) {
        return localStorage.key(index);
      } else {
        const keys = Array.from(this.fallbackStorage.keys());
        return keys[index] || null;
      }
    } catch (error) {
      console.warn(`Failed to get key at index ${index}:`, error);
      const keys = Array.from(this.fallbackStorage.keys());
      return keys[index] || null;
    }
  }

  /**
   * Handle quota exceeded error by removing old items
   */
  private handleQuotaExceeded(): void {
    if (!this.isAvailable) return;

    try {
      console.log('Attempting to free up localStorage space...');
      let removedCount = 0;

      // Remove items that look like they might be old/temporary
      const keysToRemove: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!key) continue;

        // Remove old cache items, analytics data, etc.
        if (
          key.includes('_cache_') ||
          key.includes('_temp_') ||
          key.includes('analytics_') ||
          key.startsWith('debug_') ||
          key.startsWith('log_')
        ) {
          keysToRemove.push(key);
        }
      }

      // Remove identified items
      keysToRemove.forEach(key => {
        try {
          localStorage.removeItem(key);
          removedCount++;
        } catch (error) {
          console.warn(`Failed to remove item during cleanup: ${key}`, error);
        }
      });

      console.log(`Cleaned up ${removedCount} localStorage items to free space`);

      // If still not enough space, remove oldest items
      if (removedCount === 0) {
        this.removeOldestItems(5);
      }
    } catch (error) {
      console.error('Failed to handle quota exceeded error:', error);
    }
  }

  /**
   * Remove oldest items (emergency cleanup)
   */
  private removeOldestItems(count: number): void {
    if (!this.isAvailable) return;

    try {
      const items: { key: string; value: string }[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && !key.startsWith('pomofly:')) { // Preserve app-specific data
          const value = localStorage.getItem(key);
          if (value) {
            items.push({ key, value });
          }
        }
      }

      // Remove items (we can't easily determine age, so remove first N)
      for (let i = 0; i < count && i < items.length; i++) {
        localStorage.removeItem(items[i].key);
      }

      console.log(`Emergency cleanup: removed ${Math.min(count, items.length)} items`);
    } catch (error) {
      console.error('Failed to remove oldest items:', error);
    }
  }

  /**
   * Get storage info for debugging
   */
  getStorageInfo(): {
    isAvailable: boolean;
    localStorageLength: number;
    fallbackStorageSize: number;
    estimatedSize: string;
  } {
    let estimatedSize = '0 KB';
    let localStorageLength = 0;

    try {
      if (this.isAvailable) {
        localStorageLength = localStorage.length;
        
        // Estimate localStorage size
        let totalSize = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            const value = localStorage.getItem(key);
            totalSize += (key.length + (value?.length || 0)) * 2; // 2 bytes per character (UTF-16)
          }
        }
        
        estimatedSize = `${(totalSize / 1024).toFixed(2)} KB`;
      }
    } catch (error) {
      console.warn('Failed to get storage info:', error);
    }

    return {
      isAvailable: this.isAvailable,
      localStorageLength,
      fallbackStorageSize: this.fallbackStorage.size,
      estimatedSize,
    };
  }
}

// Export singleton instance
export const safeLocalStorage = new SafeLocalStorageImpl();

// Export utility functions
export const localStorageUtils = {
  /**
   * Safe JSON parse/stringify with localStorage
   */
  getJSON<T>(key: string, defaultValue: T): T {
    try {
      const value = safeLocalStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (error) {
      console.warn(`Failed to parse JSON from localStorage key "${key}":`, error);
      return defaultValue;
    }
  },

  setJSON<T>(key: string, value: T): boolean {
    try {
      return safeLocalStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to stringify and store JSON to localStorage key "${key}":`, error);
      return false;
    }
  },

  /**
   * Check if localStorage is working
   */
  isWorking(): boolean {
    return safeLocalStorage.getStorageInfo().isAvailable;
  },

  /**
   * Get detailed storage info
   */
  getInfo() {
    return safeLocalStorage.getStorageInfo();
  }
};