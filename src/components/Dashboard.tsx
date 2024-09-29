'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import Header from './Header';
import PomodoroTimer from './PomodoroTimer';
import TaskList from './TaskList';
import ProjectList from './ProjectList';
import SettingsModal from './SettingsModal'; // Add this import

const defaultSettings = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4
};

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);

  useEffect(() => {
    const savedSettings = localStorage.getItem('pomodoroSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  const handleSettingsSave = (newSettings: typeof defaultSettings) => {
    setSettings(newSettings);
    localStorage.setItem('pomodoroSettings', JSON.stringify(newSettings));
    setIsSettingsOpen(false);
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-[#CCCCCC]">
      <Header onSettingsClick={() => setIsSettingsOpen(true)} />
      <main className="container mx-auto px-4 py-8">
        {user ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <ProjectList />
              <TaskList />
            </div>
            <div>
              <PomodoroTimer settings={settings} />
            </div>
          </div>
        ) : (
          <div className='flex flex-col items-center justify-center'>
            <PomodoroTimer settings={settings} />
            <div className="mt-8">
              <p className="mb-4 text-[#333333]">Sign in to access task and project management features.</p>
            </div>
          </div>
        )}
      </main>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSave={handleSettingsSave}
      />
    </div>
  );
}