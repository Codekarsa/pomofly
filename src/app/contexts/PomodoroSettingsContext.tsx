'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { defaultSettings } from '@/hooks/usePomodoro';

const PomodoroSettingsContext = createContext<{
  settings: typeof defaultSettings;
  loaded: boolean;
  updateSettings: (settings: typeof defaultSettings) => void;
} | null>(null);

export function PomodoroSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState(defaultSettings);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('pomodoroSettings');
    if (saved) setSettings(JSON.parse(saved));
    setLoaded(true);
  }, []);

  const updateSettings = useCallback((next: typeof defaultSettings) => {
    localStorage.setItem('pomodoroSettings', JSON.stringify(next));
    setSettings(next);
  }, []);

  return (
    <PomodoroSettingsContext.Provider value={{ settings, loaded, updateSettings }}>
      {children}
    </PomodoroSettingsContext.Provider>
  );
}

export function usePomodoroSettings() {
  const context = useContext(PomodoroSettingsContext);
  if (!context) throw new Error('usePomodoroSettings requires PomodoroSettingsProvider');
  return context;
}
