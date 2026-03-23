import DOMPurify from 'dompurify';

// Configuration for DOMPurify to prevent XSS attacks
const SANITIZE_CONFIG = {
  ALLOWED_TAGS: [], // No HTML tags allowed in titles/text inputs
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true, // Keep text content, remove tags
};

// More permissive config for rich text (if needed in the future)
const RICH_TEXT_CONFIG = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

/**
 * Sanitizes user input to prevent XSS attacks
 * Removes all HTML tags and dangerous content while preserving text
 */
export function sanitizeUserInput(input: string): string {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Basic validation
  if (input.length === 0) {
    return '';
  }
  
  // Remove all HTML tags and dangerous content
  const sanitized = DOMPurify.sanitize(input.trim(), SANITIZE_CONFIG);
  
  // Additional validation for common XSS patterns
  const cleaned = sanitized
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ''); // Remove script tags as backup
  
  return cleaned.trim();
}

/**
 * Validates and sanitizes task/project titles
 * Enforces character limits and removes dangerous content
 */
export function sanitizeTitle(title: string): string {
  const sanitized = sanitizeUserInput(title);
  
  // Enforce character limit
  const maxLength = 200;
  return sanitized.length > maxLength ? sanitized.substring(0, maxLength).trim() : sanitized;
}

/**
 * Validates and sanitizes task descriptions
 */
export function sanitizeDescription(description: string): string {
  const sanitized = sanitizeUserInput(description);
  
  // Enforce character limit for descriptions
  const maxLength = 1000;
  return sanitized.length > maxLength ? sanitized.substring(0, maxLength).trim() : sanitized;
}

/**
 * Validates and sanitizes project names
 */
export function sanitizeProjectName(name: string): string {
  const sanitized = sanitizeUserInput(name);
  
  // Enforce character limit and additional validation for project names
  const maxLength = 100;
  const cleaned = sanitized.replace(/[<>:"\/\\|?*]/g, ''); // Remove filesystem-unsafe characters
  
  return cleaned.length > maxLength ? cleaned.substring(0, maxLength).trim() : cleaned;
}

/**
 * Sanitizes Claude AI responses before storage
 * More permissive but still secure
 */
export function sanitizeAIResponse(response: string): string {
  if (typeof response !== 'string') {
    return '';
  }
  
  // Use basic sanitization for AI responses (they shouldn't contain HTML anyway)
  const sanitized = DOMPurify.sanitize(response.trim(), SANITIZE_CONFIG);
  
  return sanitized.trim();
}

/**
 * Validation schema for task/project input
 */
export const INPUT_VALIDATION = {
  title: {
    maxLength: 200,
    minLength: 1,
    required: true,
    pattern: /^[^<>]*$/, // No angle brackets
  },
  description: {
    maxLength: 1000,
    minLength: 0,
    required: false,
  },
  projectName: {
    maxLength: 100,
    minLength: 1,
    required: true,
    pattern: /^[^<>:"\/\\|?*]*$/, // No dangerous characters
  },
} as const;

/**
 * Validates input against schema
 */
export function validateInput(input: string, field: keyof typeof INPUT_VALIDATION): {
  isValid: boolean;
  error?: string;
  sanitized: string;
} {
  const schema = INPUT_VALIDATION[field];
  const sanitized = sanitizeUserInput(input);
  
  if (schema.required && sanitized.length === 0) {
    return { isValid: false, error: 'This field is required', sanitized };
  }
  
  if (sanitized.length < schema.minLength) {
    return { isValid: false, error: `Minimum length is ${schema.minLength}`, sanitized };
  }
  
  if (sanitized.length > schema.maxLength) {
    return { isValid: false, error: `Maximum length is ${schema.maxLength}`, sanitized };
  }
  
  if (schema.pattern && !schema.pattern.test(sanitized)) {
    return { isValid: false, error: 'Invalid characters detected', sanitized };
  }
  
  return { isValid: true, sanitized };
}