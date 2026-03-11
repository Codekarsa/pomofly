import { 
  Auth, 
  User, 
  signInWithPopup, 
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged
} from 'firebase/auth';
import { IAuthService, AuthUser } from '../interfaces/IAuthService';

export class FirebaseAuthService implements IAuthService {
  constructor(
    private auth: Auth,
    private googleProvider: any
  ) {}

  private mapFirebaseUser(user: User | null): AuthUser | null {
    if (!user) return null;
    
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    };
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return this.mapFirebaseUser(this.auth.currentUser);
  }

  onAuthStateChanged(callback: (user: AuthUser | null) => void): () => void {
    return firebaseOnAuthStateChanged(this.auth, (user) => {
      callback(this.mapFirebaseUser(user));
    });
  }

  async signInWithGoogle(): Promise<AuthUser> {
    try {
      const result = await signInWithPopup(this.auth, this.googleProvider);
      const mappedUser = this.mapFirebaseUser(result.user);
      if (!mappedUser) {
        throw new Error('Sign in failed - no user returned');
      }
      return mappedUser;
    } catch (error) {
      console.error('Sign in error:', error);
      throw new Error('Failed to sign in with Google');
    }
  }

  async signOut(): Promise<void> {
    try {
      await firebaseSignOut(this.auth);
    } catch (error) {
      console.error('Sign out error:', error);
      throw new Error('Failed to sign out');
    }
  }

  isAuthenticated(): boolean {
    return this.auth.currentUser !== null;
  }

  getCurrentUserId(): string | null {
    return this.auth.currentUser?.uid || null;
  }
}