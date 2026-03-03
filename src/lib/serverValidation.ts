import { NextRequest } from 'next/server';

/**
 * Server-side input sanitization (no DOM available)
 * Removes HTML tags and dangerous characters
 */
export function sanitizeServerInput(input: string, maxLength: number = 1000): string {
  if (!input || typeof input !== 'string') {
    return '';
  }
  
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove potentially dangerous characters
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
}

/**
 * Validates request body size to prevent DoS attacks
 */
export function validateRequestSize(body: string, maxSizeBytes: number = 50000): boolean {
  return Buffer.byteLength(body, 'utf8') <= maxSizeBytes;
}

/**
 * Rate limiting helper - tracks requests per IP
 */
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  request: NextRequest, 
  maxRequests: number = 100, 
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): boolean {
  const ip = request.ip || 'unknown';
  const now = Date.now();
  
  const current = requestCounts.get(ip);
  
  if (!current || now > current.resetTime) {
    // First request or window expired
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false; // Rate limit exceeded
  }
  
  current.count++;
  return true;
}

/**
 * Validates and sanitizes Claude API request body
 */
export interface ClaudeAPIRequest {
  description: string;
  startDate?: string;
  endDate?: string;
  pomodoroDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
}

export function validateClaudeRequest(body: any): { 
  isValid: boolean; 
  error?: string; 
  data?: ClaudeAPIRequest 
} {
  if (!body || typeof body !== 'object') {
    return { isValid: false, error: 'Invalid request body' };
  }
  
  // Required field validation
  if (!body.description || typeof body.description !== 'string') {
    return { isValid: false, error: 'Description is required and must be a string' };
  }
  
  if (typeof body.pomodoroDuration !== 'number' || body.pomodoroDuration <= 0) {
    return { isValid: false, error: 'Pomodoro duration must be a positive number' };
  }
  
  if (typeof body.shortBreakDuration !== 'number' || body.shortBreakDuration <= 0) {
    return { isValid: false, error: 'Short break duration must be a positive number' };
  }
  
  if (typeof body.longBreakDuration !== 'number' || body.longBreakDuration <= 0) {
    return { isValid: false, error: 'Long break duration must be a positive number' };
  }
  
  // Sanitize and validate description length
  const sanitizedDescription = sanitizeServerInput(body.description, 2000);
  if (!sanitizedDescription) {
    return { isValid: false, error: 'Description cannot be empty after sanitization' };
  }
  
  if (sanitizedDescription.length > 2000) {
    return { isValid: false, error: 'Description too long (max 2000 characters)' };
  }
  
  // Validate date formats if provided
  const data: ClaudeAPIRequest = {
    description: sanitizedDescription,
    pomodoroDuration: body.pomodoroDuration,
    shortBreakDuration: body.shortBreakDuration,
    longBreakDuration: body.longBreakDuration,
  };
  
  if (body.startDate) {
    if (typeof body.startDate !== 'string') {
      return { isValid: false, error: 'Start date must be a string' };
    }
    const startDate = new Date(body.startDate);
    if (isNaN(startDate.getTime())) {
      return { isValid: false, error: 'Invalid start date format' };
    }
    data.startDate = startDate.toISOString();
  }
  
  if (body.endDate) {
    if (typeof body.endDate !== 'string') {
      return { isValid: false, error: 'End date must be a string' };
    }
    const endDate = new Date(body.endDate);
    if (isNaN(endDate.getTime())) {
      return { isValid: false, error: 'Invalid end date format' };
    }
    data.endDate = endDate.toISOString();
  }
  
  // Validate duration limits (reasonable bounds)
  if (data.pomodoroDuration > 180 || data.pomodoroDuration < 1) {
    return { isValid: false, error: 'Pomodoro duration must be between 1 and 180 minutes' };
  }
  
  if (data.shortBreakDuration > 60 || data.shortBreakDuration < 1) {
    return { isValid: false, error: 'Short break duration must be between 1 and 60 minutes' };
  }
  
  if (data.longBreakDuration > 120 || data.longBreakDuration < 1) {
    return { isValid: false, error: 'Long break duration must be between 1 and 120 minutes' };
  }
  
  return { isValid: true, data };
}

/**
 * Security headers for API responses
 */
export function getSecurityHeaders() {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
  };
}