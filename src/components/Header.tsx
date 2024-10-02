'use client'

import React from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { auth, googleProvider } from '../lib/firebase';
import { signOut, signInWithPopup } from 'firebase/auth';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';

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
    <header className="bg-[#333333] text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">Pomofly</h1>
        <div>
          <button
            onClick={handleSettingsClick}
            className="bg-[#666666] hover:bg-[#1A1A1A] text-white font-bold py-2 px-4 rounded mr-2"
          >
            Settings
          </button>
          {user ? (
            <button
              onClick={handleSignOut}
              className="bg-[#666666] hover:bg-[#1A1A1A] text-white font-bold py-2 px-4 rounded"
            >
              Sign Out
            </button>
          ) : (
            <button
              onClick={handleSignIn}
              className="bg-[#666666] hover:bg-[#1A1A1A] text-white font-bold py-2 px-4 rounded"
            >
              Sign In with Google
            </button>
          )}
        </div>
      </div>
    </header>
  );
}