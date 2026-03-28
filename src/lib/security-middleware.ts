import { NextRequest, NextResponse } from 'next/server';

/**
 * CORS configuration for API routes
 */
interface CORSConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

/**
 * Get CORS configuration based on environment
 */
function getCORSConfig(): CORSConfig {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const productionDomain = process.env.NEXT_PUBLIC_APP_URL || 'https://pomofly.com';
  
  return {
    allowedOrigins: isDevelopment 
      ? ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:3001']
      : [productionDomain, 'https://pomofly.com', 'https://www.pomofly.com'],
    allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'User-Agent'
    ],
    exposedHeaders: [
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'Retry-After'
    ],
    credentials: true,
    maxAge: 86400, // 24 hours
  };
}

/**
 * Security headers configuration
 */
function getSecurityHeaders(): Record<string, string> {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const baseHeaders = {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // XSS protection
    'X-XSS-Protection': '1; mode=block',
    
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Disable unnecessary features
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
    
    // Prevent information disclosure
    'X-Powered-By': '', // Remove Next.js header
    'Server': 'Pomofly-API',
    
    // Cache control for API responses
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    'Pragma': 'no-cache',
    'Expires': '0',
  };

  // Add HSTS in production
  if (!isDevelopment) {
    baseHeaders['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }

  return baseHeaders;
}

/**
 * Validate origin against allowed origins
 */
function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return false;
  
  // Check exact matches
  if (allowedOrigins.includes(origin)) return true;
  
  // In development, allow localhost with any port
  if (process.env.NODE_ENV === 'development') {
    const localhostRegex = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/;
    if (localhostRegex.test(origin)) return true;
  }
  
  return false;
}

/**
 * Handle CORS preflight requests
 */
function handlePreflight(request: NextRequest, config: CORSConfig): NextResponse {
  const origin = request.headers.get('origin');
  const requestMethod = request.headers.get('access-control-request-method');
  const requestHeaders = request.headers.get('access-control-request-headers');

  const response = new NextResponse(null, { status: 200 });

  // Set CORS headers for preflight
  if (origin && isOriginAllowed(origin, config.allowedOrigins)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  response.headers.set('Access-Control-Allow-Methods', config.allowedMethods.join(', '));
  response.headers.set('Access-Control-Allow-Headers', config.allowedHeaders.join(', '));
  response.headers.set('Access-Control-Max-Age', config.maxAge.toString());

  if (config.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  // Validate requested method
  if (requestMethod && !config.allowedMethods.includes(requestMethod)) {
    return new NextResponse('Method not allowed in CORS policy', { status: 405 });
  }

  // Add security headers
  const securityHeaders = getSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) response.headers.set(key, value);
  });

  return response;
}

/**
 * Apply CORS and security headers to response
 */
function applyCORSAndSecurityHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const config = getCORSConfig();
  const origin = request.headers.get('origin');

  // Apply CORS headers
  if (origin && isOriginAllowed(origin, config.allowedOrigins)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
  }

  if (config.credentials) {
    response.headers.set('Access-Control-Allow-Credentials', 'true');
  }

  if (config.exposedHeaders.length > 0) {
    response.headers.set('Access-Control-Expose-Headers', config.exposedHeaders.join(', '));
  }

  // Apply security headers
  const securityHeaders = getSecurityHeaders();
  Object.entries(securityHeaders).forEach(([key, value]) => {
    if (value) response.headers.set(key, value);
  });

  return response;
}

/**
 * Comprehensive security middleware for API routes
 * Handles CORS, security headers, and basic validation
 */
export function withSecurity<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    try {
      const config = getCORSConfig();

      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return handlePreflight(request, config);
      }

      // Validate Content-Type for POST/PUT requests
      if (['POST', 'PUT'].includes(request.method)) {
        const contentType = request.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
          const response = NextResponse.json(
            { 
              error: 'Invalid Content-Type',
              details: 'Content-Type must be application/json'
            },
            { status: 400 }
          );
          return applyCORSAndSecurityHeaders(response, request);
        }
      }

      // Validate request size (basic check)
      const contentLength = request.headers.get('content-length');
      if (contentLength && parseInt(contentLength) > 1024 * 1024) { // 1MB limit
        const response = NextResponse.json(
          {
            error: 'Payload Too Large',
            details: 'Request body must be less than 1MB'
          },
          { status: 413 }
        );
        return applyCORSAndSecurityHeaders(response, request);
      }

      // Execute the actual handler
      const response = await handler(request, ...args);

      // Apply CORS and security headers to the response
      return applyCORSAndSecurityHeaders(response, request);

    } catch (error) {
      console.error('Security middleware error:', error);
      
      const errorResponse = NextResponse.json(
        {
          error: 'Internal Server Error',
          message: 'An unexpected error occurred'
        },
        { status: 500 }
      );

      return applyCORSAndSecurityHeaders(errorResponse, request);
    }
  };
}

/**
 * Rate limiting store (in-memory for simplicity)
 * In production, use Redis or similar distributed cache
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number; violations: number }>();

/**
 * Enhanced rate limiting with progressive penalties
 */
export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

export function enhancedRateLimit(
  identifier: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetTime: number; retryAfter?: number } {
  const now = Date.now();
  const key = `rate_limit_${identifier}`;
  const existing = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (Math.random() < 0.01) { // 1% chance
    const expired = Array.from(rateLimitStore.entries())
      .filter(([_, data]) => now > data.resetTime)
      .map(([key]) => key);
    
    expired.forEach(key => rateLimitStore.delete(key));
  }

  if (!existing || now > existing.resetTime) {
    // Reset or initialize
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
      violations: 0
    });
    
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs
    };
  }

  if (existing.count >= config.maxRequests) {
    existing.violations += 1;
    
    // Progressive penalties for repeated violations
    const penalty = Math.min(existing.violations * 30000, 300000); // Max 5 min penalty
    
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.resetTime,
      retryAfter: Math.ceil((existing.resetTime - now + penalty) / 1000)
    };
  }

  existing.count += 1;
  
  return {
    allowed: true,
    remaining: config.maxRequests - existing.count,
    resetTime: existing.resetTime
  };
}

/**
 * CSP violation reporting endpoint
 */
export function handleCSPViolation(request: NextRequest): NextResponse {
  try {
    // Log CSP violations for monitoring
    console.warn('CSP Violation reported:', {
      userAgent: request.headers.get('user-agent'),
      origin: request.headers.get('origin'),
      timestamp: new Date().toISOString()
    });

    return new NextResponse('', { status: 204 });
  } catch (error) {
    console.error('Error handling CSP violation:', error);
    return new NextResponse('', { status: 500 });
  }
}

/**
 * Origin validation for sensitive API endpoints
 */
export function validateOriginForSensitiveEndpoint(request: NextRequest): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');
  const config = getCORSConfig();

  // Allow same-origin requests (no Origin header in some cases)
  if (!origin && !referer) {
    return true; // Server-to-server requests
  }

  // Validate origin
  if (origin && isOriginAllowed(origin, config.allowedOrigins)) {
    return true;
  }

  // Fallback to referer check
  if (referer) {
    try {
      const refererOrigin = new URL(referer).origin;
      return isOriginAllowed(refererOrigin, config.allowedOrigins);
    } catch {
      return false;
    }
  }

  return false;
}