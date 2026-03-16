import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { validateAuth, checkRateLimit } from '@/lib/auth-middleware';
import { getServerEnv } from '@/lib/env';
import { sanitizeServerInput, validateServerInput, sanitizeAIResponse } from '@/lib/security';

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

export async function POST(request: NextRequest) {
  // Authentication check
  const authResult = await validateAuth(request);
  if (!authResult.isAuthenticated) {
    return NextResponse.json(
      { error: 'Unauthorized', details: authResult.error },
      { status: 401 }
    );
  }

  // Rate limiting check
  const rateLimitResult = checkRateLimit(authResult.uid!, 5, 60000); // 5 requests per minute
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { 
        error: 'Rate limit exceeded', 
        details: 'Too many requests. Please try again later.',
        resetTime: rateLimitResult.resetTime
      },
      { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString()
        }
      }
    );
  }
  try {
    const body = await request.json();
    
    // Input validation
    const {
      description,
      startDate,
      endDate,
      pomodoroDuration,
      shortBreakDuration,
      longBreakDuration,
    } = body;

    // Validate required fields
    if (!description || typeof description !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Description is required and must be a string' },
        { status: 400 }
      );
    }

    // Server-side input validation and sanitization
    const inputValidation = validateServerInput(description, 2000);
    if (!inputValidation.isValid) {
      return NextResponse.json(
        { error: 'Input Validation Error', details: inputValidation.error },
        { status: 400 }
      );
    }

    // Sanitize the description to prevent injection attacks
    const sanitizedDescription = sanitizeServerInput(description);

    // Validate numeric fields
    if (pomodoroDuration && (typeof pomodoroDuration !== 'number' || pomodoroDuration < 1 || pomodoroDuration > 120)) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Pomodoro duration must be between 1 and 120 minutes' },
        { status: 400 }
      );
    }

    if (shortBreakDuration && (typeof shortBreakDuration !== 'number' || shortBreakDuration < 1 || shortBreakDuration > 60)) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Short break duration must be between 1 and 60 minutes' },
        { status: 400 }
      );
    }

    if (longBreakDuration && (typeof longBreakDuration !== 'number' || longBreakDuration < 1 || longBreakDuration > 120)) {
      return NextResponse.json(
        { error: 'Bad Request', details: 'Long break duration must be between 1 and 120 minutes' },
        { status: 400 }
      );
    }

    // Validate environment variables early
    const env = getServerEnv();

    if (!env.CLAUDE_MODEL) {
      return NextResponse.json(
        { 
          error: 'Configuration Error', 
          message: 'Claude model is not configured' 
        },
        { status: 503 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: env.CLAUDE_API_KEY,
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

Task Description: ${sanitizedDescription}
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
        model: env.CLAUDE_MODEL as Anthropic.Model,
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
      return NextResponse.json(
        { 
          error: 'API Response Error', 
          message: 'Claude API returned empty response' 
        },
        { status: 502 }
      );
    }

    const aiContent = (message.content[0] as Anthropic.TextBlock).text.trim();

    console.log('Assistant Response Content:', aiContent);

    let taskBreakdown: any;
    try {
      taskBreakdown = JSON.parse(aiContent); 
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      return NextResponse.json(
        { 
          error: 'AI Response Format Error', 
          message: 'Claude API returned invalid JSON format' 
        },
        { status: 502 }
      );
    }

    // Validate and sanitize AI response
    const sanitizationResult = sanitizeAIResponse(taskBreakdown);
    if (!sanitizationResult.isValid) {
      console.error('AI response validation failed:', sanitizationResult.error);
      return NextResponse.json(
        { 
          error: 'AI Response Validation Error', 
          message: sanitizationResult.error || 'Claude API response failed security validation' 
        },
        { status: 502 }
      );
    }

    return NextResponse.json(sanitizationResult.sanitizedData);
  } catch (error) {
    console.error('Error processing Claude API request:', error);
    
    // Handle environment validation errors with more specific messaging
    if (error instanceof Error && error.message.includes('environment variables')) {
      return NextResponse.json(
        { 
          error: 'Configuration Error', 
          details: 'Server configuration is invalid. Please check environment variables.',
          configError: true
        },
        { status: 500 }
      );
    }

    // Handle different error types with appropriate responses
    if (error instanceof TimeoutError) {
      return NextResponse.json(
        { 
          error: 'Request Timeout', 
          message: 'Claude API request timed out. Please try again.' 
        },
        { status: 408 }
      );
    }

    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        return NextResponse.json(
          { 
            error: 'Authentication Error', 
            message: 'Invalid Claude API key' 
          },
          { status: 401 }
        );
      }

      if (error.status === 429) {
        return NextResponse.json(
          { 
            error: 'Rate Limit Exceeded', 
            message: 'Claude API rate limit exceeded. Please try again later.' 
          },
          { status: 429 }
        );
      }

      if (error.status === 400) {
        return NextResponse.json(
          { 
            error: 'Bad Request', 
            message: 'Invalid request to Claude API' 
          },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { 
          error: 'Claude API Error', 
          message: `Claude API returned error: ${error.message}` 
        },
        { status: error.status || 502 }
      );
    }

    if (error instanceof Anthropic.APIConnectionError) {
      return NextResponse.json(
        { 
          error: 'Connection Error', 
          message: 'Failed to connect to Claude API. Please try again.' 
        },
        { status: 503 }
      );
    }

    // Generic error fallback
    return NextResponse.json(
      { 
        error: 'Internal Server Error', 
        message: 'An unexpected error occurred processing your request' 
      },
      { status: 500 }
    );
  }
}
