import { NextRequest, NextResponse } from 'next/server';
import { withValidation, CommonSchemas } from '@/lib/validation-middleware';
import { z } from 'zod';
import type { ValidatedRequest } from '@/lib/validation-middleware';

/**
 * Example API route demonstrating centralized validation middleware usage
 */

// Define custom schema for this endpoint
const ExampleRequestSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  age: z.number().int().min(1).max(120).optional(),
  preferences: z.object({
    newsletter: z.boolean().default(false),
    notifications: z.boolean().default(true),
  }).optional(),
});

// Example GET handler with query validation
async function handleGet(
  request: NextRequest,
  validatedRequest: ValidatedRequest
): Promise<NextResponse> {
  const { page, limit } = validatedRequest.query;
  
  // Simulate fetching data with pagination
  const mockData = {
    message: 'Data retrieved successfully',
    user: validatedRequest.user,
    pagination: {
      page,
      limit,
      total: 100,
    },
    rateLimitInfo: {
      remaining: validatedRequest.rateLimit.remaining,
      resetTime: validatedRequest.rateLimit.resetTime,
    },
  };
  
  return NextResponse.json(mockData);
}

// Example POST handler with body validation
async function handlePost(
  request: NextRequest,
  validatedRequest: ValidatedRequest
): Promise<NextResponse> {
  const { name, email, age, preferences } = validatedRequest.body;
  
  // Simulate creating a resource
  const mockResponse = {
    message: 'Resource created successfully',
    data: {
      id: 'generated-id-123',
      name,
      email,
      age,
      preferences: preferences || { newsletter: false, notifications: true },
      userId: validatedRequest.user?.uid,
      createdAt: new Date().toISOString(),
    },
    rateLimitInfo: {
      remaining: validatedRequest.rateLimit.remaining,
      resetTime: validatedRequest.rateLimit.resetTime,
    },
  };
  
  return NextResponse.json(mockResponse, { status: 201 });
}

/**
 * Export handlers with different validation configurations
 */

// GET with authentication, rate limiting, and query validation
export const GET = withValidation(handleGet, {
  requireAuth: true,
  rateLimit: {
    requests: 20,
    windowMs: 60000, // 20 requests per minute
  },
  querySchema: CommonSchemas.pagination,
  allowedMethods: ['GET'],
});

// POST with authentication, stricter rate limiting, and custom body validation
export const POST = withValidation(handlePost, {
  requireAuth: true,
  rateLimit: {
    requests: 10,
    windowMs: 60000, // 10 requests per minute
  },
  bodySchema: ExampleRequestSchema,
  allowedMethods: ['POST'],
  maxBodySize: 2 * 1024, // 2KB
  sanitizeStrings: true,
});

// OPTIONS handler for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}