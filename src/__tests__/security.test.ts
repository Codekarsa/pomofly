/**
 * Security module tests - XSS protection and input sanitization
 * Tests both server-side and client-side sanitization functions
 */

import { 
  sanitizeTaskTitle, 
  sanitizeProjectName, 
  sanitizeServerInput, 
  validateServerInput,
  sanitizeAIResponse
} from '@/lib/security';

// Mock DOMPurify for tests
jest.mock('dompurify', () => ({
  sanitize: jest.fn((input: string, config?: any) => {
    // Basic mock that removes script tags and dangerous content
    return input
      .replace(/<script.*?<\/script>/gi, '')
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '');
  })
}));

describe('Security Module - XSS Protection', () => {
  describe('sanitizeTaskTitle', () => {
    it('should sanitize basic script injection', () => {
      const maliciousTitle = '<script>alert("xss")</script>Valid Title';
      const result = sanitizeTaskTitle(maliciousTitle);
      
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
      expect(result).toBe('Valid Title');
    });

    it('should remove HTML tags while preserving text', () => {
      const htmlTitle = '<p>Task <strong>title</strong> with <em>formatting</em></p>';
      const result = sanitizeTaskTitle(htmlTitle);
      
      expect(result).not.toContain('<p>');
      expect(result).not.toContain('<strong>');
      expect(result).not.toContain('<em>');
      expect(result).toBe('Task title with formatting');
    });

    it('should handle javascript: protocol injection', () => {
      const maliciousTitle = 'javascript:alert("xss") Normal Title';
      const result = sanitizeTaskTitle(maliciousTitle);
      
      expect(result).not.toContain('javascript:');
      expect(result).toBe(' Normal Title');
    });

    it('should handle vbscript: protocol injection', () => {
      const maliciousTitle = 'vbscript:alert("xss") Normal Title';
      const result = sanitizeTaskTitle(maliciousTitle);
      
      expect(result).not.toContain('vbscript:');
      expect(result).toBe(' Normal Title');
    });

    it('should handle non-string input gracefully', () => {
      expect(sanitizeTaskTitle(null as any)).toBe('');
      expect(sanitizeTaskTitle(undefined as any)).toBe('');
      expect(sanitizeTaskTitle(123 as any)).toBe('');
      expect(sanitizeTaskTitle({} as any)).toBe('');
    });

    it('should preserve safe text unchanged', () => {
      const safeTitle = 'Normal Task Title 123';
      const result = sanitizeTaskTitle(safeTitle);
      
      expect(result).toBe(safeTitle);
    });

    it('should handle empty string', () => {
      expect(sanitizeTaskTitle('')).toBe('');
    });

    it('should handle special characters safely', () => {
      const specialTitle = 'Task with & symbols < > " \' /';
      const result = sanitizeTaskTitle(specialTitle);
      
      // Should preserve the text content without dangerous interpretations
      expect(result).toContain('Task with');
      expect(result).not.toContain('<script>');
    });
  });

  describe('sanitizeProjectName', () => {
    it('should sanitize script injection in project names', () => {
      const maliciousName = '<script>alert("xss")</script>Project Name';
      const result = sanitizeProjectName(maliciousName);
      
      expect(result).not.toContain('<script>');
      expect(result).toBe('Project Name');
    });

    it('should handle non-string input gracefully', () => {
      expect(sanitizeProjectName(null as any)).toBe('');
      expect(sanitizeProjectName(undefined as any)).toBe('');
      expect(sanitizeProjectName(123 as any)).toBe('');
    });

    it('should preserve safe project names', () => {
      const safeName = 'My Project 2024';
      const result = sanitizeProjectName(safeName);
      
      expect(result).toBe(safeName);
    });
  });

  describe('sanitizeServerInput', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = sanitizeServerInput(input);
      
      expect(result).not.toContain('<script>');
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    it('should escape HTML entities', () => {
      const input = 'Test & <tag> "quoted" \'single\' /slash';
      const result = sanitizeServerInput(input);
      
      expect(result).toContain('&amp;');
      expect(result).toContain('&lt;');
      expect(result).toContain('&gt;');
      expect(result).toContain('&quot;');
      expect(result).toContain('&#x27;');
      expect(result).toContain('&#x2F;');
    });

    it('should remove javascript protocols', () => {
      const input = 'javascript:alert("xss") normal text';
      const result = sanitizeServerInput(input);
      
      expect(result).not.toContain('javascript:');
      expect(result).toContain('normal text');
    });

    it('should remove event handlers', () => {
      const input = 'onclick="alert()" onload="malicious()" normal';
      const result = sanitizeServerInput(input);
      
      expect(result).not.toContain('onclick=');
      expect(result).not.toContain('onload=');
      expect(result).toContain('normal');
    });

    it('should handle non-string input', () => {
      expect(() => sanitizeServerInput(123 as any)).toThrow('Input must be a string');
      expect(() => sanitizeServerInput(null as any)).toThrow('Input must be a string');
    });
  });

  describe('validateServerInput', () => {
    it('should validate safe input as valid', () => {
      const result = validateServerInput('Safe task title');
      
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject input with script tags', () => {
      const result = validateServerInput('<script>alert("xss")</script>');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('malicious content');
    });

    it('should reject input with javascript protocol', () => {
      const result = validateServerInput('javascript:alert("xss")');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('malicious content');
    });

    it('should reject input that is too long', () => {
      const longInput = 'a'.repeat(3000);
      const result = validateServerInput(longInput, 2000);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('less than 2000 characters');
    });

    it('should reject empty input', () => {
      const result = validateServerInput('');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('cannot be empty');
    });

    it('should reject non-string input', () => {
      const result = validateServerInput(123 as any);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('must be a string');
    });
  });

  describe('sanitizeAIResponse', () => {
    it('should validate and sanitize valid AI response', () => {
      const validResponse = {
        tasks: [
          { title: 'Task 1', estimatedPomodoros: 2 },
          { title: 'Task 2', estimatedPomodoros: 3 }
        ]
      };

      const result = sanitizeAIResponse(validResponse);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.tasks).toHaveLength(2);
      expect(result.sanitizedData?.tasks[0].title).toBe('Task 1');
      expect(result.sanitizedData?.tasks[0].estimatedPomodoros).toBe(2);
    });

    it('should sanitize malicious task titles in AI response', () => {
      const maliciousResponse = {
        tasks: [
          { title: '<script>alert("xss")</script>Clean Task', estimatedPomodoros: 2 }
        ]
      };

      const result = sanitizeAIResponse(maliciousResponse);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.tasks[0].title).not.toContain('<script>');
      expect(result.sanitizedData?.tasks[0].title).toBe('Clean Task');
    });

    it('should reject response without tasks array', () => {
      const invalidResponse = { notTasks: [] };
      const result = sanitizeAIResponse(invalidResponse);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('tasks array');
    });

    it('should reject response with empty tasks array', () => {
      const invalidResponse = { tasks: [] };
      const result = sanitizeAIResponse(invalidResponse);
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('at least one task');
    });

    it('should reject response with too many tasks', () => {
      const tasks = Array.from({ length: 51 }, (_, i) => ({
        title: `Task ${i}`,
        estimatedPomodoros: 1
      }));
      
      const result = sanitizeAIResponse({ tasks });
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Too many tasks');
    });

    it('should reject tasks with invalid pomodoro counts', () => {
      const invalidResponse = {
        tasks: [
          { title: 'Valid Task', estimatedPomodoros: 0 }, // Invalid: too low
          { title: 'Another Task', estimatedPomodoros: 101 } // Invalid: too high
        ]
      };

      expect(() => sanitizeAIResponse(invalidResponse)).toThrow();
    });

    it('should handle fractional pomodoro estimates', () => {
      const response = {
        tasks: [
          { title: 'Task 1', estimatedPomodoros: 2.7 }
        ]
      };

      const result = sanitizeAIResponse(response);
      
      expect(result.isValid).toBe(true);
      expect(result.sanitizedData?.tasks[0].estimatedPomodoros).toBe(2); // Should be floored
    });
  });
});

describe('Security Integration Tests', () => {
  it('should handle realistic XSS payloads', () => {
    const xssPayloads = [
      '<img src=x onerror=alert("xss")>',
      '<svg onload=alert("xss")>',
      'javascript:alert("xss")',
      '"><script>alert("xss")</script>',
      '<iframe src="javascript:alert(\'xss\')"></iframe>',
      '<object data="javascript:alert(\'xss\')"></object>',
      'vbscript:alert("xss")',
      '<script>fetch("/steal-data")</script>',
      '<img src="x" onerror="document.location=\'http://evil.com\'">'
    ];

    xssPayloads.forEach(payload => {
      const sanitizedTask = sanitizeTaskTitle(payload);
      const sanitizedProject = sanitizeProjectName(payload);
      
      // Should not contain any dangerous patterns
      expect(sanitizedTask).not.toMatch(/<script/i);
      expect(sanitizedTask).not.toMatch(/javascript:/i);
      expect(sanitizedTask).not.toMatch(/vbscript:/i);
      expect(sanitizedTask).not.toMatch(/onerror=/i);
      expect(sanitizedTask).not.toMatch(/onload=/i);
      
      expect(sanitizedProject).not.toMatch(/<script/i);
      expect(sanitizedProject).not.toMatch(/javascript:/i);
      expect(sanitizedProject).not.toMatch(/vbscript:/i);
    });
  });

  it('should preserve legitimate special characters', () => {
    const legitimateTexts = [
      'Task #1: Review & Test',
      'Project (2024) - Phase 1',
      'Bug Fix: Handle edge case with 100% CPU',
      'Feature: Add support for UTF-8 ñáéíóú',
      'Meeting @ 3PM - Q&A Session'
    ];

    legitimateTexts.forEach(text => {
      const sanitizedTask = sanitizeTaskTitle(text);
      const sanitizedProject = sanitizeProjectName(text);
      
      // Should preserve meaningful content
      expect(sanitizedTask.length).toBeGreaterThan(0);
      expect(sanitizedProject.length).toBeGreaterThan(0);
    });
  });
});