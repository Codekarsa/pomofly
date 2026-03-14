import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { getClientEnv } from "./env";

// Get validated Firebase configuration
const getFirebaseConfig = () => {
  try {
    const env = getClientEnv();
    return {
      apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: env.NEXT_PUBLIC_FIREBASE_APP_ID
    };
  } catch (error) {
    // During build time or when environment variables are missing,
    // we want to provide a helpful error message
    console.error('Firebase configuration error:', error);
    throw new Error(
      'Firebase configuration failed. Please ensure all required environment variables are set:\n' +
      '- NEXT_PUBLIC_FIREBASE_API_KEY\n' +
      '- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN\n' +
      '- NEXT_PUBLIC_FIREBASE_PROJECT_ID\n' +
      '- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET\n' +
      '- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID\n' +
      '- NEXT_PUBLIC_FIREBASE_APP_ID'
    );
  }
};

// Initialize Firebase only when we have valid configuration
const isServer = typeof window === 'undefined';
let app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _googleProvider: GoogleAuthProvider | undefined;

// Only initialize Firebase in environments where we expect valid config
if (!isServer || process.env.NODE_ENV === 'development') {
  try {
    const firebaseConfig = getFirebaseConfig();
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    _auth = getAuth(app);
    _db = getFirestore(app);
    _googleProvider = new GoogleAuthProvider();
  } catch (error) {
    // In development, we want to see configuration errors clearly
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Firebase Initialization Error:');
      console.error(error);
    }
    
    // Don't throw during build/SSG, but do throw in runtime
    if (!isServer) {
      throw error;
    }
  }
}

// Exports with proper error handling for missing configuration
export const auth = (() => {
  if (!_auth) {
    throw new Error(
      'Firebase auth not initialized. Please check your environment configuration.'
    );
  }
  return _auth;
})();

export const db = (() => {
  if (!_db) {
    throw new Error(
      'Firebase firestore not initialized. Please check your environment configuration.'
    );
  }
  return _db;
})();

export const googleProvider = (() => {
  if (!_googleProvider) {
    throw new Error(
      'Firebase Google provider not initialized. Please check your environment configuration.'
    );
  }
  return _googleProvider;
})();