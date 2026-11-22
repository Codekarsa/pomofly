'use client'
import React, { useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import TaskList from '@/components/TaskList';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';

export default function TasksPage() {
  const { user } = useAuth();
  const { event } = useGoogleAnalytics();

  useEffect(() => {
    event('tasks_page_view', {
      is_authenticated: !!user
    });
  }, [user, event]);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-4 sm:py-8">
        {/* Week and Calendar boards need room for seven day columns. */}
        <div className="max-w-4xl mx-auto has-[[data-wide-plan]]:max-w-6xl">
          <div className="mb-6 sm:mb-8 px-2">
            <h1 className="font-display mb-3 text-4xl sm:text-5xl">Make space for the week.</h1>
            <p className="text-muted-foreground text-sm">Your tasks, at a pace that works for you. Plan a day or choose one thing to focus on.</p>
          </div>
          
          <div className="space-y-6 sm:space-y-8">
            <TaskList />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
