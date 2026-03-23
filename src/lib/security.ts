/**
 * Security utilities for input sanitization and XSS protection
 * Handles both server-side and client-side sanitization
 */

import DOMPurify from 'dompurify';

// Server-side input sanitization patterns
const MALICIOUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /vbscript:/gi,
  /on\w+\s*=/gi,
  /<iframe\b[^>]*>/gi,
  /<object\b[^>]*>/gi,
  /<embed\b[^>]*>/gi,
  /<form\b[^>]*>/gi,
  /<input\b[^>]*>/gi,
  /data:text\/html/gi,
  /expression\s*\(/gi,
  /eval\s*\(/gi,
];

const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
} as const;

/**
 * Server-side input sanitization - removes potentially malicious content
 */
export function sanitizeServerInput(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }

  let sanitized = input.trim();

  // Remove malicious patterns
  MALICIOUS_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Escape HTML entities
  sanitized = sanitized.replace(
    /[&<>"'\/]/g,
    (match) => HTML_ENTITIES[match as keyof typeof HTML_ENTITIES]
  );

  return sanitized;
}

/**
 * Validates input length and content on server
 */
export function validateServerInput(
  input: string,
  maxLength: number = 2000
): {
  isValid: boolean;
  error?: string;
} {
  if (typeof input !== 'string') {
    return { isValid: false, error: 'Input must be a string' };
  }

  if (input.length === 0) {
    return { isValid: false, error: 'Input cannot be empty' };
  }

  if (input.length > maxLength) {
    return {
      isValid: false,
      error: `Input must be less than ${maxLength} characters`,
    };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /<script/i,
    /javascript:/i,
    /vbscript:/i,
    /on\w+=/i,
    /data:text\/html/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(input)) {
      return {
        isValid: false,
        error: 'Input contains potentially malicious content',
      };
    }
  }

  return { isValid: true };
}

/**
 * Client-side HTML sanitization using DOMPurify
 * Configures DOMPurify for safe task title rendering
 */
export function sanitizeTaskTitle(title: string): string {
  if (typeof title !== 'string') {
    return '';
  }

  // Configure DOMPurify to be very restrictive
  const config = {
    ALLOWED_TAGS: [], // No HTML tags allowed in task titles
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true, // Keep text content, remove tags
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SANITIZE_DOM: true,
    FORCE_BODY: false,
  };

  return DOMPurify.sanitize(title, config);
}

/**
 * Client-side HTML sanitization for rich content (if needed in future)
 * More permissive than task titles but still secure
 */
export function sanitizeRichContent(content: string): string {
  if (typeof content !== 'string') {
    return '';
  }

  const config = {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
    ALLOW_DATA_ATTR: false,
    ALLOW_UNKNOWN_PROTOCOLS: false,
    SANITIZE_DOM: true,
    FORCE_BODY: false,
  };

  return DOMPurify.sanitize(content, config);
}

/**
 * Validates AI response structure and sanitizes content with comprehensive error handling
 */
export function sanitizeAIResponse(response: any): {
  isValid: boolean;
  sanitizedData?: {
    tasks: Array<{ title: string; estimatedPomodoros: number }>;
  };
  error?: string;
} {
  try {
    // Basic structure validation
    if (!response || typeof response !== 'object') {
      return { isValid: false, error: 'AI response must be a valid JSON object' };
    }

    if (!response.tasks || !Array.isArray(response.tasks)) {
      return { isValid: false, error: 'AI response must contain a "tasks" array' };
    }

<<<<<<< HEAD
    if (response.tasks.length === 0) {
      return { isValid: false, error: 'AI response must contain at least one task' };
    }

    if (response.tasks.length > 50) {
      return { isValid: false, error: 'AI response contains too many tasks (maximum 50 allowed)' };
    }

    // Enhanced task validation with better error handling
    const sanitizedTasks: Array<{ title: string; estimatedPomodoros: number }> = [];
    const validationErrors: string[] = [];

    for (let i = 0; i < response.tasks.length; i++) {
      const task = response.tasks[i];
      const taskIndex = i + 1;

      // Validate task object structure
      if (!task || typeof task !== 'object') {
        validationErrors.push(`Task ${taskIndex}: Must be a valid object`);
        continue;
      }

      // Validate title field
      if (task.title === undefined || task.title === null) {
        validationErrors.push(`Task ${taskIndex}: Missing required "title" field`);
        continue;
      }

      if (typeof task.title !== 'string') {
        validationErrors.push(`Task ${taskIndex}: Title must be a string (got ${typeof task.title})`);
        continue;
      }

      // Check for empty/whitespace-only titles before sanitization
      const trimmedTitle = task.title.trim();
      if (trimmedTitle.length === 0) {
        validationErrors.push(`Task ${taskIndex}: Title cannot be empty or contain only whitespace`);
        continue;
      }

      if (trimmedTitle.length > 500) {
        validationErrors.push(`Task ${taskIndex}: Title too long (${trimmedTitle.length} chars, maximum 500)`);
        continue;
      }

      // Validate estimatedPomodoros field
      if (task.estimatedPomodoros === undefined || task.estimatedPomodoros === null) {
        validationErrors.push(`Task ${taskIndex}: Missing required "estimatedPomodoros" field`);
        continue;
      }

      if (typeof task.estimatedPomodoros !== 'number') {
        validationErrors.push(`Task ${taskIndex}: estimatedPomodoros must be a number (got ${typeof task.estimatedPomodoros})`);
        continue;
      }

      // Enhanced numeric validation - check for NaN, infinity, and reasonable ranges
      if (Number.isNaN(task.estimatedPomodoros)) {
        validationErrors.push(`Task ${taskIndex}: estimatedPomodoros cannot be NaN`);
        continue;
      }

      if (!Number.isFinite(task.estimatedPomodoros)) {
        validationErrors.push(`Task ${taskIndex}: estimatedPomodoros must be a finite number`);
        continue;
      }

      if (task.estimatedPomodoros < 1) {
        validationErrors.push(`Task ${taskIndex}: estimatedPomodoros must be at least 1 (got ${task.estimatedPomodoros})`);
        continue;
      }

      if (task.estimatedPomodoros > 20) {
        validationErrors.push(`Task ${taskIndex}: estimatedPomodoros cannot exceed 20 (got ${task.estimatedPomodoros})`);
        continue;
      }

      if (!Number.isInteger(task.estimatedPomodoros)) {
        // Auto-round to nearest integer with warning in logs
        console.warn(`Task ${taskIndex}: Rounding estimatedPomodoros from ${task.estimatedPomodoros} to ${Math.round(task.estimatedPomodoros)}`);
      }

      // Sanitize task title
      const sanitizedTitle = sanitizeTaskTitle(trimmedTitle);
      
      if (sanitizedTitle.length === 0) {
        validationErrors.push(`Task ${taskIndex}: Title is empty after security sanitization`);
        continue;
      }

      if (sanitizedTitle.length > 200) {
        validationErrors.push(`Task ${taskIndex}: Title too long after sanitization (${sanitizedTitle.length} chars, maximum 200)`);
        continue;
      }

      // Task passed all validation - add to sanitized results
      sanitizedTasks.push({
        title: sanitizedTitle,
        estimatedPomodoros: Math.round(task.estimatedPomodoros), // Ensure integer
      });
    }

    // Check if we have any valid tasks after validation
    if (sanitizedTasks.length === 0) {
      const errorSummary = validationErrors.length > 0 
        ? `All tasks failed validation: ${validationErrors.slice(0, 3).join('; ')}${validationErrors.length > 3 ? '...' : ''}`
        : 'No valid tasks found after validation';
      return { isValid: false, error: errorSummary };
    }

    // If some tasks failed but we have valid ones, log warnings but continue
    if (validationErrors.length > 0) {
      console.warn(`AI Response Validation: ${validationErrors.length} tasks failed validation:`, validationErrors);
=======
    if (
      typeof task.estimatedPomodoros !== 'number' ||
      task.estimatedPomodoros < 1 ||
      task.estimatedPomodoros > 100
    ) {
      throw new Error(
        `Task at index ${index} must have valid estimatedPomodoros (1-100)`
      );
    }

    // Sanitize task title
    const sanitizedTitle = sanitizeTaskTitle(task.title);

    if (sanitizedTitle.length === 0) {
      throw new Error(
        `Task at index ${index} title is empty after sanitization`
      );
    }

    if (sanitizedTitle.length > 200) {
      throw new Error(
        `Task at index ${index} title is too long (max 200 characters)`
      );
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)
    }

    return {
      isValid: true,
      sanitizedData: { tasks: sanitizedTasks },
    };

  } catch (error) {
    // Catch any unexpected errors during validation
    console.error('Unexpected error during AI response validation:', error);
    return { 
      isValid: false, 
      error: 'Unexpected error during response validation. Please try again.' 
    };
  }
}

/**
 * CSP-compliant inline style sanitization (if needed)
 */
export function sanitizeInlineStyles(styles: string): string {
  if (typeof styles !== 'string') {
    return '';
  }

  // Remove any potentially dangerous CSS properties
  const dangerousProperties = [
    'expression',
    'javascript:',
    'vbscript:',
    'data:',
    'import',
    '@import',
    'behavior',
    '-moz-binding',
  ];

  let sanitized = styles;
  dangerousProperties.forEach((prop) => {
    const regex = new RegExp(prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    sanitized = sanitized.replace(regex, '');
  });

  return sanitized;
}

/**
 * Rate limiting helper for additional security
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkClientRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
} {
  const now = Date.now();
  const windowStart = now - windowMs;

  let entry = requestCounts.get(identifier);

  if (!entry || entry.resetTime < windowStart) {
    entry = { count: 0, resetTime: now + windowMs };
    requestCounts.set(identifier, entry);
  }

  if (entry.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Clean up old rate limit entries
 */
export function cleanupRateLimit(): void {
  const now = Date.now();
  for (const [key, entry] of requestCounts.entries()) {
    if (entry.resetTime < now) {
      requestCounts.delete(key);
    }
  }
}

// Clean up rate limit entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupRateLimit, 5 * 60 * 1000);
}
