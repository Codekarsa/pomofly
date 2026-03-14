import { useCallback } from 'react';
import { reportError, getGlobalErrorHandler } from '@/lib/globalErrorHandler';

/**
 * Hook for manual error reporting in components
 */
export function useErrorReporting() {
  const reportErrorManually = useCallback((error: Error, context?: Record<string, any>) => {
    reportError(error, context);
  }, []);

  const reportErrorWithMessage = useCallback((message: string, context?: Record<string, any>) => {
    const error = new Error(message);
    reportError(error, context);
  }, []);

  const getErrorHistory = useCallback(() => {
    const handler = getGlobalErrorHandler();
    return handler ? handler.getErrorReports() : [];
  }, []);

  const clearErrors = useCallback(() => {
    const handler = getGlobalErrorHandler();
    if (handler) {
      handler.clearErrorReports();
    }
  }, []);

  return {
    reportError: reportErrorManually,
    reportErrorWithMessage,
    getErrorHistory,
    clearErrors
  };
}

/**
 * Higher-order component for wrapping async operations with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  asyncFunction: T,
  errorContext?: Record<string, any>
): T {
  return (async (...args: any[]) => {
    try {
      return await asyncFunction(...args);
    } catch (error) {
      if (error instanceof Error) {
        reportError(error, errorContext);
      } else {
        reportError(new Error(String(error)), errorContext);
      }
      throw error; // Re-throw to maintain original behavior
    }
  }) as T;
}

/**
 * Utility for safe async operations that won't throw
 */
export function safeAsync<T>(
  asyncFunction: () => Promise<T>,
  fallbackValue: T,
  errorContext?: Record<string, any>
): Promise<T> {
  return asyncFunction().catch((error) => {
    if (error instanceof Error) {
      reportError(error, errorContext);
    } else {
      reportError(new Error(String(error)), errorContext);
    }
    return fallbackValue;
  });
}