'use client'

import React from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { auth, googleProvider } from '../lib/firebase';
import { signOut, signInWithPopup } from 'firebase/auth';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { Button } from '@/components/ui/button';
import { Github } from 'lucide-react';

export default function Header({ onSettingsClick }: { onSettingsClick: () => void }) {
  const { user } = useAuth();
  const { event } = useGoogleAnalytics();

  const handleSignOut = async () => {
    try {
      event('sign_out_attempt', {});
      await signOut(auth);
      event('sign_out_success', {});
    } catch (error) {
      console.error("Error signing out:", error);
      event('sign_out_error', { error_message: (error as Error).message });
    }
  };

  const handleSignIn = async () => {
    try {
      event('sign_in_attempt', { method: 'google' });
      const result = await signInWithPopup(auth, googleProvider);
      event('sign_in_success', { 
        method: 'google',
        user_id: result.user.uid 
      });
    } catch (error: unknown) { 
      console.error("Error signing in with Google", error);
      event('sign_in_error', { 
        method: 'google',
        error_message: (error as Error).message
      });
    }
  };

  const handleSettingsClick = () => {
    event('settings_button_click', {});
    onSettingsClick();
  };

  return (
    <header className="bg-background border-b">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-semibold text-foreground">Pomofly</h1>
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
          <Button variant="ghost" size="sm" onClick={handleSettingsClick}>
            Settings
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
  );
}