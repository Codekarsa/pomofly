'use client';
import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import PomodoroTimer from '@/components/PomodoroTimer';
import { defaultSettings } from '@/hooks/usePomodoro';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';

export default function HomePage() {
  const [settings, setSettings] = useState(defaultSettings);
  const { event } = useGoogleAnalytics();

  useEffect(() => {
    const savedSettings = localStorage.getItem('pomodoroSettings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings(parsedSettings);
    }
  }, []);

  useEffect(() => {
    event('timer_page_view', {});
  }, [event]);

  const memoizedSettings = useMemo(() => settings, [settings]);

  return (
    <AppLayout>
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
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
