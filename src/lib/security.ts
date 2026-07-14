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
  MALICIOUS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // Escape HTML entities
  sanitized = sanitized.replace(/[&<>"'\/]/g, (match) => 
    HTML_ENTITIES[match as keyof typeof HTML_ENTITIES]
  );

  return sanitized;
}

/**
 * Validates input length and content on server
 */
export function validateServerInput(input: string, maxLength: number = 2000): {
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
    return { isValid: false, error: `Input must be less than ${maxLength} characters` };
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
      return { isValid: false, error: 'Input contains potentially malicious content' };
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
 * Validates AI response structure and sanitizes content
 */
export function sanitizeAIResponse(response: unknown): {
  isValid: boolean;
  sanitizedData?: { tasks: Array<{ title: string; estimatedPomodoros: number }> };
  error?: string;
} {
  if (!response || typeof response !== 'object') {
    return { isValid: false, error: 'Invalid response structure' };
  }

  const tasks = (response as Record<string, unknown>).tasks;

  if (!tasks || !Array.isArray(tasks)) {
    return { isValid: false, error: 'Response must contain tasks array' };
  }

  if (tasks.length === 0) {
    return { isValid: false, error: 'Response must contain at least one task' };
  }

  if (tasks.length > 50) {
    return { isValid: false, error: 'Too many tasks in response (max 50)' };
  }

  const sanitizedTasks = tasks.map((task: unknown, index: number) => {
    // Validate task structure
    if (!task || typeof task !== 'object') {
      throw new Error(`Task at index ${index} is not a valid object`);
    }

    const { title, estimatedPomodoros } = task as Record<string, unknown>;

    if (typeof title !== 'string') {
      throw new Error(`Task at index ${index} must have a string title`);
    }

    if (typeof estimatedPomodoros !== 'number' || estimatedPomodoros < 1 || estimatedPomodoros > 100) {
      throw new Error(`Task at index ${index} must have valid estimatedPomodoros (1-100)`);
    }

    // Sanitize task title
    const sanitizedTitle = sanitizeTaskTitle(title);

    if (sanitizedTitle.length === 0) {
      throw new Error(`Task at index ${index} title is empty after sanitization`);
    }

    if (sanitizedTitle.length > 200) {
      throw new Error(`Task at index ${index} title is too long (max 200 characters)`);
    }

    return {
      title: sanitizedTitle,
      estimatedPomodoros: Math.floor(estimatedPomodoros), // Ensure integer
    };
  });

  return {
    isValid: true,
    sanitizedData: { tasks: sanitizedTasks },
  };
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
  dangerousProperties.forEach(prop => {
    const regex = new RegExp(prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    sanitized = sanitized.replace(regex, '');
  });

  return sanitized;
}

/**
 * Rate limiting helper for additional security
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkClientRateLimit(identifier: string, maxRequests: number, windowMs: number): {
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
  requestCounts.forEach((entry, key) => {
    if (entry.resetTime < now) {
      requestCounts.delete(key);
    }
  });
}

// Clean up rate limit entries every 5 minutes
if (typeof window !== 'undefined') {
  setInterval(cleanupRateLimit, 5 * 60 * 1000);
}