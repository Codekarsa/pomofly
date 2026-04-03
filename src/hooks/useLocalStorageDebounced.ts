import { useCallback, useEffect, useRef } from 'react';
import { debounce } from 'lodash';

/**
 * Custom hook for debounced localStorage operations
 * Prevents excessive writes and improves performance
 */
export function useLocalStorageDebounced<T>(
  key: string,
  value: T,
  delay: number = 500
): void {
  const debouncedWrite = useRef(
    debounce((key: string, value: T) => {
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Failed to write to localStorage key "${key}":`, error);
      }
    }, delay)
  );

  useEffect(() => {
    debouncedWrite.current(key, value);
    
    // Cleanup on unmount
    return () => {
      debouncedWrite.current.cancel();
      // Flush any pending writes immediately on unmount
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Failed to flush localStorage key "${key}":`, error);
      }
    };
  }, [key, value]);

  // Cleanup on hook unmount
  useEffect(() => {
    return () => {
      debouncedWrite.current.cancel();
    };
  }, []);
}

/**
 * Custom hook for batched localStorage operations
 * Groups multiple writes into a single operation
 */
export function useLocalStorageBatched() {
  const batchRef = useRef<{ [key: string]: any }>({});
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const write = useCallback((key: string, value: any) => {
    batchRef.current[key] = value;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      const batch = { ...batchRef.current };
      batchRef.current = {};
      
      Object.entries(batch).forEach(([k, v]) => {
        try {
          localStorage.setItem(k, JSON.stringify(v));
        } catch (error) {
          console.error(`Failed to write batched localStorage key "${k}":`, error);
        }
      });
    }, 300);
  }, []);

  const flush = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    const batch = { ...batchRef.current };
    batchRef.current = {};
    
    Object.entries(batch).forEach(([k, v]) => {
      try {
        localStorage.setItem(k, JSON.stringify(v));
      } catch (error) {
        console.error(`Failed to flush batched localStorage key "${k}":`, error);
      }
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      flush();
    };
  }, [flush]);

  return { write, flush };
}