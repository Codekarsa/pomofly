import { NextRequest, NextResponse } from 'next/server';

/**
 * Kubernetes-style readiness probe endpoint
 * Checks if the application is ready to serve traffic
 * Returns 200 if ready, 503 if not ready
 */
export async function GET() {
  try {
    // Check if essential services are configured and available
    const checks = {
      firebase: checkFirebaseConfig(),
      environment: checkEnvironmentConfig(),
    };
    
    const results = await Promise.all([
      checks.firebase,
      checks.environment,
    ]);
    
    const allReady = results.every(result => result.ready);
    const issues = results.filter(result => !result.ready);
    
    if (allReady) {
      return NextResponse.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: results.map(r => ({ service: r.service, ready: r.ready }))
      }, { status: 200 });
    } else {
      return NextResponse.json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        issues: issues.map(r => ({ service: r.service, reason: r.reason })),
        checks: results.map(r => ({ service: r.service, ready: r.ready }))
      }, { status: 503 });
    }
    
  } catch (error) {
    console.error('Readiness check failed:', error);
    return NextResponse.json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}

/**
 * Check if Firebase is properly configured
 */
async function checkFirebaseConfig(): Promise<{ service: string; ready: boolean; reason?: string }> {
  try {
    const requiredVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      return {
        service: 'firebase',
        ready: false,
        reason: `Missing environment variables: ${missingVars.join(', ')}`
      };
    }
    
    return {
      service: 'firebase',
      ready: true
    };
    
  } catch (error) {
    return {
      service: 'firebase',
      ready: false,
      reason: error instanceof Error ? error.message : 'Unknown Firebase config error'
    };
  }
}

/**
 * Check essential environment configuration
 */
async function checkEnvironmentConfig(): Promise<{ service: string; ready: boolean; reason?: string }> {
  try {
    const nodeEnv = process.env.NODE_ENV;
    
    if (!nodeEnv) {
      return {
        service: 'environment',
        ready: false,
        reason: 'NODE_ENV not set'
      };
    }
    
    // In production, Claude API should be available for full functionality
    if (nodeEnv === 'production' && !process.env.CLAUDE_API_KEY) {
      return {
        service: 'environment',
        ready: false,
        reason: 'CLAUDE_API_KEY required for production'
      };
    }
    
    return {
      service: 'environment',
      ready: true
    };
    
  } catch (error) {
    return {
      service: 'environment',
      ready: false,
      reason: error instanceof Error ? error.message : 'Unknown environment error'
    };
  }
}

/**
 * HEAD request for load balancer compatibility
 */
export async function HEAD() {
  try {
    const checks = await Promise.all([
      checkFirebaseConfig(),
      checkEnvironmentConfig(),
    ]);
    
    const allReady = checks.every(check => check.ready);
    return new Response(null, { status: allReady ? 200 : 503 });
    
  } catch (error) {
    return new Response(null, { status: 503 });
  }
}