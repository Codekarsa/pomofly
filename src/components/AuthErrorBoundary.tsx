'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export class AuthErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AuthErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Here you could also log to an error reporting service
    if (typeof window !== 'undefined') {
      // Log to localStorage for debugging in development
      try {
        const errorLog = {
          timestamp: new Date().toISOString(),
          error: {
            message: error.message,
            stack: error.stack,
          },
          errorInfo: {
            componentStack: errorInfo.componentStack,
          },
          userAgent: navigator.userAgent,
          url: window.location.href,
        };
        
        const existingLogs = JSON.parse(localStorage.getItem('auth_errors') || '[]');
        existingLogs.push(errorLog);
        
        // Keep only last 10 errors
        if (existingLogs.length > 10) {
          existingLogs.splice(0, existingLogs.length - 10);
        }
        
        localStorage.setItem('auth_errors', JSON.stringify(existingLogs));
      } catch (e) {
        console.warn('Could not save error to localStorage:', e);
      }
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  handleRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      // Fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full space-y-8 p-8">
            <div className="text-center">
              <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                Authentication Error
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                We encountered a problem with authentication. This might be due to:
              </p>
              <ul className="mt-4 text-sm text-gray-600 text-left space-y-1">
                <li>• Network connectivity issues</li>
                <li>• Firebase service outage</li>
                <li>• Browser storage limitations</li>
                <li>• Configuration problems</li>
              </ul>
            </div>

            <div className="space-y-4">
              <button
                onClick={this.handleRetry}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Try Again
              </button>
              
              <button
                onClick={this.handleRefresh}
                className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
              >
                Refresh Page
              </button>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-4 text-xs text-gray-500">
                  <summary className="cursor-pointer font-medium">
                    Development Info (click to expand)
                  </summary>
                  <div className="mt-2 p-3 bg-gray-100 rounded overflow-auto">
                    <p className="font-medium">Error: {this.state.error.message}</p>
                    <pre className="mt-2 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                    {this.state.errorInfo && (
                      <pre className="mt-2 whitespace-pre-wrap">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    )}
                  </div>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AuthErrorBoundary;