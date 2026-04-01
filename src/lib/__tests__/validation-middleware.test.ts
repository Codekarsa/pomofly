import { NextRequest } from 'next/server';
import { validateRequest, withValidation, CommonSchemas, createErrorResponse } from '../validation-middleware';
import { z } from 'zod';

// Mock the auth middleware
jest.mock('../auth-middleware', () => ({
  validateAuth: jest.fn(),
  checkRateLimit: jest.fn(),
}));

import { validateAuth, checkRateLimit } from '../auth-middleware';

const mockValidateAuth = validateAuth as jest.MockedFunction<typeof validateAuth>;
const mockCheckRateLimit = checkRateLimit as jest.MockedFunction<typeof checkRateLimit>;

describe('validation-middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Default successful auth
    mockValidateAuth.mockResolvedValue({
      isAuthenticated: true,
      uid: 'test-user-123',
    });
    
    // Default successful rate limit
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      remaining: 9,
      resetTime: Date.now() + 60000,
    });
  });

  describe('validateRequest', () => {
    it('should validate a basic authenticated request', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ message: 'hello' }),
      });

      const result = await validateRequest(request, {
        bodySchema: z.object({ message: z.string() }),
      });

      expect(result.success).toBe(true);
      expect(result.data?.user?.uid).toBe('test-user-123');
      expect(result.data?.body.message).toBe('hello');
    });

    it('should reject unauthorized requests', async () => {
      mockValidateAuth.mockResolvedValueOnce({
        isAuthenticated: false,
        error: 'Invalid token',
      });

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
      });

      const result = await validateRequest(request);

      expect(result.success).toBe(false);
      expect(result.response?.status).toBe(401);
    });

    it('should handle rate limiting', async () => {
      mockCheckRateLimit.mockReturnValueOnce({
        allowed: false,
        remaining: 0,
        resetTime: Date.now() + 30000,
      });

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
        },
      });

      const result = await validateRequest(request);

      expect(result.success).toBe(false);
      expect(result.response?.status).toBe(429);
    });

    it('should validate request body against schema', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ name: 'test', age: 'invalid' }),
      });

      const schema = z.object({
        name: z.string(),
        age: z.number(),
      });

      const result = await validateRequest(request, { bodySchema: schema });

      expect(result.success).toBe(false);
      expect(result.response?.status).toBe(400);
    });

    it('should validate query parameters', async () => {
      const request = new NextRequest('http://localhost/api/test?page=1&limit=10', {
        method: 'GET',
        headers: {
          'authorization': 'Bearer valid-token',
        },
      });

      const result = await validateRequest(request, {
        querySchema: CommonSchemas.pagination,
      });

      expect(result.success).toBe(true);
      expect(result.data?.query.page).toBe(1);
      expect(result.data?.query.limit).toBe(10);
    });

    it('should reject disallowed HTTP methods', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'DELETE',
        headers: {
          'authorization': 'Bearer valid-token',
        },
      });

      const result = await validateRequest(request, {
        allowedMethods: ['GET', 'POST'],
      });

      expect(result.success).toBe(false);
      expect(result.response?.status).toBe(405);
    });

    it('should handle payload size limits', async () => {
      const largePayload = 'x'.repeat(2000);
      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ data: largePayload }),
      });

      const result = await validateRequest(request, {
        maxBodySize: 1024, // 1KB limit
      });

      expect(result.success).toBe(false);
      expect(result.response?.status).toBe(413);
    });

    it('should work without authentication when not required', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'GET',
      });

      const result = await validateRequest(request, {
        requireAuth: false,
      });

      expect(result.success).toBe(true);
      expect(result.data?.user).toBeUndefined();
      expect(mockValidateAuth).not.toHaveBeenCalled();
    });
  });

  describe('withValidation HOF', () => {
    it('should wrap handler with validation', async () => {
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({ success: true }), {
          headers: { 'content-type': 'application/json' },
        })
      );

      const wrappedHandler = withValidation(mockHandler, {
        bodySchema: z.object({ test: z.string() }),
      });

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ test: 'value' }),
      });

      const response = await wrappedHandler(request);

      expect(mockHandler).toHaveBeenCalled();
      expect(response.status).toBe(200);
    });

    it('should return validation error before calling handler', async () => {
      const mockHandler = jest.fn();

      const wrappedHandler = withValidation(mockHandler, {
        bodySchema: z.object({ required: z.string() }),
      });

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ invalid: 'data' }),
      });

      const response = await wrappedHandler(request);

      expect(mockHandler).not.toHaveBeenCalled();
      expect(response.status).toBe(400);
    });

    it('should handle handler errors gracefully', async () => {
      const mockHandler = jest.fn().mockRejectedValue(new Error('Handler error'));

      const wrappedHandler = withValidation(mockHandler);

      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
        },
      });

      const response = await wrappedHandler(request);

      expect(response.status).toBe(500);
    });
  });

  describe('createErrorResponse', () => {
    it('should create standard error response', () => {
      const response = createErrorResponse(
        'Test Error',
        'This is a test error',
        422
      );

      expect(response.status).toBe(422);
    });

    it('should create error response with headers', () => {
      const response = createErrorResponse(
        'Rate Limited',
        'Too many requests',
        429,
        { 'Retry-After': '60' }
      );

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('60');
    });
  });

  describe('CommonSchemas', () => {
    it('should validate pagination schema', () => {
      const validData = { page: 1, limit: 10 };
      const result = CommonSchemas.pagination.safeParse(validData);
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it('should provide defaults for pagination', () => {
      const result = CommonSchemas.pagination.safeParse({});
      
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.page).toBe(1);
        expect(result.data.limit).toBe(10);
      }
    });

    it('should validate task creation schema', () => {
      const validTask = {
        title: 'Test Task',
        estimatedPomodoros: 5,
      };

      const result = CommonSchemas.taskCreate.safeParse(validTask);
      
      expect(result.success).toBe(true);
    });

    it('should validate Claude breakdown schema', () => {
      const validRequest = {
        description: 'Test task description',
        pomodoroDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
      };

      const result = CommonSchemas.claudeBreakdown.safeParse(validRequest);
      
      expect(result.success).toBe(true);
    });
  });

  describe('input sanitization', () => {
    it('should sanitize malicious input when enabled', async () => {
      const maliciousInput = '<script>alert("xss")</script>Hello';
      
      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({ message: maliciousInput }),
      });

      const result = await validateRequest(request, {
        bodySchema: z.object({ message: z.string() }),
        sanitizeStrings: true,
      });

      expect(result.success).toBe(true);
      expect(result.data?.body.message).not.toContain('<script>');
      expect(result.data?.body.message).toContain('&lt;script&gt;');
    });

    it('should sanitize nested object strings', async () => {
      const request = new NextRequest('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'authorization': 'Bearer valid-token',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          user: {
            name: '<script>alert("xss")</script>John',
            bio: 'Hello <b>world</b>',
          }
        }),
      });

      const result = await validateRequest(request, {
        sanitizeStrings: true,
      });

      expect(result.success).toBe(true);
      expect(result.data?.body.user.name).toContain('&lt;script&gt;');
      expect(result.data?.body.user.bio).toContain('&lt;b&gt;');
    });
  });
});