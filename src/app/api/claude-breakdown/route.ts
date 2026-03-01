import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getClaudeConfig } from '@/lib/claude-config';

interface TaskBreakdown {
  tasks: {
    title: string;
    estimatedPomodoros: number;
  }[];
}

interface RequestBody {
  description: string;
  startDate?: string;
  endDate?: string;
  pomodoroDuration: number;
  shortBreakDuration: number;
  longBreakDuration: number;
}

// Input validation constants
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_DATE_STRING_LENGTH = 50;
const MIN_POMODORO_DURATION = 1;
const MAX_POMODORO_DURATION = 60;
const MIN_BREAK_DURATION = 1;
const MAX_BREAK_DURATION = 30;
const MAX_REQUEST_SIZE = 10 * 1024; // 10KB

function validateRequestBody(body: any): RequestBody {
  // Check if body exists and is object
  if (!body || typeof body !== 'object') {
    throw new Error('Request body is required and must be a valid JSON object');
  }

  // Validate description
  if (typeof body.description !== 'string') {
    throw new Error('Description is required and must be a string');
  }
  if (body.description.trim().length === 0) {
    throw new Error('Description cannot be empty');
  }
  if (body.description.length > MAX_DESCRIPTION_LENGTH) {
    throw new Error(`Description cannot exceed ${MAX_DESCRIPTION_LENGTH} characters`);
  }

  // Validate optional date strings
  if (body.startDate !== undefined) {
    if (typeof body.startDate !== 'string' || body.startDate.length > MAX_DATE_STRING_LENGTH) {
      throw new Error('Start date must be a valid string');
    }
  }
  if (body.endDate !== undefined) {
    if (typeof body.endDate !== 'string' || body.endDate.length > MAX_DATE_STRING_LENGTH) {
      throw new Error('End date must be a valid string');
    }
  }

  // Validate pomodoro duration
  if (typeof body.pomodoroDuration !== 'number' || 
      !Number.isInteger(body.pomodoroDuration) ||
      body.pomodoroDuration < MIN_POMODORO_DURATION || 
      body.pomodoroDuration > MAX_POMODORO_DURATION) {
    throw new Error(`Pomodoro duration must be an integer between ${MIN_POMODORO_DURATION} and ${MAX_POMODORO_DURATION} minutes`);
  }

  // Validate break durations
  if (typeof body.shortBreakDuration !== 'number' || 
      !Number.isInteger(body.shortBreakDuration) ||
      body.shortBreakDuration < MIN_BREAK_DURATION || 
      body.shortBreakDuration > MAX_BREAK_DURATION) {
    throw new Error(`Short break duration must be an integer between ${MIN_BREAK_DURATION} and ${MAX_BREAK_DURATION} minutes`);
  }

  if (typeof body.longBreakDuration !== 'number' || 
      !Number.isInteger(body.longBreakDuration) ||
      body.longBreakDuration < MIN_BREAK_DURATION || 
      body.longBreakDuration > MAX_BREAK_DURATION) {
    throw new Error(`Long break duration must be an integer between ${MIN_BREAK_DURATION} and ${MAX_BREAK_DURATION} minutes`);
  }

  return {
    description: body.description.trim(),
    startDate: body.startDate,
    endDate: body.endDate,
    pomodoroDuration: body.pomodoroDuration,
    shortBreakDuration: body.shortBreakDuration,
    longBreakDuration: body.longBreakDuration,
  };
}

export async function POST(request: Request) {
  try {
    // Check request size
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > MAX_REQUEST_SIZE) {
      return NextResponse.json(
        { error: 'Request payload too large', maxSize: `${MAX_REQUEST_SIZE} bytes` },
        { status: 413 }
      );
    }

    const rawBody = await request.json();
    const validatedBody = validateRequestBody(rawBody);
    
    const {
      description,
      startDate,
      endDate,
      pomodoroDuration,
      shortBreakDuration,
      longBreakDuration,
    } = validatedBody;

    // Get Claude configuration
    const claudeConfig = getClaudeConfig();
    
    if (!claudeConfig.isConfigured || !claudeConfig.client) {
      return NextResponse.json(
        { error: 'Claude API not configured or unavailable' },
        { status: 503 }
      );
    }

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
}`;

    // Add timeout for Claude API call
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Claude API request timeout')), 30000); // 30 second timeout
    });

    const messagePromise = claudeConfig.client.messages.create({
      model: claudeConfig.model,
      max_tokens: claudeConfig.maxTokens,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const message = await Promise.race([messagePromise, timeoutPromise]) as Anthropic.Messages.Message;

    if (!message.content || message.content.length === 0) {
      return NextResponse.json(
        { error: 'Empty response from Claude API' },
        { status: 502 }
      );
    }

    const aiContent = (message.content[0] as Anthropic.TextBlock).text.trim();

    let taskBreakdown: TaskBreakdown;
    try {
      taskBreakdown = JSON.parse(aiContent); 
    } catch (parseError) {
      return NextResponse.json(
        { error: 'Invalid response format from AI service' },
        { status: 502 }
      );
    }

    // Validate the response structure
    if (
      !taskBreakdown.tasks ||
      !Array.isArray(taskBreakdown.tasks) ||
      !taskBreakdown.tasks.every(
        (task) =>
          typeof task.title === 'string' &&
          typeof task.estimatedPomodoros === 'number' &&
          task.title.length > 0 &&
          task.title.length <= 200 &&
          Number.isInteger(task.estimatedPomodoros) &&
          task.estimatedPomodoros > 0 &&
          task.estimatedPomodoros <= 50
      )
    ) {
      return NextResponse.json(
        { error: 'Invalid task breakdown format from AI service' },
        { status: 502 }
      );
    }

    // Limit the number of tasks returned
    if (taskBreakdown.tasks.length > 20) {
      taskBreakdown.tasks = taskBreakdown.tasks.slice(0, 20);
    }

    return NextResponse.json({
      ...taskBreakdown,
      metadata: {
        model: claudeConfig.model,
        modelName: claudeConfig.modelInfo.name,
        requestTimestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    // Handle specific error types
    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid JSON in request' },
        { status: 400 }
      );
    }
    
    if (error instanceof Error) {
      // If it's our validation error, return 400
      if (error.message.includes('required') || 
          error.message.includes('must be') || 
          error.message.includes('cannot exceed') ||
          error.message.includes('cannot be empty')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }

      // If it's a timeout or Claude API error, return 502
      if (error.message.includes('timeout') || error.message.includes('Claude API')) {
        return NextResponse.json(
          { error: 'AI service temporarily unavailable' },
          { status: 502 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
