'use client'
import React, { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import Sidebar from './Sidebar';
import SettingsModal from './SettingsModal';
import GuestBanner from './GuestBanner';
import DataMigrationModal from './DataMigrationModal';
import AuthErrorFallback from './AuthErrorFallback';
import { usePomodoro, defaultSettings } from '@/hooks/usePomodoro';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { Button } from "@/components/ui/button";
import { Github } from 'lucide-react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { hasGuestData, getGuestDataSummary } from '@/lib/guestStorage';

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, loading, error, retry, clearError, isOnline } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState(defaultSettings);
  const [showGuestBanner, setShowGuestBanner] = useState(true);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [guestDataSummary, setGuestDataSummary] = useState({ taskCount: 0, projectCount: 0 });
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
      clearError(); // Clear any previous errors
      await signInWithPopup(auth, googleProvider);
      event('user_sign_in', { method: 'Google' });
    } catch (error) {
      console.error('Error signing in:', error);
      event('sign_in_error', { error: (error as Error).message });
      
      // Don't automatically set this as the auth context error since it's a user action
      // The user can try again or use a different method
      if (error instanceof Error) {
        // You could show a toast or alert here instead of setting the global auth error
        console.warn('Sign-in failed:', error.message);
      }
    }
  };

  const handleSignOut = async () => {
    try {
      clearError(); // Clear any previous errors
      await signOut(auth);
      event('user_sign_out', { method: 'Google' });
    } catch (error) {
      console.error('Error signing out:', error);
      event('sign_out_error', { error: (error as Error).message });
      
      // Sign-out errors are less critical, user can retry or refresh page
      if (error instanceof Error) {
        console.warn('Sign-out failed:', error.message);
      }
    }
  };

  const handleDismissGuestBanner = useCallback(() => {
    setShowGuestBanner(false);
  }, []);

  const handleCloseMigrationModal = useCallback(() => {
    setShowMigrationModal(false);
  }, []);

  // Enhanced loading state with error handling
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {!isOnline ? 'Waiting for connection...' : 'Loading...'}
          </p>
        </div>
      </div>
    );
  }

  // Show authentication error fallback if there's an error
  if (error) {
    return (
      <AuthErrorFallback 
        error={error} 
        onRetry={() => {
          clearError();
          retry();
        }}
      />
    );
  }

  const isGuest = !user;

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar onSettingsClick={handleSettingsOpen} onSignIn={handleSignIn} />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Guest Banner */}
        {isGuest && showGuestBanner && (
          <GuestBanner onSignIn={handleSignIn} onDismiss={handleDismissGuestBanner} />
        )}
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-900">Pomofly</h1>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm" asChild>
                <a
                  href="https://github.com/Codekarsa/pomofly"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center"
                >
                  <Github className="w-4 h-4 mr-2" />
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
