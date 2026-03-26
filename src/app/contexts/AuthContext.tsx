'use client'

import React, { createContext, useState, useContext, useEffect, useRef } from 'react';
import { auth } from '@/lib/firebase';
import { User } from 'firebase/auth';
import { 
  logUserLogin, 
  logUserLogout, 
  generateSessionId, 
  getClientInfo 
} from '@/lib/activityLogger';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  sessionId: string;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  sessionId: ''
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const sessionIdRef = useRef<string>(generateSessionId());
  const previousUserRef = useRef<User | null>(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (newUser) => {
      const previousUser = previousUserRef.current;
      
      try {
        // Log logout for previous user if they existed
        if (previousUser && !newUser) {
          await logUserLogout(previousUser.uid, sessionIdRef.current);
        }
        
        // Log login for new user
        if (newUser && newUser.uid !== previousUser?.uid) {
          // Generate new session ID for new login
          if (previousUser) {
            sessionIdRef.current = generateSessionId();
          }
          
          const clientInfo = getClientInfo();
          await logUserLogin(newUser.uid, sessionIdRef.current, {
            loginMethod: newUser.providerData[0]?.providerId || 'unknown',
            email: newUser.email,
            emailVerified: newUser.emailVerified,
            isNewUser: !previousUser,
            ...clientInfo,
          });
        }
      } catch (error) {
        // Don't block auth flow if logging fails
        console.warn('Activity logging failed:', error);
      }
      
      previousUserRef.current = newUser;
      setUser(newUser);
      setLoading(false);
    });

    // Cleanup function to log logout when component unmounts
    return () => {
      unsubscribe();
      
      if (previousUserRef.current) {
        // Fire-and-forget logout logging
        logUserLogout(previousUserRef.current.uid, sessionIdRef.current).catch(error => {
          console.warn('Logout logging failed:', error);
        });
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading,
      sessionId: sessionIdRef.current
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);