import { useCallback, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { monitoring } from '@/lib/monitoring';

export function useMonitoring() {
  const { user } = useAuth();

  // Update user ID when auth state changes
  useEffect(() => {
    monitoring.setUserId(user?.uid || null);
  }, [user?.uid]);

  // Error reporting function
  const reportError = useCallback((error: Error, context?: {
    component?: string;
    action?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    tags?: string[];
  }) => {
    monitoring.reportError(error, context);
  }, []);

  // Performance metric recording
  const recordMetric = useCallback((metric: string, value: number, tags: string[] = []) => {
    monitoring.recordMetric(metric, value, tags);
  }, []);

  // Time a function execution
  const timeFunction = useCallback(<T>(name: string, fn: () => T, tags: string[] = []): T => {
    return monitoring.timeFunction(name, fn, tags);
  }, []);

  // Time an async function execution
  const timeAsyncFunction = useCallback(<T>(name: string, fn: () => Promise<T>, tags: string[] = []): Promise<T> => {
    return monitoring.timeAsyncFunction(name, fn, tags);
  }, []);

  // Track user actions
  const trackAction = useCallback((action: string, context?: Record<string, any>) => {
    recordMetric(`action_${action}`, 1, ['user_action', action]);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('User Action:', { action, context, timestamp: new Date().toISOString() });
    }
  }, [recordMetric]);

  // Track feature usage
  const trackFeature = useCallback((feature: string, metadata?: Record<string, any>) => {
    recordMetric(`feature_${feature}`, 1, ['feature_usage', feature]);
    
    if (process.env.NODE_ENV === 'development') {
      console.log('Feature Usage:', { feature, metadata, timestamp: new Date().toISOString() });
    }
  }, [recordMetric]);

  // Track API calls
  const trackApiCall = useCallback((endpoint: string, method: string, status: number, duration: number) => {
    recordMetric(`api_call_duration`, duration, ['api', endpoint, method]);
    recordMetric(`api_call_${status >= 400 ? 'error' : 'success'}`, 1, ['api', endpoint, method]);
    
    if (status >= 400) {
      reportError(new Error(`API Error: ${method} ${endpoint} returned ${status}`), {
        component: 'api',
        action: 'api_call',
        severity: status >= 500 ? 'high' : 'medium',
        tags: ['api_error', endpoint, method, `status_${status}`]
      });
    }
  }, [recordMetric, reportError]);

  // Track form interactions
  const trackFormEvent = useCallback((formName: string, event: 'start' | 'submit' | 'error' | 'abandon', context?: Record<string, any>) => {
    recordMetric(`form_${event}`, 1, ['form', formName, event]);
    
    if (event === 'error' && context?.error) {
      reportError(context.error, {
        component: 'form',
        action: 'form_error',
        severity: 'medium',
        tags: ['form_error', formName]
      });
    }
  }, [recordMetric, reportError]);

  // Get monitoring summary
  const getMonitoringSummary = useCallback(() => {
    return monitoring.getSummary();
  }, []);

  return {
    reportError,
    recordMetric,
    timeFunction,
    timeAsyncFunction,
    trackAction,
    trackFeature,
    trackApiCall,
    trackFormEvent,
    getMonitoringSummary
  };
}

// Hook for API call monitoring
export function useApiMonitoring() {
  const { trackApiCall } = useMonitoring();

  const monitorApiCall = useCallback(async <T>(
    endpoint: string,
    method: string,
    apiCall: () => Promise<T>
  ): Promise<T> => {
    const start = performance.now();
    
    try {
      const result = await apiCall();
      const duration = performance.now() - start;
      trackApiCall(endpoint, method, 200, duration);
      return result;
    } catch (error) {
      const duration = performance.now() - start;
      const status = (error as any)?.status || (error as any)?.response?.status || 500;
      trackApiCall(endpoint, method, status, duration);
      throw error;
    }
  }, [trackApiCall]);

  return { monitorApiCall };
}

// Hook for form monitoring
export function useFormMonitoring(formName: string) {
  const { trackFormEvent } = useMonitoring();

  const trackFormStart = useCallback(() => {
    trackFormEvent(formName, 'start');
  }, [formName, trackFormEvent]);

  const trackFormSubmit = useCallback((context?: Record<string, any>) => {
    trackFormEvent(formName, 'submit', context);
  }, [formName, trackFormEvent]);

  const trackFormError = useCallback((error: Error, context?: Record<string, any>) => {
    trackFormEvent(formName, 'error', { error, ...context });
  }, [formName, trackFormEvent]);

  const trackFormAbandon = useCallback(() => {
    trackFormEvent(formName, 'abandon');
  }, [formName, trackFormEvent]);

  return {
    trackFormStart,
    trackFormSubmit,
    trackFormError,
    trackFormAbandon
  };
}

// Hook for performance monitoring specific to heavy operations
export function usePerformanceMonitoring() {
  const { timeFunction, timeAsyncFunction, recordMetric } = useMonitoring();

  const measureRender = useCallback((componentName: string, renderFn: () => JSX.Element) => {
    return timeFunction(`${componentName}_render`, renderFn, ['component_render']);
  }, [timeFunction]);

  const measureAsyncOperation = useCallback(<T>(operationName: string, operation: () => Promise<T>) => {
    return timeAsyncFunction(operationName, operation, ['async_operation']);
  }, [timeAsyncFunction]);

  const recordInteractionTime = useCallback((interaction: string, startTime: number) => {
    const duration = performance.now() - startTime;
    recordMetric(`${interaction}_time`, duration, ['interaction', interaction]);
  }, [recordMetric]);

  return {
    measureRender,
    measureAsyncOperation,
    recordInteractionTime
  };
}