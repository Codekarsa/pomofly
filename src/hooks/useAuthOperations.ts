'use client'

import { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';

interface AuthOperationState {
  loading: boolean;
  error: string | null;
  success: boolean;
}

// Auth operations expected from AuthContext.
// TODO: AuthContextType (src/app/contexts/AuthContext.tsx) does not implement
// these yet; this hook will fail at runtime until they are added there.
interface AuthContextOperations {
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

interface AuthOperationResult {
  signInWithEmail: (email: string, password: string) => Promise<boolean>;
  signUpWithEmail: (email: string, password: string, displayName?: string) => Promise<boolean>;
  signOut: () => Promise<boolean>;
  sendPasswordReset: (email: string) => Promise<boolean>;
  state: AuthOperationState;
  clearState: () => void;
}

/**
 * Hook for handling authentication operations with loading states and error handling
 */
export const useAuthOperations = (): AuthOperationResult => {
  const { signIn, signUp, logout, resetPassword } = useAuth() as unknown as AuthContextOperations;
  const [state, setState] = useState<AuthOperationState>({
    loading: false,
    error: null,
    success: false,
  });

  const clearState = () => {
    setState({
      loading: false,
      error: null,
      success: false,
    });
  };

  const signInWithEmail = async (email: string, password: string): Promise<boolean> => {
    setState({ loading: true, error: null, success: false });
    
    try {
      // Basic validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      if (!isValidEmail(email)) {
        throw new Error('Please enter a valid email address');
      }

      await signIn(email, password);
      setState({ loading: false, error: null, success: true });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign in failed';
      setState({ loading: false, error: errorMessage, success: false });
      return false;
    }
  };

  const signUpWithEmail = async (
    email: string, 
    password: string, 
    displayName?: string
  ): Promise<boolean> => {
    setState({ loading: true, error: null, success: false });
    
    try {
      // Basic validation
      if (!email || !password) {
        throw new Error('Email and password are required');
      }
      
      if (!isValidEmail(email)) {
        throw new Error('Please enter a valid email address');
      }
      
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }
      
      if (displayName && displayName.trim().length < 2) {
        throw new Error('Display name must be at least 2 characters long');
      }

      await signUp(email, password, displayName);
      setState({ loading: false, error: null, success: true });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign up failed';
      setState({ loading: false, error: errorMessage, success: false });
      return false;
    }
  };

  const signOut = async (): Promise<boolean> => {
    setState({ loading: true, error: null, success: false });
    
    try {
      await logout();
      setState({ loading: false, error: null, success: true });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Sign out failed';
      setState({ loading: false, error: errorMessage, success: false });
      return false;
    }
  };

  const sendPasswordReset = async (email: string): Promise<boolean> => {
    setState({ loading: true, error: null, success: false });
    
    try {
      if (!email) {
        throw new Error('Email is required');
      }
      
      if (!isValidEmail(email)) {
        throw new Error('Please enter a valid email address');
      }

      await resetPassword(email);
      setState({ loading: false, error: null, success: true });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Password reset failed';
      setState({ loading: false, error: errorMessage, success: false });
      return false;
    }
  };

  return {
    signInWithEmail,
    signUpWithEmail,
    signOut,
    sendPasswordReset,
    state,
    clearState,
  };
};

// Helper function
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}