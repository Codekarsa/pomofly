'use client';
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import TaskList from '@/components/TaskList';
import TodayFocusSection from '@/components/TodayFocusSection';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { defaultSettings } from '@/hooks/usePomodoro';
import { safeLocalStorage } from '@/lib/safeLocalStorage';

export default function TasksPage() {
  const { user } = useAuth();
  const { event } = useGoogleAnalytics();
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    const parsedSettings = safeLocalStorage.getItem('pomodoroSettings', null);
    if (parsedSettings) {
      setSettings(parsedSettings);
    }
  }, []);

  useEffect(() => {
    event('tasks_page_view', {
      is_authenticated: !!user,
    });
  }, [user, event]);

  return (
    <AppLayout>
<<<<<<< HEAD
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Tasks</h1>
            <p className="text-muted-foreground">Manage your tasks and focus on what matters most.</p>
          </div>
          
          <div className="space-y-8">
=======
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 px-2 sm:mb-8">
            <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Tasks</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Manage your tasks and focus on what matters most.
            </p>
          </div>

          <div className="space-y-6 sm:space-y-8">
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)
            <TodayFocusSection settings={settings} />
            <TaskList settings={settings} />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
