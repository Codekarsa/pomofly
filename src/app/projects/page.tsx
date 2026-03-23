'use client';
import React from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import AppLayout from '@/components/AppLayout';
import ProjectList from '@/components/ProjectList';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';

export default function ProjectsPage() {
  const { user } = useAuth();
  const { event } = useGoogleAnalytics();

  React.useEffect(() => {
    event('projects_page_view', {
      is_authenticated: !!user,
    });
  }, [user, event]);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 px-2 sm:mb-8">
            <h1 className="mb-2 text-2xl font-bold sm:text-3xl">Projects</h1>
            <p className="text-sm text-muted-foreground sm:text-base">
              Organize your work into projects and track progress.
            </p>
          </div>

          <ProjectList />
        </div>
      </div>
    </AppLayout>
  );
}
