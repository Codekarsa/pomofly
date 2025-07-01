'use client'
import React, { useState, useCallback } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import Sidebar from './Sidebar';
import SettingsModal from './SettingsModal';
import { usePomodoro, defaultSettings } from '@/hooks/usePomodoro';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { Button } from "@/components/ui/button";
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const { event } = useGoogleAnalytics();

  const { updateSettings } = usePomodoro(settings);

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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md text-center max-w-md">
          <h1 className="text-3xl font-bold mb-4">Welcome to Pomofly</h1>
          <p className="text-gray-600 mb-6">An elegant and minimal Pomodoro timer for productive focus.</p>
          <Button onClick={handleSignIn} className="w-full">
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar onSettingsClick={handleSettingsOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleSettingsClose}
        settings={settings}
        onSave={handleSettingsSave}
        event={event}
      />
    </div>
  );
};

export default AppLayout; 