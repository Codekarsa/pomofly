// Performance optimization utilities for PomoFly

/**
 * Debounce function to limit the rate of function calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function to limit the rate of function calls
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Performance monitoring hook for development
 */
export function measurePerformance(name: string, fn: () => void) {
  if (typeof window !== 'undefined' && window.performance) {
    const startTime = performance.now();
    fn();
    const endTime = performance.now();
    console.log(`[Performance] ${name}: ${endTime - startTime}ms`);
  } else {
    fn();
  }
}

/**
 * Lazy image loading utility
 */
export function createIntersectionObserver(
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit
) {
  if (typeof window !== 'undefined' && 'IntersectionObserver' in window) {
    return new IntersectionObserver(callback, {
      rootMargin: '50px 0px',
      threshold: 0.1,
      ...options,
    });
  }
  return null;
}

/**
 * Memoization utility for expensive calculations
 */
export function memoize<T extends (...args: unknown[]) => unknown>(fn: T): T {
  const cache = new Map();
<<<<<<< HEAD
  
  return ((...args: unknown[]) => {
=======

  return ((...args: any[]) => {
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key);
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

/**
 * Virtual scrolling utility for large lists
 */
export interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

export function calculateVirtualScrollRange(
  scrollTop: number,
  totalItems: number,
  config: VirtualScrollConfig
) {
  const { itemHeight, containerHeight, overscan = 5 } = config;

  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(containerHeight / itemHeight),
    totalItems - 1
  );

  const start = Math.max(0, visibleStart - overscan);
  const end = Math.min(totalItems - 1, visibleEnd + overscan);

  return {
    start,
    end,
    offsetY: start * itemHeight,
    totalHeight: totalItems * itemHeight,
  };
}

/**
 * Preload component utility
 */
export function preloadComponent(componentImport: () => Promise<unknown>) {
  if (typeof window !== 'undefined') {
    // Preload on user interaction or idle time
    const preload = () => componentImport();

    // Preload on mouse hover or focus
    document.addEventListener('mouseover', preload, {
      once: true,
      passive: true,
    });
    document.addEventListener('focus', preload, { once: true, passive: true });

    // Preload on idle
    if ('requestIdleCallback' in window) {
      requestIdleCallback(preload);
    } else {
      setTimeout(preload, 1);
    }
  }
}

/**
 * Resource hints for better loading performance
 */
export function addResourceHints() {
  if (typeof document === 'undefined') return;

  // Preconnect to external domains
  const preconnectLinks = [
    'https://fonts.googleapis.com',
    'https://fonts.gstatic.com',
  ];

  preconnectLinks.forEach((href) => {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = href;
    document.head.appendChild(link);
  });
}
