'use client';

import React, { Component, ReactNode } from 'react';
import { monitoring } from '@/lib/monitoring';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: any;
  errorId?: string;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    // Generate unique error ID for this occurrence
    const errorId = `boundary-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    
    // Report error to monitoring service
    monitoring.reportError(error, {
      component: this.props.name || 'ErrorBoundary',
      action: 'component_error',
      severity: 'high',
      tags: ['error_boundary', 'react_error']
    });

    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Log detailed error info in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error);
      console.error('Error Info:', errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleRefresh = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg border p-6 text-center">
            <div className="flex justify-center mb-4">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>
            
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Something went wrong
            </h2>
            
            <p className="text-gray-600 mb-6">
              We encountered an unexpected error. Our team has been notified and will look into it.
            </p>

            {this.props.showDetails && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Technical details
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded border text-xs font-mono text-gray-700 overflow-auto max-h-32">
                  <p><strong>Error:</strong> {this.state.error.message}</p>
                  {this.state.errorId && (
                    <p className="mt-1"><strong>Error ID:</strong> {this.state.errorId}</p>
                  )}
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer">Stack trace</summary>
                      <pre className="mt-1 text-xs overflow-auto">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={this.handleReset}
                variant="outline"
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </Button>
              <Button
                onClick={this.handleGoHome}
                className="flex items-center gap-2"
              >
                <Home className="h-4 w-4" />
                Go Home
              </Button>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              If this problem persists, try refreshing the page or contact support.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// Specialized error boundaries for different parts of the app

export const TaskErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary
    name="TaskManagement"
    fallback={
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Task management temporarily unavailable</span>
        </div>
        <p className="text-sm text-red-600 mt-1">
          Please refresh the page to try again.
        </p>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);

export const TimerErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary
    name="PomodoroTimer"
    fallback={
      <div className="p-6 bg-red-50 border border-red-200 rounded-lg">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Timer temporarily unavailable</span>
        </div>
        <p className="text-sm text-red-600 mt-1">
          Please refresh the page to restore the timer.
        </p>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);