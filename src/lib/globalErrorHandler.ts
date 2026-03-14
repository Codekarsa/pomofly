/**
 * Global error handler for unhandled promise rejections and JavaScript errors
 */

interface ErrorContext {
  timestamp: string;
  userAgent: string;
  url: string;
  userId?: string;
}

interface ErrorReport {
  type: 'unhandledRejection' | 'error' | 'resourceError';
  message: string;
  source?: string;
  stack?: string;
  context: ErrorContext;
}

class GlobalErrorHandler {
  private errorQueue: ErrorReport[] = [];
  private isProcessing = false;
  private maxQueueSize = 50;

  constructor() {
    this.setupErrorHandlers();
  }

  private setupErrorHandlers() {
    // Handle unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.handleUnhandledRejection(event);
      });

      // Handle uncaught JavaScript errors
      window.addEventListener('error', (event) => {
        this.handleJavaScriptError(event);
      });

      // Handle resource loading errors (images, scripts, etc.)
      window.addEventListener('error', (event) => {
        if (event.target !== window) {
          this.handleResourceError(event);
        }
      }, true); // Use capture phase for resource errors
    }
  }

  private handleUnhandledRejection(event: PromiseRejectionEvent) {
    const error = event.reason;
    
    // Prevent the default browser behavior (console error)
    event.preventDefault();

    const errorReport: ErrorReport = {
      type: 'unhandledRejection',
      message: this.extractErrorMessage(error),
      stack: error?.stack,
      context: this.getErrorContext()
    };

    this.reportError(errorReport);
  }

  private handleJavaScriptError(event: ErrorEvent) {
    const errorReport: ErrorReport = {
      type: 'error',
      message: event.message || 'Unknown JavaScript error',
      source: event.filename,
      stack: event.error?.stack,
      context: this.getErrorContext()
    };

    this.reportError(errorReport);
  }

  private handleResourceError(event: Event) {
    const target = event.target as HTMLElement;
    let resourceType = 'unknown';
    let source = '';

    if (target instanceof HTMLImageElement) {
      resourceType = 'image';
      source = target.src;
    } else if (target instanceof HTMLScriptElement) {
      resourceType = 'script';
      source = target.src;
    } else if (target instanceof HTMLLinkElement) {
      resourceType = 'stylesheet';
      source = target.href;
    }

    const errorReport: ErrorReport = {
      type: 'resourceError',
      message: `Failed to load ${resourceType}: ${source}`,
      source,
      context: this.getErrorContext()
    };

    this.reportError(errorReport);
  }

  private extractErrorMessage(error: any): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (error?.message) {
      return error.message;
    }
    return 'Unknown error occurred';
  }

  private getErrorContext(): ErrorContext {
    return {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      // userId can be set when user is available
    };
  }

  private async reportError(errorReport: ErrorReport) {
    // Add to queue
    this.errorQueue.push(errorReport);
    
    // Prevent queue overflow
    if (this.errorQueue.length > this.maxQueueSize) {
      this.errorQueue.shift(); // Remove oldest error
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Global Error Caught');
      console.error('Type:', errorReport.type);
      console.error('Message:', errorReport.message);
      if (errorReport.source) {
        console.error('Source:', errorReport.source);
      }
      if (errorReport.stack) {
        console.error('Stack:', errorReport.stack);
      }
      console.error('Context:', errorReport.context);
      console.groupEnd();
    }

    // Process error queue
    this.processErrorQueue();
  }

  private async processErrorQueue() {
    if (this.isProcessing || this.errorQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    try {
      // In production, you would send errors to a monitoring service
      if (process.env.NODE_ENV === 'production') {
        await this.sendToMonitoringService();
      }

      // Clear processed errors
      this.errorQueue = [];
    } catch (error) {
      console.warn('Failed to report errors to monitoring service:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async sendToMonitoringService() {
    // Placeholder for monitoring service integration
    // Examples: Sentry, LogRocket, Datadog, etc.
    
    // For now, just store in localStorage for potential later transmission
    try {
      const existingErrors = localStorage.getItem('pomofly_error_reports');
      const previousErrors = existingErrors ? JSON.parse(existingErrors) : [];
      
      const allErrors = [...previousErrors, ...this.errorQueue];
      
      // Keep only the last 100 errors
      const recentErrors = allErrors.slice(-100);
      
      localStorage.setItem('pomofly_error_reports', JSON.stringify(recentErrors));
    } catch (storageError) {
      console.warn('Failed to store error reports locally:', storageError);
    }
  }

  public setUserId(userId: string) {
    // Allow setting user context for better error tracking
    this.errorQueue.forEach(error => {
      error.context.userId = userId;
    });
  }

  public getErrorReports(): ErrorReport[] {
    // For debugging purposes
    return [...this.errorQueue];
  }

  public clearErrorReports() {
    this.errorQueue = [];
    try {
      localStorage.removeItem('pomofly_error_reports');
    } catch (error) {
      console.warn('Failed to clear stored error reports:', error);
    }
  }
}

// Create singleton instance
let globalErrorHandler: GlobalErrorHandler | null = null;

export function initializeGlobalErrorHandler(): GlobalErrorHandler {
  if (typeof window !== 'undefined' && !globalErrorHandler) {
    globalErrorHandler = new GlobalErrorHandler();
  }
  return globalErrorHandler!;
}

export function getGlobalErrorHandler(): GlobalErrorHandler | null {
  return globalErrorHandler;
}

// Utility function for manual error reporting
export function reportError(error: Error, context?: Partial<ErrorContext>) {
  const handler = getGlobalErrorHandler();
  if (handler) {
    const errorReport: ErrorReport = {
      type: 'error',
      message: error.message,
      stack: error.stack,
      context: {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
        ...context
      }
    };
    
    // Access private method through public interface
    (handler as any).reportError(errorReport);
  }
}