// Error tracking and performance monitoring for PomoFly

export interface ErrorReport {
  id: string;
  timestamp: Date;
  error: {
    name: string;
    message: string;
    stack?: string;
    cause?: any;
  };
  context: {
    userAgent: string;
    url: string;
    userId?: string;
    sessionId: string;
    route: string;
    component?: string;
    action?: string;
  };
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
}

export interface PerformanceMetric {
  id: string;
  timestamp: Date;
  metric: string;
  value: number;
  context: {
    userId?: string;
    sessionId: string;
    route: string;
    userAgent: string;
  };
  tags: string[];
}

class MonitoringService {
  private sessionId: string;
  private userId?: string;
  private initialized = false;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.init();
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private init() {
    if (typeof window === 'undefined') return;

    // Initialize performance monitoring
    this.setupPerformanceMonitoring();
    
    // Initialize error tracking
    this.setupErrorTracking();
    
    // Initialize user monitoring
    this.setupUserMonitoring();

    this.initialized = true;
  }

  private setupPerformanceMonitoring() {
    // Monitor page load performance
    if ('performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (perfData) {
            this.recordMetric('page_load_time', perfData.loadEventEnd - perfData.loadEventStart);
            this.recordMetric('dom_content_loaded_time', perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart);
            this.recordMetric('first_paint_time', perfData.loadEventEnd - perfData.fetchStart);
          }
        }, 1000);
      });
    }

    // Monitor Core Web Vitals
    this.observeWebVitals();
  }

  private setupErrorTracking() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.reportError(event.error || new Error(event.message), {
        component: 'global',
        action: 'script_error',
        severity: 'high',
        tags: ['javascript', 'global']
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
        component: 'global',
        action: 'promise_rejection',
        severity: 'high',
        tags: ['promise', 'unhandled']
      });
    });
  }

  private setupUserMonitoring() {
    // Track user session start
    this.recordMetric('session_start', 1, ['user_session']);

    // Track session duration on page unload
    window.addEventListener('beforeunload', () => {
      const sessionDuration = Date.now() - parseInt(this.sessionId.split('-')[0]);
      this.recordMetric('session_duration', sessionDuration, ['user_session']);
    });

    // Track user interactions
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'BUTTON' || target.closest('button')) {
        this.recordMetric('button_click', 1, ['user_interaction', 'button']);
      }
    });
  }

  private observeWebVitals() {
    try {
      // Largest Contentful Paint (LCP)
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries();
          const lastEntry = entries[entries.length - 1];
          this.recordMetric('lcp', lastEntry.startTime, ['web_vitals']);
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
      }
    } catch (error) {
      console.warn('Web Vitals monitoring not available');
    }
  }

  setUserId(userId: string | null) {
    this.userId = userId || undefined;
  }

  reportError(error: Error, context?: {
    component?: string;
    action?: string;
    severity?: ErrorReport['severity'];
    tags?: string[];
  }) {
    if (!this.initialized) return;

    const errorReport: ErrorReport = {
      id: `error-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
        cause: error.cause
      },
      context: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        userId: this.userId,
        sessionId: this.sessionId,
        route: window.location.pathname,
        component: context?.component,
        action: context?.action
      },
      severity: context?.severity || 'medium',
      tags: context?.tags || []
    };

    // Store error locally
    this.storeErrorLocally(errorReport);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Report:', errorReport);
    }

    // Send to remote monitoring service (if configured)
    this.sendErrorToRemoteService(errorReport);
  }

  recordMetric(metric: string, value: number, tags: string[] = []) {
    if (!this.initialized) return;

    const performanceMetric: PerformanceMetric = {
      id: `metric-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      metric,
      value,
      context: {
        userId: this.userId,
        sessionId: this.sessionId,
        route: window.location.pathname,
        userAgent: navigator.userAgent
      },
      tags
    };

    // Store metric locally
    this.storeMetricLocally(performanceMetric);

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('Performance Metric:', performanceMetric);
    }

    // Send to remote monitoring service (if configured)
    this.sendMetricToRemoteService(performanceMetric);
  }

  // Time a function execution
  timeFunction<T>(name: string, fn: () => T, tags: string[] = []): T {
    const start = performance.now();
    try {
      const result = fn();
      const duration = performance.now() - start;
      this.recordMetric(`${name}_duration`, duration, ['function_timing', ...tags]);
      return result;
    } catch (error) {
      this.reportError(error as Error, {
        component: 'performance',
        action: 'function_timing',
        severity: 'medium',
        tags: ['timing_error', ...tags]
      });
      throw error;
    }
  }

  // Time an async function execution
  async timeAsyncFunction<T>(name: string, fn: () => Promise<T>, tags: string[] = []): Promise<T> {
    const start = performance.now();
    try {
      const result = await fn();
      const duration = performance.now() - start;
      this.recordMetric(`${name}_duration`, duration, ['async_function_timing', ...tags]);
      return result;
    } catch (error) {
      this.reportError(error as Error, {
        component: 'performance',
        action: 'async_function_timing',
        severity: 'medium',
        tags: ['async_timing_error', ...tags]
      });
      throw error;
    }
  }

  private storeErrorLocally(errorReport: ErrorReport) {
    try {
      const errors = this.getStoredErrors();
      errors.push(errorReport);
      
      // Keep only the last 50 errors
      const recentErrors = errors.slice(-50);
      
      localStorage.setItem('pomofly_errors', JSON.stringify(recentErrors));
    } catch (error) {
      console.warn('Could not store error locally:', error);
    }
  }

  private storeMetricLocally(metric: PerformanceMetric) {
    try {
      const metrics = this.getStoredMetrics();
      metrics.push(metric);
      
      // Keep only the last 100 metrics
      const recentMetrics = metrics.slice(-100);
      
      localStorage.setItem('pomofly_metrics', JSON.stringify(recentMetrics));
    } catch (error) {
      console.warn('Could not store metric locally:', error);
    }
  }

  getStoredErrors(): ErrorReport[] {
    try {
      const errors = localStorage.getItem('pomofly_errors');
      return errors ? JSON.parse(errors) : [];
    } catch {
      return [];
    }
  }

  getStoredMetrics(): PerformanceMetric[] {
    try {
      const metrics = localStorage.getItem('pomofly_metrics');
      return metrics ? JSON.parse(metrics) : [];
    } catch {
      return [];
    }
  }

  private sendErrorToRemoteService(errorReport: ErrorReport) {
    // This could be configured to send to Sentry, LogRocket, Bugsnag, etc.
    // For now, we'll just store locally and provide the hook for future integration
    const remoteEndpoint = process.env.NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT;
    if (remoteEndpoint) {
      fetch(remoteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorReport)
      }).catch((error) => {
        console.warn('Failed to send error to remote service:', error);
      });
    }
  }

  private sendMetricToRemoteService(metric: PerformanceMetric) {
    // This could be configured to send to DataDog, New Relic, etc.
    const remoteEndpoint = process.env.NEXT_PUBLIC_METRICS_ENDPOINT;
    if (remoteEndpoint) {
      fetch(remoteEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(metric)
      }).catch((error) => {
        console.warn('Failed to send metric to remote service:', error);
      });
    }
  }

  // Get monitoring summary for debugging
  getSummary() {
    const errors = this.getStoredErrors();
    const metrics = this.getStoredMetrics();
    
    return {
      sessionId: this.sessionId,
      userId: this.userId,
      errorCount: errors.length,
      metricCount: metrics.length,
      recentErrors: errors.slice(-5),
      recentMetrics: metrics.slice(-10),
      lastError: errors[errors.length - 1],
      sessionDuration: Date.now() - parseInt(this.sessionId.split('-')[0])
    };
  }

  // Clear stored data (for GDPR compliance)
  clearStoredData() {
    localStorage.removeItem('pomofly_errors');
    localStorage.removeItem('pomofly_metrics');
  }
}

// Singleton instance
export const monitoring = new MonitoringService();