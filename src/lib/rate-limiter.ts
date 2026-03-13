/**
 * In-memory rate limiter for API endpoints
 * For production, consider using Redis or database-backed solution
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class MemoryRateLimiter {
  private requests = new Map<string, RateLimitEntry>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Check if a request is allowed based on rate limiting rules
   */
  isAllowed(
    identifier: string,
    maxRequests: number,
    windowMs: number
  ): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const entry = this.requests.get(identifier);
    
    if (!entry || entry.resetTime <= now) {
      // First request or window expired, create new entry
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs,
      };
      this.requests.set(identifier, newEntry);
      
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: newEntry.resetTime,
      };
    }
    
    if (entry.count >= maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.resetTime,
      };
    }
    
    // Increment counter
    entry.count++;
    this.requests.set(identifier, entry);
    
    return {
      allowed: true,
      remaining: maxRequests - entry.count,
      resetTime: entry.resetTime,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.requests.entries()) {
      if (entry.resetTime <= now) {
        this.requests.delete(key);
      }
    }
  }

  /**
   * Get current stats for monitoring
   */
  getStats() {
    return {
      totalKeys: this.requests.size,
      activeWindows: Array.from(this.requests.values()).filter(
        entry => entry.resetTime > Date.now()
      ).length,
    };
  }

  /**
   * Clear all rate limit data (for testing)
   */
  clear() {
    this.requests.clear();
  }

  /**
   * Cleanup interval for server shutdown
   */
  destroy() {
    clearInterval(this.cleanupInterval);
    this.requests.clear();
  }
}

// Global rate limiter instance
const globalRateLimiter = new MemoryRateLimiter();

export { globalRateLimiter };

/**
 * Rate limiting presets for different endpoints
 */
export const RATE_LIMITS = {
  CLAUDE_API: {
    maxRequests: 10, // 10 requests
    windowMs: 60 * 1000, // per minute
    skipSuccessfulRequests: false,
  },
  GENERAL_API: {
    maxRequests: 100, // 100 requests
    windowMs: 60 * 1000, // per minute
    skipSuccessfulRequests: true,
  },
  AUTH_API: {
    maxRequests: 5, // 5 attempts
    windowMs: 15 * 60 * 1000, // per 15 minutes
    skipSuccessfulRequests: false,
  },
} as const;

/**
 * Get client identifier for rate limiting
 */
export function getClientIdentifier(request: Request): string {
  // Try to get user ID from headers (if auth is implemented)
  const userId = request.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const remoteAddr = request.headers.get('x-remote-addr');
  
  const ip = forwarded?.split(',')[0]?.trim() || 
             realIp || 
             remoteAddr || 
             'unknown';
  
  return `ip:${ip}`;
}

/**
 * Rate limiting middleware for Next.js API routes
 */
export async function rateLimitMiddleware(
  request: Request,
  config: typeof RATE_LIMITS.CLAUDE_API
): Promise<{ 
  allowed: boolean; 
  headers: Record<string, string>;
  error?: string;
}> {
  const identifier = getClientIdentifier(request);
  const result = globalRateLimiter.isAllowed(
    identifier,
    config.maxRequests,
    config.windowMs
  );

  const headers = {
    'X-RateLimit-Limit': config.maxRequests.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString(),
  };

  if (!result.allowed) {
    const retryAfter = Math.ceil((result.resetTime - Date.now()) / 1000);
    headers['Retry-After'] = retryAfter.toString();
    
    return {
      allowed: false,
      headers,
      error: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
    };
  }

  return {
    allowed: true,
    headers,
  };
}

/**
 * Request size validation middleware
 */
export function validateRequestSize(
  contentLength: string | null,
  maxSizeBytes: number = 1024 * 1024 // 1MB default
): { valid: boolean; error?: string } {
  if (!contentLength) {
    return { valid: true }; // No content-length header
  }

  const size = parseInt(contentLength, 10);
  if (isNaN(size)) {
    return { 
      valid: false, 
      error: 'Invalid Content-Length header' 
    };
  }

  if (size > maxSizeBytes) {
    return { 
      valid: false, 
      error: `Request too large. Maximum size: ${Math.round(maxSizeBytes / 1024)}KB` 
    };
  }

  return { valid: true };
}

/**
 * CORS headers for API routes
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' 
    ? process.env.NEXT_PUBLIC_BASE_URL || 'https://pomofly.app'
    : '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400', // 24 hours
} as const;

/**
 * Security headers for API responses
 */
export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Content-Security-Policy': 'default-src \'none\'; script-src \'none\';',
} as const;

/**
 * Request logging utility
 */
export function logAPIRequest(
  request: Request,
  identifier: string,
  endpoint: string,
  allowed: boolean,
  processingTimeMs?: number
) {
  const logData = {
    timestamp: new Date().toISOString(),
    endpoint,
    method: request.method,
    identifier,
    userAgent: request.headers.get('user-agent') || 'unknown',
    rateLimitAllowed: allowed,
    processingTimeMs,
  };

  if (!allowed) {
    console.warn('[API Rate Limited]', logData);
  } else {
    console.log('[API Request]', logData);
  }
}