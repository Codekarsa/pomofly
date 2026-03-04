import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

// Environment validation with proper typing
interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

// Validate and build Firebase configuration
function validateFirebaseConfig(): FirebaseConfig | null {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  // Use fallback values for development/demo (should be removed in production)
  const firebaseConfig: FirebaseConfig = {
    apiKey: apiKey || "AIzaSyD7ud8TN_pJ0b1x2ZPro9cvwKWd8y7Andc",
    authDomain: authDomain || "pomofly-63fc9.firebaseapp.com",
    projectId: projectId || "pomofly-63fc9",
    storageBucket: storageBucket || "pomofly-63fc9.appspot.com",
    messagingSenderId: messagingSenderId || "531162182130",
    appId: appId || "1:531162182130:web:67108b2c84cdd3e0fbfb6b"
  };

  // Validate required fields
  const requiredFields: (keyof FirebaseConfig)[] = [
    'apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'
  ];

  for (const field of requiredFields) {
    if (!firebaseConfig[field] || firebaseConfig[field].trim() === '') {
      return null;
    }
  }

  return firebaseConfig;
}

// Initialize Firebase safely
const isServer = typeof window === 'undefined';
const firebaseConfig = validateFirebaseConfig();

let app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _googleProvider: GoogleAuthProvider | null = null;

// Initialize Firebase only if config is valid
if (firebaseConfig && !isServer) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    _auth = getAuth(app);
    _db = getFirestore(app);
    _googleProvider = new GoogleAuthProvider();
  } catch (error) {
    console.error('Failed to initialize Firebase:', error);
    // Reset to null on initialization failure
    app = null;
    _auth = null;
    _db = null;
    _googleProvider = null;
  }
} else if (!firebaseConfig && !isServer) {
  console.warn('Firebase configuration is invalid or missing. Some features may not work.');
}

// Safe getter functions that validate initialization before returning values
export function getFirebaseAuth(): Auth {
  if (!_auth) {
    throw new Error('Firebase Auth not initialized. Check your Firebase configuration.');
  }
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (!_db) {
    throw new Error('Firestore not initialized. Check your Firebase configuration.');
  }
  return _db;
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!_googleProvider) {
    throw new Error('Google Auth Provider not initialized. Check your Firebase configuration.');
  }
  return _googleProvider;
}

// Check if Firebase is properly initialized
export function isFirebaseInitialized(): boolean {
  return !!(app && _auth && _db && _googleProvider);
}

// Legacy exports for backward compatibility - these will throw if not initialized
export const auth = new Proxy({} as Auth, {
  get(_, prop) {
    const authInstance = getFirebaseAuth();
    return authInstance[prop as keyof Auth];
  }
});

export const db = new Proxy({} as Firestore, {
  get(_, prop) {
    const dbInstance = getFirebaseDb();
    return dbInstance[prop as keyof Firestore];
  }
});

export const googleProvider = new Proxy({} as GoogleAuthProvider, {
  get(_, prop) {
    const providerInstance = getGoogleProvider();
    return providerInstance[prop as keyof GoogleAuthProvider];
  }
});

// Export the Firebase app instance for advanced usage
export { app as firebaseApp };