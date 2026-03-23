/**
 * Memory Leak Prevention Utilities
 * Provides utilities to prevent common memory leaks in React applications
 */

import { useEffect, useRef, useState, useCallback } from 'react';

/**
 * Tracks active intervals and timers to ensure cleanup
 */
class TimerManager {
  private static activeTimers = new Set<NodeJS.Timeout>();
  private static activeIntervals = new Set<NodeJS.Timeout>();

  static setSafeTimeout(callback: () => void, delay: number): NodeJS.Timeout {
    const timerId = setTimeout(() => {
      this.activeTimers.delete(timerId);
      callback();
    }, delay);
    
    this.activeTimers.add(timerId);
    return timerId;
  }

  static setSafeInterval(callback: () => void, interval: number): NodeJS.Timeout {
    const intervalId = setInterval(callback, interval);
    this.activeIntervals.add(intervalId);
    return intervalId;
  }

  static clearSafeTimeout(timerId: NodeJS.Timeout) {
    clearTimeout(timerId);
    this.activeTimers.delete(timerId);
  }

  static clearSafeInterval(intervalId: NodeJS.Timeout) {
    clearInterval(intervalId);
    this.activeIntervals.delete(intervalId);
  }

  /**
   * Emergency cleanup - clears all tracked timers
   * Call this only in error recovery situations
   */
  static clearAllTimers() {
    this.activeTimers.forEach(timer => clearTimeout(timer));
    this.activeIntervals.forEach(interval => clearInterval(interval));
    this.activeTimers.clear();
    this.activeIntervals.clear();
  }

  static getActiveCount() {
    return {
      timers: this.activeTimers.size,
      intervals: this.activeIntervals.size,
    };
  }
}

/**
 * Hook to ensure event listener cleanup
 */
export function useEventListener<K extends keyof WindowEventMap>(
  eventType: K,
  handler: (event: WindowEventMap[K]) => void,
  target: EventTarget = window,
  options?: boolean | AddEventListenerOptions
) {
  const handlerRef = useRef(handler);
  
  useEffect(() => {
    handlerRef.current = handler;
  }, [handler]);

  useEffect(() => {
    const eventListener = (event: Event) => {
      handlerRef.current(event as WindowEventMap[K]);
    };

    target.addEventListener(eventType, eventListener, options);

    return () => {
      target.removeEventListener(eventType, eventListener, options);
    };
  }, [eventType, target, options]);
}

/**
 * Hook for safe timer management with automatic cleanup
 */
export function useSafeTimer() {
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  const setSafeTimeout = (callback: () => void, delay: number): NodeJS.Timeout => {
    const timerId = TimerManager.setSafeTimeout(callback, delay);
    timersRef.current.push(timerId);
    return timerId;
  };

  const setSafeInterval = (callback: () => void, interval: number): NodeJS.Timeout => {
    const intervalId = TimerManager.setSafeInterval(callback, interval);
    timersRef.current.push(intervalId);
    return intervalId;
  };

  const clearSafeTimeout = (timerId: NodeJS.Timeout) => {
    TimerManager.clearSafeTimeout(timerId);
    timersRef.current = timersRef.current.filter(id => id !== timerId);
  };

  const clearSafeInterval = (intervalId: NodeJS.Timeout) => {
    TimerManager.clearSafeInterval(intervalId);
    timersRef.current = timersRef.current.filter(id => id !== intervalId);
  };

  // Cleanup all timers when component unmounts
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timerId => {
        TimerManager.clearSafeTimeout(timerId);
        TimerManager.clearSafeInterval(timerId);
      });
    };
  }, []);

  return {
    setSafeTimeout,
    setSafeInterval,
    clearSafeTimeout,
    clearSafeInterval,
  };
}

/**
 * Hook to track component mount state to prevent state updates on unmounted components
 */
export function useMountedRef() {
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  return mountedRef;
}

/**
 * Safe state setter that only updates if component is still mounted
 */
export function useSafeState<T>(initialState: T) {
  const [state, setState] = useState<T>(initialState);
  const mountedRef = useMountedRef();

  const setSafeState = useCallback((newState: T | ((prevState: T) => T)) => {
    if (mountedRef.current) {
      setState(newState);
    }
  }, [mountedRef]);

  return [state, setSafeState] as const;
}

/**
 * Utility for memory usage monitoring (development only)
 */
export const MemoryMonitor = {
  logMemoryUsage(context: string = 'Unknown') {
    if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined' && 'performance' in window) {
      // @ts-ignore - performance.memory is not in all browsers but we're checking for it
      const memory = (window.performance as any).memory;
      if (memory) {
        console.log(`[Memory Monitor] ${context}:`, {
          used: `${Math.round(memory.usedJSHeapSize / 1048576 * 100) / 100} MB`,
          total: `${Math.round(memory.totalJSHeapSize / 1048576 * 100) / 100} MB`,
          limit: `${Math.round(memory.jsHeapSizeLimit / 1048576 * 100) / 100} MB`,
          timers: TimerManager.getActiveCount(),
        });
      }
    }
  },

  startPeriodicMonitoring(intervalMs: number = 30000) {
    if (process.env.NODE_ENV === 'development') {
      const intervalId = TimerManager.setSafeInterval(() => {
        this.logMemoryUsage('Periodic Check');
      }, intervalMs);

      return () => TimerManager.clearSafeInterval(intervalId);
    }
    return () => {};
  },
};

export { TimerManager };