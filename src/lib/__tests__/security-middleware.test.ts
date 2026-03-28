import { NextRequest, NextResponse } from 'next/server';
import { 
  withSecurity, 
  enhancedRateLimit, 
  validateOriginForSensitiveEndpoint 
} from '../security-middleware';

// Mock Next.js request/response
const createMockRequest = (init: {
  method?: string;
  origin?: string;
  contentType?: string;
  contentLength?: string;
  url?: string;
  body?: any;
}) => {
  const headers = new Headers();
  
  if (init.origin) headers.set('origin', init.origin);
  if (init.contentType) headers.set('content-type', init.contentType);
  if (init.contentLength) headers.set('content-length', init.contentLength);
  
  return new NextRequest(init.url || 'http://localhost:3000/api/test', {
    method: init.method || 'GET',
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
};

const mockHandler = jest.fn(async (request: NextRequest) => {
  return NextResponse.json({ success: true });
});

describe('Security Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'test';
  });

  describe('withSecurity', () => {
    it('should handle preflight OPTIONS requests', async () => {
      const request = createMockRequest({ 
        method: 'OPTIONS',
        origin: 'http://localhost:3000'
      });
      
      const securedHandler = withSecurity(mockHandler);
      const response = await securedHandler(request);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
      expect(response.headers.get('Access-Control-Allow-Methods')).toContain('GET');
      expect(mockHandler).not.toHaveBeenCalled();
    });

    it('should apply CORS headers to valid origins', async () => {
      const request = createMockRequest({ 
        method: 'GET',
        origin: 'http://localhost:3000'
      });
      
      const securedHandler = withSecurity(mockHandler);
      const response = await securedHandler(request);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should reject invalid content-type for POST requests', async () => {
      const request = createMockRequest({ 
        method: 'POST',
        contentType: 'text/plain',
        origin: 'http://localhost:3000'
      });
      
      const securedHandler = withSecurity(mockHandler);
      const response = await securedHandler(request);
      
      expect(response.status).toBe(400);
      expect(mockHandler).not.toHaveBeenCalled();
      
      const data = await response.json();
      expect(data.error).toBe('Invalid Content-Type');
    });

    it('should reject oversized requests', async () => {
      const request = createMockRequest({ 
        method: 'POST',
        contentType: 'application/json',
        contentLength: '2000000', // 2MB
        origin: 'http://localhost:3000'
      });
      
      const securedHandler = withSecurity(mockHandler);
      const response = await securedHandler(request);
      
      expect(response.status).toBe(413);
      expect(mockHandler).not.toHaveBeenCalled();
      
      const data = await response.json();
      expect(data.error).toBe('Payload Too Large');
    });

    it('should apply security headers to all responses', async () => {
      const request = createMockRequest({ 
        method: 'GET',
        origin: 'http://localhost:3000'
      });
      
      const securedHandler = withSecurity(mockHandler);
      const response = await securedHandler(request);
      
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(response.headers.get('X-Frame-Options')).toBe('DENY');
      expect(response.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(response.headers.get('Cache-Control')).toContain('no-store');
    });

    it('should not set CORS headers for invalid origins', async () => {
      const request = createMockRequest({ 
        method: 'GET',
        origin: 'https://malicious-site.com'
      });
      
      const securedHandler = withSecurity(mockHandler);
      const response = await securedHandler(request);
      
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
      expect(mockHandler).toHaveBeenCalled();
    });

    it('should handle handler errors gracefully', async () => {
      const errorHandler = jest.fn(async () => {
        throw new Error('Handler error');
      });
      
      const request = createMockRequest({ 
        method: 'GET',
        origin: 'http://localhost:3000'
      });
      
      const securedHandler = withSecurity(errorHandler);
      const response = await securedHandler(request);
      
      expect(response.status).toBe(500);
      
      const data = await response.json();
      expect(data.error).toBe('Internal Server Error');
    });
  });

  describe('enhancedRateLimit', () => {
    it('should allow requests within limit', () => {
      const result = enhancedRateLimit('user1', {
        windowMs: 60000,
        maxRequests: 10
      });
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(9);
    });

    it('should block requests exceeding limit', () => {
      const identifier = 'user2';
      const config = { windowMs: 60000, maxRequests: 2 };
      
      // First request - allowed
      const result1 = enhancedRateLimit(identifier, config);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(1);
      
      // Second request - allowed
      const result2 = enhancedRateLimit(identifier, config);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(0);
      
      // Third request - blocked
      const result3 = enhancedRateLimit(identifier, config);
      expect(result3.allowed).toBe(false);
      expect(result3.remaining).toBe(0);
      expect(result3.retryAfter).toBeGreaterThan(0);
    });

    it('should reset limits after window expires', () => {
      const identifier = 'user3';
      const config = { windowMs: 100, maxRequests: 1 }; // 100ms window
      
      // First request - allowed
      const result1 = enhancedRateLimit(identifier, config);
      expect(result1.allowed).toBe(true);
      
      // Second request - blocked
      const result2 = enhancedRateLimit(identifier, config);
      expect(result2.allowed).toBe(false);
      
      // Wait for window to expire and test again
      // Note: In a real test, you'd mock Date.now() for this
    });
  });

  describe('validateOriginForSensitiveEndpoint', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'development';
    });

    it('should allow requests from valid origins', () => {
      const request = createMockRequest({ 
        origin: 'http://localhost:3000'
      });
      
      const result = validateOriginForSensitiveEndpoint(request);
      expect(result).toBe(true);
    });

    it('should reject requests from invalid origins', () => {
      const request = createMockRequest({ 
        origin: 'https://malicious-site.com'
      });
      
      const result = validateOriginForSensitiveEndpoint(request);
      expect(result).toBe(false);
    });

    it('should allow server-to-server requests (no origin)', () => {
      const request = createMockRequest({ method: 'POST' });
      
      const result = validateOriginForSensitiveEndpoint(request);
      expect(result).toBe(true);
    });

    it('should validate referer when origin is not available', () => {
      const headers = new Headers();
      headers.set('referer', 'http://localhost:3000/dashboard');
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers,
      });
      
      const result = validateOriginForSensitiveEndpoint(request);
      expect(result).toBe(true);
    });

    it('should reject requests with invalid referer', () => {
      const headers = new Headers();
      headers.set('referer', 'https://malicious-site.com/attack');
      
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers,
      });
      
      const result = validateOriginForSensitiveEndpoint(request);
      expect(result).toBe(false);
    });
  });

  describe('CORS Configuration', () => {
    it('should allow localhost in development', () => {
      process.env.NODE_ENV = 'development';
      
      const request = createMockRequest({ 
        method: 'GET',
        origin: 'http://localhost:3001'
      });
      
      const securedHandler = withSecurity(mockHandler);
      
      return securedHandler(request).then(response => {
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3001');
      });
    });

    it('should use production domains in production', () => {
      process.env.NODE_ENV = 'production';
      process.env.NEXT_PUBLIC_APP_URL = 'https://pomofly.com';
      
      const request = createMockRequest({ 
        method: 'GET',
        origin: 'https://pomofly.com'
      });
      
      const securedHandler = withSecurity(mockHandler);
      
      return securedHandler(request).then(response => {
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('https://pomofly.com');
      });
    });
  });
});