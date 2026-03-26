/**
 * Comprehensive Rate Limiting and Abuse Protection
 * Implements Redis-based rate limiting, circuit breakers, and progressive restrictions
 */

import { NextRequest } from 'next/server';

// Rate limit configurations
export interface RateLimitConfig {
  requests: number;
  windowMs: number;
  identifier?: 'ip' | 'user' | 'both';
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyPrefix?: string;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  monitorWindowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

export interface CircuitBreakerResult {
  allowed: boolean;
  state: 'closed' | 'open' | 'half-open';
  failureRate?: number;
  nextRetryTime?: number;
}

/**
 * In-memory storage for rate limiting (fallback when Redis is not available)
 * In production, replace with Redis for distributed rate limiting
 */
class MemoryRateLimitStore {
  private store = new Map<string, { count: number; resetTime: number; requests: number[] }>();
  private circuitBreakers = new Map<string, { 
    failures: number[];
    state: 'closed' | 'open' | 'half-open';
    lastFailureTime: number;
    nextRetryTime: number;
  }>();

  async increment(key: string, windowMs: number): Promise<{ count: number; resetTime: number }> {
    const now = Date.now();
    const resetTime = now + windowMs;
    
    let entry = this.store.get(key);
    
    if (!entry || now > entry.resetTime) {
      // Create new or reset expired entry
      entry = { count: 1, resetTime, requests: [now] };
    } else {
      // Increment existing entry
      entry.count++;
      entry.requests.push(now);
      // Clean old requests outside window
      entry.requests = entry.requests.filter(time => time > now - windowMs);
      entry.count = entry.requests.length;
    }
    
    this.store.set(key, entry);
    return { count: entry.count, resetTime: entry.resetTime };
  }

  async getCircuitBreakerState(key: string, config: CircuitBreakerConfig): Promise<CircuitBreakerResult> {
    const now = Date.now();
    let breaker = this.circuitBreakers.get(key);
    
    if (!breaker) {
      breaker = {
        failures: [],
        state: 'closed',
        lastFailureTime: 0,
        nextRetryTime: 0
      };
      this.circuitBreakers.set(key, breaker);
    }

    // Clean old failures outside monitoring window
    breaker.failures = breaker.failures.filter(time => time > now - config.monitorWindowMs);

    const failureRate = breaker.failures.length / Math.max(1, config.monitorWindowMs / 60000); // failures per minute

    // State transitions
    if (breaker.state === 'open') {
      if (now >= breaker.nextRetryTime) {
        breaker.state = 'half-open';
      }
    } else if (breaker.state === 'closed') {
      if (breaker.failures.length >= config.failureThreshold) {
        breaker.state = 'open';
        breaker.nextRetryTime = now + config.resetTimeoutMs;
      }
    }

    return {
      allowed: breaker.state !== 'open',
      state: breaker.state,
      failureRate,
      nextRetryTime: breaker.nextRetryTime
    };
  }

  async recordCircuitBreakerFailure(key: string): Promise<void> {
    const now = Date.now();
    let breaker = this.circuitBreakers.get(key);
    
    if (!breaker) {
      breaker = {
        failures: [],
        state: 'closed',
        lastFailureTime: 0,
        nextRetryTime: 0
      };
    }

    breaker.failures.push(now);
    breaker.lastFailureTime = now;
    
    // If we're in half-open state and get a failure, go back to open
    if (breaker.state === 'half-open') {
      breaker.state = 'open';
      breaker.nextRetryTime = now + 30000; // 30 second timeout
    }
    
    this.circuitBreakers.set(key, breaker);
  }

  async recordCircuitBreakerSuccess(key: string): Promise<void> {
    const breaker = this.circuitBreakers.get(key);
    if (breaker && breaker.state === 'half-open') {
      breaker.state = 'closed';
      breaker.failures = []; // Clear failures on successful recovery
      this.circuitBreakers.set(key, breaker);
    }
  }

  async cleanup(): Promise<void> {
    const now = Date.now();
    
    // Clean expired rate limit entries
    for (const [key, entry] of this.store.entries()) {
      if (now > entry.resetTime) {
        this.store.delete(key);
      }
    }

    // Clean old circuit breaker entries
    for (const [key, breaker] of this.circuitBreakers.entries()) {
      if (breaker.failures.length === 0 && breaker.state === 'closed' && 
          now - breaker.lastFailureTime > 3600000) { // 1 hour
        this.circuitBreakers.delete(key);
      }
    }
  }
}

// Global store instance (in production, use Redis)
const store = new MemoryRateLimitStore();

// Cleanup old entries every 5 minutes
setInterval(() => {
  store.cleanup();
}, 300000);

/**
 * Extract identifier from request (IP, user ID, or both)
 */
function getRequestIdentifier(request: NextRequest, type: 'ip' | 'user' | 'both' = 'ip'): string {
  const ip = request.ip || 
            request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
            request.headers.get('x-real-ip') ||
            '127.0.0.1';
            
  if (type === 'ip') {
    return ip;
  }
  
  if (type === 'user') {
    // Extract user ID from JWT token
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1];
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.user_id || payload.sub || ip;
      } catch {
        return ip;
      }
    }
    return ip;
  }
  
  // type === 'both'
  const userPart = (() => {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      try {
        const token = authHeader.split('Bearer ')[1];
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.user_id || payload.sub;
      } catch {
        return null;
      }
    }
    return null;
  })();
  
  return userPart ? `${userPart}:${ip}` : ip;
}

/**
 * Main rate limiting function
 */
export async function checkRateLimit(
  request: NextRequest, 
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const identifier = getRequestIdentifier(request, config.identifier);
  const key = `${config.keyPrefix || 'rate_limit'}:${identifier}`;
  
  try {
    const { count, resetTime } = await store.increment(key, config.windowMs);
    
    const allowed = count <= config.requests;
    const remaining = Math.max(0, config.requests - count);
    
    return {
      allowed,
      limit: config.requests,
      remaining,
      resetTime,
      retryAfter: allowed ? undefined : Math.ceil((resetTime - Date.now()) / 1000)
    };
  } catch (error) {
    console.error('Rate limiting error:', error);
    // On error, allow request but log the issue
    return {
      allowed: true,
      limit: config.requests,
      remaining: config.requests,
      resetTime: Date.now() + config.windowMs
    };
  }
}

/**
 * Circuit breaker for external API calls
 */
export async function checkCircuitBreaker(
  serviceKey: string, 
  config: CircuitBreakerConfig
): Promise<CircuitBreakerResult> {
  return store.getCircuitBreakerState(serviceKey, config);
}

/**
 * Record a failure for circuit breaker
 */
export async function recordFailure(serviceKey: string): Promise<void> {
  return store.recordCircuitBreakerFailure(serviceKey);
}

/**
 * Record a success for circuit breaker
 */
export async function recordSuccess(serviceKey: string): Promise<void> {
  return store.recordCircuitBreakerSuccess(serviceKey);
}

/**
 * Progressive rate limiting - increases restrictions based on violation history
 */
export async function checkProgressiveRateLimit(
  request: NextRequest,
  baseConfig: RateLimitConfig
): Promise<RateLimitResult> {
  const identifier = getRequestIdentifier(request, baseConfig.identifier);
  const violationKey = `violations:${identifier}`;
  
  // Check violation history (last hour)
  const violationResult = await store.increment(violationKey, 3600000); // 1 hour window
  const violationCount = violationResult.count;
  
  // Apply progressive penalties
  let adjustedConfig = { ...baseConfig };
  
  if (violationCount > 5) {
    // Severe penalty: 10x stricter
    adjustedConfig.requests = Math.max(1, Math.floor(baseConfig.requests / 10));
  } else if (violationCount > 2) {
    // Moderate penalty: 3x stricter
    adjustedConfig.requests = Math.max(1, Math.floor(baseConfig.requests / 3));
  } else if (violationCount > 0) {
    // Light penalty: 2x stricter
    adjustedConfig.requests = Math.max(1, Math.floor(baseConfig.requests / 2));
  }
  
  const result = await checkRateLimit(request, adjustedConfig);
  
  // Record violation if rate limit exceeded
  if (!result.allowed) {
    await store.increment(violationKey, 3600000);
  }
  
  return result;
}

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMITS = {
  // Claude API - High cost operations
  CLAUDE_API: {
    requests: 100,
    windowMs: 60000, // 1 minute
    identifier: 'user' as const,
    keyPrefix: 'claude_api'
  },
  
  // General API endpoints
  GENERAL_API: {
    requests: 1000,
    windowMs: 60000, // 1 minute
    identifier: 'ip' as const,
    keyPrefix: 'general_api'
  },
  
  // Authentication endpoints
  AUTH_API: {
    requests: 10,
    windowMs: 60000, // 1 minute
    identifier: 'ip' as const,
    keyPrefix: 'auth_api'
  },
  
  // Monitoring endpoints
  MONITORING_API: {
    requests: 50,
    windowMs: 60000, // 1 minute
    identifier: 'ip' as const,
    keyPrefix: 'monitoring_api'
  }
} as const;

/**
 * Circuit breaker configurations
 */
export const CIRCUIT_BREAKERS = {
  CLAUDE_API: {
    failureThreshold: 5,
    resetTimeoutMs: 30000, // 30 seconds
    monitorWindowMs: 300000 // 5 minutes
  },
  
  EXTERNAL_API: {
    failureThreshold: 3,
    resetTimeoutMs: 60000, // 1 minute
    monitorWindowMs: 300000 // 5 minutes
  }
} as const;

/**
 * Middleware helper to apply rate limiting to API routes
 */
export function withRateLimit(config: RateLimitConfig) {
  return async (request: NextRequest) => {
    const result = await checkProgressiveRateLimit(request, config);
    
    if (!result.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please try again later.',
          limit: result.limit,
          remaining: result.remaining,
          resetTime: result.resetTime
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': result.limit.toString(),
            'X-RateLimit-Remaining': result.remaining.toString(),
            'X-RateLimit-Reset': result.resetTime.toString(),
            'Retry-After': (result.retryAfter || 60).toString()
          }
        }
      );
    }
    
    return null; // Continue processing
  };
}

/**
 * Circuit breaker wrapper for external API calls
 */
export async function withCircuitBreaker<T>(
  serviceKey: string,
  operation: () => Promise<T>,
  config: CircuitBreakerConfig = CIRCUIT_BREAKERS.EXTERNAL_API
): Promise<T> {
  const breakerResult = await checkCircuitBreaker(serviceKey, config);
  
  if (!breakerResult.allowed) {
    const error = new Error(`Service ${serviceKey} is temporarily unavailable (circuit breaker open)`);
    (error as any).status = 503;
    (error as any).retryAfter = Math.ceil((breakerResult.nextRetryTime! - Date.now()) / 1000);
    throw error;
  }
  
  try {
    const result = await operation();
    await recordSuccess(serviceKey);
    return result;
  } catch (error) {
    await recordFailure(serviceKey);
    throw error;
  }
}

export default {
  checkRateLimit,
  checkProgressiveRateLimit,
  withRateLimit,
  withCircuitBreaker,
  checkCircuitBreaker,
  recordFailure,
  recordSuccess,
  RATE_LIMITS,
  CIRCUIT_BREAKERS
};