'use client'
import React, { useState, useCallback, useEffect, Suspense, lazy } from 'react';
import Link from 'next/link';
import { useAuth } from '@/app/contexts/AuthContext';
import Sidebar from './Sidebar';
import SettingsModal from './SettingsModal';
import GuestBanner from './GuestBanner';
import RunningTasksTray from './RunningTasksTray';
import { defaultSettings } from '@/hooks/usePomodoro';
import { usePomodoroSettings } from '@/app/contexts/PomodoroSettingsContext';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { Button } from "@/components/ui/button";
import { Settings, Sprout } from 'lucide-react';
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
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <div className="flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden">
        {/* Guest Banner */}
        {isGuest && showGuestBanner && (
          <GuestBanner onDismiss={handleDismissGuestBanner} />
        )}
        {/* Top Header */}
        <header className="shrink-0 border-b bg-background px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-3 gap-y-2">
            <Link href="/" className="flex items-center gap-2 text-xl font-semibold tracking-tight" aria-label="Pomofly home">
              <Sprout className="h-6 w-6 text-primary" aria-hidden="true" />pomofly
            </Link>
            <Sidebar />
            <div className="ml-auto flex items-center gap-1">
              {user && <span className="hidden max-w-36 truncate text-xs text-muted-foreground md:block" title={user.email || undefined}>{user.displayName || user.email}</span>}
              <Button variant="ghost" size="icon" onClick={handleSettingsOpen} aria-label="Settings">
                <Settings className="w-5 h-5" />
              </Button>
              {user ? (
                <Button variant="ghost" size="sm" onClick={handleSignOut}>
                  Sign Out
                </Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={handleSignIn}>
                  Sign In
                </Button>
              )}
            </div>
          </div>
        </header>
        <RunningTasksTray />
        <main className="flex-1 min-h-0 overflow-y-auto">
          {children}
          <footer className="mx-auto flex max-w-5xl flex-wrap justify-between gap-3 px-4 py-6 text-xs text-muted-foreground">
            <span>Your pace. Your progress.</span>
            <a href="https://github.com/Codekarsa/pomofly" target="_blank" rel="noopener noreferrer" className="hover:underline">Source on GitHub</a>
          </footer>
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
