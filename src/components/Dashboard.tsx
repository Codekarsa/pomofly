'use client'

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import Header from './Header';
import PomodoroTimer from './PomodoroTimer';
import TaskList from './TaskList';
import ProjectList from './ProjectList';
import SettingsModal from './SettingsModal';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';

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
  const { event } = useGoogleAnalytics();

  useEffect(() => {
    const savedSettings = localStorage.getItem('pomodoroSettings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings(parsedSettings);
      event('settings_loaded', { 
        pomodoro: parsedSettings.pomodoro,
        shortBreak: parsedSettings.shortBreak,
        longBreak: parsedSettings.longBreak,
        longBreakInterval: parsedSettings.longBreakInterval
      });
    } else {
      event('default_settings_used', {});
    }
  }, [event]);

  useEffect(() => {
    event('dashboard_view', { 
      is_authenticated: !!user 
    });
  }, [user, event]);

  const handleSettingsSave = (newSettings: typeof defaultSettings) => {
    setSettings(newSettings);
    localStorage.setItem('pomodoroSettings', JSON.stringify(newSettings));
    setIsSettingsOpen(false);
    event('settings_saved', { 
      pomodoro: newSettings.pomodoro,
      shortBreak: newSettings.shortBreak,
      longBreak: newSettings.longBreak,
      longBreakInterval: newSettings.longBreakInterval
    });
  };

  const handleSettingsOpen = () => {
    setIsSettingsOpen(true);
    event('settings_modal_opened', {});
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
    event('settings_modal_closed', {});
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen bg-[#CCCCCC]">
      <Header onSettingsClick={handleSettingsOpen} />
      <main className="container mx-auto px-4 py-8">
        {user ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <PomodoroTimer settings={settings} />
            </div>
            <div>
              <div className="space-y-8">
                <ProjectList />
                <TaskList />
              </div>
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
        onClose={handleSettingsClose}
        settings={settings}
        onSave={handleSettingsSave}
      />
    </div>
  );
}