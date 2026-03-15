import { NextResponse } from 'next/server';
import { auth, db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { 
  DetailedHealthResponse, 
  HealthCheck, 
  HealthCheckName, 
  HEALTH_CHECK_TIMEOUTS 
} from '@/types/health';

// Use timeout from types file
const HEALTH_CHECK_TIMEOUT = HEALTH_CHECK_TIMEOUTS.DETAILED;

/**
 * Detailed health check endpoint with dependency validation
 * Returns comprehensive service status including external dependencies
 * 
 * GET /api/health/detailed
 */
export async function GET() {
  const startTime = Date.now();
  const checks: HealthCheck[] = [];

  // Firebase Authentication Check
  const authCheck = await checkFirebaseAuth();
  checks.push(authCheck);

  // Firebase Firestore Check
  const firestoreCheck = await checkFirestore();
  checks.push(firestoreCheck);

  // Claude API Check
  const claudeCheck = await checkClaudeAPI();
  checks.push(claudeCheck);

  // Environment Variables Check
  const envCheck = checkEnvironmentVariables();
  checks.push(envCheck);

  // Memory Usage Check
  const memoryCheck = checkMemoryUsage();
  checks.push(memoryCheck);

  // Calculate summary
  const summary = {
    total: checks.length,
    healthy: checks.filter(c => c.status === 'healthy').length,
    unhealthy: checks.filter(c => c.status === 'unhealthy').length,
    degraded: checks.filter(c => c.status === 'degraded').length,
  };

  // Determine overall status
  let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';
  if (summary.unhealthy > 0) {
    overallStatus = 'unhealthy';
  } else if (summary.degraded > 0) {
    overallStatus = 'degraded';
  }

  const healthData: DetailedHealthResponse = {
    status: overallStatus,
    timestamp: new Date().toISOString(),
    service: 'pomofly',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    checks,
    summary,
  };

  const httpStatus = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;

  return NextResponse.json(healthData, {
    status: httpStatus,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

async function checkFirebaseAuth(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    // Try to access the Auth instance
    if (!auth) {
      return {
        name: 'firebase_auth',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: 'Firebase Auth instance not initialized',
      };
    }

    // Check if auth is configured properly
    const currentUser = auth.currentUser;
    
    return {
      name: 'firebase_auth',
      status: 'healthy',
      responseTime: Date.now() - startTime,
      details: {
        configured: true,
        currentUser: currentUser ? 'authenticated' : 'anonymous',
      },
    };
  } catch (error) {
    return {
      name: 'firebase_auth',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkFirestore(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    if (!db) {
      return {
        name: 'firestore',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: 'Firestore instance not initialized',
      };
    }

    // Try to read a test document (this should fail gracefully if collection doesn't exist)
    const testDocRef = doc(db, '__health__', 'test');
    
    // Set a timeout for the operation
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Firestore connection timeout')), HEALTH_CHECK_TIMEOUT);
    });

    const docSnapshot = await Promise.race([
      getDoc(testDocRef),
      timeoutPromise
    ]) as any;

    return {
      name: 'firestore',
      status: 'healthy',
      responseTime: Date.now() - startTime,
      details: {
        connected: true,
        testDocExists: docSnapshot?.exists() || false,
      },
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Determine if this is a degraded or unhealthy state
    if (error instanceof Error && error.message.includes('timeout')) {
      return {
        name: 'firestore',
        status: 'degraded',
        responseTime,
        error: 'Firestore connection timeout (slow response)',
      };
    }

    return {
      name: 'firestore',
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function checkClaudeAPI(): Promise<HealthCheck> {
  const startTime = Date.now();
  
  try {
    const apiKey = process.env.CLAUDE_API_KEY;
    const modelName = process.env.CLAUDE_MODEL;

    if (!apiKey || !modelName) {
      return {
        name: 'claude_api',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: 'Claude API credentials not configured',
        details: {
          hasApiKey: !!apiKey,
          hasModel: !!modelName,
        },
      };
    }

    // For health check, we just verify the credentials are configured
    // We don't make an actual API call to avoid costs and rate limits
    return {
      name: 'claude_api',
      status: 'healthy',
      responseTime: Date.now() - startTime,
      details: {
        configured: true,
        model: modelName,
        // Don't expose actual API key, just confirm it's set
        apiKeyConfigured: apiKey.length > 10,
      },
    };
  } catch (error) {
    return {
      name: 'claude_api',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function checkEnvironmentVariables(): HealthCheck {
  const startTime = Date.now();
  
  try {
    const requiredEnvVars = [
      'NEXT_PUBLIC_FIREBASE_API_KEY',
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN',
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
      'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET',
      'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
      'NEXT_PUBLIC_FIREBASE_APP_ID',
      'CLAUDE_API_KEY',
      'CLAUDE_MODEL',
    ];

    const missing: string[] = [];
    const present: string[] = [];

    requiredEnvVars.forEach(varName => {
      const value = process.env[varName];
      if (!value || value.trim() === '') {
        missing.push(varName);
      } else {
        present.push(varName);
      }
    });

    const status = missing.length === 0 ? 'healthy' : missing.length < requiredEnvVars.length / 2 ? 'degraded' : 'unhealthy';

    return {
      name: 'environment_variables',
      status,
      responseTime: Date.now() - startTime,
      details: {
        required: requiredEnvVars.length,
        present: present.length,
        missing: missing.length,
        missingVars: missing,
      },
      error: missing.length > 0 ? `Missing environment variables: ${missing.join(', ')}` : undefined,
    };
  } catch (error) {
    return {
      name: 'environment_variables',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

function checkMemoryUsage(): HealthCheck {
  const startTime = Date.now();
  
  try {
    const usage = process.memoryUsage();
    
    // Convert to MB for easier reading
    const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(usage.rss / 1024 / 1024);
    
    // Determine status based on heap usage percentage
    const heapUsagePercent = (usage.heapUsed / usage.heapTotal) * 100;
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (heapUsagePercent > 90) {
      status = 'unhealthy';
    } else if (heapUsagePercent > 75) {
      status = 'degraded';
    }

    return {
      name: 'memory_usage',
      status,
      responseTime: Date.now() - startTime,
      details: {
        heapUsed: `${heapUsedMB}MB`,
        heapTotal: `${heapTotalMB}MB`,
        rss: `${rssMB}MB`,
        external: `${Math.round(usage.external / 1024 / 1024)}MB`,
        heapUsagePercent: Math.round(heapUsagePercent),
      },
    };
  } catch (error) {
    return {
      name: 'memory_usage',
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}