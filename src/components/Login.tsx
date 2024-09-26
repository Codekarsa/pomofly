'use client'

import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { auth } from '../lib/firebase';

export default function Login() {
  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };

  return (
    <button
      onClick={signInWithGoogle}
      className="bg-[#333333] hover:bg-[#1A1A1A] text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
    >
      Sign In with Google
    </button>
  );
}