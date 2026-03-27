import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth as initAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { 
  validateFirebaseConfig, 
  checkEnvironmentHealth, 
  printConfigurationStatus,
  ensureValidConfiguration,
  getSanitizedConfig
} from "./firebase-config";

// Enhanced Firebase initialization with comprehensive validation
const isServer = typeof window === 'undefined';

let app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _googleProvider: GoogleAuthProvider | undefined;

// Initialize Firebase with enhanced error handling and validation
function initializeFirebaseServices(): void {
  try {
    // Validate configuration before initialization
    const firebaseConfig = ensureValidConfiguration();
    
    // Initialize Firebase app
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    
    // Initialize services
    _auth = initAuth(app);
    _db = getFirestore(app);
    _googleProvider = new GoogleAuthProvider();

    // Configure Google Provider
    _googleProvider.setCustomParameters({
      prompt: 'select_account'
    });

    // Development-only configuration status logging
    if (process.env.NODE_ENV === 'development') {
      printConfigurationStatus();
    }

    // Log successful initialization (sanitized in production)
    const sanitizedConfig = getSanitizedConfig();
    console.log('✅ Firebase initialized successfully', {
      projectId: sanitizedConfig.projectId,
      environment: process.env.NODE_ENV,
    });

  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    
    // Reset services to undefined on failure
    app = undefined;
    _auth = undefined;
    _db = undefined;
    _googleProvider = undefined;

    // In development, provide helpful error information
    if (process.env.NODE_ENV === 'development') {
      console.group('🔧 Firebase Configuration Help');
      console.log('Check your .env.local file for the following variables:');
      console.log('- NEXT_PUBLIC_FIREBASE_API_KEY');
      console.log('- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
      console.log('- NEXT_PUBLIC_FIREBASE_PROJECT_ID');
      console.log('- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
      console.log('- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
      console.log('- NEXT_PUBLIC_FIREBASE_APP_ID');
      console.log('');
      console.log('Copy .env.example to .env.local and fill in your Firebase project details.');
      console.groupEnd();
    }

    throw error;
  }
}

// Initialize Firebase only in browser environment
if (!isServer) {
  // Check configuration validity before attempting initialization
  const configValidation = validateFirebaseConfig();
  
  if (configValidation.isValid) {
    initializeFirebaseServices();
  } else {
    console.warn('⚠️ Firebase configuration validation failed:', {
      errors: configValidation.errors,
      warnings: configValidation.warnings
    });

    // Provide helpful guidance for configuration issues
    const health = checkEnvironmentHealth();
    if (health.recommendations.length > 0) {
      console.group('💡 Configuration Recommendations');
      health.recommendations.forEach(rec => console.log(rec));
      console.groupEnd();
    }
  }
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

/**
 * Estimation History Collection Helpers
 */
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit 
} from "firebase/firestore";
import { 
  EstimationRecordCreate, 
  EstimationRecord,
  transformFirebaseEstimationRecord,
  extractKeywords,
  Task
} from "./validation";

/**
 * Add a new estimation record to the history collection
 */
export async function addEstimationRecord(userId: string, task: Task): Promise<string> {
  if (!_db) {
    throw new Error('Firebase not initialized');
  }

  // Only store if task had an estimate
  if (!task.estimatedPomodoros) {
    return ''; // Skip tasks without estimates
  }

  const record = {
    userId,
    taskId: task.id,
    taskTitle: task.title,
    projectId: task.projectId || null,
    estimatedPomodoros: task.estimatedPomodoros || 1,
    actualPomodoros: task.totalPomodoroSessions || 0,
    accuracy: (task.estimatedPomodoros || 1) / Math.max(task.totalPomodoroSessions || 1, 1),
    completedAt: new Date(),
    keywords: task.title.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2)
  };

  const docRef = await addDoc(collection(_db, 'estimation_history'), record);
  return docRef.id;
}

/**
 * Get estimation history for a user
 */
export async function getEstimationHistory(
  userId: string, 
  limitCount: number = 50
): Promise<EstimationRecord[]> {
  if (!_db) {
    throw new Error('Firebase not initialized');
  }

  const q = query(
    collection(_db, 'estimation_history'),
    where('userId', '==', userId),
    orderBy('completedAt', 'desc'),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  const records: EstimationRecord[] = [];

  querySnapshot.forEach((doc) => {
    try {
      const record = transformFirebaseEstimationRecord({ id: doc.id, ...doc.data() });
      records.push(record);
    } catch (error) {
      console.error(`Invalid estimation record data for document ${doc.id}:`, error);
    }
  });

  return records;
}

/**
 * Get estimation history for a specific project
 */
export async function getProjectEstimationHistory(
  userId: string,
  projectId: string,
  limitCount: number = 20
): Promise<EstimationRecord[]> {
  if (!_db) {
    throw new Error('Firebase not initialized');
  }

  const q = query(
    collection(_db, 'estimation_history'),
    where('userId', '==', userId),
    where('projectId', '==', projectId),
    orderBy('completedAt', 'desc'),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  const records: EstimationRecord[] = [];

  querySnapshot.forEach((doc) => {
    try {
      const record = transformFirebaseEstimationRecord({ id: doc.id, ...doc.data() });
      records.push(record);
    } catch (error) {
      console.error(`Invalid estimation record data for document ${doc.id}:`, error);
    }
  });

  return records;
}
