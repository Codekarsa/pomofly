'use client'

import React, { Component, ReactNode } from 'react'
import { AlertTriangle, RefreshCw, Home } from 'lucide-react'

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

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo)
    }

    // Log to external service in production
    if (process.env.NODE_ENV === 'production') {
      try {
        // Send to monitoring service (placeholder for future integration)
        console.error('Production error:', {
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          timestamp: new Date().toISOString(),
          level: this.props.level || 'component'
        })
      } catch (loggingError) {
        console.error('Failed to log error:', loggingError)
      }
    }

    this.setState({
      error,
      errorInfo,
    })
  }

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Default fallback UI based on error level
      return this.renderDefaultFallback()
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

export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode
  fallback?: ReactNode 
}> = ({ children, fallback }) => (
  <ErrorBoundary level="component" fallback={fallback}>{children}</ErrorBoundary>
)