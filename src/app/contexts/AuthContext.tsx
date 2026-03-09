'use client'

import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import { User } from 'firebase/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  retry: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true, 
  error: null,
  retry: () => {}
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initAuth = useCallback(() => {
    setLoading(true);
    setError(null);
    
    try {
      const unsubscribe = auth.onAuthStateChanged(
        (user) => {
          setUser(user);
          setLoading(false);
          setError(null);
        },
        (error) => {
          console.error('Auth state change error:', error);
          setError(error.message || 'Authentication error occurred');
          setLoading(false);
          setUser(null);
        }
      );
      return unsubscribe;
    } catch (error: unknown) {
      console.error('Auth initialization error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to initialize authentication';
      setError(errorMessage);
      setLoading(false);
      setUser(null);
      return () => {}; // No-op cleanup
    }
  }, []);

  const retry = useCallback(() => {
    initAuth();
  }, [initAuth]);

  useEffect(() => {
    const unsubscribe = initAuth();
    return unsubscribe;
  }, [initAuth]);

  return (
    <AuthContext.Provider value={{ user, loading, error, retry }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);