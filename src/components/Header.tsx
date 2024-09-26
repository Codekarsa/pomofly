'use client'

import React from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export default function Header() {
  const { user } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <header className="bg-blue-500 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <h1 className="text-2xl font-bold">Pomodoro App</h1>
        {user && (
          <button
            onClick={handleSignOut}
            className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded"
          >
            Sign Out
          </button>
        )}
      </div>
    </header>
  );
}