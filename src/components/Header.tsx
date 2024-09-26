'use client'

import React from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { auth, googleProvider } from '../lib/firebase';
import { signOut, signInWithPopup } from 'firebase/auth';

export default function Header({ onSettingsClick }: { onSettingsClick: () => void }) {
  const { user } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  return (
    <header className="bg-[#333333] text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">Pomodoro App</h1>
        <div>
          <button
            onClick={onSettingsClick}
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