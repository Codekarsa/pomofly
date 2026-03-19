'use client';

import React, { Component, ReactNode } from 'react';
import { monitoring } from '@/lib/monitoring';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface Props {
  children: ReactNode
  fallback?: ReactNode
  level?: 'page' | 'component' | 'global'
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
    }
  }

<<<<<<< HEAD
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // Report error to monitoring system
    try {
      monitoring.reportError(error, {
        component: 'ErrorBoundary',
        level: this.props.level || 'component',
        componentStack: errorInfo.componentStack,
        action: 'error_boundary_catch'
      });
    } catch (monitoringError) {
      console.error('Failed to report error to monitoring:', monitoringError);
    }
=======
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
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)

    this.setState({
      error,
      errorInfo,
<<<<<<< HEAD
    })
=======
      errorId,
    });

    // Log detailed error info in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error);
      console.error('Error Info:', errorInfo);
    }
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback
      }

<<<<<<< HEAD
      // Default fallback UI based on error level
      return this.renderDefaultFallback()
=======
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
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)
    }

    return this.props.children
  }

  private renderDefaultFallback() {
    const { level = 'component' } = this.props
    const isGlobal = level === 'global'

    return (
      <div className={`flex items-center justify-center ${isGlobal ? 'min-h-screen bg-gray-50' : 'min-h-64 bg-gray-50 rounded-lg border'} p-6`}>
        <div className="text-center max-w-md">
          <div className={`mx-auto flex items-center justify-center ${isGlobal ? 'w-16 h-16' : 'w-12 h-12'} rounded-full bg-red-100 mb-4`}>
            <AlertTriangle className={`${isGlobal ? 'w-8 h-8' : 'w-6 h-6'} text-red-600`} />
          </div>
          
          <h2 className={`${isGlobal ? 'text-xl' : 'text-lg'} font-semibold text-gray-900 mb-2`}>
            {isGlobal ? 'Application Error' : 'Something went wrong'}
          </h2>
          
          <p className="text-gray-600 mb-6">
            {isGlobal 
              ? 'The application encountered an unexpected error. We apologize for the inconvenience.'
              : 'This component encountered an error and could not be displayed.'
            }
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Page
            </button>
            
            {isGlobal && (
              <button
                onClick={() => window.location.href = '/'}
                className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                <Home className="w-4 h-4 mr-2" />
                Go Home
              </button>
            )}
          </div>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-6 text-left">
              <summary className="cursor-pointer text-sm text-gray-500 mb-2">
                Error Details (Development Only)
              </summary>
              <pre className="text-xs text-red-600 bg-red-50 p-3 rounded border overflow-auto">
                {this.state.error.message}
                {'\n\n'}
                {this.state.error.stack}
                {this.state.errorInfo?.componentStack && (
                  '\n\nComponent Stack:' + this.state.errorInfo.componentStack
                )}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}

// Convenience wrapper for different error boundary levels
export const GlobalErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="global">{children}</ErrorBoundary>
)

export const PageErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary level="page">{children}</ErrorBoundary>
)

<<<<<<< HEAD
export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode
  fallback?: ReactNode 
}> = ({ children, fallback }) => (
  <ErrorBoundary level="component" fallback={fallback}>{children}</ErrorBoundary>
)
=======
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
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)
