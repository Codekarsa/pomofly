'use client';
import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import PomodoroTimer from '@/components/PomodoroTimer';
import { defaultSettings } from '@/hooks/usePomodoro';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { safeLocalStorage } from '@/lib/safeLocalStorage';

export default function HomePage() {
  const [settings, setSettings] = useState(defaultSettings);
  const { event } = useGoogleAnalytics();

  useEffect(() => {
    const parsedSettings = safeLocalStorage.getItem('pomodoroSettings', null);
    if (parsedSettings) {
      setSettings(parsedSettings);
    }
  }, []);

  useEffect(() => {
    event('timer_page_view', {});
  }, [event]);

  const memoizedSettings = useMemo(() => settings, [settings]);

  return (
    <AppLayout>
<<<<<<< HEAD
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Pomodoro Timer</h1>
            <p className="text-muted-foreground">Focus on your work with timed sessions</p>
=======
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 px-2 text-center sm:mb-8">
            <h1 className="mb-2 text-2xl font-bold sm:text-3xl">
              Pomodoro Timer
            </h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Focus on your work with timed sessions
            </p>
          </div>
          <div className="px-2 sm:px-0">
            <PomodoroTimer settings={memoizedSettings} />
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)
          </div>
          <PomodoroTimer settings={memoizedSettings} />
        </div>
      </div>
    </AppLayout>
  );
}
