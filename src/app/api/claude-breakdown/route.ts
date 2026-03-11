import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface TaskBreakdown {
  tasks: {
    title: string;
    estimatedPomodoros: number;
  }[];
}

// Security validation helpers
function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');
  
  // Allow same-origin requests
  if (origin && host) {
    const originUrl = new URL(origin);
    return originUrl.host === host;
  }
  
  // Allow requests without origin (e.g., from mobile apps, but be cautious)
  return !origin;
}

function sanitizeInput(input: string): string {
  // Remove potentially dangerous characters and limit length
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>'"&]/g, '') // Remove dangerous characters
    .trim()
    .substring(0, 5000); // Limit to 5000 characters
}

function validateRequestBody(body: any): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Invalid request body' };
  }

  const { description, pomodoroDuration, shortBreakDuration, longBreakDuration } = body;

  if (!description || typeof description !== 'string') {
    return { valid: false, error: 'Description is required and must be a string' };
  }

  if (description.length > 5000) {
    return { valid: false, error: 'Description too long (max 5000 characters)' };
  }

  if (pomodoroDuration && (typeof pomodoroDuration !== 'number' || pomodoroDuration < 1 || pomodoroDuration > 90)) {
    return { valid: false, error: 'Invalid pomodoro duration (must be 1-90 minutes)' };
  }

  if (shortBreakDuration && (typeof shortBreakDuration !== 'number' || shortBreakDuration < 1 || shortBreakDuration > 30)) {
    return { valid: false, error: 'Invalid short break duration (must be 1-30 minutes)' };
  }

  if (longBreakDuration && (typeof longBreakDuration !== 'number' || longBreakDuration < 1 || longBreakDuration > 60)) {
    return { valid: false, error: 'Invalid long break duration (must be 1-60 minutes)' };
  }

  return { valid: true };
}

export async function POST(request: Request) {
  try {
    // CSRF Protection: Validate origin
    if (!validateOrigin(request)) {
      return NextResponse.json(
        { error: 'Forbidden: Invalid origin' },
        { 
          status: 403,
          headers: {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
          }
        }
      );
    }

    // Check content length to prevent large payload attacks
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 10240) { // 10KB limit
      return NextResponse.json(
        { error: 'Request payload too large' },
        { status: 413 }
      );
    }
    const body = await request.json();
    
    // Validate request body
    const validation = validateRequestBody(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }

    const {
      description,
      startDate,
      endDate,
      pomodoroDuration,
      shortBreakDuration,
      longBreakDuration,
    } = body;

    // Sanitize inputs
    const sanitizedDescription = sanitizeInput(description);
    const sanitizedStartDate = startDate ? sanitizeInput(startDate) : null;
    const sanitizedEndDate = endDate ? sanitizeInput(endDate) : null;

    const apiKey = process.env.CLAUDE_API_KEY;
    const claudeModel = process.env.CLAUDE_MODEL;
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY is not set in the environment variables');
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    console.log('Sending request to Claude API with body:', {
      description: sanitizedDescription,
      startDate: sanitizedStartDate || 'Not specified',
      endDate: sanitizedEndDate || 'Not specified',
      pomodoroDuration,
      shortBreakDuration,
      longBreakDuration,
    });

    const prompt = `Given the following task description and time constraints, please break it down into subtasks with estimated Pomodoro sessions (${pomodoroDuration}-minute work intervals) for each:

Task Description: ${sanitizedDescription}
Start Date: ${sanitizedStartDate || 'Not specified'}
End Date: ${sanitizedEndDate || 'Not specified'}
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
}`;
    const message = await anthropic.messages.create({
      model: claudeModel as Anthropic.Model,
      max_tokens: 1000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    console.log('Claude API Response:', JSON.stringify(message, null, 2));

    if (!message.content || message.content.length === 0) {
      throw new Error('Unexpected response structure from Claude API');
    }

    const aiContent = (message.content[0] as Anthropic.TextBlock).text.trim();

    console.log('Assistant Response Content:', aiContent);

    let taskBreakdown: TaskBreakdown;
    try {
      taskBreakdown = JSON.parse(aiContent); 
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Failed to parse AI response. Ensure the AI returns valid JSON.');
    }

    if (
      !taskBreakdown.tasks ||
      !Array.isArray(taskBreakdown.tasks) ||
      !taskBreakdown.tasks.every(
        (task) =>
          typeof task.title === 'string' &&
          typeof task.estimatedPomodoros === 'number'
      )
    ) {
      throw new Error('AI response format is incorrect');
    }

    return NextResponse.json(taskBreakdown, {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      }
    });
  } catch (error) {
    console.error('Error processing Claude API request:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as Error).message },
      { 
        status: 500,
        headers: {
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
        }
      }
    );
  }
}
