'use client'
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  // Determine the actual theme based on user preference and system setting
  const getResolvedTheme = useCallback((currentTheme: Theme): 'light' | 'dark' => {
    if (currentTheme === 'system') {
      if (typeof window !== 'undefined') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      return 'light';
    }
    return currentTheme;
  }, []);

  // Update the DOM and resolved theme
  const updateTheme = useCallback((newTheme: Theme) => {
    const resolved = getResolvedTheme(newTheme);
    setResolvedTheme(resolved);

    if (typeof window !== 'undefined') {
      const root = window.document.documentElement;
      
      // Remove existing theme classes
      root.classList.remove('light', 'dark');
      
      // Add the resolved theme class
      root.classList.add(resolved);
    }
  }, [getResolvedTheme]);

  // Set theme and persist to localStorage
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme', newTheme);
    }
    updateTheme(newTheme);
  }, [updateTheme]);

  // Toggle between light and dark (ignores system)
  const toggleTheme = useCallback(() => {
    const newTheme = resolvedTheme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  }, [resolvedTheme, setTheme]);

  // Initialize theme on mount
  useEffect(() => {
    let initialTheme: Theme = 'system';

    // Check localStorage for saved preference
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        initialTheme = savedTheme;
      }
    }

    setThemeState(initialTheme);
    updateTheme(initialTheme);
  }, [updateTheme]);

  // Listen for system theme changes when using system theme
  useEffect(() => {
    if (typeof window === 'undefined' || theme !== 'system') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = () => {
      updateTheme('system');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, updateTheme]);

  const value: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}