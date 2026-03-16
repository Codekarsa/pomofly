'use client'

import React, { createContext, useState, useContext, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { User } from 'firebase/auth';
import { AppCacheManager } from '@/lib/appCache';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      const prevUser = user;
      setUser(user);
      setLoading(false);

      // Handle cache invalidation on auth state change
      if (user && !prevUser) {
        // User logged in
        AppCacheManager.onUserLogin();
      } else if (!user && prevUser) {
        // User logged out
        AppCacheManager.onUserLogout();
      }
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