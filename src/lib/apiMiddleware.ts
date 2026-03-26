/**
 * API Middleware for rate limiting, authentication, and security
 * Central place for API protection logic
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAuth } from './auth-middleware';
import { 
  checkProgressiveRateLimit, 
  withCircuitBreaker,
  RateLimitConfig,
  CircuitBreakerConfig,
  RATE_LIMITS 
} from './rateLimiting';

export interface MiddlewareConfig {
  requireAuth?: boolean;
  rateLimit?: RateLimitConfig;
  circuitBreaker?: {
    serviceKey: string;
    config: CircuitBreakerConfig;
  };
  validateInput?: (body: any) => { isValid: boolean; error?: string };
}

export interface MiddlewareResult {
  success: boolean;
  response?: NextResponse;
  rateLimitResult?: any;
  authResult?: any;
}

/**
 * Apply comprehensive API middleware
 */
export async function applyMiddleware(
  request: NextRequest,
  config: MiddlewareConfig = {}
): Promise<MiddlewareResult> {
  
  // 1. Rate Limiting
  if (config.rateLimit) {
    const rateLimitResult = await checkProgressiveRateLimit(request, config.rateLimit);
    
    if (!rateLimitResult.allowed) {
      return {
        success: false,
        response: NextResponse.json(
          { 
            error: 'Rate limit exceeded', 
            message: 'Too many requests. Please try again later.',
            limit: rateLimitResult.limit,
            remaining: rateLimitResult.remaining,
            resetTime: rateLimitResult.resetTime
          },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Limit': rateLimitResult.limit.toString(),
              'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
              'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
              'Retry-After': (rateLimitResult.retryAfter || 60).toString()
            }
          }
        )
      };
    }
  }

  // 2. Authentication
  let authResult;
  if (config.requireAuth) {
    authResult = await validateAuth(request);
    
    if (!authResult.isAuthenticated) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Unauthorized', details: authResult.error },
          { status: 401 }
        )
      };
    }
  }

  // 3. Input Validation
  if (config.validateInput) {
    try {
      const body = await request.json();
      const validation = config.validateInput(body);
      
      if (!validation.isValid) {
        return {
          success: false,
          response: NextResponse.json(
            { error: 'Validation Error', details: validation.error },
            { status: 400 }
          )
        };
      }
    } catch (error) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Invalid JSON', details: 'Request body must be valid JSON' },
          { status: 400 }
        )
      };
    }
  }

  return {
    success: true,
    rateLimitResult: config.rateLimit ? await checkProgressiveRateLimit(request, config.rateLimit) : null,
    authResult
  };
}

/**
 * Add standard headers to response
 */
export function addStandardHeaders(
  response: NextResponse,
  rateLimitResult?: any
): NextResponse {
  const headers = new Headers(response.headers);
  
  // Security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('X-XSS-Protection', '1; mode=block');
  
  // Rate limit headers
  if (rateLimitResult) {
    headers.set('X-RateLimit-Limit', rateLimitResult.limit.toString());
    headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    headers.set('X-RateLimit-Reset', rateLimitResult.resetTime.toString());
  }
  
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

/**
 * Wrapper for API handlers with middleware
 */
export function withMiddleware(
  handler: (request: NextRequest, context: any) => Promise<NextResponse>,
  config: MiddlewareConfig = {}
) {
  return async (request: NextRequest) => {
    const middlewareResult = await applyMiddleware(request, config);
    
    if (!middlewareResult.success) {
      return middlewareResult.response!;
    }
    
    try {
      const context = {
        auth: middlewareResult.authResult,
        rateLimit: middlewareResult.rateLimitResult,
        request
      };
      
      let response = await handler(request, context);
      
      // Add standard headers
      response = addStandardHeaders(response, middlewareResult.rateLimitResult);
      
      return response;
    } catch (error) {
      console.error('API handler error:', error);
      
      return NextResponse.json(
        { 
          error: 'Internal Server Error',
          message: 'An unexpected error occurred' 
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Predefined middleware configurations
 */
export const MIDDLEWARE_CONFIGS = {
  CLAUDE_API: {
    requireAuth: true,
    rateLimit: RATE_LIMITS.CLAUDE_API,
    circuitBreaker: {
      serviceKey: 'claude-api',
      config: {
        failureThreshold: 5,
        resetTimeoutMs: 30000,
        monitorWindowMs: 300000
      }
    }
  },
  
  MONITORING_API: {
    requireAuth: false,
    rateLimit: RATE_LIMITS.MONITORING_API
  },
  
  PUBLIC_API: {
    requireAuth: false,
    rateLimit: RATE_LIMITS.GENERAL_API
  },
  
  AUTH_API: {
    requireAuth: false,
    rateLimit: RATE_LIMITS.AUTH_API
  }
} as const;

/**
 * Request queue for high-load scenarios
 */
class RequestQueue {
  private queue: Array<{
    resolve: Function;
    reject: Function;
    timestamp: number;
  }> = [];
  private processing = false;
  private maxQueueSize = 100;
  private processingDelay = 100; // ms

  async enqueue(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.queue.length >= this.maxQueueSize) {
        reject(new Error('Request queue is full'));
        return;
      }
      
      this.queue.push({
        resolve,
        reject,
        timestamp: Date.now()
      });
      
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing) {
      return;
    }
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const item = this.queue.shift()!;
      
      // Check if request has expired (30 seconds)
      if (Date.now() - item.timestamp > 30000) {
        item.reject(new Error('Request timeout in queue'));
        continue;
      }
      
      item.resolve();
      
      // Add delay to prevent overwhelming
      if (this.queue.length > 0) {
        await new Promise(resolve => setTimeout(resolve, this.processingDelay));
      }
    }
    
    this.processing = false;
  }

  getQueueSize(): number {
    return this.queue.length;
  }
}

const globalRequestQueue = new RequestQueue();

/**
 * Queue requests during high load
 */
export async function queueRequest(): Promise<void> {
  return globalRequestQueue.enqueue();
}

/**
 * Get current queue status
 */
export function getQueueStatus() {
  return {
    size: globalRequestQueue.getQueueSize(),
    processing: globalRequestQueue['processing']
  };
}

export default {
  applyMiddleware,
  withMiddleware,
  addStandardHeaders,
  queueRequest,
  getQueueStatus,
  MIDDLEWARE_CONFIGS
};