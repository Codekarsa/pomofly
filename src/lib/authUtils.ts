import { 
  signInWithPopup,
  signInAnonymously as firebaseSignInAnonymously,
  signOut as firebaseSignOut,
  UserCredential
} from "firebase/auth";
import { getAuth, getGoogleProvider } from './firebase';

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  const auth = getAuth();
  const provider = getGoogleProvider();
  
  // Configure Google provider
  provider.addScope('email');
  provider.addScope('profile');
  
  try {
    const result = await signInWithPopup(auth, provider);
    return result;
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}

/**
 * Sign in anonymously
 */
export async function signInAnonymously(): Promise<UserCredential> {
  const auth = getAuth();
  
  try {
    const result = await firebaseSignInAnonymously(auth);
    return result;
  } catch (error) {
    console.error('Anonymous sign-in error:', error);
    throw error;
  }
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  const auth = getAuth();
  
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Sign-out error:', error);
    throw error;
  }
}