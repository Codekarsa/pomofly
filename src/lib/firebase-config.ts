/**
 * Firebase Configuration Security and Validation
 * 
 * This module provides comprehensive Firebase configuration validation,
 * environment health checks, and security measures to address:
 * - Configuration exposure minimization
 * - Runtime environment validation  
 * - Configuration rotation support
 * - Error handling and fallbacks
 */

// Types for configuration validation
export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config?: FirebaseConfig;
}

export interface EnvironmentHealth {
  isHealthy: boolean;
  environment: 'development' | 'production' | 'test' | 'unknown';
  configStatus: 'complete' | 'partial' | 'missing';
  issues: string[];
  recommendations: string[];
}

/**
 * Validates Firebase configuration and provides detailed feedback
 */
export function validateFirebaseConfig(): ConfigValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';
  const isProduction = process.env.NODE_ENV === 'production';

  // Extract configuration from environment
  const rawConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  // Validate required fields
  const requiredFields = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ] as const;

  for (const field of requiredFields) {
    if (!rawConfig[field] || rawConfig[field].trim() === '') {
      errors.push(`Missing required Firebase configuration: ${field.toUpperCase()}`);
    }
  }

  // If we have errors, return early
  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  // Type assertion after validation
  const config = rawConfig as FirebaseConfig;

  // Validate format and content
  validateConfigFormat(config, errors, warnings);
  
  // Security validations
  validateConfigSecurity(config, errors, warnings, isProduction);

  // Environment-specific validations
  if (isBrowser) {
    validateBrowserEnvironment(config, warnings);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config: errors.length === 0 ? config : undefined
  };
}

/**
 * Validates the format and structure of configuration values
 */
function validateConfigFormat(config: FirebaseConfig, errors: string[], warnings: string[]): void {
  // Validate API key format
  if (config.apiKey) {
    if (config.apiKey.length < 20) {
      errors.push('Firebase API key appears to be invalid (too short)');
    }
    if (!/^[A-Za-z0-9_-]+$/.test(config.apiKey)) {
      errors.push('Firebase API key contains invalid characters');
    }
  }

  // Validate auth domain
  if (config.authDomain) {
    if (!config.authDomain.includes('.')) {
      errors.push('Firebase auth domain must be a valid domain');
    }
    if (!config.authDomain.endsWith('.firebaseapp.com')) {
      warnings.push('Firebase auth domain should typically end with .firebaseapp.com');
    }
  }

  // Validate project ID format
  if (config.projectId) {
    if (!/^[a-z0-9-]+$/.test(config.projectId)) {
      errors.push('Firebase project ID must contain only lowercase letters, numbers, and hyphens');
    }
    if (config.projectId.length < 4 || config.projectId.length > 30) {
      errors.push('Firebase project ID must be between 4-30 characters');
    }
  }

  // Validate storage bucket
  if (config.storageBucket) {
    if (!config.storageBucket.includes('.')) {
      errors.push('Firebase storage bucket must be a valid domain');
    }
    if (!config.storageBucket.endsWith('.appspot.com')) {
      warnings.push('Firebase storage bucket should typically end with .appspot.com');
    }
  }

  // Validate messaging sender ID (numeric)
  if (config.messagingSenderId) {
    if (!/^\d+$/.test(config.messagingSenderId)) {
      errors.push('Firebase messaging sender ID must be numeric');
    }
  }

  // Validate app ID format
  if (config.appId) {
    if (!config.appId.includes(':')) {
      errors.push('Firebase app ID must be in format "1:project-number:platform:app-id"');
    }
  }
}

/**
 * Validates configuration security aspects
 */
function validateConfigSecurity(
  config: FirebaseConfig, 
  errors: string[], 
  warnings: string[], 
  isProduction: boolean
): void {
  // Check for development/test configurations in production
  if (isProduction) {
    const testPatterns = ['test', 'dev', 'demo', 'staging'];
    
    testPatterns.forEach(pattern => {
      if (config.projectId.includes(pattern)) {
        warnings.push(`Project ID contains '${pattern}' - ensure this is not a development project`);
      }
      if (config.authDomain.includes(pattern)) {
        warnings.push(`Auth domain contains '${pattern}' - ensure this is production configuration`);
      }
    });
  }

  // Check for common configuration issues
  if (config.apiKey.toLowerCase().includes('your-api-key') ||
      config.apiKey === 'your-api-key-here') {
    errors.push('Firebase API key appears to be a placeholder value');
  }

  if (config.projectId === 'your-project-id' ||
      config.projectId === 'demo-project') {
    errors.push('Firebase project ID appears to be a placeholder value');
  }

  // Warn about configuration exposure
  warnings.push(
    'Firebase configuration is exposed in client bundle. ' +
    'This is normal for Firebase web apps, but ensure Firestore security rules are properly configured.'
  );
}

/**
 * Validates browser-specific environment concerns
 */
function validateBrowserEnvironment(config: FirebaseConfig, warnings: string[]): void {
  // Check if running on localhost in production mode
  if (process.env.NODE_ENV === 'production' && 
      (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    warnings.push('Production build running on localhost - configuration may not match deployment environment');
  }

  // Check protocol security
  if (window.location.protocol === 'http:' && 
      !['localhost', '127.0.0.1'].includes(window.location.hostname)) {
    warnings.push('Firebase should be used with HTTPS in production environments');
  }
}

/**
 * Performs comprehensive environment health check
 */
export function checkEnvironmentHealth(): EnvironmentHealth {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Determine environment
  const nodeEnv = process.env.NODE_ENV || 'unknown';
  let environment: EnvironmentHealth['environment'];
  
  switch (nodeEnv) {
    case 'development':
      environment = 'development';
      break;
    case 'production':
      environment = 'production';
      break;
    case 'test':
      environment = 'test';
      break;
    default:
      environment = 'unknown';
      issues.push(`Unknown NODE_ENV: ${nodeEnv}`);
  }

  // Validate configuration completeness
  const configResult = validateFirebaseConfig();
  let configStatus: EnvironmentHealth['configStatus'];

  if (configResult.isValid) {
    configStatus = 'complete';
  } else if (configResult.config) {
    configStatus = 'partial';
    issues.push('Firebase configuration is incomplete');
  } else {
    configStatus = 'missing';
    issues.push('Firebase configuration is missing or invalid');
  }

  // Environment-specific checks
  if (environment === 'production') {
    // Production-specific validations
    if (!process.env.CLAUDE_API_KEY) {
      issues.push('Claude API key not configured for production');
    }
    
    if (typeof window !== 'undefined' && window.location.protocol === 'http:') {
      issues.push('Production app should use HTTPS');
    }

    recommendations.push('Ensure Firestore security rules are configured');
    recommendations.push('Enable Firebase App Check for enhanced security');
    recommendations.push('Monitor Firebase usage and billing');
  }

  if (environment === 'development') {
    recommendations.push('Use Firebase Emulator Suite for local development');
    recommendations.push('Keep development and production projects separate');
  }

  // Check for common configuration issues
  issues.push(...configResult.errors);

  // Add warnings as recommendations
  recommendations.push(...configResult.warnings.map(w => `Warning: ${w}`));

  return {
    isHealthy: issues.length === 0,
    environment,
    configStatus,
    issues,
    recommendations
  };
}

/**
 * Gets sanitized configuration for logging/debugging (removes sensitive values)
 */
export function getSanitizedConfig(): Partial<FirebaseConfig> {
  const config = validateFirebaseConfig().config;
  
  if (!config) {
    return {};
  }

  return {
    authDomain: config.authDomain,
    projectId: config.projectId,
    storageBucket: config.storageBucket,
    messagingSenderId: config.messagingSenderId.replace(/\d/g, '*'),
    appId: config.appId.split(':').map((part, index) => 
      index === 0 ? part : part.replace(/[A-Za-z0-9]/g, '*')
    ).join(':'),
    // API key is not included in sanitized output
    apiKey: `${config.apiKey.substring(0, 8)}...` // Only show first 8 chars
  };
}

/**
 * Configuration rotation helpers
 */
export interface ConfigRotationInfo {
  canRotate: boolean;
  lastRotated?: string;
  nextRotation?: string;
  rotationSteps: string[];
}

export function getConfigRotationInfo(): ConfigRotationInfo {
  // This would integrate with your deployment/configuration management system
  return {
    canRotate: true,
    rotationSteps: [
      '1. Generate new Firebase project configuration',
      '2. Update environment variables in deployment system',
      '3. Deploy new configuration',
      '4. Verify Firebase connectivity',
      '5. Remove old configuration from Firebase console (if needed)',
      '6. Update monitoring and alerting systems'
    ]
  };
}

/**
 * Development helper to print configuration status
 */
export function printConfigurationStatus(): void {
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  const health = checkEnvironmentHealth();
  const sanitized = getSanitizedConfig();

  console.group('🔥 Firebase Configuration Status');
  
  console.log('Environment:', health.environment);
  console.log('Config Status:', health.configStatus);
  console.log('Healthy:', health.isHealthy ? '✅' : '❌');
  
  if (health.issues.length > 0) {
    console.group('Issues:');
    health.issues.forEach(issue => console.warn('⚠️', issue));
    console.groupEnd();
  }

  if (health.recommendations.length > 0) {
    console.group('Recommendations:');
    health.recommendations.forEach(rec => console.info('💡', rec));
    console.groupEnd();
  }

  console.group('Configuration (sanitized):');
  console.table(sanitized);
  console.groupEnd();

  console.groupEnd();
}

/**
 * Runtime configuration validation with helpful error messages
 */
export function ensureValidConfiguration(): FirebaseConfig {
  const result = validateFirebaseConfig();
  
  if (!result.isValid || !result.config) {
    const errorMessage = [
      '🔥 Firebase configuration is invalid or missing.',
      '',
      'Issues found:',
      ...result.errors.map(error => `  ❌ ${error}`),
      '',
      'Please check your environment variables:',
      '  • NEXT_PUBLIC_FIREBASE_API_KEY',
      '  • NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      '  • NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      '  • NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      '  • NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      '  • NEXT_PUBLIC_FIREBASE_APP_ID',
      '',
      'See .env.example for the expected format.',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Log warnings in development
  if (process.env.NODE_ENV === 'development' && result.warnings.length > 0) {
    console.group('🔥 Firebase Configuration Warnings');
    result.warnings.forEach(warning => console.warn('⚠️', warning));
    console.groupEnd();
  }

  return result.config;
}