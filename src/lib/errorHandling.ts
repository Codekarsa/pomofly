import { toast } from 'sonner';

export interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  timestamp?: Date;
  metadata?: Record<string, any>;
}

export interface ErrorInfo {
  id: string;
  message: string;
  type: 'network' | 'validation' | 'auth' | 'permission' | 'server' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  recoverable: boolean;
  context: ErrorContext;
  suggestedActions: string[];
}

export interface FeedbackData {
  id: string;
  type: 'error' | 'general' | 'feature' | 'bug';
  rating?: number;
  message: string;
  context: ErrorContext;
  timestamp: Date;
  userAgent: string;
  resolved?: boolean;
}

class ErrorManager {
  private errors: Map<string, ErrorInfo> = new Map();
  private feedback: FeedbackData[] = [];

  generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  classifyError(error: Error | string, context: ErrorContext): ErrorInfo {
    const message = typeof error === 'string' ? error : error.message;
    const id = this.generateErrorId();

    // Network errors
    if (message.includes('Failed to fetch') || message.includes('NetworkError')) {
      return {
        id,
        message: 'Connection failed. Please check your internet connection.',
        type: 'network',
        severity: 'medium',
        recoverable: true,
        context,
        suggestedActions: [
          'Check your internet connection',
          'Try refreshing the page',
          'Try again in a moment'
        ]
      };
    }

    // Authentication errors
    if (message.includes('auth') || message.includes('unauthorized') || message.includes('401')) {
      return {
        id,
        message: 'Authentication failed. Please sign in again.',
        type: 'auth',
        severity: 'high',
        recoverable: true,
        context,
        suggestedActions: [
          'Sign out and sign in again',
          'Clear browser cache',
          'Contact support if problem persists'
        ]
      };
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return {
        id,
        message: 'Please check your input and try again.',
        type: 'validation',
        severity: 'low',
        recoverable: true,
        context,
        suggestedActions: [
          'Review the highlighted fields',
          'Ensure all required fields are filled',
          'Check data formats (dates, emails, etc.)'
        ]
      };
    }

    // Permission errors
    if (message.includes('permission') || message.includes('forbidden') || message.includes('403')) {
      return {
        id,
        message: "You don't have permission to perform this action.",
        type: 'permission',
        severity: 'medium',
        recoverable: false,
        context,
        suggestedActions: [
          'Contact your administrator',
          'Check if you have the necessary permissions',
          'Try signing out and in again'
        ]
      };
    }

    // Server errors
    if (message.includes('500') || message.includes('server') || message.includes('internal')) {
      return {
        id,
        message: 'Server error occurred. Our team has been notified.',
        type: 'server',
        severity: 'high',
        recoverable: true,
        context,
        suggestedActions: [
          'Try again in a few minutes',
          'Save your work locally',
          'Contact support if problem persists'
        ]
      };
    }

    // Default unknown error
    return {
      id,
      message: 'Something went wrong. Please try again.',
      type: 'unknown',
      severity: 'medium',
      recoverable: true,
      context,
      suggestedActions: [
        'Try refreshing the page',
        'Clear browser cache',
        'Contact support with error details'
      ]
    };
  }

  handleError(error: Error | string, context: ErrorContext = {}): ErrorInfo {
    const errorInfo = this.classifyError(error, context);
    this.errors.set(errorInfo.id, errorInfo);

    // Log to analytics (placeholder)
    this.logErrorAnalytics(errorInfo);

    // Show user-friendly error
    this.showErrorToUser(errorInfo);

    return errorInfo;
  }

  private logErrorAnalytics(errorInfo: ErrorInfo): void {
    // In production, this would send to analytics service
    console.group(`🚨 Error: ${errorInfo.type}`);
    console.error('Message:', errorInfo.message);
    console.error('Context:', errorInfo.context);
    console.error('Severity:', errorInfo.severity);
    console.groupEnd();

    // Store in localStorage for debugging
    const analyticsData = {
      ...errorInfo,
      timestamp: new Date().toISOString()
    };
    
    const existingErrors = JSON.parse(localStorage.getItem('pomofly_errors') || '[]');
    existingErrors.push(analyticsData);
    
    // Keep only last 50 errors
    if (existingErrors.length > 50) {
      existingErrors.splice(0, existingErrors.length - 50);
    }
    
    localStorage.setItem('pomofly_errors', JSON.stringify(existingErrors));
  }

  private showErrorToUser(errorInfo: ErrorInfo): void {
    const isRecoverable = errorInfo.recoverable;
    const actions = errorInfo.suggestedActions.slice(0, 2); // Show max 2 actions

    if (errorInfo.severity === 'critical') {
      toast.error(errorInfo.message, {
        duration: 10000,
        action: isRecoverable ? {
          label: 'Help',
          onClick: () => this.showErrorDetails(errorInfo.id)
        } : undefined
      });
    } else if (errorInfo.severity === 'high') {
      toast.error(errorInfo.message, {
        duration: 8000,
        description: actions[0],
        action: {
          label: 'More Help',
          onClick: () => this.showErrorDetails(errorInfo.id)
        }
      });
    } else {
      toast.error(errorInfo.message, {
        duration: 5000,
        description: actions[0]
      });
    }
  }

  showErrorDetails(errorId: string): void {
    const errorInfo = this.errors.get(errorId);
    if (!errorInfo) return;

    // This would open a modal or dedicated error details view
    const details = {
      id: errorInfo.id,
      message: errorInfo.message,
      type: errorInfo.type,
      actions: errorInfo.suggestedActions,
      context: errorInfo.context
    };

    console.group('🔍 Error Details');
    console.log(details);
    console.groupEnd();

    // Trigger custom event for error details modal
    window.dispatchEvent(new CustomEvent('show-error-details', { detail: details }));
  }

  collectFeedback(data: Omit<FeedbackData, 'id' | 'timestamp' | 'userAgent'>): string {
    const feedback: FeedbackData = {
      ...data,
      id: `feedback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      userAgent: navigator.userAgent
    };

    this.feedback.push(feedback);

    // Store in localStorage (in production, send to backend)
    const existingFeedback = JSON.parse(localStorage.getItem('pomofly_feedback') || '[]');
    existingFeedback.push(feedback);
    localStorage.setItem('pomofly_feedback', JSON.stringify(existingFeedback));

    toast.success('Thank you for your feedback!', {
      description: 'Your feedback helps us improve Pomofly.'
    });

    return feedback.id;
  }

  getErrorStats(): { total: number; byType: Record<string, number>; bySeverity: Record<string, number> } {
    const errors = Array.from(this.errors.values());
    const byType: Record<string, number> = {};
    const bySeverity: Record<string, number> = {};

    errors.forEach(error => {
      byType[error.type] = (byType[error.type] || 0) + 1;
      bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
    });

    return {
      total: errors.length,
      byType,
      bySeverity
    };
  }

  clearErrors(): void {
    this.errors.clear();
    localStorage.removeItem('pomofly_errors');
  }
}

// Global instance
export const errorManager = new ErrorManager();

// Helper function for easy error handling
export const handleError = (error: Error | string, context: ErrorContext = {}) => {
  return errorManager.handleError(error, context);
};

// Helper function for feedback collection
export const collectFeedback = (data: Omit<FeedbackData, 'id' | 'timestamp' | 'userAgent'>) => {
  return errorManager.collectFeedback(data);
};