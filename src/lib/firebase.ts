import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth as initAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// Skip Firebase initialization during static site generation (SSG) when env vars aren't available
// Firebase will be properly initialized at runtime in the browser
const isServer = typeof window === 'undefined';
const hasRequiredConfig = !!(
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain &&
  firebaseConfig.projectId
);

let app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _googleProvider: GoogleAuthProvider | undefined;

if (hasRequiredConfig && !isServer) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    _auth = initAuth(app);
    _db = getFirestore(app);
    _googleProvider = new GoogleAuthProvider();
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    // Reset to undefined on initialization failure
    app = undefined;
    _auth = undefined;
    _db = undefined;
    _googleProvider = undefined;
  }
} else if (!hasRequiredConfig && !isServer) {
  // Only warn in browser if config is missing
  console.warn(
    'Firebase configuration missing. Please set the following environment variables:\n' +
    '- NEXT_PUBLIC_FIREBASE_API_KEY\n' +
    '- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN\n' +
    '- NEXT_PUBLIC_FIREBASE_PROJECT_ID\n' +
    '- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET\n' +
    '- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID\n' +
    '- NEXT_PUBLIC_FIREBASE_APP_ID\n' +
    'Firebase features will be disabled.'
  );
}

// Safe getters with runtime validation
export function getAuth(): Auth {
  if (!_auth) {
    throw new Error('Firebase Auth not initialized. Please check your Firebase configuration.');
  }
  return _auth;
}

export function getDB(): Firestore {
  if (!_db) {
    throw new Error('Firebase Firestore not initialized. Please check your Firebase configuration.');
  }
  return _db;
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!_googleProvider) {
    throw new Error('Google Auth Provider not initialized. Please check your Firebase configuration.');
  }
  return _googleProvider;
}

// Check if Firebase is properly initialized
export function isFirebaseInitialized(): boolean {
  return !!(app && _auth && _db && _googleProvider);
}

// Export boolean to check if Firebase is available
export const isFirebaseAvailable = hasRequiredConfig && !isServer;

// Legacy exports for backward compatibility (deprecated)
export const auth = _auth as Auth;
export const db = _db as Firestore;
export const googleProvider = _googleProvider as GoogleAuthProvider;
