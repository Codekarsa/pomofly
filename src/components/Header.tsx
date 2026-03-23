'use client';

import React from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { auth, googleProvider } from '../lib/firebase';
import { signOut, signInWithPopup } from 'firebase/auth';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { Button } from '@/components/ui/button';
import { MobileButton } from '@/components/ui/mobile-button';
import { Github, Menu, X } from 'lucide-react';
import { useState } from 'react';

export default function Header({
  onSettingsClick,
}: {
  onSettingsClick: () => void;
}) {
  const { user } = useAuth();
  const { event } = useGoogleAnalytics();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      event('sign_out_attempt', {});
      await signOut(auth);
      event('sign_out_success', {});
    } catch (error) {
      console.error('Error signing out:', error);
      event('sign_out_error', { error_message: (error as Error).message });
    }
  };

  const handleSignIn = async () => {
    try {
      event('sign_in_attempt', { method: 'google' });
      const result = await signInWithPopup(auth, googleProvider);
      event('sign_in_success', {
        method: 'google',
        user_id: result.user.uid,
      });
    } catch (error: unknown) {
      console.error('Error signing in with Google', error);
      event('sign_in_error', {
        method: 'google',
        error_message: (error as Error).message,
      });
    }
  };

  const handleSettingsClick = () => {
    event('settings_button_click', {});
    onSettingsClick();
  };

  return (
    <header className="border-b bg-background">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <h1 className="text-xl font-semibold text-foreground">Pomofly</h1>

        {/* Desktop Navigation */}
        <div className="hidden items-center space-x-2 md:flex">
          <Button variant="ghost" size="sm" asChild>
            <a
              href="https://github.com/Codekarsa/pomofly"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center"
            >
              <Github className="mr-2 h-4 w-4" />
              <span>Star on GitHub</span>
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

        {/* Mobile Menu Button */}
        <MobileButton
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </MobileButton>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="border-t bg-background md:hidden">
          <div className="container mx-auto flex flex-col space-y-2 px-4 py-2">
            <MobileButton
              variant="ghost"
              className="h-12 justify-start"
              asChild
            >
              <a
                href="https://github.com/Codekarsa/pomofly"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center"
                onClick={() => setMobileMenuOpen(false)}
              >
                <Github className="mr-3 h-5 w-5" />
                Star on GitHub
              </a>
            </MobileButton>
            <MobileButton
              variant="ghost"
              className="h-12 justify-start"
              onClick={() => {
                handleSettingsClick();
                setMobileMenuOpen(false);
              }}
            >
              Settings
            </MobileButton>
            {user ? (
              <MobileButton
                variant="ghost"
                className="h-12 justify-start"
                onClick={() => {
                  handleSignOut();
                  setMobileMenuOpen(false);
                }}
              >
                Sign Out
              </MobileButton>
            ) : (
              <MobileButton
                variant="ghost"
                className="h-12 justify-start"
                onClick={() => {
                  handleSignIn();
                  setMobileMenuOpen(false);
                }}
              >
                Sign In
              </MobileButton>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
