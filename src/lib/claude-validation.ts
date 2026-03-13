import { z } from 'zod';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Server-side DOMPurify setup
const window = new JSDOM('').window;
const purify = DOMPurify(window);

// Input validation schema for Claude API requests
export const claudeRequestSchema = z.object({
  description: z
    .string()
    .min(1, 'Task description is required')
    .max(5000, 'Task description must be less than 5000 characters')
    .refine(
      (value) => value.trim().length > 0,
      'Task description cannot be empty or whitespace only'
    ),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  pomodoroDuration: z
    .number()
    .int('Pomodoro duration must be an integer')
    .min(5, 'Pomodoro duration must be at least 5 minutes')
    .max(60, 'Pomodoro duration must be at most 60 minutes')
    .default(25),
  shortBreakDuration: z
    .number()
    .int('Short break duration must be an integer')
    .min(1, 'Short break duration must be at least 1 minute')
    .max(30, 'Short break duration must be at most 30 minutes')
    .default(5),
  longBreakDuration: z
    .number()
    .int('Long break duration must be an integer')
    .min(5, 'Long break duration must be at least 5 minutes')
    .max(60, 'Long break duration must be at most 60 minutes')
    .default(15),
});

// Task validation schema for Claude API responses
export const taskSchema = z.object({
  title: z
    .string()
    .min(1, 'Task title cannot be empty')
    .max(200, 'Task title must be less than 200 characters')
    .refine(
      (value) => value.trim().length > 0,
      'Task title cannot be empty or whitespace only'
    )
    .refine(
      (value) => !/<script|javascript:|on\w+=/i.test(value),
      'Task title contains potentially dangerous content'
    ),
  estimatedPomodoros: z
    .number()
    .int('Estimated pomodoros must be an integer')
    .min(1, 'Estimated pomodoros must be at least 1')
    .max(20, 'Estimated pomodoros must be at most 20')
    .refine(
      (value) => Number.isFinite(value),
      'Estimated pomodoros must be a valid number'
    ),
});

// Response validation schema
export const claudeResponseSchema = z.object({
  tasks: z
    .array(taskSchema)
    .min(1, 'At least one task is required')
    .max(20, 'Too many tasks generated (maximum 20 allowed)')
    .refine(
      (tasks) => {
        const totalPomodoros = tasks.reduce((sum, task) => sum + task.estimatedPomodoros, 0);
        return totalPomodoros <= 100;
      },
      'Total estimated pomodoros cannot exceed 100'
    )
    .refine(
      (tasks) => {
        const uniqueTitles = new Set(tasks.map(t => t.title.toLowerCase().trim()));
        return uniqueTitles.size === tasks.length;
      },
      'Task titles must be unique'
    ),
});

// Types
export type ClaudeRequest = z.infer<typeof claudeRequestSchema>;
export type TaskBreakdown = z.infer<typeof claudeResponseSchema>;
export type Task = z.infer<typeof taskSchema>;

// Sanitization functions
export function sanitizeTaskTitle(title: string): string {
  // Remove HTML tags and dangerous characters
  const cleaned = purify.sanitize(title, { 
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [] // No attributes allowed
  });
  
  // Additional cleaning for potential XSS patterns
  return cleaned
    .replace(/<script[\s\S]*?<\/script>/gi, '') // Remove script tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 200); // Enforce length limit
}

export function sanitizeDescription(description: string): string {
  // For descriptions, we can be slightly more permissive but still safe
  const cleaned = purify.sanitize(description, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'], // Allow basic formatting
    ALLOWED_ATTR: [] // No attributes allowed
  });
  
  return cleaned.trim().substring(0, 5000); // Enforce length limit
}

// Validation utilities
export function validateClaudeRequest(data: unknown): ClaudeRequest {
  try {
    const validated = claudeRequestSchema.parse(data);
    
    // Sanitize the description
    validated.description = sanitizeDescription(validated.description);
    
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const firstError = error.errors[0];
      throw new Error(`Validation failed: ${firstError.message}`);
    }
    throw new Error('Invalid request data');
  }
}

export function validateClaudeResponse(data: unknown): TaskBreakdown {
  try {
    // First, ensure it's an object with the expected structure
    if (!data || typeof data !== 'object' || !('tasks' in data)) {
      throw new Error('Response must contain a tasks array');
    }
    
    const response = data as any;
    
    // Sanitize task titles before validation
    if (Array.isArray(response.tasks)) {
      response.tasks = response.tasks.map((task: any) => ({
        ...task,
        title: sanitizeTaskTitle(task.title || ''),
      }));
    }
    
    const validated = claudeResponseSchema.parse(response);
    
    return validated;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errors = error.errors.map(err => err.message).join(', ');
      throw new Error(`AI response validation failed: ${errors}`);
    }
    throw new Error('Invalid AI response format');
  }
}

// XSS pattern detection
export function detectSuspiciousPatterns(text: string): string[] {
  const patterns = [
    { pattern: /<script[\s\S]*?<\/script>/gi, name: 'Script tags' },
    { pattern: /javascript:/gi, name: 'JavaScript protocol' },
    { pattern: /on\w+\s*=/gi, name: 'Event handlers' },
    { pattern: /data:.*base64/gi, name: 'Base64 data URLs' },
    { pattern: /expression\s*\(/gi, name: 'CSS expressions' },
    { pattern: /@import/gi, name: 'CSS imports' },
    { pattern: /vbscript:/gi, name: 'VBScript protocol' },
  ];
  
  const found: string[] = [];
  
  for (const { pattern, name } of patterns) {
    if (pattern.test(text)) {
      found.push(name);
    }
  }
  
  return found;
}

// Logging utility for validation failures
export function logValidationFailure(
  type: 'request' | 'response',
  error: unknown,
  data?: unknown
) {
  const timestamp = new Date().toISOString();
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  console.warn(`[Claude Validation Failure] ${timestamp}`, {
    type,
    error: errorMessage,
    dataType: typeof data,
    hasData: !!data,
    // Only log first 100 chars of data for privacy
    dataSample: typeof data === 'string' ? data.substring(0, 100) : undefined,
  });
}