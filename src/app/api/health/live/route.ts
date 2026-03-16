import { NextResponse } from 'next/server';
import { LivenessResponse } from '@/types/health';

/**
 * Kubernetes liveness probe endpoint
 * Returns 200 if service is alive and responding, 503 if not
 * 
 * This endpoint is designed to be as simple and fast as possible.
 * It should only fail if the service is completely unresponsive
 * or has encountered a fatal error that requires restart.
 * 
 * GET /api/health/live
 */
export async function GET() {
  try {
    // Perform minimal checks to verify service is alive
    const livenessData = {
      alive: true,
      timestamp: new Date().toISOString(),
      service: 'pomofly',
      uptime: process.uptime(),
      pid: process.pid,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
    };

    return NextResponse.json(livenessData, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error) {
    // If we can't even construct a basic response, service needs restart
    const errorData = {
      alive: false,
      timestamp: new Date().toISOString(),
      service: 'pomofly',
      error: error instanceof Error ? error.message : 'Service unresponsive',
      pid: process.pid,
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