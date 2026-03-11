import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Validate all required environment variables at build time
const requiredEnvVars = [
  'NEXT_PUBLIC_FIREBASE_API_KEY',
  'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'NEXT_PUBLIC_FIREBASE_APP_ID'
] as const;

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0 && typeof window !== 'undefined') {
  throw new Error(
    `Missing required Firebase environment variables: ${missingVars.join(', ')}. ` +
    'Please check your .env.local file and ensure all Firebase credentials are properly configured.'
  );
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!
};

// Skip Firebase initialization during static site generation (SSG) when env vars aren't available
// Firebase will be properly initialized at runtime in the browser
const isServer = typeof window === 'undefined';
const hasAllRequiredVars = missingVars.length === 0;

let app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _googleProvider: GoogleAuthProvider | undefined;

// Only initialize Firebase if we have all required environment variables
if (hasAllRequiredVars) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  _auth = getAuth(app);
  _db = getFirestore(app);
  _googleProvider = new GoogleAuthProvider();
}

// Export with proper validation - these should only be accessed when properly configured
if (!hasAllRequiredVars && !isServer) {
  throw new Error(
    `Missing required Firebase environment variables: ${missingVars.join(', ')}. ` +
    'Please check your .env.local file and ensure all Firebase credentials are properly configured.'
  );
}

export const auth = _auth as Auth;
export const db = _db as Firestore;
export const googleProvider = _googleProvider as GoogleAuthProvider;

export { auth, db, googleProvider };