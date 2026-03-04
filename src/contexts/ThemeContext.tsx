/**
 * Theme Context Provider for managing application theme state
 */

'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTheme as useThemeHook, type Theme, type ResolvedTheme } from '@/hooks/useTheme';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setSystemTheme: () => void;
  isSystemTheme: boolean;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
}

export function ThemeProvider({ 
  children, 
  defaultTheme = 'system' 
}: ThemeProviderProps) {
  const [isLoading, setIsLoading] = useState(true);
  const themeHook = useThemeHook();

  // Handle hydration mismatch by showing loading state initially
  useEffect(() => {
    setIsLoading(false);
  }, []);

  const value: ThemeContextType = {
    ...themeHook,
    isLoading,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context
 */
export function useTheme() {
  const context = useContext(ThemeContext);
  
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  
  return context;
}

/**
 * HOC to wrap components with theme functionality
 */
export function withTheme<P extends object>(Component: React.ComponentType<P>) {
  return function ThemeComponent(props: P) {
    return (
      <ThemeProvider>
        <Component {...props} />
      </ThemeProvider>
    );
  };
}

/**
 * Theme loading fallback component
 */
export function ThemeLoader({ children }: { children: React.ReactNode }) {
  const { isLoading } = useTheme();
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }
  
  return <>{children}</>;
}