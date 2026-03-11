import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiting (use Redis in production)
const rateLimitStore = new Map<string, { count: number; lastRequest: number }>();

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

function getRateLimitKey(request: NextRequest): string {
  // Use IP address as the primary key
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.ip || 'unknown';
  
  // For API routes, include the path to have per-endpoint limits
  if (request.nextUrl.pathname.startsWith('/api/')) {
    return `${ip}:${request.nextUrl.pathname}`;
  }
  
  return ip;
}

function checkRateLimit(key: string, config: RateLimitConfig): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record) {
    rateLimitStore.set(key, { count: 1, lastRequest: now });
    return true;
  }

  // Reset if window has passed
  if (now - record.lastRequest > config.windowMs) {
    rateLimitStore.set(key, { count: 1, lastRequest: now });
    return true;
  }

  // Check if limit exceeded
  if (record.count >= config.maxRequests) {
    return false;
  }

  // Increment count
  record.count++;
  record.lastRequest = now;
  rateLimitStore.set(key, record);
  return true;
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [key, record] of rateLimitStore.entries()) {
    if (now - record.lastRequest > oneHour) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

export function middleware(request: NextRequest) {
  // Apply rate limiting to API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const key = getRateLimitKey(request);
    
    // Different limits for different endpoints
    let rateLimitConfig: RateLimitConfig;
    
    if (request.nextUrl.pathname.includes('/claude-breakdown')) {
      // Stricter limits for Claude API to prevent cost abuse
      rateLimitConfig = { maxRequests: 10, windowMs: 60 * 1000 }; // 10 requests per minute
    } else {
      // Default limits for other API routes
      rateLimitConfig = { maxRequests: 100, windowMs: 60 * 1000 }; // 100 requests per minute
    }
    
    if (!checkRateLimit(key, rateLimitConfig)) {
      return NextResponse.json(
        { 
          error: 'Rate limit exceeded', 
          message: `Too many requests. Limit: ${rateLimitConfig.maxRequests} per ${rateLimitConfig.windowMs / 1000} seconds.`
        },
        { 
          status: 429,
          headers: {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'Retry-After': Math.ceil(rateLimitConfig.windowMs / 1000).toString(),
          }
        }
      );
    }
  }

  // Add security headers to all responses
  const response = NextResponse.next();
  
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin');

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};