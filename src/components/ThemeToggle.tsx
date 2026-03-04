/**
 * Theme toggle component with multiple theme options
 */

'use client';

import React from 'react';
import { Monitor, Moon, Sun, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/ThemeContext';

interface ThemeToggleProps {
  variant?: 'default' | 'icon' | 'text';
  size?: 'sm' | 'default' | 'lg';
  showLabel?: boolean;
  className?: string;
}

export function ThemeToggle({ 
  variant = 'icon', 
  size = 'default',
  showLabel = false,
  className = '' 
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, systemTheme, isSystemTheme } = useTheme();

  const getThemeIcon = () => {
    switch (resolvedTheme) {
      case 'dark':
        return <Moon className="h-4 w-4" />;
      case 'light':
        return <Sun className="h-4 w-4" />;
      default:
        return <Monitor className="h-4 w-4" />;
    }
  };

  const getThemeLabel = () => {
    if (isSystemTheme) {
      return `Auto (${systemTheme})`;
    }
    return resolvedTheme === 'dark' ? 'Dark' : 'Light';
  };

  if (variant === 'icon') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size={size === 'sm' ? 'sm' : 'icon'}
            className={`relative ${className}`}
            aria-label={`Theme toggle. Current theme: ${getThemeLabel()}`}
          >
            {getThemeIcon()}
            {isSystemTheme && (
              <div className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-blue-500" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel className="flex items-center space-x-2">
            <Palette className="h-4 w-4" />
            <span>Theme</span>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setTheme('light')}
            className={theme === 'light' ? 'bg-accent' : ''}
          >
            <Sun className="h-4 w-4 mr-2" />
            <span>Light</span>
            {theme === 'light' && (
              <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setTheme('dark')}
            className={theme === 'dark' ? 'bg-accent' : ''}
          >
            <Moon className="h-4 w-4 mr-2" />
            <span>Dark</span>
            {theme === 'dark' && (
              <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
          
          <DropdownMenuItem 
            onClick={() => setTheme('system')}
            className={theme === 'system' ? 'bg-accent' : ''}
          >
            <Monitor className="h-4 w-4 mr-2" />
            <span>System</span>
            {theme === 'system' && (
              <div className="ml-auto h-2 w-2 rounded-full bg-primary" />
            )}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'text') {
    return (
      <Button 
        variant="ghost" 
        size={size}
        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        className={`space-x-2 ${className}`}
      >
        {getThemeIcon()}
        {showLabel && <span>{getThemeLabel()}</span>}
      </Button>
    );
  }

  // Default variant - simple toggle button
  return (
    <Button 
      variant="outline" 
      size={size}
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className={`space-x-2 ${className}`}
    >
      {getThemeIcon()}
      {showLabel && <span>{getThemeLabel()}</span>}
    </Button>
  );
}

/**
 * Simple theme toggle for inline use
 */
export function SimpleThemeToggle({ className = '' }: { className?: string }) {
  const { toggleTheme, resolvedTheme } = useTheme();
  
  return (
    <Button 
      variant="ghost" 
      size="icon"
      onClick={toggleTheme}
      className={className}
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
    </Button>
  );
}

export default ThemeToggle;