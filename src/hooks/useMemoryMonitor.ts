import { useEffect, useRef } from 'react';

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: MemoryInfo;
}

/**
 * Hook for monitoring memory usage and detecting potential memory leaks
 * Only works in development mode and browsers that support performance.memory
 */
export function useMemoryMonitor(componentName: string, enabled: boolean = process.env.NODE_ENV === 'development') {
  const initialMemoryRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const performance = window.performance as PerformanceWithMemory;
    
    if (!performance.memory) {
      console.warn('Memory monitoring not supported in this browser');
      return;
    }

    // Record initial memory usage
    initialMemoryRef.current = performance.memory.usedJSHeapSize;

    // Monitor memory every 10 seconds
    intervalRef.current = setInterval(() => {
      if (!isMountedRef.current || !performance.memory) return;

      const currentMemory = performance.memory.usedJSHeapSize;
      const initialMemory = initialMemoryRef.current || 0;
      const memoryIncrease = currentMemory - initialMemory;
      const memoryIncreasePercent = initialMemory > 0 ? (memoryIncrease / initialMemory) * 100 : 0;

      // Log memory usage in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Memory Monitor - ${componentName}]`, {
          current: `${(currentMemory / 1024 / 1024).toFixed(2)} MB`,
          initial: `${(initialMemory / 1024 / 1024).toFixed(2)} MB`,
          increase: `${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`,
          increasePercent: `${memoryIncreasePercent.toFixed(1)}%`,
          total: `${(performance.memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
          limit: `${(performance.memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
        });
      }

      // Warn about potential memory leaks (>50MB increase or >50% increase)
      if (memoryIncrease > 50 * 1024 * 1024 || memoryIncreasePercent > 50) {
        console.warn(`[Memory Leak Warning - ${componentName}] Significant memory increase detected:`, {
          increase: `${(memoryIncrease / 1024 / 1024).toFixed(2)} MB (${memoryIncreasePercent.toFixed(1)}%)`,
          recommendation: 'Check for uncleaned effects, intervals, or listeners'
        });
      }
    }, 10000); // Check every 10 seconds

    // Cleanup function
    return () => {
      isMountedRef.current = false;
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      // Log final memory usage
      if (performance.memory && initialMemoryRef.current) {
        const finalMemory = performance.memory.usedJSHeapSize;
        const memoryDiff = finalMemory - initialMemoryRef.current;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Memory Monitor - ${componentName}] Component unmounted`, {
            final: `${(finalMemory / 1024 / 1024).toFixed(2)} MB`,
            difference: `${(memoryDiff / 1024 / 1024).toFixed(2)} MB`
          });
        }
      }
    };
  }, [componentName, enabled]);

  // Return memory utilities
  return {
    getMemoryUsage: () => {
      if (typeof window === 'undefined') return null;
      
      const performance = window.performance as PerformanceWithMemory;
      if (!performance.memory) return null;
      
      return {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit,
        usedMB: performance.memory.usedJSHeapSize / 1024 / 1024,
        totalMB: performance.memory.totalJSHeapSize / 1024 / 1024,
        limitMB: performance.memory.jsHeapSizeLimit / 1024 / 1024
      };
    },
    
    forceGarbageCollection: () => {
      if (typeof window !== 'undefined' && 'gc' in window) {
        try {
          (window as any).gc();
          console.log('[Memory Monitor] Forced garbage collection');
        } catch (error) {
          console.warn('[Memory Monitor] Could not force garbage collection:', error);
        }
      } else {
        console.warn('[Memory Monitor] Garbage collection not available');
      }
    }
  };
}