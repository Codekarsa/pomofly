import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { debounce, throttle, memoize } from '@/lib/performance';

/**
 * Hook for debounced values
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook for throttled callbacks
 */
export function useThrottle<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(throttle(callback, delay), [callback, delay]) as T;
}

/**
 * Hook for debounced callbacks
 */
export function useDebounceCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(debounce(callback, delay), [callback, delay]) as T;
}

/**
 * Hook for memoized expensive calculations
 */
export function useMemoizedCallback<T extends (...args: unknown[]) => unknown>(
  callback: T,
  deps: React.DependencyList
): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback(memoize(callback), deps) as T;
}

/**
 * Hook for intersection observer
 */
export function useIntersectionObserver(
  options?: IntersectionObserverInit
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const elementRef = useRef<Element | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      setEntry(entry);
    }, {
      threshold: 0.1,
      rootMargin: '50px 0px',
      ...options,
    });

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options]);

  return { ref: elementRef, isIntersecting, entry };
}

/**
 * Hook for virtual scrolling
 */
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const visibleCount = Math.ceil(containerHeight / itemHeight);
    const end = Math.min(start + visibleCount, items.length - 1);

    const startIndex = Math.max(0, start - overscan);
    const endIndex = Math.min(items.length - 1, end + overscan);

    return {
      startIndex,
      endIndex,
      offsetY: startIndex * itemHeight,
      visibleItems: items.slice(startIndex, endIndex + 1),
      totalHeight: items.length * itemHeight,
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, items]);

  const onScroll = useCallback((event: React.UIEvent<HTMLElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    ...visibleRange,
    onScroll,
  };
}

/**
 * Hook for performance monitoring
 */
export function usePerformanceMonitor(componentName: string) {
  const renderCount = useRef(0);
  const renderTime = useRef(0);

  useEffect(() => {
    renderCount.current += 1;
    const start = performance.now();

    return () => {
      const end = performance.now();
      renderTime.current = end - start;

      if (process.env.NODE_ENV === 'development') {
        console.log(
          `[Performance] ${componentName} - Renders: ${renderCount.current}, Last render: ${renderTime.current.toFixed(2)}ms`
        );
      }
    };
  });

  return {
    renderCount: renderCount.current,
    lastRenderTime: renderTime.current,
  };
}

/**
 * Hook for lazy loading images
 */
export function useLazyImage(src: string, placeholder: string = '') {
  const [imageSrc, setImageSrc] = useState(placeholder);
  const [isLoaded, setIsLoaded] = useState(false);
  const { ref, isIntersecting } = useIntersectionObserver();

  useEffect(() => {
    if (isIntersecting && src) {
      const img = new Image();
      img.onload = () => {
        setImageSrc(src);
        setIsLoaded(true);
      };
      img.src = src;
    }
  }, [isIntersecting, src]);

  return { ref, src: imageSrc, isLoaded };
}