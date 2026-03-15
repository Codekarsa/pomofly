import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase';
import { ReadinessResponse } from '@/types/health';

/**
 * Kubernetes readiness probe endpoint
 * Returns 200 if service is ready to receive traffic, 503 if not ready
 * 
 * This endpoint checks if critical dependencies are available and
 * the service can handle requests successfully.
 * 
 * GET /api/health/ready
 */
export async function GET() {
  try {
    // Check critical dependencies for readiness
    const checks = await Promise.allSettled([
      checkFirebaseReady(),
      checkEnvironmentReady(),
    ]);

    // Extract results
    const results = checks.map(check => 
      check.status === 'fulfilled' ? check.value : { ready: false, error: 'Promise rejected' }
    );

    // Check if all critical services are ready
    const allReady = results.every(result => result.ready);

    const readinessData = {
      ready: allReady,
      timestamp: new Date().toISOString(),
      service: 'pomofly',
      checks: {
        firebase: results[0],
        environment: results[1],
      },
    };

    // Return 200 if ready, 503 if not ready
    const status = allReady ? 200 : 503;

    return NextResponse.json(readinessData, {
      status,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    // Service is definitely not ready if we can't even run checks
    const errorData = {
      ready: false,
      timestamp: new Date().toISOString(),
      service: 'pomofly',
      error: error instanceof Error ? error.message : 'Unknown error',
    };

    return NextResponse.json(errorData, {
      status: 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  }
}

async function checkFirebaseReady(): Promise<{ ready: boolean; error?: string }> {
  try {
    // Check if Firebase instances are initialized
    if (!auth || !db) {
      return {
        ready: false,
        error: 'Firebase instances not initialized',
      };
    }

    // Quick check - if we can access the instances, we're likely ready
    // We don't do network calls here to keep readiness checks fast
    return { ready: true };
  } catch (error) {
    return {
      ready: false,
      error: error instanceof Error ? error.message : 'Firebase check failed',
    };
  }
}

async function checkEnvironmentReady(): Promise<{ ready: boolean; error?: string; missing?: string[] }> {
  try {
    // Check essential environment variables for readiness
    const essentialEnvVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'CLAUDE_API_KEY',
    ];

    const missing = essentialEnvVars.filter(varName => {
      const value = process.env[varName];
      return !value || value.trim() === '';
    });

    if (missing.length > 0) {
      return {
        ready: false,
        error: `Missing essential environment variables`,
        missing,
      };
    }

    return { ready: true };
  } catch (error) {
    return {
      ready: false,
      error: error instanceof Error ? error.message : 'Environment check failed',
    };
  }
}