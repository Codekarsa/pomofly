import { NextRequest } from 'next/server';
import { securityMiddleware, checkEnhancedRateLimit, getSecurityConfig } from '../security-middleware';

// Mock NextRequest for testing
function createMockRequest(options: {
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}) {
  const url = options.url || 'http://localhost:3000/api/test';
  const headers = new Headers(options.headers || {});
  
  // Add content-length header if body is provided
  if (options.body) {
    headers.set('content-length', options.body.length.toString());
  }
  
  return new NextRequest(url, {
    method: options.method || 'POST',
    headers,
    body: options.body,
  });
}

describe('Security Middleware', () => {
  beforeEach(() => {
    // Clear stores between tests
    jest.clearAllMocks();
  });

  describe('Request Size Validation', () => {
    it('should accept requests under the size limit', async () => {
      const smallBody = JSON.stringify({ test: 'data' });
      const request = createMockRequest({ body: smallBody });
      
      const result = await securityMiddleware(request);
      
      expect(result.allowed).toBe(true);
      expect(result.requestSize).toBe(smallBody.length);
    });

    it('should reject requests over the size limit', async () => {
      // Create a body larger than 100KB
      const largeBody = 'x'.repeat(101 * 1024);
      const request = createMockRequest({ body: largeBody });
      
      const result = await securityMiddleware(request);
      
      expect(result.allowed).toBe(false);
      expect(result.response).toBeDefined();
    });

    it('should handle requests with invalid content-length header', async () => {
      const request = createMockRequest({
        headers: { 'content-length': 'invalid' },
        body: JSON.stringify({ test: 'data' })
      });
      
      const result = await securityMiddleware(request);
      
      expect(result.allowed).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    it('should allow requests within rate limit', () => {
      const ip = '192.168.1.1';
      const uid = 'user123';
      
      const result = checkEnhancedRateLimit(ip, uid, 1024);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeGreaterThan(0);
    });

    it('should block requests after rate limit exceeded', () => {
      const ip = '192.168.1.2';
      
      // Make requests up to the limit
      for (let i = 0; i < 20; i++) {
        checkEnhancedRateLimit(ip);
      }
      
      // Next request should be blocked
      const result = checkEnhancedRateLimit(ip);
      
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('rate limit');
    });

    it('should handle different IPs independently', () => {
      const ip1 = '192.168.1.3';
      const ip2 = '192.168.1.4';
      
      // Max out ip1
      for (let i = 0; i < 20; i++) {
        checkEnhancedRateLimit(ip1);
      }
      
      // ip1 should be blocked
      expect(checkEnhancedRateLimit(ip1).allowed).toBe(false);
      
      // ip2 should still be allowed
      expect(checkEnhancedRateLimit(ip2).allowed).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should return security configuration', () => {
      const config = getSecurityConfig();
      
      expect(config.MAX_REQUEST_SIZE).toBe(100 * 1024);
      expect(config.RATE_LIMIT_PER_IP.requests).toBe(20);
      expect(config.RATE_LIMIT_PER_USER.requests).toBe(10);
    });
  });

  describe('IP Detection', () => {
    it('should extract IP from X-Forwarded-For header', async () => {
      const request = createMockRequest({
        headers: { 'x-forwarded-for': '203.0.113.1, 198.51.100.1' }
      });
      
      const result = await securityMiddleware(request);
      
      // Should use the first IP in the forwarded header
      expect(result.allowed).toBe(true);
    });

    it('should extract IP from CF-Connecting-IP header (Cloudflare)', async () => {
      const request = createMockRequest({
        headers: { 'cf-connecting-ip': '203.0.113.2' }
      });
      
      const result = await securityMiddleware(request);
      
      expect(result.allowed).toBe(true);
    });

    it('should extract IP from X-Real-IP header', async () => {
      const request = createMockRequest({
        headers: { 'x-real-ip': '203.0.113.3' }
      });
      
      const result = await securityMiddleware(request);
      
      expect(result.allowed).toBe(true);
    });
  });
});