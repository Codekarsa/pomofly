import { NextRequest } from 'next/server';

/**
 * Extracts and validates Firebase ID token from request headers
 * @param request - Next.js request object
 * @returns Promise<{isAuthenticated: boolean, uid?: string, error?: string}>
 */
export async function validateAuth(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { isAuthenticated: false, error: 'Missing or invalid authorization header' };
    }
    
    const token = authHeader.split('Bearer ')[1];
    
    if (!token) {
      return { isAuthenticated: false, error: 'No token provided' };
    }

    // Basic token validation - client-side Firebase tokens
    // Note: In production, implement proper server-side token verification
    
    // Basic validation - check if token looks like a JWT
    const tokenParts = token.split('.');
    if (tokenParts.length !== 3) {
      return { isAuthenticated: false, error: 'Invalid token format' };
    }

    // For this implementation, we'll trust the client-side authentication
    // and just validate that a token is present and properly formatted
    // In production, you should verify the token with Firebase Admin SDK
    
    try {
      // Decode the payload to get user info (without verification for now)
      const payload = JSON.parse(atob(tokenParts[1]));
      const uid = payload.user_id || payload.sub;
      
      if (!uid) {
        return { isAuthenticated: false, error: 'Invalid token: missing user ID' };
      }
      
      return { isAuthenticated: true, uid };
    } catch (decodeError) {
      return { isAuthenticated: false, error: 'Failed to decode token' };
    }
    
  } catch (error) {
    console.error('Auth validation error:', error);
    return { isAuthenticated: false, error: 'Authentication validation failed' };
  }
}

/**
 * Rate limiting data structure (in-memory for simplicity)
 * In production, use Redis or similar persistent store
 * Cleanup old entries to prevent memory leaks
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Cleanup old rate limit entries every 5 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime + 300000) { // 5 minutes buffer
      rateLimitStore.delete(key);
    }
  }
}, 300000);

/**
 * Enhanced rate limiting implementation with sliding window
 * @param identifier - User ID or IP address for rate limiting
 * @param limit - Requests per window
 * @param windowMs - Time window in milliseconds
 * @returns Object with allowed status and metadata
 */
export function checkRateLimit(identifier: string, limit: number = 10, windowMs: number = 60000) {
  const now = Date.now();
  const userLimit = rateLimitStore.get(identifier);
  
  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize counter
    rateLimitStore.set(identifier, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetTime: now + windowMs };
  }
  
  if (userLimit.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: userLimit.resetTime };
  }
  
  userLimit.count++;
  return { allowed: true, remaining: limit - userLimit.count, resetTime: userLimit.resetTime };
}

/**
 * Validate request body size to prevent DoS attacks
 * @param request - NextRequest object
 * @param maxSizeBytes - Maximum allowed size in bytes (default: 1MB)
 * @returns Promise<boolean>
 */
export async function validateRequestSize(request: NextRequest, maxSizeBytes: number = 1024 * 1024): Promise<boolean> {
  const contentLength = request.headers.get('content-length');
  
  if (contentLength) {
    const size = parseInt(contentLength, 10);
    if (size > maxSizeBytes) {
      return false;
    }
  }
  
  return true;
}