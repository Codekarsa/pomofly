'use client'
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import TaskList from '@/components/TaskList';
import TodayFocusSection from '@/components/TodayFocusSection';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { defaultSettings } from '@/hooks/usePomodoro';
import { PomodoroSettingsCache } from '@/lib/appCache';

export default function TasksPage() {
  const { user } = useAuth();
  const { event } = useGoogleAnalytics();
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    const savedSettings = PomodoroSettingsCache.get();
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, []);

  useEffect(() => {
    event('tasks_page_view', {
      is_authenticated: !!user
    });
  }, [user, event]);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8 px-2">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Tasks</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Manage your tasks and focus on what matters most.</p>
          </div>
          
          <div className="space-y-6 sm:space-y-8">
            <TodayFocusSection settings={settings} />
            <TaskList settings={settings} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
} 