import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAuth, checkRateLimit } from '@/lib/auth-middleware';
import { validateServerInput, sanitizeServerInput } from '@/lib/security';

/**
 * Standard API error response interface
 */
export interface ApiError {
  error: string;
  details?: string;
  code?: string;
}

/**
 * Validation result for middleware chain
 */
export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  response?: NextResponse;
}

/**
 * Request validation configuration
 */
export interface ValidationConfig {
  requireAuth?: boolean;
  rateLimit?: {
    requests: number;
    windowMs: number;
  };
  bodySchema?: z.ZodSchema;
  querySchema?: z.ZodSchema;
  maxBodySize?: number;
  sanitizeStrings?: boolean;
  allowedMethods?: string[];
}

/**
 * Default validation configuration
 */
const DEFAULT_CONFIG: Required<ValidationConfig> = {
  requireAuth: true,
  rateLimit: {
    requests: 10,
    windowMs: 60000, // 1 minute
  },
  bodySchema: z.any(),
  querySchema: z.any(),
  maxBodySize: 10 * 1024, // 10KB
  sanitizeStrings: true,
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
};

/**
 * Validated request context passed to route handlers
 */
export interface ValidatedRequest {
  user?: {
    uid: string;
  };
  body?: any;
  query?: any;
  rateLimit: {
    remaining: number;
    resetTime: number;
  };
}

/**
 * Creates an error response with consistent format
 */
export function createErrorResponse(
  error: string,
  details?: string,
  statusCode: number = 400,
  headers?: Record<string, string>
): NextResponse {
  const errorResponse: ApiError = {
    error,
    details,
  };

  return NextResponse.json(errorResponse, {
    status: statusCode,
    headers,
  });
}

/**
 * Recursively sanitizes string values in an object
 */
function sanitizeObjectStrings(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeServerInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectStrings);
  }
  
  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObjectStrings(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validates request method against allowed methods
 */
function validateMethod(request: NextRequest, allowedMethods: string[]): ValidationResult {
  if (!allowedMethods.includes(request.method)) {
    return {
      success: false,
      response: createErrorResponse(
        'Method Not Allowed',
        `Method ${request.method} is not allowed for this endpoint`,
        405,
        { Allow: allowedMethods.join(', ') }
      ),
    };
  }
  
  return { success: true };
}

/**
 * Validates and parses request body
 */
async function validateBody(
  request: NextRequest,
  schema: z.ZodSchema,
  maxSize: number,
  sanitize: boolean
): Promise<ValidationResult> {
  let body: any;
  
  // Check if request has body
  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > maxSize) {
    return {
      success: false,
      response: createErrorResponse(
        'Payload Too Large',
        `Request body exceeds maximum size of ${maxSize} bytes`,
        413
      ),
    };
  }
  
  try {
    const text = await request.text();
    
    if (text.length > maxSize) {
      return {
        success: false,
        response: createErrorResponse(
          'Payload Too Large',
          `Request body exceeds maximum size of ${maxSize} bytes`,
          413
        ),
      };
    }
    
    if (text.trim()) {
      try {
        body = JSON.parse(text);
      } catch (parseError) {
        return {
          success: false,
          response: createErrorResponse(
            'Invalid JSON',
            'Request body must be valid JSON',
            400
          ),
        };
      }
    } else {
      body = {};
    }
  } catch (error) {
    return {
      success: false,
      response: createErrorResponse(
        'Failed to Read Body',
        'Unable to read request body',
        400
      ),
    };
  }
  
  // Sanitize strings if enabled
  if (sanitize && body) {
    try {
      body = sanitizeObjectStrings(body);
    } catch (sanitizeError) {
      return {
        success: false,
        response: createErrorResponse(
          'Invalid Input',
          'Request contains potentially malicious content',
          400
        ),
      };
    }
  }
  
  // Validate against schema
  try {
    const validatedBody = schema.parse(body);
    return {
      success: true,
      data: validatedBody,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      
      return {
        success: false,
        response: createErrorResponse(
          'Validation Error',
          `Invalid request body: ${errorMessages}`,
          400
        ),
      };
    }
    
    return {
      success: false,
      response: createErrorResponse(
        'Validation Error',
        'Request body validation failed',
        400
      ),
    };
  }
}

/**
 * Validates query parameters
 */
function validateQuery(
  request: NextRequest,
  schema: z.ZodSchema,
  sanitize: boolean
): ValidationResult {
  const url = new URL(request.url);
  let queryParams: any = {};
  
  // Convert URLSearchParams to object
  for (const [key, value] of url.searchParams.entries()) {
    queryParams[key] = value;
  }
  
  // Sanitize query parameters if enabled
  if (sanitize && Object.keys(queryParams).length > 0) {
    try {
      queryParams = sanitizeObjectStrings(queryParams);
    } catch (sanitizeError) {
      return {
        success: false,
        response: createErrorResponse(
          'Invalid Query Parameters',
          'Query parameters contain potentially malicious content',
          400
        ),
      };
    }
  }
  
  // Validate against schema
  try {
    const validatedQuery = schema.parse(queryParams);
    return {
      success: true,
      data: validatedQuery,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessages = error.errors.map(err => 
        `${err.path.join('.')}: ${err.message}`
      ).join(', ');
      
      return {
        success: false,
        response: createErrorResponse(
          'Validation Error',
          `Invalid query parameters: ${errorMessages}`,
          400
        ),
      };
    }
    
    return {
      success: false,
      response: createErrorResponse(
        'Validation Error',
        'Query parameter validation failed',
        400
      ),
    };
  }
}

/**
 * Main validation middleware function
 */
export async function validateRequest(
  request: NextRequest,
  config: Partial<ValidationConfig> = {}
): Promise<ValidationResult<ValidatedRequest>> {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  const validatedRequest: ValidatedRequest = {
    rateLimit: { remaining: 0, resetTime: 0 }
  };
  
  try {
    // 1. Validate HTTP method
    const methodResult = validateMethod(request, fullConfig.allowedMethods);
    if (!methodResult.success) {
      return methodResult;
    }
    
    // 2. Authentication validation
    if (fullConfig.requireAuth) {
      const authResult = await validateAuth(request);
      if (!authResult.isAuthenticated) {
        return {
          success: false,
          response: createErrorResponse(
            'Unauthorized',
            authResult.error || 'Authentication required',
            401
          ),
        };
      }
      
      validatedRequest.user = { uid: authResult.uid! };
      
      // 3. Rate limiting (only for authenticated requests)
      const rateLimitResult = checkRateLimit(
        authResult.uid!,
        fullConfig.rateLimit.requests,
        fullConfig.rateLimit.windowMs
      );
      
      if (!rateLimitResult.allowed) {
        const retryAfter = Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000);
        return {
          success: false,
          response: createErrorResponse(
            'Rate Limit Exceeded',
            'Too many requests. Please try again later.',
            429,
            {
              'Retry-After': retryAfter.toString(),
              'X-RateLimit-Limit': fullConfig.rateLimit.requests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': rateLimitResult.resetTime.toString(),
            }
          ),
        };
      }
      
      validatedRequest.rateLimit = {
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime,
      };
    }
    
    // 4. Body validation (for methods that typically have bodies)
    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const bodyResult = await validateBody(
        request,
        fullConfig.bodySchema,
        fullConfig.maxBodySize,
        fullConfig.sanitizeStrings
      );
      
      if (!bodyResult.success) {
        return bodyResult;
      }
      
      validatedRequest.body = bodyResult.data;
    }
    
    // 5. Query parameter validation
    const queryResult = validateQuery(
      request,
      fullConfig.querySchema,
      fullConfig.sanitizeStrings
    );
    
    if (!queryResult.success) {
      return queryResult;
    }
    
    validatedRequest.query = queryResult.data;
    
    return {
      success: true,
      data: validatedRequest,
    };
    
  } catch (error) {
    console.error('Validation middleware error:', error);
    return {
      success: false,
      response: createErrorResponse(
        'Internal Server Error',
        'Request validation failed',
        500
      ),
    };
  }
}

/**
 * Higher-order function to wrap route handlers with validation
 */
export function withValidation<T = any>(
  handler: (request: NextRequest, validatedRequest: ValidatedRequest) => Promise<NextResponse>,
  config: Partial<ValidationConfig> = {}
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const validationResult = await validateRequest(request, config);
    
    if (!validationResult.success) {
      return validationResult.response!;
    }
    
    try {
      return await handler(request, validationResult.data!);
    } catch (error) {
      console.error('Route handler error:', error);
      return createErrorResponse(
        'Internal Server Error',
        'An unexpected error occurred',
        500
      );
    }
  };
}

/**
 * Common validation schemas for reuse
 */
export const CommonSchemas = {
  /**
   * Schema for pagination parameters
   */
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
  }),
  
  /**
   * Schema for task creation
   */
  taskCreate: z.object({
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    projectId: z.string().min(1).optional(),
    estimatedPomodoros: z.number().int().min(1).max(100),
    deadline: z.string().datetime().optional(),
  }),
  
  /**
   * Schema for task updates
   */
  taskUpdate: z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
    completed: z.boolean().optional(),
    estimatedPomodoros: z.number().int().min(1).max(100).optional(),
    deadline: z.string().datetime().nullable().optional(),
  }),
  
  /**
   * Schema for project creation
   */
  projectCreate: z.object({
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional(),
  }),
  
  /**
   * Schema for Claude breakdown request
   */
  claudeBreakdown: z.object({
    description: z.string().min(1).max(2000),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    pomodoroDuration: z.number().int().min(1).max(120).default(25),
    shortBreakDuration: z.number().int().min(1).max(60).default(5),
    longBreakDuration: z.number().int().min(1).max(120).default(15),
  }),
};