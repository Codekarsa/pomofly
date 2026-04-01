import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { withValidation, CommonSchemas, createErrorResponse } from '@/lib/validation-middleware';
import { sanitizeAIResponse } from '@/lib/security';
import type { ValidatedRequest } from '@/lib/validation-middleware';

interface TaskBreakdown {
  tasks: {
    title: string;
    estimatedPomodoros: number;
  }[];
}

// Request timeout configuration (30 seconds)
const REQUEST_TIMEOUT_MS = 30000;

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TimeoutError';
  }
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new TimeoutError(`Request timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * Main route handler with centralized validation
 */
async function handleClaudeBreakdown(
  request: NextRequest,
  validatedRequest: ValidatedRequest
): Promise<NextResponse> {
  const {
    description,
    startDate,
    endDate,
    pomodoroDuration,
    shortBreakDuration,
    longBreakDuration,
  } = validatedRequest.body;

  // Check API configuration
  const apiKey = process.env.CLAUDE_API_KEY;
  const claudeModel = process.env.CLAUDE_MODEL;
  
  if (!apiKey) {
    return createErrorResponse(
      'Configuration Error',
      'Claude API is not properly configured',
      503
    );
  }

  if (!claudeModel) {
    return createErrorResponse(
      'Configuration Error',
      'Claude model is not configured',
      503
    );
  }

  try {
    const anthropic = new Anthropic({
      apiKey: apiKey,
      timeout: REQUEST_TIMEOUT_MS,
    });

    console.log('Sending request to Claude API with body:', {
      description,
      startDate: startDate || 'Not specified',
      endDate: endDate || 'Not specified',
      pomodoroDuration,
      shortBreakDuration,
      longBreakDuration,
    });

    const prompt = `Given the following task description and time constraints, please break it down into subtasks with estimated Pomodoro sessions (${pomodoroDuration}-minute work intervals) for each:

Task Description: ${description}
Start Date: ${startDate || 'Not specified'}
End Date: ${endDate || 'Not specified'}
Pomodoro Duration: ${pomodoroDuration} minutes
Short Break Duration: ${shortBreakDuration} minutes
Long Break Duration: ${longBreakDuration} minutes

Please provide the breakdown in the following JSON format without any additional text or formatting:
{
  "tasks": [
    {
      "title": "Subtask title",
      "estimatedPomodoros": number
    },
    ...
  ]
}

IMPORTANT: Task titles should be plain text only, no HTML tags, scripts, or special formatting.`;

    const message = await withTimeout(
      anthropic.messages.create({
        model: claudeModel as Anthropic.Model,
        max_tokens: 1000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
      REQUEST_TIMEOUT_MS
    );

    console.log('Claude API Response:', JSON.stringify(message, null, 2));

    if (!message.content || message.content.length === 0) {
      return createErrorResponse(
        'API Response Error',
        'Claude API returned empty response',
        502
      );
    }

    const aiContent = (message.content[0] as Anthropic.TextBlock).text.trim();

    console.log('Assistant Response Content:', aiContent);

    let taskBreakdown: TaskBreakdown;
    try {
      taskBreakdown = JSON.parse(aiContent); 
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return createErrorResponse(
        'AI Response Format Error',
        'Claude API returned invalid JSON format',
        502
      );
    }

    // Validate and sanitize AI response using existing security utilities
    const sanitizationResult = sanitizeAIResponse(taskBreakdown);
    if (!sanitizationResult.isValid) {
      console.error('AI response validation failed:', sanitizationResult.error);
      return createErrorResponse(
        'AI Response Validation Error',
        sanitizationResult.error || 'Claude API response failed security validation',
        502
      );
    }

    return NextResponse.json(sanitizationResult.sanitizedData);
    
  } catch (error) {
    console.error('Error processing Claude API request:', error);

    // Handle different error types with appropriate responses
    if (error instanceof TimeoutError) {
      return createErrorResponse(
        'Request Timeout',
        'Claude API request timed out. Please try again.',
        408
      );
    }

    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return createErrorResponse(
          'Authentication Error',
          'Invalid Claude API key',
          401
        );
      }

      if (error.status === 429) {
        return createErrorResponse(
          'Rate Limit Exceeded',
          'Claude API rate limit exceeded. Please try again later.',
          429
        );
      }

      if (error.status === 400) {
        return createErrorResponse(
          'Bad Request',
          'Invalid request to Claude API',
          400
        );
      }

      return createErrorResponse(
        'Claude API Error',
        `Claude API returned error: ${error.message}`,
        error.status || 502
      );
    }

    if (error instanceof Anthropic.APIConnectionError) {
      return createErrorResponse(
        'Connection Error',
        'Failed to connect to Claude API. Please try again.',
        503
      );
    }

    // Generic error fallback
    return createErrorResponse(
      'Internal Server Error',
      'An unexpected error occurred processing your request',
      500
    );
  }
}

/**
 * Export the POST handler with validation middleware applied
 */
export const POST = withValidation(handleClaudeBreakdown, {
  requireAuth: true,
  rateLimit: {
    requests: 5,
    windowMs: 60000, // 5 requests per minute for AI endpoints
  },
  bodySchema: CommonSchemas.claudeBreakdown,
  allowedMethods: ['POST'],
  maxBodySize: 5 * 1024, // 5KB for text requests
  sanitizeStrings: true,
});

/**
 * Export OPTIONS handler for CORS if needed
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Allow': 'POST, OPTIONS',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}