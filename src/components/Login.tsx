'use client'

import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from '../lib/firebase';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';

export default function Login() {
  const { event } = useGoogleAnalytics();
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  const handleClick = async () => {
    event('button_click', { button_name: 'example_button' });
    await signInWithGoogle(); 
  };

  return (
    <button
      onClick={handleClick}
      className="bg-[#333333] hover:bg-[#1A1A1A] text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
    >
      Sign In with Google
    </button>
  );
}