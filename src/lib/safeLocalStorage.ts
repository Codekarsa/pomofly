/**
 * Safe localStorage utility that handles errors gracefully.
 * Prevents crashes in private browsing mode, when storage quota is exceeded,
 * or when localStorage contains corrupted data.
 */
export const safeLocalStorage = {
  /**
   * Safely gets an item from localStorage and parses it as JSON
   * @param key - The localStorage key
   * @param defaultValue - Value to return if retrieval fails or key doesn't exist
   * @returns The parsed value or defaultValue
   */
  getItem: <T>(key: string, defaultValue: T): T => {
    try {
      if (typeof window === 'undefined') {
        return defaultValue;
      }
      
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Failed to get item from localStorage (key: ${key}):`, error);
      return defaultValue;
    }
  },

  /**
   * Safely sets an item in localStorage as JSON
   * @param key - The localStorage key
   * @param value - Value to store (will be JSON.stringified)
   * @returns true if successful, false if it failed
   */
  setItem: (key: string, value: any): boolean => {
    try {
      if (typeof window === 'undefined') {
        return false;
      }
      
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn(`Failed to save to localStorage (key: ${key}):`, error);
      return false;
    }
  },

  /**
   * Safely removes an item from localStorage
   * @param key - The localStorage key
   * @returns true if successful, false if it failed
   */
  removeItem: (key: string): boolean => {
    try {
      if (typeof window === 'undefined') {
        return false;
      }
      
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.warn(`Failed to remove item from localStorage (key: ${key}):`, error);
      return false;
    }
  },

  /**
   * Safely clears localStorage
   * @returns true if successful, false if it failed
   */
  clear: (): boolean => {
    try {
      if (typeof window === 'undefined') {
        return false;
      }
      
      localStorage.clear();
      return true;
    } catch (error) {
      console.warn('Failed to clear localStorage:', error);
      return false;
    }
  }
};