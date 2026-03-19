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
      tags: ['error_boundary', 'react_error'],
    });

    this.setState({
      error,
      errorInfo,
      errorId,
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
        <div className="flex min-h-[400px] items-center justify-center p-6">
          <div className="w-full max-w-md rounded-lg border bg-white p-6 text-center shadow-lg">
            <div className="mb-4 flex justify-center">
              <AlertCircle className="h-12 w-12 text-red-500" />
            </div>

            <h2 className="mb-2 text-xl font-semibold text-gray-900">
              Something went wrong
            </h2>

            <p className="mb-6 text-gray-600">
              We encountered an unexpected error. Our team has been notified and
              will look into it.
            </p>

            {this.props.showDetails && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
                  Technical details
                </summary>
                <div className="mt-2 max-h-32 overflow-auto rounded border bg-gray-50 p-3 font-mono text-xs text-gray-700">
                  <p>
                    <strong>Error:</strong> {this.state.error.message}
                  </p>
                  {this.state.errorId && (
                    <p className="mt-1">
                      <strong>Error ID:</strong> {this.state.errorId}
                    </p>
                  )}
                  {this.state.error.stack && (
                    <details className="mt-2">
                      <summary className="cursor-pointer">Stack trace</summary>
                      <pre className="mt-1 overflow-auto text-xs">
                        {this.state.error.stack}
                      </pre>
                    </details>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
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

            <p className="mt-4 text-xs text-gray-500">
              If this problem persists, try refreshing the page or contact
              support.
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
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">
            Task management temporarily unavailable
          </span>
        </div>
        <p className="mt-1 text-sm text-red-600">
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
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="h-5 w-5" />
          <span className="font-medium">Timer temporarily unavailable</span>
        </div>
        <p className="mt-1 text-sm text-red-600">
          Please refresh the page to restore the timer.
        </p>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);
