import { NextRequest, NextResponse } from 'next/server';
import { checkEnvironmentHealth, validateFirebaseConfig, getSanitizedConfig } from '@/lib/firebase-config';
import { withSecurity } from '@/lib/security-middleware';

/**
 * Firebase Configuration Health Check Endpoint
 * 
 * Provides runtime validation and monitoring of Firebase configuration
 * Returns sanitized configuration status without exposing sensitive data
 */
async function handleGET(request: NextRequest) {
  try {
    // Perform comprehensive health check
    const health = checkEnvironmentHealth();
    const configValidation = validateFirebaseConfig();
    const sanitizedConfig = getSanitizedConfig();

    // Security: Only expose sanitized information
    const healthResponse = {
      status: health.isHealthy ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: health.environment,
      configStatus: health.configStatus,
      firebase: {
        initialized: configValidation.isValid,
        configComplete: health.configStatus === 'complete',
        projectId: sanitizedConfig.projectId,
        authDomain: sanitizedConfig.authDomain,
        // Note: API key and other sensitive data are not exposed
      },
      validation: {
        hasErrors: configValidation.errors.length > 0,
        hasWarnings: configValidation.warnings.length > 0,
        errorCount: configValidation.errors.length,
        warningCount: configValidation.warnings.length,
      },
      checks: {
        environmentVariables: health.configStatus !== 'missing',
        configurationFormat: configValidation.isValid,
        securityValidation: configValidation.errors.length === 0,
      }
    };

    // Include issues and recommendations if any
    if (health.issues.length > 0 || health.recommendations.length > 0) {
      healthResponse['details'] = {
        issues: health.issues,
        recommendations: health.recommendations.slice(0, 5), // Limit recommendations
      };
    }

    // Include detailed errors in development only
    if (process.env.NODE_ENV === 'development') {
      healthResponse['development'] = {
        errors: configValidation.errors,
        warnings: configValidation.warnings,
        sanitizedConfig: sanitizedConfig,
      };
    }

    // Set appropriate status code based on health
    const statusCode = health.isHealthy ? 200 : 500;

    return NextResponse.json(healthResponse, { 
      status: statusCode,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });

  } catch (error) {
    console.error('Firebase health check failed:', error);

    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
      details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  }
}

/**
 * Configuration validation endpoint (POST)
 * Allows testing configuration changes without affecting the running application
 */
async function handlePOST(request: NextRequest) {
  try {
    // Only allow in development environment for security
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({
        error: 'Configuration validation is not available in production',
        timestamp: new Date().toISOString()
      }, { status: 403 });
    }

    const body = await request.json();
    const { config } = body;

    if (!config || typeof config !== 'object') {
      return NextResponse.json({
        error: 'Invalid request body. Expected: { config: FirebaseConfig }',
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    // Temporarily override environment variables for validation
    const originalEnv = { ...process.env };
    
    try {
      // Set temporary environment variables
      if (config.apiKey) process.env.NEXT_PUBLIC_FIREBASE_API_KEY = config.apiKey;
      if (config.authDomain) process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN = config.authDomain;
      if (config.projectId) process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID = config.projectId;
      if (config.storageBucket) process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET = config.storageBucket;
      if (config.messagingSenderId) process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = config.messagingSenderId;
      if (config.appId) process.env.NEXT_PUBLIC_FIREBASE_APP_ID = config.appId;

      // Validate the configuration
      const validation = validateFirebaseConfig();
      
      return NextResponse.json({
        valid: validation.isValid,
        errors: validation.errors,
        warnings: validation.warnings,
        timestamp: new Date().toISOString(),
        test: true
      });

    } finally {
      // Restore original environment variables
      Object.assign(process.env, originalEnv);
    }

  } catch (error) {
    console.error('Firebase config validation failed:', error);
    
    return NextResponse.json({
      error: 'Configuration validation failed',
      details: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Export with security middleware
export const GET = withSecurity(handleGET);
export const POST = withSecurity(handlePOST);