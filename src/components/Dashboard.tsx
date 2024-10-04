'use client'
import React, { useState, useEffect, useMemo } from 'react';
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

  const memoizedSettings = useMemo(() => settings, [settings]);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header onSettingsClick={handleSettingsOpen} />
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-8">
            <PomodoroTimer settings={memoizedSettings} />
            {user && <ProjectList />}
          </div>
          <div className="space-y-8">
            {user ? (
              <TaskList />
            ) : (
              <div className="bg-white p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-semibold mb-4">Welcome to Pomodoro Timer</h2>
                <p className="text-gray-600">Sign in to access task and project management features.</p>
              </div>
            )}
          </div>
        </div>
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