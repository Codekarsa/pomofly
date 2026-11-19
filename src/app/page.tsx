'use client'
import React, { useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import PomodoroTimer from '@/components/PomodoroTimer';
import { usePomodoroSettings } from '@/app/contexts/PomodoroSettingsContext';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';

export default function HomePage() {
  const { settings, loaded } = usePomodoroSettings();
  const { event } = useGoogleAnalytics();

  useEffect(() => {
    event('timer_page_view', {});
  }, [event]);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 sm:mb-8 text-center px-2">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Pomodoro Timer</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Work for {settings.pomodoro} minutes, then take a {settings.shortBreak}-minute break. Repeat, with a longer break every {settings.longBreakInterval} focus sessions.</p>
          </div>
          <div className="px-2 sm:px-0">
            {loaded && <PomodoroTimer settings={settings} />}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
