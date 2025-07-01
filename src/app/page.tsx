'use client'
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
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Pomodoro Timer</h1>
            <p className="text-muted-foreground">Focus on your work with timed sessions</p>
          </div>
          <PomodoroTimer settings={memoizedSettings} />
        </div>
      </div>
    </AppLayout>
  );
}