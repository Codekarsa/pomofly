import { NextRequest } from 'next/server';
import { getAdminAuth } from './firebase-admin';

/**
 * Extracts and verifies the Firebase ID token from the Authorization header.
 * Verification is done with the Firebase Admin SDK (signature, expiry,
 * audience/issuer) — a forged or tampered token is rejected.
 * @param request - Next.js request object
 * @returns Promise<{isAuthenticated: boolean, uid?: string, error?: string}>
 */
export async function validateAuth(request: NextRequest) {
  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { isAuthenticated: false, error: 'Missing or invalid authorization header' };
  }

  const token = authHeader.slice('Bearer '.length).trim();

  if (!token) {
    return { isAuthenticated: false, error: 'No token provided' };
  }

  try {
    const decoded = await getAdminAuth().verifyIdToken(token);
    return { isAuthenticated: true, uid: decoded.uid };
  } catch (error) {
    const code = (error as { code?: string })?.code;
    if (code === 'auth/id-token-expired') {
      return { isAuthenticated: false, error: 'Token expired, please sign in again' };
    }
    return { isAuthenticated: false, error: 'Invalid authentication token' };
  }
}

/**
 * Rate limiting data structure (in-memory for simplicity)
 * In production, use Redis or similar
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Simple rate limiting implementation
 * @param uid - User ID
 * @param limit - Requests per window
 * @param windowMs - Time window in milliseconds
 */
export function checkRateLimit(uid: string, limit: number = 10, windowMs: number = 60000) {
  const now = Date.now();
  const userLimit = rateLimitStore.get(uid);

  if (!userLimit || now > userLimit.resetTime) {
    // Reset or initialize counter
    rateLimitStore.set(uid, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetTime: now + windowMs };
  }

  if (userLimit.count >= limit) {
    return { allowed: false, remaining: 0, resetTime: userLimit.resetTime };
  }

  userLimit.count++;
  return { allowed: true, remaining: limit - userLimit.count, resetTime: userLimit.resetTime };
}
