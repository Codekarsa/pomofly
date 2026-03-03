/**
 * Comprehensive localStorage management with quota handling, 
 * data integrity validation, and error recovery
 */

interface StorageInfo {
  available: boolean;
  quota: number;
  usage: number;
  remaining: number;
}

interface StorageError {
  type: 'quota_exceeded' | 'data_corruption' | 'unavailable' | 'unknown';
  message: string;
  originalError?: Error;
}

interface StorageConfig {
  maxRetries: number;
  cleanupThreshold: number; // Percentage of quota before cleanup
  maxDataAge: number; // Days
  enableCompression: boolean;
  checksumValidation: boolean;
}

const DEFAULT_CONFIG: StorageConfig = {
  maxRetries: 3,
  cleanupThreshold: 0.8, // 80%
  maxDataAge: 90, // 90 days
  enableCompression: true,
  checksumValidation: true,
};

class StorageManager {
  private config: StorageConfig;
  private fallbackStorage: Map<string, string> = new Map();
  private errorCallbacks: ((error: StorageError) => void)[] = [];

  constructor(config: Partial<StorageConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if localStorage is available
   */
  isAvailable(): boolean {
    if (typeof window === 'undefined') return false;
    
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get storage usage information
   */
  async getStorageInfo(): Promise<StorageInfo> {
    const info: StorageInfo = {
      available: this.isAvailable(),
      quota: 0,
      usage: 0,
      remaining: 0,
    };

    if (!info.available) return info;

    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        info.quota = estimate.quota || 0;
        info.usage = estimate.usage || 0;
      } else {
        // Fallback: estimate based on current localStorage usage
        let totalSize = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            totalSize += key.length + (localStorage.getItem(key)?.length || 0);
          }
        }
        info.usage = totalSize * 2; // UTF-16 encoding
        info.quota = 5 * 1024 * 1024; // Assume 5MB default
      }
      
      info.remaining = info.quota - info.usage;
    } catch (error) {
      console.warn('Failed to get storage estimate:', error);
    }

    return info;
  }

  /**
   * Generate checksum for data validation
   */
  private generateChecksum(data: string): string {
    if (!this.config.checksumValidation) return '';
    
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Compress data using simple compression
   */
  private compress(data: string): string {
    if (!this.config.enableCompression) return data;
    
    try {
      // Simple RLE-like compression for JSON data
      return data.replace(/(.)\1+/g, (match, char) => {
        return match.length > 3 ? `${char}${match.length}` : match;
      });
    } catch {
      return data;
    }
  }

  /**
   * Decompress data
   */
  private decompress(data: string): string {
    if (!this.config.enableCompression) return data;
    
    try {
      return data.replace(/(.)\d+/g, (match, char) => {
        const count = parseInt(match.slice(1));
        return count > 0 && count <= 1000 ? char.repeat(count) : match;
      });
    } catch {
      return data;
    }
  }

  /**
   * Create storage entry with metadata
   */
  private createStorageEntry(value: string): string {
    const timestamp = Date.now();
    const checksum = this.generateChecksum(value);
    const compressed = this.compress(value);
    
    const entry = {
      value: compressed,
      timestamp,
      checksum,
      compressed: this.config.enableCompression,
    };
    
    return JSON.stringify(entry);
  }

  /**
   * Parse and validate storage entry
   */
  private parseStorageEntry(data: string): { value: string; isValid: boolean } {
    try {
      const entry = JSON.parse(data);
      
      // Validate structure
      if (!entry || typeof entry !== 'object' || !('value' in entry)) {
        return { value: data, isValid: false }; // Fallback to raw data
      }

      let value = entry.compressed ? this.decompress(entry.value) : entry.value;
      
      // Validate checksum if available
      if (this.config.checksumValidation && entry.checksum) {
        const expectedChecksum = this.generateChecksum(value);
        if (expectedChecksum !== entry.checksum) {
          this.notifyError({
            type: 'data_corruption',
            message: 'Data integrity validation failed',
          });
          return { value: '', isValid: false };
        }
      }

      return { value, isValid: true };
    } catch {
      // Treat as legacy data without metadata
      return { value: data, isValid: false };
    }
  }

  /**
   * Clean up old data based on age and usage
   */
  private async cleanupOldData(): Promise<void> {
    if (!this.isAvailable()) return;

    const storageInfo = await this.getStorageInfo();
    const usageRatio = storageInfo.usage / storageInfo.quota;

    // Only cleanup if approaching quota limit
    if (usageRatio < this.config.cleanupThreshold) return;

    const cutoffDate = Date.now() - (this.config.maxDataAge * 24 * 60 * 60 * 1000);
    const keysToRemove: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      try {
        const data = localStorage.getItem(key);
        if (!data) continue;

        const parsed = JSON.parse(data);
        if (parsed && parsed.timestamp && parsed.timestamp < cutoffDate) {
          keysToRemove.push(key);
        }
      } catch {
        // Skip non-JSON data
        continue;
      }
    }

    // Remove old keys
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.warn(`Failed to remove old storage key: ${key}`, error);
      }
    });

    if (keysToRemove.length > 0) {
      console.log(`Cleaned up ${keysToRemove.length} old storage items`);
    }
  }

  /**
   * Store data with error handling and retries
   */
  async setItem(key: string, value: string): Promise<boolean> {
    for (let attempt = 0; attempt < this.config.maxRetries; attempt++) {
      try {
        if (!this.isAvailable()) {
          // Use fallback storage
          this.fallbackStorage.set(key, value);
          this.notifyError({
            type: 'unavailable',
            message: 'localStorage unavailable, using in-memory fallback',
          });
          return true;
        }

        const entry = this.createStorageEntry(value);
        localStorage.setItem(key, entry);
        return true;
        
      } catch (error) {
        const storageError = error as Error;
        
        if (storageError.name === 'QuotaExceededError') {
          // Try to clean up old data and retry
          if (attempt === 0) {
            await this.cleanupOldData();
            continue;
          }
          
          this.notifyError({
            type: 'quota_exceeded',
            message: 'Storage quota exceeded. Please free up space or sign in to sync data to cloud.',
            originalError: storageError,
          });
          
          // Use fallback storage
          this.fallbackStorage.set(key, value);
          return false;
        }
        
        if (attempt === this.config.maxRetries - 1) {
          this.notifyError({
            type: 'unknown',
            message: `Failed to store data after ${this.config.maxRetries} attempts`,
            originalError: storageError,
          });
          
          // Use fallback storage as last resort
          this.fallbackStorage.set(key, value);
          return false;
        }
      }
    }
    
    return false;
  }

  /**
   * Retrieve data with validation
   */
  getItem(key: string): string | null {
    try {
      if (!this.isAvailable()) {
        return this.fallbackStorage.get(key) || null;
      }

      const data = localStorage.getItem(key);
      if (!data) return null;

      const { value, isValid } = this.parseStorageEntry(data);
      
      if (!isValid) {
        console.warn(`Data integrity issue for key: ${key}`);
      }
      
      return value;
      
    } catch (error) {
      this.notifyError({
        type: 'data_corruption',
        message: `Failed to retrieve data for key: ${key}`,
        originalError: error as Error,
      });
      
      return this.fallbackStorage.get(key) || null;
    }
  }

  /**
   * Remove item
   */
  removeItem(key: string): boolean {
    try {
      if (this.isAvailable()) {
        localStorage.removeItem(key);
      }
      this.fallbackStorage.delete(key);
      return true;
    } catch (error) {
      console.error(`Failed to remove item: ${key}`, error);
      return false;
    }
  }

  /**
   * Clear all data
   */
  clear(): boolean {
    try {
      if (this.isAvailable()) {
        localStorage.clear();
      }
      this.fallbackStorage.clear();
      return true;
    } catch (error) {
      console.error('Failed to clear storage', error);
      return false;
    }
  }

  /**
   * Get all keys
   */
  getKeys(): string[] {
    try {
      if (this.isAvailable()) {
        const keys: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) keys.push(key);
        }
        return keys;
      }
      return Array.from(this.fallbackStorage.keys());
    } catch {
      return Array.from(this.fallbackStorage.keys());
    }
  }

  /**
   * Subscribe to storage errors
   */
  onError(callback: (error: StorageError) => void): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Notify error callbacks
   */
  private notifyError(error: StorageError): void {
    this.errorCallbacks.forEach(callback => {
      try {
        callback(error);
      } catch (err) {
        console.error('Error in storage error callback:', err);
      }
    });
  }

  /**
   * Get fallback data (in-memory storage)
   */
  getFallbackData(): Map<string, string> {
    return new Map(this.fallbackStorage);
  }

  /**
   * Check if currently using fallback storage
   */
  isUsingFallback(key?: string): boolean {
    if (key) {
      return this.fallbackStorage.has(key) && !this.isAvailable();
    }
    return this.fallbackStorage.size > 0 && !this.isAvailable();
  }
}

// Singleton instance
export const storageManager = new StorageManager();

// Export types
export type { StorageError, StorageInfo, StorageConfig };