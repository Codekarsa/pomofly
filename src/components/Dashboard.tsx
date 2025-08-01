'use client'
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import Header from './Header';
import PomodoroTimer from './PomodoroTimer';
import TaskList from './TaskList';
import ProjectList from './ProjectList';
import SettingsModal from './SettingsModal';
import TodayFocusSection from './TodayFocusSection';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { Github } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { usePomodoro, defaultSettings } from '@/hooks/usePomodoro';

export default function Dashboard() {
  const { user, loading } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { event } = useGoogleAnalytics();
  const [settings, setSettings] = useState(defaultSettings);

  const { updateSettings } = usePomodoro(settings);

  useEffect(() => {
    const savedSettings = localStorage.getItem('pomodoroSettings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings(parsedSettings);
    }
  }, []);

  useEffect(() => {
    const savedSettings = localStorage.getItem('pomodoroSettings');
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
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

  const memoizedEvent = useCallback(event, [event]);

  useEffect(() => {
    event('dashboard_view', {
      is_authenticated: !!user
    });
  }, [user, event]);

  const handleSettingsOpen = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleSettingsClose = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const handleSettingsSave = useCallback((newSettings: typeof defaultSettings) => {
    setSettings(newSettings);
    updateSettings(newSettings);
    setIsSettingsOpen(false);
    event('settings_saved', {
      pomodoro: newSettings.pomodoro,
      shortBreak: newSettings.shortBreak,
      longBreak: newSettings.longBreak,
      longBreakInterval: newSettings.longBreakInterval
    });
  }, [event, updateSettings]);

  const memoizedSettings = useMemo(() => settings, [settings]);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      event('user_sign_in', { method: 'Google' });
    } catch (error) {
      console.error('Error signing in:', error);
      event('sign_in_error', { error: (error as Error).message });
    }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <>
      <div className="flex flex-col min-h-screen">
        <Header onSettingsClick={handleSettingsOpen} />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
              <PomodoroTimer settings={memoizedSettings} />
              {user && <ProjectList />}
            </div>
            <div className="space-y-8">
              {user ? (
                <>
                  <TodayFocusSection settings={settings} />
                  <TaskList settings={settings} />
                </>
              ) : (
                <div className="bg-white p-6 rounded-lg shadow-md">
                  <h2 className="text-xl font-semibold mb-4">Welcome to Pomofly, an Elegant and Minimal Pomodoro Timer</h2>
                  <p className="text-gray-600 mb-4">Sign in to access task and project management features.</p>
                  <Button onClick={handleSignIn} className="w-full sm:w-auto">
                    Sign in with Google
                  </Button>
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
          event={memoizedEvent}
        />
        <Footer />
      </div>
      <AutoBacklink />
    </>
  );
}

const Footer = () => (
  <footer className="bg-background border-t py-2 text-sm text-muted-foreground mt-auto">
    <div className="container mx-auto px-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-4">
          <span>© 2024 Pomofly</span>
          <Separator orientation="vertical" className="h-4" />
          <a href="/#" className="hover:underline">Privacy</a>
          <a href="/#" className="hover:underline">Terms</a>
        </div>
        <div className="flex items-center space-x-4">
          <span>Made with ❤️ by Codekarsa</span>
          <Button variant="ghost" size="icon">
            <Github className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  </footer>
);

const AutoBacklink = () => (
  <div className="bg-background border-t py-4 w-full text-sm text-muted-foreground mx-auto overflow-hidden">
    <div className='text-lg font-bold px-28 mb-4'>Indie Hacker</div>
    <div className="autobacklink grid grid-cols-6 gap-4 px-28"></div>
  </div>
);