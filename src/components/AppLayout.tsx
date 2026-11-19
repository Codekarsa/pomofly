'use client'
import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import Sidebar from './Sidebar';
import SettingsModal from './SettingsModal';
import GuestBanner from './GuestBanner';
import { defaultSettings } from '@/hooks/usePomodoro';
import { usePomodoroSettings } from '@/app/contexts/PomodoroSettingsContext';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { Button } from "@/components/ui/button";
import { Settings } from 'lucide-react';
import { signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { hasGuestData, getGuestDataSummary } from '@/lib/guestStorage';

// Lazy load DataMigrationModal since it's only shown conditionally
const DataMigrationModal = lazy(() => import('./DataMigrationModal'));

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { settings, updateSettings } = usePomodoroSettings();
  const [showGuestBanner, setShowGuestBanner] = useState(true);
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [guestDataSummary, setGuestDataSummary] = useState({ taskCount: 0, projectCount: 0 });
  const { event } = useGoogleAnalytics();

  useEffect(() => {
    setShowGuestBanner(localStorage.getItem('guestBannerDismissed') !== 'true');
  }, []);

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
    localStorage.setItem('guestBannerDismissed', 'true');
    setShowGuestBanner(false);
  }, []);

  const handleCloseMigrationModal = useCallback(() => {
    setShowMigrationModal(false);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  const isGuest = !user;

  return (
    <div className="flex flex-col md:flex-row h-dvh bg-gray-100">
      <Sidebar onSettingsClick={handleSettingsOpen} />
      <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
        {/* Guest Banner */}
        {isGuest && showGuestBanner && (
          <GuestBanner onDismiss={handleDismissGuestBanner} />
        )}
        {/* Top Header */}
        <header className="shrink-0 bg-white border-b border-gray-200 px-4 md:px-6 py-3">
          <div className="flex justify-between items-center">
            <span className="md:hidden text-xl font-semibold text-gray-900">Pomofly</span>
            <div className="flex items-center space-x-2 ml-auto">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={handleSettingsOpen} aria-label="Settings">
                <Settings className="w-5 h-5" />
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
        <main className="flex-1 min-h-0 overflow-y-auto">
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
      <Suspense fallback={null}>
        <DataMigrationModal
          isOpen={showMigrationModal}
          onClose={handleCloseMigrationModal}
          taskCount={guestDataSummary.taskCount}
          projectCount={guestDataSummary.projectCount}
        />
      </Suspense>
    </div>
  );
};

export default AppLayout;
