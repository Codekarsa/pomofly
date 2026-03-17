import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware, cleanupSecurityStores } from '@/lib/security-middleware';

/**
 * Global middleware for security and request protection
 * Runs before all API routes and pages
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Apply security middleware to API routes
  if (pathname.startsWith('/api/')) {
    // Skip security for health checks and monitoring endpoints that don't need strict limits
    if (pathname === '/api/monitoring' && request.method === 'GET') {
      return NextResponse.next();
    }
    
    // Apply security middleware to all other API routes
    const securityResult = await securityMiddleware(request);
    if (!securityResult.allowed) {
      return securityResult.response!;
    }
    
    // Add security headers to API responses
    const response = NextResponse.next();
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Add request size info for debugging (in non-production)
    if (process.env.NODE_ENV === 'development' && securityResult.requestSize) {
      response.headers.set('X-Debug-Request-Size', securityResult.requestSize.toString());
    }
    
    return response;
  }
  
  // For non-API routes, just add security headers
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

/**
 * Configure middleware to run on specific paths
 */
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match all pages except static files and Next.js internals
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

// Cleanup expired security store entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    try {
      cleanupSecurityStores();
    } catch (error) {
      console.error('Error cleaning up security stores:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes
}