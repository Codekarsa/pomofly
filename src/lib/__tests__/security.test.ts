/**
 * @jest-environment jsdom
 */

import { 
  sanitizeTaskTitle, 
  sanitizeRichContent, 
  sanitizeAIResponse, 
  sanitizeServerInput,
  validateServerInput,
  sanitizeInlineStyles 
} from '../security';

// Mock DOMPurify for tests
jest.mock('dompurify', () => ({
  default: {
    sanitize: jest.fn((input: string, config?: any) => {
      // Simple mock that removes script tags and returns cleaned content
      if (config && config.ALLOWED_TAGS && config.ALLOWED_TAGS.length === 0) {
        // For task titles - strip all HTML
        return input.replace(/<[^>]*>/g, '');
      }
      // For rich content - allow some tags
      return input
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+=/gi, '');
    })
  }
}));

describe('Security Module', () => {
  
  describe('sanitizeTaskTitle', () => {
    it('should remove HTML tags from task titles', () => {
      const input = '<b>Important Task</b>';
      const result = sanitizeTaskTitle(input);
      expect(result).toBe('Important Task');
    });

    it('should remove script tags and prevent XSS', () => {
      const input = 'Task <script>alert("xss")</script> title';
      const result = sanitizeTaskTitle(input);
      expect(result).toBe('Task  title');
    });

    it('should remove event handlers', () => {
      const input = 'Task <span onclick="alert()">title</span>';
      const result = sanitizeTaskTitle(input);
      expect(result).toBe('Task title');
    });

    it('should handle empty and null inputs', () => {
      expect(sanitizeTaskTitle('')).toBe('');
      expect(sanitizeTaskTitle(null as any)).toBe('');
      expect(sanitizeTaskTitle(undefined as any)).toBe('');
    });

    it('should preserve normal text content', () => {
      const input = 'Normal task title with special chars: !@#$%^&*()';
      const result = sanitizeTaskTitle(input);
      expect(result).toBe(input);
    });
  });

  describe('sanitizeRichContent', () => {
    it('should allow safe HTML tags', () => {
      const input = '<p>Paragraph with <strong>bold</strong> text</p>';
      const result = sanitizeRichContent(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
    });

    it('should remove dangerous script tags', () => {
      const input = '<p>Content</p><script>alert("xss")</script>';
      const result = sanitizeRichContent(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Content</p>');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert()">Link</a>';
      const result = sanitizeRichContent(input);
      expect(result).not.toContain('javascript:');
    });
  });

  describe('sanitizeAIResponse', () => {
    it('should validate and sanitize valid AI response', () => {
      const response = {
        tasks: [
          { title: 'Clean task title', estimatedPomodoros: 3 },
          { title: 'Another task', estimatedPomodoros: 2 }
        ]
      };
      
      const result = sanitizeAIResponse(response);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.tasks).toHaveLength(2);
      expect(result.sanitizedData?.tasks[0].title).toBe('Clean task title');
    });

    it('should sanitize malicious content in task titles', () => {
      const response = {
        tasks: [
          { title: '<script>alert("xss")</script>Task', estimatedPomodoros: 2 }
        ]
      };
      
      const result = sanitizeAIResponse(response);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.tasks[0].title).toBe('Task');
    });

    it('should reject invalid response structures', () => {
      expect(sanitizeAIResponse(null)).toEqual({
        isValid: false,
        error: 'Invalid response structure'
      });
      
      expect(sanitizeAIResponse({})).toEqual({
        isValid: false,
        error: 'Response must contain tasks array'
      });
      
      expect(sanitizeAIResponse({ tasks: [] })).toEqual({
        isValid: false,
        error: 'Response must contain at least one task'
      });
    });

    it('should reject too many tasks', () => {
      const manyTasks = Array(51).fill({ title: 'Task', estimatedPomodoros: 1 });
      const result = sanitizeAIResponse({ tasks: manyTasks });
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Too many tasks in response (max 50)');
    });

    it('should validate task properties', () => {
      const response = {
        tasks: [
          { title: '', estimatedPomodoros: 2 } // Empty title
        ]
      };
      
      const result = sanitizeAIResponse(response);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('title is empty after sanitization');
    });

    it('should validate pomodoro estimates', () => {
      const response = {
        tasks: [
          { title: 'Task', estimatedPomodoros: 101 } // Too many pomodoros
        ]
      };
      
      const result = sanitizeAIResponse(response);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('valid estimatedPomodoros (1-100)');
    });
  });

  describe('sanitizeServerInput', () => {
    it('should remove malicious patterns', () => {
      const input = 'Text with <script>alert()</script> content';
      const result = sanitizeServerInput(input);
      expect(result).not.toContain('<script>');
    });

    it('should escape HTML entities', () => {
      const input = 'Text with <>&"\'/ characters';
      const result = sanitizeServerInput(input);
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&quot;');
    });

    it('should throw error for non-string input', () => {
      expect(() => sanitizeServerInput(123 as any)).toThrow('Input must be a string');
    });
  });

  describe('validateServerInput', () => {
    it('should validate normal input', () => {
      const result = validateServerInput('Normal task title');
      expect(result.isValid).toBe(true);
    });

    it('should reject suspicious patterns', () => {
      const result = validateServerInput('Task <script>alert()</script>');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('potentially malicious content');
    });

    it('should enforce length limits', () => {
      const longInput = 'a'.repeat(2001);
      const result = validateServerInput(longInput);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('less than 2000 characters');
    });

    it('should reject empty input', () => {
      const result = validateServerInput('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Input cannot be empty');
    });

    it('should reject non-string input', () => {
      const result = validateServerInput(123 as any);
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Input must be a string');
    });
  });

  describe('sanitizeInlineStyles', () => {
    it('should remove dangerous CSS properties', () => {
      const styles = 'color: red; expression(alert("xss")); background: blue;';
      const result = sanitizeInlineStyles(styles);
      expect(result).not.toContain('expression');
      expect(result).toContain('color: red');
      expect(result).toContain('background: blue');
    });

    it('should remove javascript URLs', () => {
      const styles = 'background-image: url(javascript:alert("xss"));';
      const result = sanitizeInlineStyles(styles);
      expect(result).not.toContain('javascript:');
    });

    it('should handle empty input', () => {
      expect(sanitizeInlineStyles('')).toBe('');
      expect(sanitizeInlineStyles(null as any)).toBe('');
    });
  });
});