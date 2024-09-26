'use client'

import React from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import Header from './Header';
import PomodoroTimer from './PomodoroTimer';
import TaskList from './TaskList';
import ProjectList from './ProjectList';
import Login from './Login';

export default function Dashboard() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {user ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <ProjectList />
              <TaskList />
            </div>
            <div>
              <PomodoroTimer />
            </div>
          </div>
        ) : (
          <div>
            <PomodoroTimer />
            <div className="mt-8">
              <p className="mb-4">Sign in to access task management features:</p>
              <Login />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}