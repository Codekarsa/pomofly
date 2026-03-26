/**
 * Tests for Rate Limiting and Abuse Protection
 */

import { NextRequest } from 'next/server';
import { 
  checkRateLimit, 
  checkProgressiveRateLimit,
  checkCircuitBreaker,
  recordFailure,
  recordSuccess,
  withCircuitBreaker,
  RATE_LIMITS,
  CIRCUIT_BREAKERS
} from '@/lib/rateLimiting';

// Mock NextRequest for testing
function createMockRequest(ip: string = '127.0.0.1', auth?: string): NextRequest {
  const headers = new Headers();
  headers.set('x-forwarded-for', ip);
  if (auth) {
    headers.set('authorization', `Bearer ${auth}`);
  }
  
  return {
    ip,
    headers,
    nextUrl: { pathname: '/api/test' }
  } as NextRequest;
}

// Helper to create a JWT-like token
function createMockToken(userId: string): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ user_id: userId, exp: Date.now() / 1000 + 3600 }));
  const signature = 'mock_signature';
  return `${header}.${payload}.${signature}`;
}

describe('Rate Limiting', () => {
  beforeEach(() => {
    // Clear any existing rate limit data
    jest.clearAllMocks();
  });

  describe('Basic Rate Limiting', () => {
    test('should allow requests within limit', async () => {
      const request = createMockRequest('192.168.1.1');
      const config = { requests: 5, windowMs: 60000 };
      
      const result = await checkRateLimit(request, config);
      
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.limit).toBe(5);
    });

    test('should reject requests over limit', async () => {
      const request = createMockRequest('192.168.1.2');
      const config = { requests: 2, windowMs: 60000 };
      
      // Make requests up to limit
      await checkRateLimit(request, config);
      await checkRateLimit(request, config);
      
      // This should be rejected
      const result = await checkRateLimit(request, config);
      
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    test('should reset after window expires', async () => {
      const request = createMockRequest('192.168.1.3');
      const config = { requests: 1, windowMs: 100 }; // Short window for testing
      
      // Exceed limit
      await checkRateLimit(request, config);
      const rejectedResult = await checkRateLimit(request, config);
      expect(rejectedResult.allowed).toBe(false);
      
      // Wait for window to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should be allowed again
      const allowedResult = await checkRateLimit(request, config);
      expect(allowedResult.allowed).toBe(true);
    });

    test('should handle different identifiers', async () => {
      const token = createMockToken('user123');
      const ipRequest = createMockRequest('192.168.1.4');
      const userRequest = createMockRequest('192.168.1.4', token);
      
      const ipConfig = { requests: 1, windowMs: 60000, identifier: 'ip' as const };
      const userConfig = { requests: 1, windowMs: 60000, identifier: 'user' as const };
      
      // Exceed IP limit
      await checkRateLimit(ipRequest, ipConfig);
      const ipResult = await checkRateLimit(ipRequest, ipConfig);
      expect(ipResult.allowed).toBe(false);
      
      // User limit should still be available
      const userResult = await checkRateLimit(userRequest, userConfig);
      expect(userResult.allowed).toBe(true);
    });
  });

  describe('Progressive Rate Limiting', () => {
    test('should apply stricter limits after violations', async () => {
      const request = createMockRequest('192.168.1.5');
      const config = { requests: 10, windowMs: 60000 };
      
      // First violation - should trigger progressive limiting
      for (let i = 0; i < 12; i++) {
        await checkProgressiveRateLimit(request, config);
      }
      
      // Next request should have stricter limits
      const result = await checkProgressiveRateLimit(request, config);
      expect(result.allowed).toBe(false);
    });

    test('should increase penalty with more violations', async () => {
      const request = createMockRequest('192.168.1.6');
      const config = { requests: 10, windowMs: 1000 }; // Short window
      
      // Multiple violation cycles
      for (let cycle = 0; cycle < 3; cycle++) {
        for (let i = 0; i < 12; i++) {
          await checkProgressiveRateLimit(request, config);
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      // Should be severely limited now
      const result = await checkProgressiveRateLimit(request, config);
      expect(result.allowed).toBe(false);
      expect(result.limit).toBeLessThan(config.requests);
    });
  });

  describe('Circuit Breaker', () => {
    test('should start in closed state', async () => {
      const result = await checkCircuitBreaker('test-service', CIRCUIT_BREAKERS.EXTERNAL_API);
      
      expect(result.allowed).toBe(true);
      expect(result.state).toBe('closed');
    });

    test('should open after failure threshold', async () => {
      const serviceKey = 'test-service-failures';
      const config = { failureThreshold: 3, resetTimeoutMs: 30000, monitorWindowMs: 60000 };
      
      // Record failures up to threshold
      for (let i = 0; i < 3; i++) {
        await recordFailure(serviceKey);
      }
      
      const result = await checkCircuitBreaker(serviceKey, config);
      expect(result.allowed).toBe(false);
      expect(result.state).toBe('open');
    });

    test('should transition to half-open after timeout', async () => {
      const serviceKey = 'test-service-recovery';
      const config = { failureThreshold: 2, resetTimeoutMs: 100, monitorWindowMs: 60000 };
      
      // Trigger circuit breaker
      await recordFailure(serviceKey);
      await recordFailure(serviceKey);
      
      let result = await checkCircuitBreaker(serviceKey, config);
      expect(result.state).toBe('open');
      
      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 150));
      
      result = await checkCircuitBreaker(serviceKey, config);
      expect(result.state).toBe('half-open');
    });

    test('should close on successful recovery', async () => {
      const serviceKey = 'test-service-success';
      const config = { failureThreshold: 2, resetTimeoutMs: 100, monitorWindowMs: 60000 };
      
      // Trigger circuit breaker
      await recordFailure(serviceKey);
      await recordFailure(serviceKey);
      
      // Wait for half-open
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Record success
      await recordSuccess(serviceKey);
      
      const result = await checkCircuitBreaker(serviceKey, config);
      expect(result.state).toBe('closed');
    });
  });

  describe('Circuit Breaker Wrapper', () => {
    test('should call operation when circuit is closed', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await withCircuitBreaker('test-wrapper', operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should throw when circuit is open', async () => {
      const serviceKey = 'test-wrapper-failure';
      const operation = jest.fn().mockResolvedValue('success');
      const config = { failureThreshold: 1, resetTimeoutMs: 30000, monitorWindowMs: 60000 };
      
      // Trigger circuit breaker
      await recordFailure(serviceKey);
      
      await expect(
        withCircuitBreaker(serviceKey, operation, config)
      ).rejects.toThrow('Service test-wrapper-failure is temporarily unavailable');
      
      expect(operation).not.toHaveBeenCalled();
    });

    test('should record failures and successes', async () => {
      const serviceKey = 'test-wrapper-recording';
      
      // Test failure recording
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service error'));
      
      await expect(
        withCircuitBreaker(serviceKey, failingOperation)
      ).rejects.toThrow('Service error');
      
      // Test success recording
      const successOperation = jest.fn().mockResolvedValue('success');
      const result = await withCircuitBreaker(serviceKey, successOperation);
      
      expect(result).toBe('success');
    });
  });

  describe('Predefined Configurations', () => {
    test('should have valid Claude API config', () => {
      const config = RATE_LIMITS.CLAUDE_API;
      
      expect(config.requests).toBe(100);
      expect(config.windowMs).toBe(60000);
      expect(config.identifier).toBe('user');
    });

    test('should have valid general API config', () => {
      const config = RATE_LIMITS.GENERAL_API;
      
      expect(config.requests).toBe(1000);
      expect(config.windowMs).toBe(60000);
      expect(config.identifier).toBe('ip');
    });

    test('should have valid circuit breaker configs', () => {
      const config = CIRCUIT_BREAKERS.CLAUDE_API;
      
      expect(config.failureThreshold).toBe(5);
      expect(config.resetTimeoutMs).toBe(30000);
      expect(config.monitorWindowMs).toBe(300000);
    });
  });

  describe('Error Handling', () => {
    test('should handle malformed JWT tokens gracefully', async () => {
      const request = createMockRequest('192.168.1.7', 'invalid.token');
      const config = { requests: 5, windowMs: 60000, identifier: 'user' as const };
      
      // Should fall back to IP-based limiting
      const result = await checkRateLimit(request, config);
      expect(result.allowed).toBe(true);
    });

    test('should handle missing headers gracefully', async () => {
      const request = {
        ip: undefined,
        headers: new Headers(),
        nextUrl: { pathname: '/api/test' }
      } as NextRequest;
      
      const config = { requests: 5, windowMs: 60000 };
      
      const result = await checkRateLimit(request, config);
      expect(result.allowed).toBe(true); // Should default to localhost
    });
  });

  describe('Edge Cases', () => {
    test('should handle concurrent requests correctly', async () => {
      const request = createMockRequest('192.168.1.8');
      const config = { requests: 5, windowMs: 60000 };
      
      // Make concurrent requests
      const promises = Array.from({ length: 10 }, () => 
        checkRateLimit(request, config)
      );
      
      const results = await Promise.all(promises);
      
      const allowed = results.filter(r => r.allowed);
      const denied = results.filter(r => !r.allowed);
      
      expect(allowed.length).toBeLessThanOrEqual(5);
      expect(denied.length).toBeGreaterThan(0);
    });

    test('should handle very short windows', async () => {
      const request = createMockRequest('192.168.1.9');
      const config = { requests: 1, windowMs: 10 }; // 10ms window
      
      const result1 = await checkRateLimit(request, config);
      expect(result1.allowed).toBe(true);
      
      const result2 = await checkRateLimit(request, config);
      expect(result2.allowed).toBe(false);
      
      // Wait for window
      await new Promise(resolve => setTimeout(resolve, 15));
      
      const result3 = await checkRateLimit(request, config);
      expect(result3.allowed).toBe(true);
    });

    test('should handle zero request limit', async () => {
      const request = createMockRequest('192.168.1.10');
      const config = { requests: 0, windowMs: 60000 };
      
      const result = await checkRateLimit(request, config);
      expect(result.allowed).toBe(false);
      expect(result.remaining).toBe(0);
    });
  });
});