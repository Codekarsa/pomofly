'use client'

import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { User } from 'firebase/auth';

export interface AuthError {
  message: string;
  code?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error?: AuthError | null;
  clearError?: () => void;
  retryAuth?: () => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);