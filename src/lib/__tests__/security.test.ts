/**
 * Tests for security utility functions
 */

import { sanitizeAIResponse, sanitizeTaskTitle, sanitizeServerInput, validateServerInput } from '../security';

describe('sanitizeAIResponse', () => {
  describe('Valid responses', () => {
    it('should validate and sanitize a proper AI response', () => {
      const response = {
        tasks: [
          { title: 'Write documentation', estimatedPomodoros: 3 },
          { title: 'Review code', estimatedPomodoros: 2 },
        ],
      };

      const result = sanitizeAIResponse(response);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.tasks).toHaveLength(2);
      expect(result.sanitizedData?.tasks[0]).toEqual({
        title: 'Write documentation',
        estimatedPomodoros: 3,
      });
    });

    it('should round non-integer pomodoros to nearest integer', () => {
      const response = {
        tasks: [{ title: 'Test task', estimatedPomodoros: 2.7 }],
      };

      const result = sanitizeAIResponse(response);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.tasks[0].estimatedPomodoros).toBe(3);
    });

    it('should sanitize malicious HTML in task titles', () => {
      const response = {
        tasks: [
          { title: '<script>alert("xss")</script>Clean title', estimatedPomodoros: 1 },
          { title: 'Normal title with <b>bold</b> tags', estimatedPomodoros: 2 },
        ],
      };

      const result = sanitizeAIResponse(response);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.tasks[0].title).toBe('Clean title');
      expect(result.sanitizedData?.tasks[1].title).toBe('Normal title with bold tags');
    });

    it('should trim whitespace from titles', () => {
      const response = {
        tasks: [{ title: '  Trimmed task  ', estimatedPomodoros: 1 }],
      };

      const result = sanitizeAIResponse(response);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.tasks[0].title).toBe('Trimmed task');
    });
  });

  describe('Invalid response structure', () => {
    it('should reject null/undefined responses', () => {
      expect(sanitizeAIResponse(null).isValid).toBe(false);
      expect(sanitizeAIResponse(undefined).isValid).toBe(false);
      expect(sanitizeAIResponse(null).error).toContain('valid JSON object');
    });

    it('should reject non-object responses', () => {
      expect(sanitizeAIResponse('string').isValid).toBe(false);
      expect(sanitizeAIResponse(42).isValid).toBe(false);
      expect(sanitizeAIResponse([]).isValid).toBe(false);
    });

    it('should reject responses without tasks array', () => {
      expect(sanitizeAIResponse({}).isValid).toBe(false);
      expect(sanitizeAIResponse({ tasks: 'not an array' }).isValid).toBe(false);
      expect(sanitizeAIResponse({ tasks: null }).isValid).toBe(false);
    });

    it('should reject empty tasks array', () => {
      const result = sanitizeAIResponse({ tasks: [] });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least one task');
    });

    it('should reject too many tasks', () => {
      const tasks = Array(51).fill({ title: 'Task', estimatedPomodoros: 1 });
      const result = sanitizeAIResponse({ tasks });
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('too many tasks');
    });
  });

  describe('Invalid task validation', () => {
    it('should reject tasks that are not objects', () => {
      const response = { tasks: ['not an object', null, undefined] };
      const result = sanitizeAIResponse(response);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Must be a valid object');
    });

    it('should reject tasks with missing title', () => {
      const response = { tasks: [{ estimatedPomodoros: 1 }] };
      const result = sanitizeAIResponse(response);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Missing required "title"');
    });

    it('should reject tasks with non-string titles', () => {
      const response = { 
        tasks: [
          { title: 123, estimatedPomodoros: 1 },
          { title: null, estimatedPomodoros: 1 },
          { title: [], estimatedPomodoros: 1 },
        ] 
      };
      const result = sanitizeAIResponse(response);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be a string');
    });

    it('should reject tasks with empty or whitespace-only titles', () => {
      const response = { 
        tasks: [
          { title: '', estimatedPomodoros: 1 },
          { title: '   ', estimatedPomodoros: 1 },
          { title: '\t\n  ', estimatedPomodoros: 1 },
        ] 
      };
      const result = sanitizeAIResponse(response);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject tasks with extremely long titles', () => {
      const longTitle = 'a'.repeat(501);
      const response = { tasks: [{ title: longTitle, estimatedPomodoros: 1 }] };
      const result = sanitizeAIResponse(response);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Title too long');
    });

    it('should reject tasks with missing estimatedPomodoros', () => {
      const response = { tasks: [{ title: 'Valid title' }] };
      const result = sanitizeAIResponse(response);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Missing required "estimatedPomodoros"');
    });

    it('should reject tasks with non-number estimatedPomodoros', () => {
      const response = { 
        tasks: [
          { title: 'Task 1', estimatedPomodoros: '5' },
          { title: 'Task 2', estimatedPomodoros: null },
          { title: 'Task 3', estimatedPomodoros: {} },
        ] 
      };
      const result = sanitizeAIResponse(response);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be a number');
    });

    it('should reject NaN and infinite values', () => {
      const response = { 
        tasks: [
          { title: 'Task 1', estimatedPomodoros: NaN },
          { title: 'Task 2', estimatedPomodoros: Infinity },
          { title: 'Task 3', estimatedPomodoros: -Infinity },
        ] 
      };
      const result = sanitizeAIResponse(response);
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/(NaN|finite)/);
    });

    it('should reject out-of-range pomodoro estimates', () => {
      const response = { 
        tasks: [
          { title: 'Task 1', estimatedPomodoros: 0 },
          { title: 'Task 2', estimatedPomodoros: -5 },
          { title: 'Task 3', estimatedPomodoros: 25 },
        ] 
      };
      const result = sanitizeAIResponse(response);
      expect(result.isValid).toBe(false);
      expect(result.error).toMatch(/(at least 1|cannot exceed 20)/);
    });
  });

  describe('Partial validation recovery', () => {
    it('should return valid tasks even when some fail validation', () => {
      const response = { 
        tasks: [
          { title: 'Valid task 1', estimatedPomodoros: 2 },
          { title: '', estimatedPomodoros: 1 }, // Invalid: empty title
          { title: 'Valid task 2', estimatedPomodoros: 3 },
          { title: 'Invalid task', estimatedPomodoros: 25 }, // Invalid: too many pomodoros
        ] 
      };
      const result = sanitizeAIResponse(response);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.tasks).toHaveLength(2);
      expect(result.sanitizedData?.tasks[0].title).toBe('Valid task 1');
      expect(result.sanitizedData?.tasks[1].title).toBe('Valid task 2');
    });

    it('should fail if no tasks pass validation', () => {
      const response = { 
        tasks: [
          { title: '', estimatedPomodoros: 1 }, // Invalid: empty title
          { title: 'Task', estimatedPomodoros: -1 }, // Invalid: negative pomodoros
        ] 
      };
      const result = sanitizeAIResponse(response);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('All tasks failed validation');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle unexpected errors gracefully', () => {
      // Mock sanitizeTaskTitle to throw an error
      const originalSanitizeTaskTitle = require('../security').sanitizeTaskTitle;
      jest.spyOn(require('../security'), 'sanitizeTaskTitle').mockImplementation(() => {
        throw new Error('Unexpected sanitization error');
      });

      const response = { tasks: [{ title: 'Task', estimatedPomodoros: 1 }] };
      const result = sanitizeAIResponse(response);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Unexpected error during response validation');
      
      // Restore original function
      require('../security').sanitizeTaskTitle.mockRestore();
    });
  });
});

describe('sanitizeTaskTitle', () => {
  it('should remove HTML tags but keep text content', () => {
    expect(sanitizeTaskTitle('<script>alert("xss")</script>Test')).toBe('Test');
    expect(sanitizeTaskTitle('Normal <b>bold</b> text')).toBe('Normal bold text');
    expect(sanitizeTaskTitle('<p>Paragraph</p>')).toBe('Paragraph');
  });

  it('should handle non-string inputs', () => {
    expect(sanitizeTaskTitle(null as any)).toBe('');
    expect(sanitizeTaskTitle(undefined as any)).toBe('');
    expect(sanitizeTaskTitle(123 as any)).toBe('');
  });
});

describe('sanitizeServerInput', () => {
  it('should escape HTML entities', () => {
    const input = 'Test <script>alert("xss")</script> & "quotes"';
    const result = sanitizeServerInput(input);
    expect(result).toContain('&lt;');
    expect(result).toContain('&gt;');
    expect(result).toContain('&amp;');
    expect(result).toContain('&quot;');
  });

  it('should remove malicious patterns', () => {
    const input = 'javascript:alert("xss") Test vbscript:evil onclick="bad()"';
    const result = sanitizeServerInput(input);
    expect(result).not.toMatch(/javascript:|vbscript:|onclick=/);
  });

  it('should throw error for non-string input', () => {
    expect(() => sanitizeServerInput(123 as any)).toThrow('Input must be a string');
  });
});

describe('validateServerInput', () => {
  it('should validate proper strings', () => {
    const result = validateServerInput('Normal input text');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject non-string inputs', () => {
    const result = validateServerInput(123 as any);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('must be a string');
  });

  it('should reject empty strings', () => {
    const result = validateServerInput('');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('cannot be empty');
  });

  it('should reject strings that are too long', () => {
    const longString = 'a'.repeat(2001);
    const result = validateServerInput(longString);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('less than 2000 characters');
  });

  it('should reject suspicious patterns', () => {
    const inputs = [
      '<script>alert("xss")</script>',
      'javascript:evil()',
      'vbscript:bad()',
      'onclick="malicious()"',
      'data:text/html,<script>alert(1)</script>',
    ];

    inputs.forEach(input => {
      const result = validateServerInput(input);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('potentially malicious');
    });
  });

  it('should accept custom length limits', () => {
    const result = validateServerInput('test', 3);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('less than 3 characters');
  });
});