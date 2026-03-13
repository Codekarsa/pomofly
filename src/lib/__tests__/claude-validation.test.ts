import {
  validateClaudeRequest,
  validateClaudeResponse,
  sanitizeTaskTitle,
  sanitizeDescription,
  detectSuspiciousPatterns,
} from '../claude-validation';

describe('Claude Validation', () => {
  describe('validateClaudeRequest', () => {
    it('should validate a correct request', () => {
      const validRequest = {
        description: 'Build a todo app',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        pomodoroDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
      };

      expect(() => validateClaudeRequest(validRequest)).not.toThrow();
    });

    it('should reject empty description', () => {
      const invalidRequest = {
        description: '',
        pomodoroDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
      };

      expect(() => validateClaudeRequest(invalidRequest)).toThrow(
        'Task description is required'
      );
    });

    it('should reject description that is too long', () => {
      const invalidRequest = {
        description: 'x'.repeat(5001),
        pomodoroDuration: 25,
        shortBreakDuration: 5,
        longBreakDuration: 15,
      };

      expect(() => validateClaudeRequest(invalidRequest)).toThrow(
        'Task description must be less than 5000 characters'
      );
    });

    it('should reject invalid pomodoro duration', () => {
      const invalidRequest = {
        description: 'Build a todo app',
        pomodoroDuration: 70, // Too high
        shortBreakDuration: 5,
        longBreakDuration: 15,
      };

      expect(() => validateClaudeRequest(invalidRequest)).toThrow(
        'Pomodoro duration must be at most 60 minutes'
      );
    });

    it('should apply default values', () => {
      const minimalRequest = {
        description: 'Build a todo app',
      };

      const result = validateClaudeRequest(minimalRequest);
      expect(result.pomodoroDuration).toBe(25);
      expect(result.shortBreakDuration).toBe(5);
      expect(result.longBreakDuration).toBe(15);
    });
  });

  describe('validateClaudeResponse', () => {
    it('should validate a correct response', () => {
      const validResponse = {
        tasks: [
          {
            title: 'Set up project structure',
            estimatedPomodoros: 3,
          },
          {
            title: 'Implement user authentication',
            estimatedPomodoros: 5,
          },
        ],
      };

      expect(() => validateClaudeResponse(validResponse)).not.toThrow();
    });

    it('should reject response with no tasks', () => {
      const invalidResponse = {
        tasks: [],
      };

      expect(() => validateClaudeResponse(invalidResponse)).toThrow(
        'At least one task is required'
      );
    });

    it('should reject tasks with invalid pomodoro count', () => {
      const invalidResponse = {
        tasks: [
          {
            title: 'Valid task',
            estimatedPomodoros: 25, // Too high
          },
        ],
      };

      expect(() => validateClaudeResponse(invalidResponse)).toThrow(
        'Estimated pomodoros must be at most 20'
      );
    });

    it('should reject tasks with empty titles', () => {
      const invalidResponse = {
        tasks: [
          {
            title: '',
            estimatedPomodoros: 3,
          },
        ],
      };

      expect(() => validateClaudeResponse(invalidResponse)).toThrow(
        'Task title cannot be empty'
      );
    });

    it('should reject duplicate task titles', () => {
      const invalidResponse = {
        tasks: [
          {
            title: 'Same task',
            estimatedPomodoros: 3,
          },
          {
            title: 'Same Task', // Case-insensitive duplicate
            estimatedPomodoros: 3,
          },
        ],
      };

      expect(() => validateClaudeResponse(invalidResponse)).toThrow(
        'Task titles must be unique'
      );
    });

    it('should reject responses with too many total pomodoros', () => {
      const invalidResponse = {
        tasks: Array.from({ length: 10 }, (_, i) => ({
          title: `Task ${i + 1}`,
          estimatedPomodoros: 15, // 10 * 15 = 150, exceeds limit of 100
        })),
      };

      expect(() => validateClaudeResponse(invalidResponse)).toThrow(
        'Total estimated pomodoros cannot exceed 100'
      );
    });
  });

  describe('sanitizeTaskTitle', () => {
    it('should remove HTML tags', () => {
      const maliciousTitle = '<script>alert("xss")</script>Clean task';
      const result = sanitizeTaskTitle(maliciousTitle);
      expect(result).toBe('Clean task');
      expect(result).not.toContain('<script>');
    });

    it('should remove JavaScript protocols', () => {
      const maliciousTitle = 'javascript:alert("xss") Clean task';
      const result = sanitizeTaskTitle(maliciousTitle);
      expect(result).toBe('Clean task');
      expect(result).not.toContain('javascript:');
    });

    it('should enforce length limit', () => {
      const longTitle = 'x'.repeat(250);
      const result = sanitizeTaskTitle(longTitle);
      expect(result.length).toBe(200);
    });

    it('should preserve normal text', () => {
      const normalTitle = 'Implement user authentication';
      const result = sanitizeTaskTitle(normalTitle);
      expect(result).toBe(normalTitle);
    });
  });

  describe('sanitizeDescription', () => {
    it('should allow basic formatting tags', () => {
      const description = 'Build a <strong>todo app</strong> with <em>React</em>';
      const result = sanitizeDescription(description);
      expect(result).toContain('<strong>');
      expect(result).toContain('<em>');
    });

    it('should remove dangerous tags', () => {
      const maliciousDescription = 'Build app <script>alert("xss")</script>';
      const result = sanitizeDescription(maliciousDescription);
      expect(result).not.toContain('<script>');
      expect(result).toBe('Build app ');
    });

    it('should enforce length limit', () => {
      const longDescription = 'x'.repeat(6000);
      const result = sanitizeDescription(longDescription);
      expect(result.length).toBe(5000);
    });
  });

  describe('detectSuspiciousPatterns', () => {
    it('should detect script tags', () => {
      const maliciousText = 'Normal text <script>alert("xss")</script>';
      const patterns = detectSuspiciousPatterns(maliciousText);
      expect(patterns).toContain('Script tags');
    });

    it('should detect JavaScript protocols', () => {
      const maliciousText = 'Click here: javascript:alert("xss")';
      const patterns = detectSuspiciousPatterns(maliciousText);
      expect(patterns).toContain('JavaScript protocol');
    });

    it('should detect event handlers', () => {
      const maliciousText = 'Image: <img onerror="alert(1)" />';
      const patterns = detectSuspiciousPatterns(maliciousText);
      expect(patterns).toContain('Event handlers');
    });

    it('should return empty array for clean text', () => {
      const cleanText = 'Build a normal todo application';
      const patterns = detectSuspiciousPatterns(cleanText);
      expect(patterns).toEqual([]);
    });

    it('should detect multiple patterns', () => {
      const maliciousText = '<script>alert(1)</script><img onerror="alert(2)"/>';
      const patterns = detectSuspiciousPatterns(maliciousText);
      expect(patterns).toContain('Script tags');
      expect(patterns).toContain('Event handlers');
      expect(patterns.length).toBe(2);
    });
  });
});