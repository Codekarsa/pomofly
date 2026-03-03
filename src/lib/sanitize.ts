import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks
 * Uses DOMPurify to clean potentially dangerous HTML/JS content
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined') {
    // Server-side: return plain text only
    return dirty.replace(/<[^>]*>/g, '');
  }
  
  // Client-side: use DOMPurify for comprehensive sanitization
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'title'],
    ALLOW_DATA_ATTR: false,
    FORBID_SCRIPTS: true,
    FORBID_TAGS: ['script', 'object', 'embed', 'form', 'input'],
    SAFE_FOR_JQUERY: true
  });
}

/**
 * Sanitizes plain text input by removing HTML tags and limiting length
 * Use for user inputs like task titles, project names, etc.
 */
export function sanitizeText(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  // Remove HTML tags
  const noHtml = input.replace(/<[^>]*>/g, '');
  
  // Remove potentially dangerous characters
  const cleaned = noHtml
    .replace(/[<>'"&]/g, (char) => {
      const entityMap: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      };
      return entityMap[char] || char;
    })
    // Remove control characters except newlines and tabs
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Limit length
    .slice(0, maxLength)
    .trim();
  
  return cleaned;
}

/**
 * Validates and sanitizes URL inputs
 * Ensures URLs are safe and follow expected patterns
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') {
    return '';
  }
  
  try {
    const parsed = new URL(url);
    
    // Only allow HTTP(S) protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    
    // Return the sanitized URL
    return parsed.toString();
  } catch {
    // Invalid URL
    return '';
  }
}

/**
 * Sanitizes user input for search queries
 * Removes dangerous characters while preserving search functionality
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query || typeof query !== 'string') {
    return '';
  }
  
  return query
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"]/g, '') // Remove dangerous characters
    .slice(0, 200) // Limit length
    .trim();
}

/**
 * Input validation schema for common fields
 */
export const ValidationRules = {
  taskTitle: {
    maxLength: 200,
    required: true,
  },
  projectName: {
    maxLength: 100,
    required: true,
  },
  description: {
    maxLength: 2000,
    required: false,
  },
  searchQuery: {
    maxLength: 200,
    required: false,
  },
} as const;

/**
 * Validates input according to predefined rules
 */
export function validateInput(
  value: string, 
  field: keyof typeof ValidationRules
): { isValid: boolean; error?: string; sanitized: string } {
  const rules = ValidationRules[field];
  const sanitized = sanitizeText(value, rules.maxLength);
  
  if (rules.required && !sanitized) {
    return {
      isValid: false,
      error: `${field} is required`,
      sanitized: ''
    };
  }
  
  if (sanitized.length > rules.maxLength) {
    return {
      isValid: false,
      error: `${field} must be less than ${rules.maxLength} characters`,
      sanitized
    };
  }
  
  return {
    isValid: true,
    sanitized
  };
}