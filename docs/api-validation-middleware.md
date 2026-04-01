# API Validation Middleware

This document describes the centralized request validation middleware system implemented to standardize API request validation, authentication, rate limiting, and error handling across all API routes.

## Overview

The validation middleware provides a unified approach to:
- Request authentication and authorization
- Input validation and sanitization
- Rate limiting protection
- Consistent error responses
- Type-safe request handling

## Basic Usage

### Simple Route with Default Validation

```typescript
import { withValidation } from '@/lib/validation-middleware';
import type { ValidatedRequest } from '@/lib/validation-middleware';

async function handleRequest(
  request: NextRequest,
  validatedRequest: ValidatedRequest
): Promise<NextResponse> {
  // Your route logic here
  return NextResponse.json({ message: 'Success' });
}

export const POST = withValidation(handleRequest);
```

### Custom Validation Configuration

```typescript
import { withValidation, CommonSchemas } from '@/lib/validation-middleware';
import { z } from 'zod';

const CustomSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

export const POST = withValidation(handleRequest, {
  requireAuth: true,
  rateLimit: {
    requests: 5,
    windowMs: 60000, // 5 requests per minute
  },
  bodySchema: CustomSchema,
  maxBodySize: 10 * 1024, // 10KB
  sanitizeStrings: true,
});
```

## Configuration Options

### ValidationConfig Interface

```typescript
interface ValidationConfig {
  requireAuth?: boolean;          // Default: true
  rateLimit?: {
    requests: number;             // Default: 10
    windowMs: number;             // Default: 60000 (1 minute)
  };
  bodySchema?: z.ZodSchema;       // Default: z.any()
  querySchema?: z.ZodSchema;      // Default: z.any()
  maxBodySize?: number;           // Default: 10KB
  sanitizeStrings?: boolean;      // Default: true
  allowedMethods?: string[];      // Default: all standard methods
}
```

### Configuration Details

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `requireAuth` | boolean | `true` | Require Firebase authentication |
| `rateLimit.requests` | number | `10` | Max requests per window |
| `rateLimit.windowMs` | number | `60000` | Rate limit window in ms |
| `bodySchema` | ZodSchema | `z.any()` | Validation schema for request body |
| `querySchema` | ZodSchema | `z.any()` | Validation schema for query params |
| `maxBodySize` | number | `10240` | Maximum body size in bytes |
| `sanitizeStrings` | boolean | `true` | Automatically sanitize string inputs |
| `allowedMethods` | string[] | All standard | HTTP methods allowed |

## Common Schemas

The middleware provides pre-built schemas for common use cases:

### Pagination

```typescript
import { CommonSchemas } from '@/lib/validation-middleware';

export const GET = withValidation(handleGet, {
  querySchema: CommonSchemas.pagination,
});

// Validates: ?page=1&limit=10
// Provides: { page: 1, limit: 10 } with defaults
```

### Task Operations

```typescript
// Task creation
export const POST = withValidation(handleCreate, {
  bodySchema: CommonSchemas.taskCreate,
});

// Task updates
export const PATCH = withValidation(handleUpdate, {
  bodySchema: CommonSchemas.taskUpdate,
});
```

### Available Common Schemas

- `CommonSchemas.pagination` - Page and limit parameters
- `CommonSchemas.taskCreate` - Task creation validation
- `CommonSchemas.taskUpdate` - Task update validation
- `CommonSchemas.projectCreate` - Project creation validation
- `CommonSchemas.claudeBreakdown` - Claude AI breakdown request

## ValidatedRequest Interface

The middleware passes a `ValidatedRequest` object to your route handler:

```typescript
interface ValidatedRequest {
  user?: {
    uid: string;                  // Firebase user ID (if authenticated)
  };
  body?: any;                     // Validated and sanitized request body
  query?: any;                    // Validated and sanitized query params
  rateLimit: {
    remaining: number;            // Remaining requests in window
    resetTime: number;            // When rate limit resets (timestamp)
  };
}
```

## Error Handling

The middleware provides consistent error responses:

```typescript
// Authentication error
{
  "error": "Unauthorized",
  "details": "Authentication required"
}

// Rate limiting error
{
  "error": "Rate Limit Exceeded",
  "details": "Too many requests. Please try again later."
}

// Validation error
{
  "error": "Validation Error",
  "details": "Invalid request body: title: String must contain at least 1 character(s)"
}
```

### HTTP Status Codes

| Error Type | Status Code | Description |
|------------|-------------|-------------|
| Validation Error | 400 | Invalid request data |
| Unauthorized | 401 | Missing/invalid authentication |
| Method Not Allowed | 405 | HTTP method not allowed |
| Request Timeout | 408 | Request processing timeout |
| Payload Too Large | 413 | Request body exceeds size limit |
| Rate Limit Exceeded | 429 | Too many requests |
| Internal Server Error | 500 | Unexpected server error |

## Custom Error Responses

Create custom error responses using the helper function:

```typescript
import { createErrorResponse } from '@/lib/validation-middleware';

// In your route handler
if (someCondition) {
  return createErrorResponse(
    'Custom Error',
    'Something went wrong',
    422  // Unprocessable Entity
  );
}
```

## Authentication Integration

The middleware integrates with Firebase authentication:

```typescript
async function handleProtectedRoute(
  request: NextRequest,
  validatedRequest: ValidatedRequest
): Promise<NextResponse> {
  const userId = validatedRequest.user?.uid; // Always available when requireAuth: true
  
  // Your protected route logic
  return NextResponse.json({ userId });
}
```

## Rate Limiting

Rate limiting is automatically applied per user:

```typescript
// Different rate limits for different endpoints
export const POST = withValidation(handleCreate, {
  rateLimit: {
    requests: 5,     // 5 requests
    windowMs: 60000, // per minute
  },
});

export const GET = withValidation(handleRead, {
  rateLimit: {
    requests: 20,    // 20 requests
    windowMs: 60000, // per minute
  },
});
```

## Input Sanitization

String inputs are automatically sanitized to prevent XSS attacks:

```typescript
// Raw input: "<script>alert('xss')</script>Hello"
// Sanitized: "&lt;script&gt;alert('xss')&lt;/script&gt;Hello"

export const POST = withValidation(handler, {
  sanitizeStrings: true, // Default: true
});
```

## Migration Guide

### Before (Manual Validation)

```typescript
export async function POST(request: NextRequest) {
  // Authentication check
  const authResult = await validateAuth(request);
  if (!authResult.isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Rate limiting
  const rateLimitResult = checkRateLimit(authResult.uid!, 5, 60000);
  if (!rateLimitResult.allowed) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  // Body parsing and validation
  const body = await request.json();
  if (!body.title || typeof body.title !== 'string') {
    return NextResponse.json({ error: 'Invalid title' }, { status: 400 });
  }

  // Your route logic...
}
```

### After (With Middleware)

```typescript
import { withValidation } from '@/lib/validation-middleware';
import { z } from 'zod';

const Schema = z.object({
  title: z.string().min(1),
});

async function handlePost(request: NextRequest, validated: ValidatedRequest) {
  const { title } = validated.body;
  // Your route logic...
}

export const POST = withValidation(handlePost, {
  bodySchema: Schema,
  rateLimit: { requests: 5, windowMs: 60000 },
});
```

## Best Practices

### 1. Define Schemas Outside Route Handlers

```typescript
// Good: Reusable and performant
const UserCreateSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
});

export const POST = withValidation(handler, {
  bodySchema: UserCreateSchema,
});
```

### 2. Use Appropriate Rate Limits

```typescript
// Read operations - more permissive
export const GET = withValidation(handler, {
  rateLimit: { requests: 30, windowMs: 60000 },
});

// Write operations - more restrictive
export const POST = withValidation(handler, {
  rateLimit: { requests: 5, windowMs: 60000 },
});

// AI/External API calls - very restrictive
export const POST = withValidation(handler, {
  rateLimit: { requests: 2, windowMs: 60000 },
});
```

### 3. Set Appropriate Body Size Limits

```typescript
// Text-based requests
export const POST = withValidation(handler, {
  maxBodySize: 5 * 1024, // 5KB
});

// File upload endpoints
export const POST = withValidation(handler, {
  maxBodySize: 10 * 1024 * 1024, // 10MB
});
```

### 4. Handle Errors Gracefully

```typescript
async function handleRequest(request: NextRequest, validated: ValidatedRequest) {
  try {
    // Your logic here
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Handler error:', error);
    return createErrorResponse(
      'Processing Error',
      'Failed to process request',
      500
    );
  }
}
```

## Testing

### Unit Testing Route Handlers

```typescript
import { createRequest } from 'node-mocks-http';
import { POST } from '@/app/api/example/route';

describe('/api/example', () => {
  it('should validate and process request', async () => {
    const request = new NextRequest('http://localhost/api/example', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer valid-token',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Test User',
        email: 'test@example.com',
      }),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);
  });
});
```

## Performance Considerations

- Schemas are compiled once and reused
- Rate limiting uses in-memory storage (consider Redis for production)
- Input sanitization is applied selectively
- Validation short-circuits on first failure

## Security Features

- XSS protection through input sanitization
- SQL injection prevention (when using with database queries)
- Rate limiting per user
- Request size limits
- Method validation
- Authentication enforcement

## Future Enhancements

- Database integration for persistent rate limiting
- Role-based access control (RBAC)
- Request logging and analytics
- Custom validation hooks
- Caching integration