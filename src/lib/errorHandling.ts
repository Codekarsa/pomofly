/**
 * Error Handling Utilities and Validation Helpers
 * 
 * Centralized error handling, validation, and recovery mechanisms
 * for robust application error management.
 */

import { monitoring } from './monitoring';

// Error types for better categorization
export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation', 
  PERMISSION = 'permission',
  TIMEOUT = 'timeout',
  STORAGE = 'storage',
  UNKNOWN = 'unknown'
}

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium', 
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Recovery action types
export enum RecoveryAction {
  RETRY = 'retry',
  RESET = 'reset',
  REDIRECT = 'redirect',
  REFRESH = 'refresh',
  IGNORE = 'ignore'
}

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  sessionId?: string;
  timestamp?: number;
  metadata?: Record<string, any>;
}

export interface ErrorRecoveryStrategy {
  action: RecoveryAction;
  delay?: number;
  maxRetries?: number;
  confirmation?: boolean;
  url?: string;
  message?: string;
}

export interface SafeOperationResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  errorType?: ErrorType;
  recoveryStrategy?: ErrorRecoveryStrategy;
}

/**
 * Enhanced error class with additional context
 */
export class ApplicationError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly context: ErrorContext;
  public readonly timestamp: number;
  public readonly errorId: string;

  constructor(
    message: string,
    type: ErrorType = ErrorType.UNKNOWN,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context: ErrorContext = {}
  ) {
    super(message);
    this.name = 'ApplicationError';
    this.type = type;
    this.severity = severity;
    this.context = context;
    this.timestamp = Date.now();
    this.errorId = `err-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Safe wrapper for async operations with error handling
 */
export async function safeAsync<T>(
  operation: () => Promise<T>,
  context?: ErrorContext
): Promise<SafeOperationResult<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    const appError = error instanceof ApplicationError 
      ? error 
      : new ApplicationError(
          error instanceof Error ? error.message : 'Unknown error',
          classifyError(error),
          ErrorSeverity.MEDIUM,
          context
        );

    // Report error to monitoring
    reportError(appError, context);

    return {
      success: false,
      error: appError,
      errorType: appError.type,
      recoveryStrategy: getRecoveryStrategy(appError)
    };
  }
}

/**
 * Safe wrapper for synchronous operations
 */
export function safeSync<T>(
  operation: () => T,
  context?: ErrorContext
): SafeOperationResult<T> {
  try {
    const data = operation();
    return { success: true, data };
  } catch (error) {
    const appError = error instanceof ApplicationError 
      ? error 
      : new ApplicationError(
          error instanceof Error ? error.message : 'Unknown error',
          classifyError(error),
          ErrorSeverity.MEDIUM,
          context
        );

    // Report error to monitoring
    reportError(appError, context);

    return {
      success: false,
      error: appError,
      errorType: appError.type,
      recoveryStrategy: getRecoveryStrategy(appError)
    };
  }
}

/**
 * Safe localStorage operations with quota handling
 */
export const safeStorage = {
  getItem: (key: string): string | null => {
    const result = safeSync(() => localStorage.getItem(key), {
      action: 'localStorage_get',
      metadata: { key }
    });
    return result.success ? result.data! : null;
  },

  setItem: (key: string, value: string): boolean => {
    const result = safeSync(() => {
      localStorage.setItem(key, value);
      return true;
    }, {
      action: 'localStorage_set',
      metadata: { key, size: value.length }
    });

    if (!result.success && result.error?.message.includes('QuotaExceededError')) {
      // Handle quota exceeded by clearing old data
      try {
        const keysToRemove = Object.keys(localStorage)
          .filter(k => k.startsWith('timer_') || k.startsWith('cache_'))
          .slice(0, 5); // Remove oldest 5 items
        
        keysToRemove.forEach(k => localStorage.removeItem(k));
        
        // Retry the operation
        return safeStorage.setItem(key, value);
      } catch {
        return false;
      }
    }

    return result.success;
  },

  removeItem: (key: string): boolean => {
    const result = safeSync(() => {
      localStorage.removeItem(key);
      return true;
    }, {
      action: 'localStorage_remove',
      metadata: { key }
    });
    return result.success;
  }
};

/**
 * Validate timer settings with comprehensive checks
 */
export function validateTimerSettings(settings: any): {
  isValid: boolean;
  errors: string[];
  sanitized: any;
} {
  const errors: string[] = [];
  const sanitized: any = {};

  // Validate pomodoro duration
  if (typeof settings?.pomodoro !== 'number' || settings.pomodoro <= 0) {
    errors.push('Pomodoro duration must be a positive number');
    sanitized.pomodoro = 25; // default
  } else if (settings.pomodoro > 120) {
    errors.push('Pomodoro duration cannot exceed 120 minutes');
    sanitized.pomodoro = 120;
  } else {
    sanitized.pomodoro = Math.round(settings.pomodoro);
  }

  // Validate short break
  if (typeof settings?.shortBreak !== 'number' || settings.shortBreak <= 0) {
    errors.push('Short break duration must be a positive number');
    sanitized.shortBreak = 5;
  } else if (settings.shortBreak > 30) {
    errors.push('Short break cannot exceed 30 minutes');
    sanitized.shortBreak = 30;
  } else {
    sanitized.shortBreak = Math.round(settings.shortBreak);
  }

  // Validate long break
  if (typeof settings?.longBreak !== 'number' || settings.longBreak <= 0) {
    errors.push('Long break duration must be a positive number');
    sanitized.longBreak = 15;
  } else if (settings.longBreak > 60) {
    errors.push('Long break cannot exceed 60 minutes');
    sanitized.longBreak = 60;
  } else {
    sanitized.longBreak = Math.round(settings.longBreak);
  }

  // Validate long break interval
  if (typeof settings?.longBreakInterval !== 'number' || settings.longBreakInterval <= 0) {
    errors.push('Long break interval must be a positive number');
    sanitized.longBreakInterval = 4;
  } else if (settings.longBreakInterval > 10) {
    errors.push('Long break interval cannot exceed 10');
    sanitized.longBreakInterval = 10;
  } else {
    sanitized.longBreakInterval = Math.round(settings.longBreakInterval);
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Validate task data structure
 */
export function validateTaskData(task: any): {
  isValid: boolean;
  errors: string[];
  sanitized: any;
} {
  const errors: string[] = [];
  const sanitized: any = {};

  // Validate ID
  if (!task?.id || typeof task.id !== 'string') {
    errors.push('Task must have a valid ID');
    sanitized.id = `task-${Date.now()}`;
  } else {
    sanitized.id = task.id;
  }

  // Validate title
  if (!task?.title || typeof task.title !== 'string') {
    errors.push('Task must have a valid title');
    sanitized.title = 'Untitled Task';
  } else if (task.title.length > 500) {
    errors.push('Task title cannot exceed 500 characters');
    sanitized.title = task.title.substring(0, 500);
  } else {
    sanitized.title = task.title.trim();
  }

  // Validate completed status
  sanitized.completed = Boolean(task?.completed);

  // Validate timestamps
  const now = new Date();
  sanitized.createdAt = task?.createdAt instanceof Date 
    ? task.createdAt 
    : (task?.createdAt ? new Date(task.createdAt) : now);
  
  if (isNaN(sanitized.createdAt.getTime())) {
    sanitized.createdAt = now;
    errors.push('Invalid createdAt date');
  }

  // Validate time tracking data
  if (task?.manualTimeSpent !== undefined) {
    if (typeof task.manualTimeSpent === 'number' && task.manualTimeSpent >= 0) {
      sanitized.manualTimeSpent = task.manualTimeSpent;
    } else {
      errors.push('Manual time spent must be a non-negative number');
      sanitized.manualTimeSpent = 0;
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    sanitized
  };
}

/**
 * Classify errors into types for better handling
 */
function classifyError(error: any): ErrorType {
  const errorMessage = error?.message?.toLowerCase() || '';
  const errorName = error?.name?.toLowerCase() || '';
  const errorCode = error?.code?.toLowerCase() || '';

  if (errorMessage.includes('network') || 
      errorMessage.includes('fetch') || 
      errorCode.includes('unavailable') ||
      errorCode.includes('timeout')) {
    return ErrorType.NETWORK;
  }

  if (errorMessage.includes('permission') || 
      errorCode.includes('permission-denied') ||
      errorCode.includes('unauthenticated')) {
    return ErrorType.PERMISSION;
  }

  if (errorMessage.includes('quota') || 
      errorName.includes('quotaexceedederror') ||
      errorMessage.includes('storage')) {
    return ErrorType.STORAGE;
  }

  if (errorMessage.includes('validation') ||
      errorMessage.includes('invalid')) {
    return ErrorType.VALIDATION;
  }

  if (errorMessage.includes('timeout') ||
      errorCode.includes('deadline-exceeded')) {
    return ErrorType.TIMEOUT;
  }

  return ErrorType.UNKNOWN;
}

/**
 * Get recovery strategy based on error type
 */
function getRecoveryStrategy(error: ApplicationError): ErrorRecoveryStrategy {
  switch (error.type) {
    case ErrorType.NETWORK:
      return {
        action: RecoveryAction.RETRY,
        delay: 1000,
        maxRetries: 3,
        message: 'Network error. Retrying...'
      };

    case ErrorType.PERMISSION:
      return {
        action: RecoveryAction.REDIRECT,
        url: '/login',
        message: 'Please sign in to continue'
      };

    case ErrorType.STORAGE:
      return {
        action: RecoveryAction.RESET,
        confirmation: true,
        message: 'Storage quota exceeded. Clear old data?'
      };

    case ErrorType.TIMEOUT:
      return {
        action: RecoveryAction.RETRY,
        delay: 2000,
        maxRetries: 2,
        message: 'Request timed out. Trying again...'
      };

    case ErrorType.VALIDATION:
      return {
        action: RecoveryAction.RESET,
        message: 'Invalid data detected. Using defaults.'
      };

    default:
      return {
        action: RecoveryAction.REFRESH,
        confirmation: true,
        message: 'An unexpected error occurred. Refresh the page?'
      };
  }
}

/**
 * Report error to monitoring service with context
 */
function reportError(error: ApplicationError, context?: ErrorContext): void {
  try {
    monitoring.reportError(error, {
      ...context,
      errorType: error.type,
      severity: error.severity,
      errorId: error.errorId,
      timestamp: error.timestamp,
    });
  } catch (monitoringError) {
    // Monitoring service failure shouldn't crash the app
    console.warn('Failed to report error to monitoring service:', monitoringError);
    
    // Fallback to console logging in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Application Error:', {
        message: error.message,
        type: error.type,
        severity: error.severity,
        context: error.context,
        stack: error.stack,
      });
    }
  }
}

/**
 * Hook for error boundary integration
 */
export function useErrorHandler() {
  const handleError = (error: Error, errorInfo?: any) => {
    const appError = error instanceof ApplicationError 
      ? error 
      : new ApplicationError(
          error.message,
          classifyError(error),
          ErrorSeverity.HIGH,
          {
            component: 'ErrorBoundary',
            action: 'component_error',
            metadata: errorInfo
          }
        );

    reportError(appError);
    return getRecoveryStrategy(appError);
  };

  const handleAsyncError = async (errorPromise: Promise<any>, context?: ErrorContext) => {
    try {
      return await errorPromise;
    } catch (error) {
      const result = await safeAsync(async () => { throw error; }, context);
      throw result.error;
    }
  };

  return {
    handleError,
    handleAsyncError,
    safeAsync,
    safeSync,
    validateTimerSettings,
    validateTaskData,
    safeStorage,
  };
}