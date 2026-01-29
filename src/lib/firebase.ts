import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyD7ud8TN_pJ0b1x2ZPro9cvwKWd8y7Andc",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "pomofly-63fc9.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "pomofly-63fc9",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "pomofly-63fc9.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "531162182130",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:531162182130:web:67108b2c84cdd3e0fbfb6b"
};

// Skip Firebase initialization during static site generation (SSG) when env vars aren't available
// Firebase will be properly initialized at runtime in the browser
const isServer = typeof window === 'undefined';
const hasConfig = !!firebaseConfig.apiKey;

let app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _googleProvider: GoogleAuthProvider | undefined;

if (hasConfig) {
  app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
  _auth = getAuth(app);
  _db = getFirestore(app);
  _googleProvider = new GoogleAuthProvider();
} else if (!isServer) {
  // Only throw error in browser if config is missing
  throw new Error('No Firebase API Key found in environment variables');
}

// Export with type assertions - these are only used in client components where they will be defined
const auth = _auth as Auth;
const db = _db as Firestore;
const googleProvider = _googleProvider as GoogleAuthProvider;

export { auth, db, googleProvider };