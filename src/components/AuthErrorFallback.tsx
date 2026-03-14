'use client'

import React from 'react';
import { AuthError } from 'firebase/auth';
import { useAuth } from '@/app/contexts/AuthContext';

interface AuthErrorFallbackProps {
  error?: AuthError | Error | null;
  onRetry?: () => void;
}

export const AuthErrorFallback: React.FC<AuthErrorFallbackProps> = ({ 
  error: propError, 
  onRetry: propOnRetry 
}) => {
  const { error: contextError, retry: contextRetry, isOnline } = useAuth();
  
  const error = propError || contextError;
  const onRetry = propOnRetry || contextRetry;

  if (!error) {
    return null;
  }

  // Determine error type and message
  const getErrorInfo = (error: AuthError | Error) => {
    if ('code' in error) {
      // Firebase AuthError
      const authError = error as AuthError;
      switch (authError.code) {
        case 'auth/network-request-failed':
          return {
            title: 'Network Error',
            message: 'Please check your internet connection and try again.',
            isNetworkError: true,
          };
        case 'auth/too-many-requests':
          return {
            title: 'Too Many Attempts',
            message: 'Too many failed authentication attempts. Please wait a moment and try again.',
            isRetryable: true,
          };
        case 'auth/user-disabled':
          return {
            title: 'Account Disabled',
            message: 'This account has been disabled. Please contact support for assistance.',
            isRetryable: false,
          };
        case 'auth/invalid-api-key':
          return {
            title: 'Configuration Error',
            message: 'Authentication service is not properly configured. Please contact support.',
            isRetryable: false,
          };
        case 'auth/app-deleted':
          return {
            title: 'Service Unavailable',
            message: 'Authentication service is temporarily unavailable. Please try again later.',
            isRetryable: true,
          };
        default:
          return {
            title: 'Authentication Error',
            message: authError.message || 'An authentication error occurred.',
            isRetryable: true,
          };
      }
    } else {
      // Generic Error
      return {
        title: 'System Error',
        message: error.message || 'An unexpected error occurred.',
        isRetryable: true,
      };
    }
  };

  const errorInfo = getErrorInfo(error);

  const handleRetry = () => {
    try {
      onRetry();
    } catch (retryError) {
      console.error('Error during retry:', retryError);
    }
  };

  const handleRefresh = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Error Icon */}
        <div className="text-center">
          <div className="mx-auto h-12 w-12 text-red-600 flex items-center justify-center">
            <svg 
              className="h-8 w-8" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" 
              />
            </svg>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {errorInfo.title}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {errorInfo.message}
          </p>

          {/* Network Status */}
          {!isOnline && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    You're currently offline. Please check your internet connection.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          {errorInfo.isRetryable !== false && (
            <button
              onClick={handleRetry}
              disabled={!isOnline && errorInfo.isNetworkError}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {!isOnline && errorInfo.isNetworkError ? 'Waiting for Connection...' : 'Try Again'}
            </button>
          )}
          
          <button
            onClick={handleRefresh}
            className="group relative w-full flex justify-center py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Refresh Page
          </button>

          {/* Help Section */}
          <div className="mt-6 text-center">
            <details className="text-sm text-gray-600">
              <summary className="cursor-pointer hover:text-gray-900 font-medium">
                Having trouble? Get help
              </summary>
              <div className="mt-3 space-y-2 text-left bg-gray-50 p-3 rounded-md">
                <p className="font-medium">Try these steps:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Check your internet connection</li>
                  <li>Clear your browser cache and cookies</li>
                  <li>Try using a different browser or incognito mode</li>
                  <li>Disable browser extensions temporarily</li>
                  {errorInfo.isNetworkError && (
                    <li>Check if your firewall or network blocks Firebase</li>
                  )}
                </ul>
              </div>
            </details>
          </div>

          {/* Development Info */}
          {process.env.NODE_ENV === 'development' && (
            <details className="mt-4 text-xs text-gray-500">
              <summary className="cursor-pointer font-medium">
                Development Info (click to expand)
              </summary>
              <div className="mt-2 p-3 bg-gray-100 rounded overflow-auto">
                <p className="font-medium">Error Details:</p>
                <pre className="mt-2 whitespace-pre-wrap text-xs">
                  {JSON.stringify({
                    message: error.message,
                    code: 'code' in error ? error.code : undefined,
                    stack: error.stack,
                    isOnline,
                    timestamp: new Date().toISOString(),
                  }, null, 2)}
                </pre>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthErrorFallback;