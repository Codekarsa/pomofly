import { POST } from '../claude-breakdown/route';
import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

// Mock dependencies
jest.mock('@anthropic-ai/sdk');
jest.mock('@/lib/auth-middleware', () => ({
  validateAuth: jest.fn(),
  checkRateLimit: jest.fn(),
}));
jest.mock('@/lib/security', () => ({
  sanitizeServerInput: jest.fn((input: string) => input),
  validateServerInput: jest.fn((input: string) => ({ isValid: true })),
  sanitizeAIResponse: jest.fn((response: any) => ({ 
    isValid: true, 
    sanitizedData: response 
  })),
}));

const MockedAnthropic = Anthropic as jest.MockedClass<typeof Anthropic>;
const { validateAuth, checkRateLimit } = require('@/lib/auth-middleware');

describe('/api/claude-breakdown', () => {
  let mockCreateMessage: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mocks
    validateAuth.mockResolvedValue({
      isAuthenticated: true,
      uid: 'test-user-id',
    });
    
    checkRateLimit.mockReturnValue({
      allowed: true,
    });

    mockCreateMessage = jest.fn();
    MockedAnthropic.mockImplementation(() => ({
      messages: {
        create: mockCreateMessage,
      },
    } as any));

    // Mock environment variables
    process.env.CLAUDE_API_KEY = 'test-api-key';
    process.env.CLAUDE_MODEL = 'claude-3-sonnet-20240229';
  });

  afterEach(() => {
    delete process.env.CLAUDE_API_KEY;
    delete process.env.CLAUDE_MODEL;
  });

  describe('Success Cases', () => {
    it('should successfully break down a task with valid input', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: JSON.stringify({
            tasks: [
              { title: 'Research topic', estimatedPomodoros: 2 },
              { title: 'Write outline', estimatedPomodoros: 1 },
              { title: 'Write first draft', estimatedPomodoros: 3 },
            ]
          })
        }]
      };

      mockCreateMessage.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/claude-breakdown', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Write a blog post about AI',
          pomodoroDuration: 25,
          shortBreakDuration: 5,
          longBreakDuration: 15,
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.tasks).toHaveLength(3);
      expect(responseData.tasks[0].title).toBe('Research topic');
      expect(responseData.tasks[0].estimatedPomodoros).toBe(2);
    });

    it('should handle optional parameters correctly', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: JSON.stringify({
            tasks: [{ title: 'Simple task', estimatedPomodoros: 1 }]
          })
        }]
      };

      mockCreateMessage.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/claude-breakdown', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Simple task',
          startDate: '2024-03-27',
          endDate: '2024-03-28',
        }),
      });

      const response = await POST(request);
      expect(response.status).toBe(200);
    });
  });

  describe('Authentication and Rate Limiting', () => {
    it('should return 401 when authentication fails', async () => {
      validateAuth.mockResolvedValue({
        isAuthenticated: false,
        error: 'Invalid token',
      });

      const request = new NextRequest('http://localhost:3000/api/claude-breakdown', {
        method: 'POST',
        body: JSON.stringify({ description: 'Test task' }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Unauthorized');
    });

    it('should return 429 when rate limit is exceeded', async () => {
      checkRateLimit.mockReturnValue({
        allowed: false,
        resetTime: Date.now() + 60000,
      });

      const request = new NextRequest('http://localhost:3000/api/claude-breakdown', {
        method: 'POST',
        body: JSON.stringify({ description: 'Test task' }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(429);
      expect(responseData.error).toBe('Rate limit exceeded');
      expect(response.headers.get('Retry-After')).toBeTruthy();
    });
  });

  describe('Input Validation', () => {
    it('should return 400 when description is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/claude-breakdown', {
        method: 'POST',
        body: JSON.stringify({}),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.error).toBe('Bad Request');
      expect(responseData.details).toContain('Description is required');
    });

    it('should return 400 when description is not a string', async () => {
      const request = new NextRequest('http://localhost:3000/api/claude-breakdown', {
        method: 'POST',
        body: JSON.stringify({ description: 123 }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.details).toContain('must be a string');
    });

    it('should validate pomodoro duration bounds', async () => {
      const request = new NextRequest('http://localhost:3000/api/claude-breakdown', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test task',
          pomodoroDuration: 150, // > 120
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.details).toContain('between 1 and 120 minutes');
    });

    it('should validate short break duration bounds', async () => {
      const request = new NextRequest('http://localhost:3000/api/claude-breakdown', {
        method: 'POST',
        body: JSON.stringify({
          description: 'Test task',
          shortBreakDuration: 70, // > 60
        }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(400);
      expect(responseData.details).toContain('between 1 and 60 minutes');
    });
  });

  describe('Configuration Errors', () => {
    it('should return 503 when Claude API key is missing', async () => {
      delete process.env.CLAUDE_API_KEY;

      const request = new NextRequest('http://localhost:3000/api/claude-breakdown', {
        method: 'POST',
        body: JSON.stringify({ description: 'Test task' }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(503);
      expect(responseData.error).toBe('Configuration Error');
    });

    it('should return 503 when Claude model is missing', async () => {
      delete process.env.CLAUDE_MODEL;

      const request = new NextRequest('http://localhost:3000/api/claude-breakdown', {
        method: 'POST',
        body: JSON.stringify({ description: 'Test task' }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(503);
      expect(responseData.error).toBe('Configuration Error');
    });
  });

  describe('Claude API Errors', () => {
    it('should handle timeout errors', async () => {
      mockCreateMessage.mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('TimeoutError')), 100);
        });
      });

      const request = new NextRequest('http://localhost:3000/api/claude-breakdown', {
        method: 'POST',
        body: JSON.stringify({ description: 'Test task' }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(408);
      expect(responseData.error).toBe('Request Timeout');
    }, 10000);

    it('should handle Claude API authentication errors', async () => {
      const apiError = new Anthropic.APIError('Invalid API key', {}, 401, {});
      mockCreateMessage.mockRejectedValue(apiError);

      const request = new NextRequest('http://localhost:3000/api/claude-breakdown', {
        method: 'POST',
        body: JSON.stringify({ description: 'Test task' }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(401);
      expect(responseData.error).toBe('Authentication Error');
    });

    it('should handle Claude API rate limit errors', async () => {
      const apiError = new Anthropic.APIError('Rate limited', {}, 429, {});
      mockCreateMessage.mockRejectedValue(apiError);

      const request = new NextRequest('http://localhost:3000/api/claude-breakdown', {
        method: 'POST',
        body: JSON.stringify({ description: 'Test task' }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(429);
      expect(responseData.error).toBe('Rate Limit Exceeded');
    });

    it('should handle connection errors', async () => {
      const connectionError = new Anthropic.APIConnectionError('Connection failed');
      mockCreateMessage.mockRejectedValue(connectionError);

      const request = new NextRequest('http://localhost:3000/api/claude-breakdown', {
        method: 'POST',
        body: JSON.stringify({ description: 'Test task' }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(503);
      expect(responseData.error).toBe('Connection Error');
    });

    it('should handle empty Claude API response', async () => {
      mockCreateMessage.mockResolvedValue({ content: [] });

      const request = new NextRequest('http://localhost:3000/api/claude-breakdown', {
        method: 'POST',
        body: JSON.stringify({ description: 'Test task' }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(502);
      expect(responseData.error).toBe('API Response Error');
    });

    it('should handle invalid JSON response from Claude', async () => {
      const mockResponse = {
        content: [{
          type: 'text',
          text: 'Invalid JSON response'
        }]
      };

      mockCreateMessage.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/claude-breakdown', {
        method: 'POST',
        body: JSON.stringify({ description: 'Test task' }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(502);
      expect(responseData.error).toBe('AI Response Format Error');
    });
  });

  describe('Security Validation', () => {
    it('should handle security validation failure', async () => {
      const { sanitizeAIResponse } = require('@/lib/security');
      sanitizeAIResponse.mockReturnValue({
        isValid: false,
        error: 'Security validation failed',
      });

      const mockResponse = {
        content: [{
          type: 'text',
          text: JSON.stringify({ tasks: [] })
        }]
      };

      mockCreateMessage.mockResolvedValue(mockResponse);

      const request = new NextRequest('http://localhost:3000/api/claude-breakdown', {
        method: 'POST',
        body: JSON.stringify({ description: 'Test task' }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(502);
      expect(responseData.error).toBe('AI Response Validation Error');
    });
  });

  describe('Generic Error Handling', () => {
    it('should handle unexpected errors', async () => {
      mockCreateMessage.mockRejectedValue(new Error('Unexpected error'));

      const request = new NextRequest('http://localhost:3000/api/claude-breakdown', {
        method: 'POST',
        body: JSON.stringify({ description: 'Test task' }),
      });

      const response = await POST(request);
      const responseData = await response.json();

      expect(response.status).toBe(500);
      expect(responseData.error).toBe('Internal Server Error');
    });
  });
});