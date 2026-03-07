/**
 * Environment variable validation and configuration
 * 
 * This module provides type-safe, validated access to environment variables
 * and fails fast with clear error messages when required config is missing.
 */

import * as yup from 'yup';

// Environment validation schemas
const serverEnvSchema = yup.object({
  // Claude API Configuration
  CLAUDE_API_KEY: yup.string().required('CLAUDE_API_KEY must be provided'),
  CLAUDE_MODEL: yup.string().default('claude-3-sonnet-20240229'),
  
  // Node environment
  NODE_ENV: yup.string().oneOf(['development', 'test', 'production']).default('development'),
});

const clientEnvSchema = yup.object({
  // Firebase Configuration (all required for proper operation)
  NEXT_PUBLIC_FIREBASE_API_KEY: yup.string().required('NEXT_PUBLIC_FIREBASE_API_KEY is required'),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: yup.string().required('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN is required'),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: yup.string().required('NEXT_PUBLIC_FIREBASE_PROJECT_ID is required'),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: yup.string().required('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET is required'),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: yup.string().required('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID is required'),
  NEXT_PUBLIC_FIREBASE_APP_ID: yup.string().required('NEXT_PUBLIC_FIREBASE_APP_ID is required'),
});

/**
 * Validates and returns server-side environment variables
 * Should only be used in server contexts (API routes, middleware, etc.)
 */
export function getServerEnv() {
  try {
    return serverEnvSchema.validateSync({
      CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
      CLAUDE_MODEL: process.env.CLAUDE_MODEL || 'claude-3-sonnet-20240229',
      NODE_ENV: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      const missingVars = error.errors.join(', ');
      throw new Error(
        `Missing or invalid server environment variables: ${missingVars}\n\n` +
        'Please check your .env.local file or deployment configuration.'
      );
    }
    throw error;
  }
}

/**
 * Validates and returns client-side environment variables
 * Safe to use in both server and client contexts
 */
export function getClientEnv() {
  try {
    return clientEnvSchema.validateSync({
      NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      const missingVars = error.errors.join(', ');
      throw new Error(
        `Missing or invalid client environment variables: ${missingVars}\n\n` +
        'Please check your .env.local file. All NEXT_PUBLIC_FIREBASE_* variables are required.'
      );
    }
    throw error;
  }
}

/**
 * Validates all environment variables (server + client)
 * Use this during application startup for comprehensive validation
 */
export function validateAllEnv() {
  const isServer = typeof window === 'undefined';
  
  // Always validate client env (it's safe on both sides)
  const clientEnv = getClientEnv();
  
  // Only validate server env on the server side
  if (isServer) {
    const serverEnv = getServerEnv();
    return { ...serverEnv, ...clientEnv };
  }
  
  return clientEnv;
}

/**
 * Get environment configuration with proper validation
 * This is the main export that components should use
 */
export const env = (() => {
  try {
    return validateAllEnv();
  } catch (error) {
    // In development, show the error clearly
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Environment Configuration Error:');
      console.error(error);
    }
    
    // Re-throw to fail fast
    throw error;
  }
})();

// Type exports for usage in other files
export type ServerEnv = yup.InferType<typeof serverEnvSchema>;
export type ClientEnv = yup.InferType<typeof clientEnvSchema>;
export type Env = ServerEnv & ClientEnv;