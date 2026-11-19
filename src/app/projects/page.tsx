'use client'
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
      is_authenticated: !!user
    });
  }, [user, event]);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6 sm:mb-8 px-2">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Projects</h1>
            <p className="text-muted-foreground text-sm sm:text-base">Create and manage project names to organize your tasks. Filter by project on the Tasks page.</p>
          </div>
          
          <ProjectList />
        </div>
      </div>
    </AppLayout>
  );
}
