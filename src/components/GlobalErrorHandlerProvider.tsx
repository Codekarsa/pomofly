'use client'

import { useEffect, ReactNode } from 'react';
import { initializeGlobalErrorHandler, getGlobalErrorHandler } from '@/lib/globalErrorHandler';
import { useAuth } from '@/app/contexts/AuthContext';

interface GlobalErrorHandlerProviderProps {
  children: ReactNode;
}

export function GlobalErrorHandlerProvider({ children }: GlobalErrorHandlerProviderProps) {
  const { user } = useAuth();

  useEffect(() => {
    // Initialize the global error handler
    initializeGlobalErrorHandler();
  }, []);

  useEffect(() => {
    // Set user context when user is available
    const handler = getGlobalErrorHandler();
    if (handler && user?.uid) {
      handler.setUserId(user.uid);
    }
  }, [user?.uid]);

  return <>{children}</>;
}