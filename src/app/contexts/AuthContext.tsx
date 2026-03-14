'use client'

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import { User, onAuthStateChanged, AuthError } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: AuthError | Error | null;
  isOnline: boolean;
  retry: () => void;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  error: null,
  isOnline: true,
  retry: () => {},
  clearError: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | Error | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [retryAttempts, setRetryAttempts] = useState(0);

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      setIsOnline(navigator.onLine);
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);

      return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      };
    }
  }, []);

  const initializeAuth = useCallback(() => {
    let unsubscribe: (() => void) | null = null;

    try {
      unsubscribe = onAuthStateChanged(
        auth, 
        (user) => {
          try {
            console.log('Auth state changed:', { user: user?.uid, email: user?.email });
            setUser(user);
            setLoading(false);
            setError(null); // Clear any previous errors on successful auth change
            setRetryAttempts(0);
          } catch (err) {
            console.error('Error processing auth state change:', err);
            setError(err instanceof Error ? err : new Error('Failed to process authentication state'));
            setLoading(false);
          }
        },
        (authError) => {
          console.error('Auth state change error:', authError);
          setError(authError);
          setLoading(false);
          
          // Log error details for debugging
          const errorDetails = {
            code: authError.code,
            message: authError.message,
            timestamp: new Date().toISOString(),
            isOnline: navigator.onLine,
            retryAttempt: retryAttempts,
          };
          
          console.error('Auth error details:', errorDetails);
          
          // Store error in localStorage for debugging (development only)
          if (process.env.NODE_ENV === 'development') {
            try {
              const authErrors = JSON.parse(localStorage.getItem('auth_debug_errors') || '[]');
              authErrors.push(errorDetails);
              if (authErrors.length > 5) authErrors.shift();
              localStorage.setItem('auth_debug_errors', JSON.stringify(authErrors));
            } catch (e) {
              console.warn('Could not save auth error to localStorage:', e);
            }
          }
        }
      );
    } catch (initError) {
      console.error('Failed to initialize auth listener:', initError);
      setError(initError instanceof Error ? initError : new Error('Failed to initialize authentication'));
      setLoading(false);
    }

    return () => {
      if (unsubscribe) {
        try {
          unsubscribe();
        } catch (cleanupError) {
          console.warn('Error during auth cleanup:', cleanupError);
        }
      }
    };
  }, [retryAttempts]);

  const retry = useCallback(() => {
    console.log('Retrying authentication...');
    setRetryAttempts(prev => prev + 1);
    setLoading(true);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Initialize auth with error handling
  useEffect(() => {
    const cleanup = initializeAuth();
    return cleanup;
  }, [initializeAuth]);

  // Auto-retry on network reconnection
  useEffect(() => {
    if (isOnline && error && retryAttempts < 3) {
      const retryTimer = setTimeout(() => {
        console.log('Auto-retrying auth on network reconnection...');
        retry();
      }, 2000);
      
      return () => clearTimeout(retryTimer);
    }
  }, [isOnline, error, retryAttempts, retry]);

  const contextValue: AuthContextType = {
    user,
    loading,
    error,
    isOnline,
    retry,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};