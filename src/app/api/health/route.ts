import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, connectFirestoreEmulator, doc, getDoc } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import Anthropic from '@anthropic-ai/sdk';

// Health check configuration
const HEALTH_CHECK_TIMEOUT = 10000; // 10 seconds
const CLAUDE_TEST_TIMEOUT = 5000; // 5 seconds for Claude API test

interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime?: number;
  details?: string;
  error?: string;
}

interface HealthCheckResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  version: string;
  uptime: number;
  environment: string;
  services: HealthStatus[];
  summary: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

/**
 * Test database connectivity by attempting to read a test document
 */
async function checkDatabaseHealth(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  try {
    // Check if Firebase is configured
    const firebaseConfig = {
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
    };

    const hasRequiredConfig = !!(
      firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId
    );

    if (!hasRequiredConfig) {
      return {
        service: 'database',
        status: 'unhealthy',
        details: 'Firebase configuration missing',
        error: 'Required Firebase environment variables are not set'
      };
    }

    // Initialize Firebase app if not already done
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    const db = getFirestore(app);

    // Test database connectivity with a simple read operation
    const testDocRef = doc(db, 'health-check', 'test');
    const startRead = Date.now();
    
    // Attempt to read a test document (this will fail gracefully if document doesn't exist)
    await getDoc(testDocRef);
    
    const responseTime = Date.now() - startTime;

    return {
      service: 'database',
      status: 'healthy',
      responseTime,
      details: `Firestore connection successful (Project: ${firebaseConfig.projectId})`
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Database health check failed:', error);
    
    return {
      service: 'database',
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown database error'
    };
  }
}

/**
 * Test Claude AI API connectivity
 */
async function checkClaudeAPIHealth(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  try {
    const apiKey = process.env.CLAUDE_API_KEY;
    const claudeModel = process.env.CLAUDE_MODEL;

    if (!apiKey) {
      return {
        service: 'claude-api',
        status: 'unhealthy',
        details: 'Claude API key not configured',
        error: 'CLAUDE_API_KEY environment variable is not set'
      };
    }

    if (!claudeModel) {
      return {
        service: 'claude-api',
        status: 'degraded',
        details: 'Claude model not specified, will use default',
        error: 'CLAUDE_MODEL environment variable is not set'
      };
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
      timeout: CLAUDE_TEST_TIMEOUT,
    });

    // Test with a minimal request to check API connectivity
    const testMessage = await anthropic.messages.create({
      model: claudeModel as Anthropic.Model,
      max_tokens: 10,
      messages: [
        {
          role: 'user',
          content: 'Say "OK"',
        },
      ],
    });

    const responseTime = Date.now() - startTime;

    if (!testMessage.content || testMessage.content.length === 0) {
      return {
        service: 'claude-api',
        status: 'degraded',
        responseTime,
        details: 'Claude API responding but returned empty content'
      };
    }

    return {
      service: 'claude-api',
      status: 'healthy',
      responseTime,
      details: `Claude API accessible (Model: ${claudeModel})`
    };

  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Claude API health check failed:', error);
    
    let status: 'degraded' | 'unhealthy' = 'unhealthy';
    let details = 'Claude AI API not accessible';
    
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        details = 'Claude API authentication failed';
      } else if (error.status === 429) {
        status = 'degraded';
        details = 'Claude API rate limited';
      } else if (error.status === 503) {
        status = 'degraded';
        details = 'Claude API temporarily unavailable';
      }
    } else if (error instanceof Anthropic.APIConnectionError) {
      status = 'degraded';
      details = 'Network connection to Claude API failed';
    }
    
    return {
      service: 'claude-api',
      status,
      responseTime,
      details,
      error: error instanceof Error ? error.message : 'Unknown Claude API error'
    };
  }
}

/**
 * Check core application functionality
 */
async function checkCoreAppHealth(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  try {
    // Test basic Node.js/Next.js functionality
    const nodeVersion = process.version;
    const nextjsVersion = process.env.npm_package_version || 'unknown';
    
    // Check memory usage
    const memUsage = process.memoryUsage();
    const memoryUsageMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    
    // Check if we're running out of memory (arbitrary threshold of 500MB)
    const isMemoryHigh = memoryUsageMB > 500;
    
    const responseTime = Date.now() - startTime;
    
    return {
      service: 'core-app',
      status: isMemoryHigh ? 'degraded' : 'healthy',
      responseTime,
      details: `Node.js ${nodeVersion}, Memory: ${memoryUsageMB}MB${isMemoryHigh ? ' (high)' : ''}`
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Core app health check failed:', error);
    
    return {
      service: 'core-app',
      status: 'unhealthy',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown core app error'
    };
  }
}

/**
 * Check external monitoring services connectivity
 */
async function checkMonitoringHealth(): Promise<HealthStatus> {
  const startTime = Date.now();
  
  try {
    const errorEndpoint = process.env.NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT;
    const metricsEndpoint = process.env.NEXT_PUBLIC_METRICS_ENDPOINT;
    const monitoringEnabled = process.env.NEXT_PUBLIC_MONITORING_ENABLED === 'true';
    
    if (!monitoringEnabled) {
      return {
        service: 'monitoring',
        status: 'healthy',
        details: 'Monitoring disabled by configuration',
        responseTime: Date.now() - startTime
      };
    }
    
    if (!errorEndpoint && !metricsEndpoint) {
      return {
        service: 'monitoring',
        status: 'degraded',
        details: 'Monitoring enabled but no endpoints configured',
        responseTime: Date.now() - startTime
      };
    }
    
    // Test connectivity to monitoring endpoints if configured
    const tests: Promise<Response>[] = [];
    
    if (errorEndpoint) {
      tests.push(fetch(errorEndpoint, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(3000)
      }));
    }
    
    if (metricsEndpoint) {
      tests.push(fetch(metricsEndpoint, {
        method: 'HEAD', 
        signal: AbortSignal.timeout(3000)
      }));
    }
    
    if (tests.length === 0) {
      return {
        service: 'monitoring',
        status: 'healthy',
        details: 'No external monitoring endpoints to test',
        responseTime: Date.now() - startTime
      };
    }
    
    // Test all endpoints
    const results = await Promise.allSettled(tests);
    const failures = results.filter(r => r.status === 'rejected');
    
    const responseTime = Date.now() - startTime;
    
    if (failures.length === 0) {
      return {
        service: 'monitoring',
        status: 'healthy',
        responseTime,
        details: `All ${tests.length} monitoring endpoint(s) accessible`
      };
    } else if (failures.length < tests.length) {
      return {
        service: 'monitoring',
        status: 'degraded',
        responseTime,
        details: `${tests.length - failures.length}/${tests.length} monitoring endpoints accessible`
      };
    } else {
      return {
        service: 'monitoring',
        status: 'unhealthy',
        responseTime,
        details: 'All monitoring endpoints inaccessible',
        error: 'External monitoring services unreachable'
      };
    }
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Monitoring health check failed:', error);
    
    return {
      service: 'monitoring',
      status: 'degraded',
      responseTime,
      error: error instanceof Error ? error.message : 'Unknown monitoring error'
    };
  }
}

/**
 * Main health check endpoint
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const { searchParams } = new URL(request.url);
  const detailed = searchParams.get('detailed') === 'true';
  const service = searchParams.get('service');
  
  try {
    // If specific service is requested, only check that service
    if (service) {
      let serviceCheck: Promise<HealthStatus>;
      
      switch (service) {
        case 'database':
        case 'db':
          serviceCheck = checkDatabaseHealth();
          break;
        case 'claude':
        case 'claude-api':
          serviceCheck = checkClaudeAPIHealth();
          break;
        case 'core':
        case 'core-app':
          serviceCheck = checkCoreAppHealth();
          break;
        case 'monitoring':
          serviceCheck = checkMonitoringHealth();
          break;
        default:
          return NextResponse.json({
            error: 'Invalid service',
            availableServices: ['database', 'claude-api', 'core-app', 'monitoring']
          }, { status: 400 });
      }
      
      const result = await serviceCheck;
      return NextResponse.json(result, {
        status: result.status === 'healthy' ? 200 : result.status === 'degraded' ? 200 : 503
      });
    }
    
    // Run all health checks concurrently
    const healthChecks = await Promise.all([
      checkDatabaseHealth(),
      checkClaudeAPIHealth(),
      checkCoreAppHealth(),
      checkMonitoringHealth(),
    ]);
    
    // Calculate summary
    const summary = {
      total: healthChecks.length,
      healthy: healthChecks.filter(s => s.status === 'healthy').length,
      degraded: healthChecks.filter(s => s.status === 'degraded').length,
      unhealthy: healthChecks.filter(s => s.status === 'unhealthy').length,
    };
    
    // Determine overall status
    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (summary.unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (summary.degraded > 0) {
      overallStatus = 'degraded';
    }
    
    const response: HealthCheckResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: Math.round(process.uptime()),
      environment: process.env.NODE_ENV || 'unknown',
      services: detailed ? healthChecks : healthChecks.map(s => ({
        service: s.service,
        status: s.status,
        responseTime: s.responseTime
      })),
      summary,
    };
    
    // Set appropriate HTTP status code
    const httpStatus = overallStatus === 'healthy' ? 200 : 
                      overallStatus === 'degraded' ? 200 : 503;
    
    return NextResponse.json(response, { 
      status: httpStatus,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    console.error('Health check endpoint failed:', error);
    
    const errorResponse = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check system failure',
      details: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    };
    
    return NextResponse.json(errorResponse, { status: 503 });
  }
}

/**
 * Health check for simple load balancer ping
 */
export async function HEAD() {
  try {
    // Quick core functionality check
    const coreHealth = await checkCoreAppHealth();
    
    if (coreHealth.status === 'healthy') {
      return new Response(null, { status: 200 });
    } else {
      return new Response(null, { status: 503 });
    }
  } catch (error) {
    return new Response(null, { status: 503 });
  }
}