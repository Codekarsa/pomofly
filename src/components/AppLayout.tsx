<<<<<<< HEAD
'use client'
import React, { useState, useCallback, useEffect } from 'react';
=======
'use client';
import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)
import { useAuth } from '@/app/contexts/AuthContext';
import Sidebar from './Sidebar';
import SettingsModal from './SettingsModal';
import GuestBanner from './GuestBanner';
import DataMigrationModal from './DataMigrationModal';
import { usePomodoro, defaultSettings } from '@/hooks/usePomodoro';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { hasGuestData, getGuestDataSummary } from '@/lib/guestStorage';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, loading, error, retry } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [showGuestBanner, setShowGuestBanner] = useState(true);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [guestDataSummary, setGuestDataSummary] = useState({
    taskCount: 0,
    projectCount: 0,
  });
  const { event } = useGoogleAnalytics();

  const { updateSettings } = usePomodoro(settings);

  // Check for guest data when user signs in
  useEffect(() => {
    if (user && hasGuestData()) {
      const summary = getGuestDataSummary();
      setGuestDataSummary(summary);
      setShowMigrationModal(true);
    }
  }, [user]);

  const handleSettingsOpen = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleSettingsClose = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  const handleSettingsSave = useCallback(
    (newSettings: typeof defaultSettings) => {
      setSettings(newSettings);
      updateSettings(newSettings);
      setIsSettingsOpen(false);
      event('settings_saved', {
        pomodoro: newSettings.pomodoro,
        shortBreak: newSettings.shortBreak,
        longBreak: newSettings.longBreak,
        longBreakInterval: newSettings.longBreakInterval,
      });
    },
    [event, updateSettings]
  );

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      event('user_sign_in', { method: 'Google' });
    } catch (error) {
      console.error('Error signing in:', error);
      event('sign_in_error', { error: (error as Error).message });
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      event('user_sign_out', { method: 'Google' });
    } catch (error) {
      console.error('Error signing out:', error);
      event('sign_out_error', { error: (error as Error).message });
    }
  };

  const handleDismissGuestBanner = useCallback(() => {
    setShowGuestBanner(false);
  }, []);

  const handleCloseMigrationModal = useCallback(() => {
    setShowMigrationModal(false);
  }, []);

<<<<<<< HEAD
  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  
  // Show authentication error with retry option
  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Authentication Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="space-y-2">
            <Button onClick={retry} className="w-full">
              Retry Authentication
            </Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      </div>
    );
  }
=======
  if (loading)
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)

  const isGuest = !user;

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar onSettingsClick={handleSettingsOpen} onSignIn={handleSignIn} />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Guest Banner */}
        {isGuest && showGuestBanner && (
          <GuestBanner
            onSignIn={handleSignIn}
            onDismiss={handleDismissGuestBanner}
          />
        )}
        {/* Top Header */}
        <header className="border-b border-gray-200 bg-white px-6 py-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Pomofly</h1>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" asChild>
                <a
                  href="https://github.com/Codekarsa/pomofly"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  <Github className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Star on GitHub</span>
                </a>
              </Button>
              {user ? (
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  Sign Out
                </Button>
              ) : (
                <Button variant="default" size="sm" onClick={handleSignIn}>
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleSettingsClose}
        settings={settings}
        onSave={handleSettingsSave}
        event={event}
      />
      <DataMigrationModal
        isOpen={showMigrationModal}
        onClose={handleCloseMigrationModal}
        taskCount={guestDataSummary.taskCount}
        projectCount={guestDataSummary.projectCount}
      />
    </div>
  );
};

export default AppLayout;
