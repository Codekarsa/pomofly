import { NextRequest, NextResponse } from 'next/server';

/**
 * Kubernetes-style liveness probe endpoint
 * Checks if the application is alive and responding
 * Returns 200 if alive, 503 if dead/unresponsive
 * 
 * This should be a lightweight check that verifies basic functionality
 * without external dependencies that could cause false positives
 */
export async function GET() {
  try {
    const startTime = Date.now();
    
    // Basic sanity checks
    const checks = {
      process: checkProcessHealth(),
      memory: checkMemoryHealth(),
      eventLoop: checkEventLoopHealth(),
    };
    
    const results = await Promise.all([
      checks.process,
      checks.memory,
      checks.eventLoop,
    ]);
    
    const responseTime = Date.now() - startTime;
    const allHealthy = results.every(result => result.healthy);
    
    if (allHealthy) {
      return NextResponse.json({
        status: 'alive',
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        responseTime,
        checks: results.map(r => ({ 
          check: r.check, 
          healthy: r.healthy,
          details: r.details 
        }))
      }, { status: 200 });
    } else {
      const issues = results.filter(r => !r.healthy);
      return NextResponse.json({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        uptime: Math.round(process.uptime()),
        responseTime,
        issues: issues.map(r => ({ 
          check: r.check, 
          reason: r.reason,
          details: r.details 
        })),
        checks: results.map(r => ({ 
          check: r.check, 
          healthy: r.healthy 
        }))
      }, { status: 503 });
    }
    
  } catch (error) {
    console.error('Liveness check failed:', error);
    return NextResponse.json({
      status: 'dead',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}

/**
 * Check if the Node.js process is healthy
 */
async function checkProcessHealth(): Promise<{
  check: string;
  healthy: boolean;
  reason?: string;
  details?: string;
}> {
  try {
    const pid = process.pid;
    const platform = process.platform;
    const nodeVersion = process.version;
    
    // Verify basic process information is available
    if (!pid || !platform || !nodeVersion) {
      return {
        check: 'process',
        healthy: false,
        reason: 'Basic process information missing'
      };
    }
    
    return {
      check: 'process',
      healthy: true,
      details: `PID ${pid}, Node.js ${nodeVersion} on ${platform}`
    };
    
  } catch (error) {
    return {
      check: 'process',
      healthy: false,
      reason: error instanceof Error ? error.message : 'Unknown process error'
    };
  }
}

/**
 * Check memory usage for potential issues
 */
async function checkMemoryHealth(): Promise<{
  check: string;
  healthy: boolean;
  reason?: string;
  details?: string;
}> {
  try {
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    
    // Check for excessive memory usage (arbitrary thresholds)
    const criticalMemoryThreshold = 1024; // 1GB heap usage
    const warningMemoryThreshold = 512; // 512MB heap usage
    
    if (heapUsedMB > criticalMemoryThreshold) {
      return {
        check: 'memory',
        healthy: false,
        reason: `Critical memory usage: ${heapUsedMB}MB heap`,
        details: `Heap: ${heapUsedMB}/${heapTotalMB}MB, RSS: ${rssMB}MB`
      };
    }
    
    return {
      check: 'memory',
      healthy: true,
      details: `Heap: ${heapUsedMB}/${heapTotalMB}MB, RSS: ${rssMB}MB ${heapUsedMB > warningMemoryThreshold ? '(high)' : ''}`
    };
    
  } catch (error) {
    return {
      check: 'memory',
      healthy: false,
      reason: error instanceof Error ? error.message : 'Unknown memory error'
    };
  }
}

/**
 * Check event loop health
 */
async function checkEventLoopHealth(): Promise<{
  check: string;
  healthy: boolean;
  reason?: string;
  details?: string;
}> {
  try {
    const startTime = process.hrtime.bigint();
    
    // Test event loop responsiveness with a small delay
    await new Promise(resolve => {
      setImmediate(() => {
        resolve(undefined);
      });
    });
    
    const endTime = process.hrtime.bigint();
    const responseTimeMs = Number(endTime - startTime) / 1000000; // Convert nanoseconds to milliseconds
    
    // If event loop takes too long to respond, it might be blocked
    const eventLoopThreshold = 100; // 100ms threshold
    
    if (responseTimeMs > eventLoopThreshold) {
      return {
        check: 'eventloop',
        healthy: false,
        reason: `Event loop delay: ${responseTimeMs.toFixed(2)}ms`,
        details: `Event loop may be blocked (>${eventLoopThreshold}ms)`
      };
    }
    
    return {
      check: 'eventloop',
      healthy: true,
      details: `Event loop responsive (${responseTimeMs.toFixed(2)}ms)`
    };
    
  } catch (error) {
    return {
      check: 'eventloop',
      healthy: false,
      reason: error instanceof Error ? error.message : 'Unknown event loop error'
    };
  }
}

/**
 * HEAD request for load balancer compatibility
 */
export async function HEAD() {
  try {
    // Quick liveness check - just verify process is responding
    const pid = process.pid;
    if (pid) {
      return new Response(null, { status: 200 });
    } else {
      return new Response(null, { status: 503 });
    }
  } catch (error) {
    return new Response(null, { status: 503 });
  }
}