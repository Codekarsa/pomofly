'use client'
import React, { useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import PomodoroTimer from '@/components/PomodoroTimer';
import { ComponentErrorBoundary } from '@/components/ErrorBoundary';
import { defaultSettings } from '@/hooks/usePomodoro';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { PomodoroSettingsCache, AppCacheManager } from '@/lib/appCache';

export default function HomePage() {
  const [settings, setSettings] = useState(defaultSettings);
  const { event } = useGoogleAnalytics();

  useEffect(() => {
    // Initialize cache management
    AppCacheManager.initialize();

    const savedSettings = PomodoroSettingsCache.get();
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, []);

  useEffect(() => {
    event('timer_page_view', {});
  }, [event]);

  const memoizedSettings = useMemo(() => settings, [settings]);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 sm:mb-8 text-center px-2">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Pomodoro Timer</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Focus on your work with timed sessions</p>
          </div>
          <div className="px-2 sm:px-0">
            <ComponentErrorBoundary>
              <PomodoroTimer settings={memoizedSettings} />
            </ComponentErrorBoundary>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}