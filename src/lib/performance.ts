/**
 * Performance monitoring utilities for React components
 * Helps track and optimize render performance
 */

import React from 'react';

export interface PerformanceMetrics {
  componentName: string;
  renderCount: number;
  averageRenderTime: number;
  maxRenderTime: number;
  lastRenderTime: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics = new Map<string, PerformanceMetrics>();
  private isEnabled = process.env.NODE_ENV === 'development';

  startRender(componentName: string): number | null {
    if (!this.isEnabled) return null;
    return performance.now();
  }

  endRender(componentName: string, startTime: number | null): void {
    if (!this.isEnabled || startTime === null) return;

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    const existing = this.metrics.get(componentName);
    if (existing) {
      const newRenderCount = existing.renderCount + 1;
      const newAverageTime = (existing.averageRenderTime * existing.renderCount + renderTime) / newRenderCount;
      
      this.metrics.set(componentName, {
        componentName,
        renderCount: newRenderCount,
        averageRenderTime: newAverageTime,
        maxRenderTime: Math.max(existing.maxRenderTime, renderTime),
        lastRenderTime: renderTime,
        timestamp: endTime,
      });
    } else {
      this.metrics.set(componentName, {
        componentName,
        renderCount: 1,
        averageRenderTime: renderTime,
        maxRenderTime: renderTime,
        lastRenderTime: renderTime,
        timestamp: endTime,
      });
    }

    // Log if render time is concerning
    if (renderTime > 16.67) { // Over 60fps
      console.warn(`Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms`);
    }
  }

  getMetrics(componentName?: string): PerformanceMetrics[] {
    if (componentName) {
      const metric = this.metrics.get(componentName);
      return metric ? [metric] : [];
    }
    return Array.from(this.metrics.values());
  }

  clearMetrics(): void {
    this.metrics.clear();
  }

  logSummary(): void {
    if (!this.isEnabled) return;

    console.group('Component Performance Summary');
    const sortedMetrics = Array.from(this.metrics.values())
      .sort((a, b) => b.averageRenderTime - a.averageRenderTime);

    sortedMetrics.forEach(metric => {
      console.log(`${metric.componentName}:`, {
        renders: metric.renderCount,
        avgTime: `${metric.averageRenderTime.toFixed(2)}ms`,
        maxTime: `${metric.maxRenderTime.toFixed(2)}ms`,
        lastTime: `${metric.lastRenderTime.toFixed(2)}ms`,
      });
    });
    console.groupEnd();
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * React hook for monitoring component render performance
 */
export function usePerformanceMonitor(componentName: string) {
  const startTime = performanceMonitor.startRender(componentName);
  
  // This will run after every render
  React.useEffect(() => {
    performanceMonitor.endRender(componentName, startTime);
  });

  return {
    getMetrics: () => performanceMonitor.getMetrics(componentName),
    logSummary: () => performanceMonitor.logSummary(),
  };
}

/**
 * Higher-order component for performance monitoring
 */
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName?: string
) {
  const WrappedComponent = React.memo((props: P) => {
    const name = componentName || Component.displayName || Component.name || 'UnknownComponent';
    usePerformanceMonitor(name);
    return <Component {...props} />;
  });

  WrappedComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name})`;
  return WrappedComponent;
}

/**
 * Utility for measuring arbitrary code performance
 */
export function measurePerformance<T>(
  label: string,
  fn: () => T
): T {
  if (process.env.NODE_ENV !== 'development') {
    return fn();
  }

  const start = performance.now();
  const result = fn();
  const end = performance.now();
  const duration = end - start;

  if (duration > 10) { // Log if operation takes more than 10ms
    console.log(`Performance: ${label} took ${duration.toFixed(2)}ms`);
  }

  return result;
}