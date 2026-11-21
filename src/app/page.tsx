'use client'
import React, { Suspense, useEffect } from 'react';
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
        <div className="max-w-5xl mx-auto">
          <div className="sm:py-4">
            <Suspense fallback={<p className="text-center text-muted-foreground">Loading timer…</p>}>
              {loaded && <PomodoroTimer settings={settings} />}
            </Suspense>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
