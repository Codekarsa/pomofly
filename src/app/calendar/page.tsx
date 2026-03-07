'use client'
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import WeeklyCalendar from '@/components/WeeklyCalendar';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { defaultSettings } from '@/hooks/usePomodoro';

export default function CalendarPage() {
  const { user } = useAuth();
  const { event } = useGoogleAnalytics();
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    const savedSettings = localStorage.getItem('pomodoroSettings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings(parsedSettings);
    }
  }, []);

  useEffect(() => {
    event('calendar_page_view', {
      is_authenticated: !!user
    });
  }, [user, event]);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6 sm:mb-8 px-2">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Weekly Calendar</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              View and manage your tasks in a weekly calendar format.
            </p>
          </div>
          
          <WeeklyCalendar settings={settings} />
        </div>
      </div>
    </AppLayout>
  );
}