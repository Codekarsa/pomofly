'use client'

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import { 
  signInWithGoogle, 
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut 
} from '@/lib/authUtils';
import { 
  User, 
  onAuthStateChanged,
  getIdToken,
  connectAuthEmulator
} from 'firebase/auth';

export interface AuthError {
  code: string;
  message: string;
  details?: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: AuthError | null;
  isSigningIn: boolean;
  isSigningOut: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAnonymously: () => Promise<void>;
  signOut: (confirmation?: boolean) => Promise<void>;
  clearError: () => void;
  refreshToken: () => Promise<void>;
  isTokenValid: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'pomofly_auth_persistence';
const TOKEN_REFRESH_INTERVAL = 45 * 60 * 1000; // 45 minutes

interface AuthPersistenceData {
  lastSignInTime: number;
  provider: string;
  persistent: boolean;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Save authentication persistence data
  const saveAuthPersistence = useCallback((user: User) => {
    try {
      const persistenceData: AuthPersistenceData = {
        lastSignInTime: Date.now(),
        provider: user.providerData[0]?.providerId || 'anonymous',
        persistent: true
      };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(persistenceData));
    } catch (error) {
      console.warn('Failed to save auth persistence data:', error);
    }
  }, []);

  // Load authentication persistence data
  const loadAuthPersistence = useCallback((): AuthPersistenceData | null => {
    try {
      const stored = localStorage.getItem(AUTH_STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        // Check if the stored auth is not too old (7 days)
        const maxAge = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - data.lastSignInTime < maxAge) {
          return data;
        }
      }
    } catch (error) {
      console.warn('Failed to load auth persistence data:', error);
    }
    return null;
  }, []);

  // Clear authentication persistence data
  const clearAuthPersistence = useCallback(() => {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear auth persistence data:', error);
    }
  }, []);

  // Enhanced error handling with user-friendly messages
  const handleAuthError = useCallback((error: any): AuthError => {
    const code = error.code || 'unknown';
    let message = 'An authentication error occurred';
    let details = error.message;

    switch (code) {
      case 'auth/network-request-failed':
        message = 'Network connection failed. Please check your internet connection.';
        break;
      case 'auth/too-many-requests':
        message = 'Too many attempts. Please try again later.';
        break;
      case 'auth/user-disabled':
        message = 'Your account has been disabled. Please contact support.';
        break;
      case 'auth/user-token-expired':
        message = 'Your session has expired. Please sign in again.';
        break;
      case 'auth/invalid-user-token':
        message = 'Invalid session. Please sign in again.';
        break;
      case 'auth/popup-closed-by-user':
        message = 'Sign-in cancelled. Please try again.';
        break;
      case 'auth/popup-blocked':
        message = 'Pop-up blocked by browser. Please allow pop-ups and try again.';
        break;
      case 'auth/cancelled-popup-request':
        message = 'Another sign-in attempt is in progress.';
        break;
      case 'auth/operation-not-allowed':
        message = 'This sign-in method is not enabled.';
        break;
      default:
        if (error.message) {
          message = error.message;
        }
    }

    return { code, message, details };
  }, []);

  // Token validation and refresh
  const isTokenValid = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    try {
      await getIdToken(user, false); // Don't force refresh, just check validity
      return true;
    } catch (error) {
      console.warn('Token validation failed:', error);
      return false;
    }
  }, [user]);

  const refreshToken = useCallback(async (): Promise<void> => {
    if (!user) {
      throw new Error('No user to refresh token for');
    }

    try {
      await getIdToken(user, true); // Force refresh
      console.log('Token refreshed successfully');
    } catch (error) {
      console.error('Token refresh failed:', error);
      setError(handleAuthError(error));
      throw error;
    }
  }, [user, handleAuthError]);

  // Enhanced sign-in methods
  const handleSignInWithGoogle = useCallback(async () => {
    setIsSigningIn(true);
    setError(null);

    try {
      const result = await signInWithGoogle();
      if (result.user) {
        saveAuthPersistence(result.user);
        console.log('Google sign-in successful');
      }
    } catch (error) {
      console.error('Google sign-in failed:', error);
      setError(handleAuthError(error));
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  }, [saveAuthPersistence, handleAuthError]);

  const handleSignInAnonymously = useCallback(async () => {
    setIsSigningIn(true);
    setError(null);

    try {
      const result = await firebaseSignInAnonymously(auth);
      if (result.user) {
        saveAuthPersistence(result.user);
        console.log('Anonymous sign-in successful');
      }
    } catch (error) {
      console.error('Anonymous sign-in failed:', error);
      setError(handleAuthError(error));
      throw error;
    } finally {
      setIsSigningIn(false);
    }
  }, [saveAuthPersistence, handleAuthError]);

  // Enhanced sign-out with confirmation
  const handleSignOut = useCallback(async (confirmation: boolean = true) => {
    if (confirmation && typeof window !== 'undefined') {
      const hasUnsavedWork = localStorage.getItem('pomofly_offline_queue');
      if (hasUnsavedWork) {
        const confirmMessage = 'You have unsaved changes that will be lost. Are you sure you want to sign out?';
        if (!window.confirm(confirmMessage)) {
          return;
        }
      } else {
        if (!window.confirm('Are you sure you want to sign out?')) {
          return;
        }
      }
    }

    setIsSigningOut(true);
    setError(null);

    try {
      await firebaseSignOut(auth);
      clearAuthPersistence();
      console.log('Sign-out successful');
    } catch (error) {
      console.error('Sign-out failed:', error);
      setError(handleAuthError(error));
      throw error;
    } finally {
      setIsSigningOut(false);
    }
  }, [clearAuthPersistence, handleAuthError]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Setup auth state monitoring with enhanced error handling
  useEffect(() => {
    let tokenRefreshTimer: NodeJS.Timeout;

    const unsubscribe = onAuthStateChanged(auth, 
      async (newUser) => {
        try {
          setUser(newUser);
          
          if (newUser) {
            // User signed in
            saveAuthPersistence(newUser);
            
            // Validate token immediately
            const isValid = await isTokenValid();
            if (!isValid) {
              console.warn('Invalid token detected, attempting refresh...');
              try {
                await refreshToken();
              } catch (refreshError) {
                console.error('Token refresh failed during auth state change:', refreshError);
                // Don't sign out automatically, let user handle it
              }
            }

            // Setup periodic token refresh
            tokenRefreshTimer = setInterval(async () => {
              try {
                const stillValid = await isTokenValid();
                if (stillValid) {
                  await refreshToken();
                }
              } catch (refreshError) {
                console.error('Periodic token refresh failed:', refreshError);
              }
            }, TOKEN_REFRESH_INTERVAL);
            
          } else {
            // User signed out
            clearAuthPersistence();
            if (tokenRefreshTimer) {
              clearInterval(tokenRefreshTimer);
            }
          }
        } catch (error) {
          console.error('Error in auth state change handler:', error);
          setError(handleAuthError(error));
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.error('Auth state change error:', error);
        setError(handleAuthError(error));
        setLoading(false);
      }
    );

    // Check for persisted auth state on mount
    const persistedAuth = loadAuthPersistence();
    if (persistedAuth && !user) {
      console.log('Found persisted auth data, waiting for auth state restoration...');
      // The onAuthStateChanged will handle the restoration
    }

    return () => {
      unsubscribe();
      if (tokenRefreshTimer) {
        clearInterval(tokenRefreshTimer);
      }
    };
  }, [saveAuthPersistence, clearAuthPersistence, loadAuthPersistence, handleAuthError, isTokenValid, refreshToken, user]);

  // Expose auth recovery method for error boundaries
  const contextValue: AuthContextType = {
    user,
    loading,
    error,
    isSigningIn,
    isSigningOut,
    signInWithGoogle: handleSignInWithGoogle,
    signInAnonymously: handleSignInAnonymously,
    signOut: handleSignOut,
    clearError,
    refreshToken,
    isTokenValid
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