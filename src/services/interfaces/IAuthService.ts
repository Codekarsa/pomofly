import { User } from 'firebase/auth';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface IAuthService {
  // Authentication state
  getCurrentUser(): Promise<AuthUser | null>;
  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void;
  
  // Authentication actions
  signInWithGoogle(): Promise<AuthUser>;
  signOut(): Promise<void>;
  
  // Utility
  isAuthenticated(): boolean;
  getCurrentUserId(): string | null;
}