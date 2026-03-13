import {
  globalRateLimiter,
  getClientIdentifier,
  rateLimitMiddleware,
  validateRequestSize,
  RATE_LIMITS,
} from '../rate-limiter';

// Mock request for testing
function createMockRequest(headers: Record<string, string> = {}): Request {
  return {
    headers: new Map(Object.entries(headers)),
    method: 'POST',
  } as any;
}

describe('Rate Limiter', () => {
  beforeEach(() => {
    globalRateLimiter.clear();
  });

  describe('globalRateLimiter.isAllowed', () => {
    it('should allow first request within limit', () => {
      const result = globalRateLimiter.isAllowed('test-user', 5, 60000);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.resetTime).toBeGreaterThan(Date.now());
    });

    it('should track multiple requests correctly', () => {
      const identifier = 'test-user';
      const maxRequests = 3;
      const windowMs = 60000;

      // First request
      let result = globalRateLimiter.isAllowed(identifier, maxRequests, windowMs);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(2);

      // Second request
      result = globalRateLimiter.isAllowed(identifier, maxRequests, windowMs);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(1);

      // Third request
      result = globalRateLimiter.isAllowed(identifier, maxRequests, windowMs);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(0);

      // Fourth request (should be blocked)
      result = globalRateLimiter.isAllowed(identifier, maxRequests, windowMs);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });

    it('should reset after window expires', async () => {
      const identifier = 'test-user';
      const maxRequests = 2;
      const windowMs = 100; // 100ms window for quick test

      // Use up the limit
      globalRateLimiter.isAllowed(identifier, maxRequests, windowMs);
      const result = globalRateLimiter.isAllowed(identifier, maxRequests, windowMs);
      expect(result.allowed).toBe(false);

      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be allowed again
      const newResult = globalRateLimiter.isAllowed(identifier, maxRequests, windowMs);
      expect(newResult.allowed).toBe(true);
    });

    it('should handle different users independently', () => {
      const maxRequests = 2;
      const windowMs = 60000;

      // User 1 uses up their limit
      globalRateLimiter.isAllowed('user1', maxRequests, windowMs);
      const user1Result = globalRateLimiter.isAllowed('user1', maxRequests, windowMs);
      expect(user1Result.allowed).toBe(false);

      // User 2 should still be allowed
      const user2Result = globalRateLimiter.isAllowed('user2', maxRequests, windowMs);
      expect(user2Result.allowed).toBe(true);
    });
  });

  describe('getClientIdentifier', () => {
    it('should use user ID when available', () => {
      const request = createMockRequest({
        'x-user-id': 'user123',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('user:user123');
    });

    it('should fall back to forwarded IP', () => {
      const request = createMockRequest({
        'x-forwarded-for': '192.168.1.100, 10.0.0.1',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('ip:192.168.1.100');
    });

    it('should use real IP when no forwarded header', () => {
      const request = createMockRequest({
        'x-real-ip': '203.0.113.42',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('ip:203.0.113.42');
    });

    it('should use remote address as fallback', () => {
      const request = createMockRequest({
        'x-remote-addr': '198.51.100.15',
      });

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('ip:198.51.100.15');
    });

    it('should use unknown when no identifier available', () => {
      const request = createMockRequest();

      const identifier = getClientIdentifier(request);
      expect(identifier).toBe('ip:unknown');
    });
  });

  describe('rateLimitMiddleware', () => {
    it('should allow requests within rate limit', async () => {
      const request = createMockRequest({
        'x-real-ip': '192.168.1.100',
      });

      const result = await rateLimitMiddleware(request, RATE_LIMITS.CLAUDE_API);

      expect(result.allowed).toBe(true);
      expect(result.headers).toHaveProperty('X-RateLimit-Limit');
      expect(result.headers).toHaveProperty('X-RateLimit-Remaining');
      expect(result.headers).toHaveProperty('X-RateLimit-Reset');
      expect(result.error).toBeUndefined();
    });

    it('should block requests exceeding rate limit', async () => {
      const request = createMockRequest({
        'x-real-ip': '192.168.1.101',
      });

      const config = { maxRequests: 1, windowMs: 60000 };

      // First request should be allowed
      const result1 = await rateLimitMiddleware(request, config);
      expect(result1.allowed).toBe(true);

      // Second request should be blocked
      const result2 = await rateLimitMiddleware(request, config);
      expect(result2.allowed).toBe(false);
      expect(result2.error).toContain('Rate limit exceeded');
      expect(result2.headers).toHaveProperty('Retry-After');
    });
  });

  describe('validateRequestSize', () => {
    it('should allow requests without content-length', () => {
      const result = validateRequestSize(null);
      expect(result.valid).toBe(true);
    });

    it('should allow requests within size limit', () => {
      const result = validateRequestSize('1024', 2048);
      expect(result.valid).toBe(true);
    });

    it('should reject requests exceeding size limit', () => {
      const result = validateRequestSize('2048', 1024);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Request too large');
    });

    it('should reject invalid content-length', () => {
      const result = validateRequestSize('not-a-number');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid Content-Length');
    });

    it('should use default size limit', () => {
      const largeSize = (1024 * 1024 + 1).toString(); // 1MB + 1 byte
      const result = validateRequestSize(largeSize);
      expect(result.valid).toBe(false);
    });
  });

  describe('Rate limit configurations', () => {
    it('should have reasonable Claude API limits', () => {
      const config = RATE_LIMITS.CLAUDE_API;
      expect(config.maxRequests).toBe(10);
      expect(config.windowMs).toBe(60 * 1000); // 1 minute
    });

    it('should have higher limits for general API', () => {
      const config = RATE_LIMITS.GENERAL_API;
      expect(config.maxRequests).toBe(100);
      expect(config.windowMs).toBe(60 * 1000); // 1 minute
    });

    it('should have strict limits for auth API', () => {
      const config = RATE_LIMITS.AUTH_API;
      expect(config.maxRequests).toBe(5);
      expect(config.windowMs).toBe(15 * 60 * 1000); // 15 minutes
    });
  });
});