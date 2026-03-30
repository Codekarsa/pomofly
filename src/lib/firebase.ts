import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth as initAuth, GoogleAuthProvider, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";
import { validateEnvironment, getSetupInstructions, createDegradationPlan, type ValidationResult } from "./env-validation";

// Global validation result and degradation plan
let validationResult: ValidationResult | null = null;
let degradationPlan: ReturnType<typeof createDegradationPlan> | null = null;

// Firebase instances
let app: FirebaseApp | undefined;
let _auth: Auth | undefined;
let _db: Firestore | undefined;
let _googleProvider: GoogleAuthProvider | undefined;

// Server-side check
const isServer = typeof window === 'undefined';

/**
 * Initialize Firebase with comprehensive environment validation
 */
function initializeFirebaseWithValidation(): void {
  // Skip initialization on server-side
  if (isServer) {
    return;
  }

  // Perform environment validation
  validationResult = validateEnvironment();
  degradationPlan = createDegradationPlan(validationResult);

  // Handle validation failure
  if (!validationResult.success) {
    const instructions = getSetupInstructions(validationResult);
    
    // Log detailed setup instructions
    console.error(
      'Pomofly: Firebase configuration invalid or missing.\n\n' +
      instructions.join('\n') +
      '\n\nApplication will run in degraded mode with limited functionality.'
    );

    // Store validation failure for UI display
    (window as any).__POMOFLY_CONFIG_ERROR__ = {
      errors: validationResult.errors,
      warnings: validationResult.warnings,
      instructions: instructions
    };
    
    return;
  }

  // Firebase configuration is valid, proceed with initialization
  const firebaseConfig = validationResult.data.firebase;

  try {
    // Initialize Firebase app
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    _auth = initAuth(app);
    _db = getFirestore(app);
    _googleProvider = new GoogleAuthProvider();

    // Log successful initialization with warnings if any
    if (validationResult.warnings.length > 0) {
      console.warn(
        'Pomofly: Firebase initialized successfully with the following warnings:\n' +
        validationResult.warnings.map(w => `⚠️ ${w}`).join('\n')
      );
    } else {
      console.log('Pomofly: Firebase initialized successfully with full functionality.');
    }

    // Store degradation plan for UI access
    (window as any).__POMOFLY_DEGRADATION_PLAN__ = degradationPlan;

  } catch (error) {
    console.error('Pomofly: Failed to initialize Firebase even with valid configuration:', error);
    
    // Reset instances on initialization failure
    app = undefined;
    _auth = undefined;
    _db = undefined;
    _googleProvider = undefined;

    // Store initialization error
    (window as any).__POMOFLY_INIT_ERROR__ = {
      message: 'Firebase initialization failed despite valid configuration',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// Initialize Firebase immediately (client-side only)
initializeFirebaseWithValidation();

// Safe getters with comprehensive error reporting
export function getAuth(): Auth {
  if (!_auth) {
    const configError = !isServer ? (window as any).__POMOFLY_CONFIG_ERROR__ : null;
    const initError = !isServer ? (window as any).__POMOFLY_INIT_ERROR__ : null;
    
    if (configError) {
      throw new Error(
        'Firebase Auth not available due to configuration errors. ' +
        'Please check the browser console for setup instructions.'
      );
    } else if (initError) {
      throw new Error(
        `Firebase Auth initialization failed: ${initError.error}. ` +
        'Please check your Firebase project settings and try refreshing.'
      );
    } else {
      throw new Error(
        'Firebase Auth not initialized. This may be due to server-side rendering or missing configuration.'
      );
    }
  }
  return _auth;
}

export function getDB(): Firestore {
  if (!_db) {
    const configError = !isServer ? (window as any).__POMOFLY_CONFIG_ERROR__ : null;
    const initError = !isServer ? (window as any).__POMOFLY_INIT_ERROR__ : null;
    
    if (configError) {
      throw new Error(
        'Firebase Firestore not available due to configuration errors. ' +
        'Please check the browser console for setup instructions.'
      );
    } else if (initError) {
      throw new Error(
        `Firebase Firestore initialization failed: ${initError.error}. ` +
        'Please check your Firebase project settings and try refreshing.'
      );
    } else {
      throw new Error(
        'Firebase Firestore not initialized. This may be due to server-side rendering or missing configuration.'
      );
    }
  }
  return _db;
}

export function getGoogleProvider(): GoogleAuthProvider {
  if (!_googleProvider) {
    const configError = !isServer ? (window as any).__POMOFLY_CONFIG_ERROR__ : null;
    const initError = !isServer ? (window as any).__POMOFLY_INIT_ERROR__ : null;
    
    if (configError) {
      throw new Error(
        'Google Auth Provider not available due to configuration errors. ' +
        'Please check the browser console for setup instructions.'
      );
    } else if (initError) {
      throw new Error(
        `Google Auth Provider initialization failed: ${initError.error}. ` +
        'Please check your Firebase project settings and try refreshing.'
      );
    } else {
      throw new Error(
        'Google Auth Provider not initialized. This may be due to server-side rendering or missing configuration.'
      );
    }
  }
  return _googleProvider;
}

// Check if Firebase is properly initialized
export function isFirebaseInitialized(): boolean {
  return !!(app && _auth && _db && _googleProvider);
}

// Export boolean to check if Firebase is available
export const isFirebaseAvailable = isFirebaseInitialized();

/**
 * Get the current environment validation status
 */
export function getEnvironmentStatus(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  setupInstructions?: string[];
} {
  if (isServer) {
    return {
      isValid: false,
      errors: ['Environment validation not available on server-side'],
      warnings: []
    };
  }

  const configError = (window as any).__POMOFLY_CONFIG_ERROR__;
  const degradationPlan = (window as any).__POMOFLY_DEGRADATION_PLAN__;

  if (configError) {
    return {
      isValid: false,
      errors: configError.errors || [],
      warnings: configError.warnings || [],
      setupInstructions: configError.instructions || []
    };
  }

  return {
    isValid: true,
    errors: [],
    warnings: validationResult?.warnings || []
  };
}

/**
 * Get the degradation plan showing what features are available
 */
export function getFeatureAvailability(): {
  firebaseAvailable: boolean;
  claudeAvailable: boolean;
  monitoringAvailable: boolean;
  supportedFeatures: string[];
  disabledFeatures: string[];
} | null {
  if (isServer) return null;

  const degradationPlan = (window as any).__POMOFLY_DEGRADATION_PLAN__;
  return degradationPlan || {
    firebaseAvailable: false,
    claudeAvailable: false,
    monitoringAvailable: false,
    supportedFeatures: [],
    disabledFeatures: ['All features disabled due to configuration errors']
  };
}

/**
 * Safe wrapper for Firebase operations that may fail due to configuration issues
 */
export async function withFirebaseErrorHandling<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  operationName: string = 'Firebase operation'
): Promise<T> {
  if (!isFirebaseInitialized()) {
    console.warn(`${operationName} skipped - Firebase not initialized`);
    return fallbackValue;
  }

  try {
    return await operation();
  } catch (error) {
    console.error(`${operationName} failed:`, error);
    
    // Check if this is a configuration issue
    const envStatus = getEnvironmentStatus();
    if (!envStatus.isValid) {
      console.error('This failure may be related to Firebase configuration issues. Check setup instructions.');
    }
    
    return fallbackValue;
  }
}

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
