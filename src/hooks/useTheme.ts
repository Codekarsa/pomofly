/**
 * Theme management hook with system preference detection and persistence
 */

import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
}

const THEME_STORAGE_KEY = 'pomofly-theme';
const THEME_ATTRIBUTE = 'data-theme';

/**
 * Get system theme preference
 */
function getSystemTheme(): ResolvedTheme {
  if (typeof window === 'undefined') return 'light';
  
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Get stored theme preference with fallback
 */
function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored && ['light', 'dark', 'system'].includes(stored)) {
      return stored as Theme;
    }
  } catch {
    // localStorage might not be available
  }
  
  return 'system';
}

/**
 * Apply theme to document
 */
function applyTheme(resolvedTheme: ResolvedTheme) {
  if (typeof window === 'undefined') return;
  
  const root = window.document.documentElement;
  
  // Remove previous theme classes
  root.classList.remove('light', 'dark');
  
  // Add new theme class
  root.classList.add(resolvedTheme);
  
  // Set data attribute for CSS targeting
  root.setAttribute(THEME_ATTRIBUTE, resolvedTheme);
  
  // Set meta theme color for mobile browsers
  const metaThemeColor = window.document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute(
      'content', 
      resolvedTheme === 'dark' ? '#0a0a0a' : '#ffffff'
    );
  } else {
    // Create meta tag if it doesn't exist
    const meta = window.document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = resolvedTheme === 'dark' ? '#0a0a0a' : '#ffffff';
    window.document.head.appendChild(meta);
  }
}

/**
 * Resolve theme based on user preference and system preference
 */
function resolveTheme(theme: Theme, systemTheme: ResolvedTheme): ResolvedTheme {
  if (theme === 'system') return systemTheme;
  return theme;
}

/**
 * Theme hook with system preference detection and persistence
 */
export function useTheme() {
  const [state, setState] = useState<ThemeState>(() => {
    const systemTheme = getSystemTheme();
    const storedTheme = getStoredTheme();
    const resolvedTheme = resolveTheme(storedTheme, systemTheme);
    
    return {
      theme: storedTheme,
      resolvedTheme,
      systemTheme,
    };
  });

  // Apply theme changes to DOM
  useEffect(() => {
    applyTheme(state.resolvedTheme);
  }, [state.resolvedTheme]);

  // Listen for system theme changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const handleChange = (e: MediaQueryListEvent) => {
      const newSystemTheme: ResolvedTheme = e.matches ? 'dark' : 'light';
      
      setState(prev => {
        const newResolvedTheme = resolveTheme(prev.theme, newSystemTheme);
        return {
          ...prev,
          systemTheme: newSystemTheme,
          resolvedTheme: newResolvedTheme,
        };
      });
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  // Set theme and persist preference
  const setTheme = useCallback((newTheme: Theme) => {
    setState(prev => {
      const newResolvedTheme = resolveTheme(newTheme, prev.systemTheme);
      
      // Persist theme preference
      try {
        localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      } catch {
        // Silently fail if localStorage is not available
        console.warn('Failed to persist theme preference');
      }
      
      return {
        ...prev,
        theme: newTheme,
        resolvedTheme: newResolvedTheme,
      };
    });
  }, []);

  // Toggle between light and dark (skips system)
  const toggleTheme = useCallback(() => {
    setTheme(state.resolvedTheme === 'dark' ? 'light' : 'dark');
  }, [state.resolvedTheme, setTheme]);

  // Set to system preference
  const setSystemTheme = useCallback(() => {
    setTheme('system');
  }, [setTheme]);

  return {
    theme: state.theme,
    resolvedTheme: state.resolvedTheme,
    systemTheme: state.systemTheme,
    setTheme,
    toggleTheme,
    setSystemTheme,
    isSystemTheme: state.theme === 'system',
  };
}