import { NextRequest, NextResponse } from 'next/server';

/**
 * Request body size and DoS protection configuration
 */
const SECURITY_CONFIG = {
  // Maximum request body size (100KB as mentioned in issue)
  MAX_REQUEST_SIZE: 100 * 1024, // 100KB
  
  // Rate limiting per IP
  RATE_LIMIT_PER_IP: {
    requests: 20, // 20 requests per window
    windowMs: 60000, // 1 minute window
  },
  
  // Enhanced rate limiting for authenticated users
  RATE_LIMIT_PER_USER: {
    requests: 10, // 10 requests per window
    windowMs: 60000, // 1 minute window
  },
  
  // Anomaly detection thresholds
  ANOMALY_DETECTION: {
    largeRequestThreshold: 50 * 1024, // 50KB - trigger alert
    suspiciousRequestCount: 50, // 50+ requests in window = suspicious
    suspiciousWindowMs: 300000, // 5 minute window for anomaly detection
  }
};

/**
 * In-memory stores for rate limiting and anomaly detection
 * In production, use Redis or similar distributed cache
 */
interface RateLimitData {
  count: number;
  resetTime: number;
  largeRequestCount?: number;
  lastLargeRequest?: number;
}

const ipRateLimitStore = new Map<string, RateLimitData>();
const userRateLimitStore = new Map<string, RateLimitData>();
const anomalyStore = new Map<string, { suspiciousRequests: number; windowStart: number }>();

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for real IP (considering proxies)
  const forwardedFor = request.headers.get('x-forwarded-for');
  const realIP = request.headers.get('x-real-ip');
  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  
  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  
  // Fallback to remote address (may not work in all deployments)
  return 'unknown';
}

/**
 * Enhanced rate limiting with IP and user-based limits
 */
export function checkEnhancedRateLimit(
  ip: string, 
  uid?: string, 
  requestSize: number = 0
): { allowed: boolean; remaining: number; resetTime: number; reason?: string } {
  const now = Date.now();
  
  // Check IP-based rate limit
  const ipLimit = ipRateLimitStore.get(ip);
  
  if (!ipLimit || now > ipLimit.resetTime) {
    ipRateLimitStore.set(ip, { 
      count: 1, 
      resetTime: now + SECURITY_CONFIG.RATE_LIMIT_PER_IP.windowMs,
      largeRequestCount: requestSize > SECURITY_CONFIG.ANOMALY_DETECTION.largeRequestThreshold ? 1 : 0,
      lastLargeRequest: requestSize > SECURITY_CONFIG.ANOMALY_DETECTION.largeRequestThreshold ? now : undefined
    });
  } else {
    if (ipLimit.count >= SECURITY_CONFIG.RATE_LIMIT_PER_IP.requests) {
      return { 
        allowed: false, 
        remaining: 0, 
        resetTime: ipLimit.resetTime, 
        reason: 'IP rate limit exceeded' 
      };
    }
    ipLimit.count++;
    
    // Track large requests for anomaly detection
    if (requestSize > SECURITY_CONFIG.ANOMALY_DETECTION.largeRequestThreshold) {
      ipLimit.largeRequestCount = (ipLimit.largeRequestCount || 0) + 1;
      ipLimit.lastLargeRequest = now;
    }
  }
  
  // Check user-based rate limit if authenticated
  if (uid) {
    const userLimit = userRateLimitStore.get(uid);
    
    if (!userLimit || now > userLimit.resetTime) {
      userRateLimitStore.set(uid, { 
        count: 1, 
        resetTime: now + SECURITY_CONFIG.RATE_LIMIT_PER_USER.windowMs 
      });
    } else {
      if (userLimit.count >= SECURITY_CONFIG.RATE_LIMIT_PER_USER.requests) {
        return { 
          allowed: false, 
          remaining: 0, 
          resetTime: userLimit.resetTime, 
          reason: 'User rate limit exceeded' 
        };
      }
      userLimit.count++;
    }
  }
  
  // Anomaly detection
  const anomalyKey = uid || ip;
  const anomalyData = anomalyStore.get(anomalyKey);
  
  if (!anomalyData || now > (anomalyData.windowStart + SECURITY_CONFIG.ANOMALY_DETECTION.suspiciousWindowMs)) {
    anomalyStore.set(anomalyKey, { suspiciousRequests: 1, windowStart: now });
  } else {
    anomalyData.suspiciousRequests++;
    
    // Alert for suspicious patterns
    if (anomalyData.suspiciousRequests > SECURITY_CONFIG.ANOMALY_DETECTION.suspiciousRequestCount) {
      console.warn(`🚨 ANOMALY DETECTED: ${anomalyKey} made ${anomalyData.suspiciousRequests} requests in ${SECURITY_CONFIG.ANOMALY_DETECTION.suspiciousWindowMs}ms`);
      
      // Log for monitoring (in production, send to alerting system)
      logSecurityEvent('anomaly_detected', {
        identifier: anomalyKey,
        requestCount: anomalyData.suspiciousRequests,
        timeWindow: SECURITY_CONFIG.ANOMALY_DETECTION.suspiciousWindowMs,
        timestamp: now
      });
    }
  }
  
  return { 
    allowed: true, 
    remaining: SECURITY_CONFIG.RATE_LIMIT_PER_IP.requests - (ipRateLimitStore.get(ip)?.count || 0), 
    resetTime: ipRateLimitStore.get(ip)?.resetTime || now 
  };
}

/**
 * Validate request body size
 */
export async function validateRequestSize(request: NextRequest): Promise<{
  valid: boolean;
  size?: number;
  error?: string;
}> {
  try {
    // Get content length from headers first
    const contentLength = request.headers.get('content-length');
    
    if (contentLength) {
      const size = parseInt(contentLength, 10);
      
      if (isNaN(size)) {
        return { valid: false, error: 'Invalid content-length header' };
      }
      
      if (size > SECURITY_CONFIG.MAX_REQUEST_SIZE) {
        logSecurityEvent('large_request_blocked', {
          size,
          maxSize: SECURITY_CONFIG.MAX_REQUEST_SIZE,
          ip: getClientIP(request),
          timestamp: Date.now()
        });
        
        return { 
          valid: false, 
          size,
          error: `Request body too large. Maximum size: ${SECURITY_CONFIG.MAX_REQUEST_SIZE} bytes` 
        };
      }
      
      // Log large requests (but under limit) for monitoring
      if (size > SECURITY_CONFIG.ANOMALY_DETECTION.largeRequestThreshold) {
        logSecurityEvent('large_request_accepted', {
          size,
          threshold: SECURITY_CONFIG.ANOMALY_DETECTION.largeRequestThreshold,
          ip: getClientIP(request),
          timestamp: Date.now()
        });
      }
      
      return { valid: true, size };
    }
    
    // If no content-length, we need to read the body to check size
    // Note: This consumes the body, so we'll need to reconstruct it
    const body = await request.arrayBuffer();
    const size = body.byteLength;
    
    if (size > SECURITY_CONFIG.MAX_REQUEST_SIZE) {
      logSecurityEvent('large_request_blocked', {
        size,
        maxSize: SECURITY_CONFIG.MAX_REQUEST_SIZE,
        ip: getClientIP(request),
        timestamp: Date.now()
      });
      
      return { 
        valid: false, 
        size,
        error: `Request body too large. Maximum size: ${SECURITY_CONFIG.MAX_REQUEST_SIZE} bytes` 
      };
    }
    
    return { valid: true, size };
    
  } catch (error) {
    console.error('Error validating request size:', error);
    return { valid: false, error: 'Failed to validate request size' };
  }
}

/**
 * Security event logging for monitoring and alerting
 */
function logSecurityEvent(eventType: string, data: Record<string, any>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    eventType,
    data,
    source: 'security-middleware'
  };
  
  // In production, send to monitoring service (DataDog, Sentry, etc.)
  console.warn(`🔒 SECURITY EVENT [${eventType}]:`, JSON.stringify(logEntry, null, 2));
  
  // TODO: Integrate with production monitoring/alerting system
  // - Send to logging service
  // - Trigger alerts for critical events
  // - Store in security audit log
}

/**
 * Main security middleware function
 */
export async function securityMiddleware(
  request: NextRequest,
  uid?: string
): Promise<{ allowed: boolean; response?: NextResponse; requestSize?: number }> {
  const ip = getClientIP(request);
  
  // Validate request body size
  const sizeValidation = await validateRequestSize(request);
  
  if (!sizeValidation.valid) {
    return {
      allowed: false,
      response: NextResponse.json(
        { 
          error: 'Request Too Large',
          details: sizeValidation.error,
          maxSize: SECURITY_CONFIG.MAX_REQUEST_SIZE
        },
        { status: 413 } // Payload Too Large
      )
    };
  }
  
  // Check enhanced rate limits
  const rateLimitResult = checkEnhancedRateLimit(ip, uid, sizeValidation.size);
  
  if (!rateLimitResult.allowed) {
    const response = NextResponse.json(
      { 
        error: 'Rate Limit Exceeded',
        details: rateLimitResult.reason || 'Too many requests. Please try again later.',
        resetTime: rateLimitResult.resetTime
      },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.resetTime.toString()
        }
      }
    );
    
    logSecurityEvent('rate_limit_exceeded', {
      ip,
      uid,
      reason: rateLimitResult.reason,
      resetTime: rateLimitResult.resetTime
    });
    
    return { allowed: false, response };
  }
  
  return { allowed: true, requestSize: sizeValidation.size };
}

/**
 * Get security configuration (for monitoring/debugging)
 */
export function getSecurityConfig() {
  return {
    ...SECURITY_CONFIG,
    stores: {
      ipRateLimitEntries: ipRateLimitStore.size,
      userRateLimitEntries: userRateLimitStore.size,
      anomalyEntries: anomalyStore.size
    }
  };
}

/**
 * Clean up expired entries (call periodically)
 */
export function cleanupSecurityStores() {
  const now = Date.now();
  
  // Clean IP rate limit store
  for (const [ip, data] of ipRateLimitStore.entries()) {
    if (now > data.resetTime) {
      ipRateLimitStore.delete(ip);
    }
  }
  
  // Clean user rate limit store
  for (const [uid, data] of userRateLimitStore.entries()) {
    if (now > data.resetTime) {
      userRateLimitStore.delete(uid);
    }
  }
  
  // Clean anomaly store
  for (const [key, data] of anomalyStore.entries()) {
    if (now > (data.windowStart + SECURITY_CONFIG.ANOMALY_DETECTION.suspiciousWindowMs)) {
      anomalyStore.delete(key);
    }
  }
  
  console.log(`🧹 Security stores cleaned. Remaining entries: IP(${ipRateLimitStore.size}), User(${userRateLimitStore.size}), Anomaly(${anomalyStore.size})`);
}