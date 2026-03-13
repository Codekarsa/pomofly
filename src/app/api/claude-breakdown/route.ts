import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import {
  validateClaudeRequest,
  validateClaudeResponse,
  detectSuspiciousPatterns,
  logValidationFailure,
  type ClaudeRequest,
  type TaskBreakdown,
} from '@/lib/claude-validation';

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    const rawBody = await request.json();
    let validatedRequest: ClaudeRequest;
    
    try {
      validatedRequest = validateClaudeRequest(rawBody);
    } catch (validationError) {
      logValidationFailure('request', validationError, rawBody);
      return NextResponse.json(
        { 
          error: 'Invalid request data', 
          details: (validationError as Error).message,
          code: 'VALIDATION_ERROR'
        },
        { status: 400 }
      );
    }

    // Check for suspicious patterns in description
    const suspiciousPatterns = detectSuspiciousPatterns(validatedRequest.description);
    if (suspiciousPatterns.length > 0) {
      console.warn('Suspicious patterns detected:', suspiciousPatterns);
      return NextResponse.json(
        { 
          error: 'Request contains potentially dangerous content', 
          details: `Detected: ${suspiciousPatterns.join(', ')}`,
          code: 'SECURITY_VIOLATION'
        },
        { status: 400 }
      );
    }

    // Validate environment variables
    const apiKey = process.env.CLAUDE_API_KEY;
    const claudeModel = process.env.CLAUDE_MODEL;
    
    if (!apiKey) {
      console.error('CLAUDE_API_KEY is not configured');
      return NextResponse.json(
        { error: 'Service configuration error', code: 'CONFIG_ERROR' },
        { status: 500 }
      );
    }

    if (!claudeModel) {
      console.error('CLAUDE_MODEL is not configured');
      return NextResponse.json(
        { error: 'Service configuration error', code: 'CONFIG_ERROR' },
        { status: 500 }
      );
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
    });

    console.log('Sending validated request to Claude API:', {
      description: validatedRequest.description.substring(0, 100) + '...', // Log only first 100 chars
      startDate: validatedRequest.startDate || 'Not specified',
      endDate: validatedRequest.endDate || 'Not specified',
      pomodoroDuration: validatedRequest.pomodoroDuration,
      shortBreakDuration: validatedRequest.shortBreakDuration,
      longBreakDuration: validatedRequest.longBreakDuration,
    });

    const prompt = `Given the following task description and time constraints, please break it down into subtasks with estimated Pomodoro sessions (${validatedRequest.pomodoroDuration}-minute work intervals) for each:

Task Description: ${validatedRequest.description}
Start Date: ${validatedRequest.startDate || 'Not specified'}
End Date: ${validatedRequest.endDate || 'Not specified'}
Pomodoro Duration: ${validatedRequest.pomodoroDuration} minutes
Short Break Duration: ${validatedRequest.shortBreakDuration} minutes
Long Break Duration: ${validatedRequest.longBreakDuration} minutes

IMPORTANT: Please provide the breakdown in the following JSON format without any additional text or formatting. Each task should have:
- A clear, concise title (1-200 characters, no HTML tags)
- A realistic estimated number of Pomodoro sessions (1-20)
- Ensure total Pomodoros across all tasks doesn't exceed 100

{
  "tasks": [
    {
      "title": "Subtask title",
      "estimatedPomodoros": number
    }
  ]
}

Guidelines:
- Break down complex tasks into manageable subtasks
- Each subtask should be completable in the estimated number of Pomodoro sessions
- Task titles should be specific and actionable
- Avoid duplicate or very similar tasks
- Estimate realistically based on typical work complexity`;

    const message = await anthropic.messages.create({
      model: claudeModel as Anthropic.Model,
      max_tokens: 2000,
      temperature: 0.1, // Lower temperature for more consistent formatting
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    console.log('Claude API Response received:', {
      contentLength: message.content?.[0] ? (message.content[0] as Anthropic.TextBlock).text.length : 0,
      messageId: message.id,
    });

    if (!message.content || message.content.length === 0) {
      console.error('Empty response from Claude API');
      return NextResponse.json(
        { error: 'AI service returned empty response', code: 'EMPTY_RESPONSE' },
        { status: 502 }
      );
    }

    const aiContent = (message.content[0] as Anthropic.TextBlock).text.trim();
    console.log('Raw AI response:', aiContent.substring(0, 200) + '...');

    // Parse AI response
    let parsedResponse: any;
    try {
      // Try to extract JSON from the response if it contains other text
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : aiContent;
      parsedResponse = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      logValidationFailure('response', parseError, aiContent);
      return NextResponse.json(
        { 
          error: 'AI response could not be parsed as valid JSON', 
          details: 'Please try again with a simpler task description',
          code: 'PARSE_ERROR'
        },
        { status: 502 }
      );
    }

    // Validate AI response
    let validatedResponse: TaskBreakdown;
    try {
      validatedResponse = validateClaudeResponse(parsedResponse);
    } catch (validationError) {
      console.error('AI response validation failed:', validationError);
      logValidationFailure('response', validationError, parsedResponse);
      return NextResponse.json(
        { 
          error: 'AI response format is invalid', 
          details: (validationError as Error).message,
          code: 'RESPONSE_VALIDATION_ERROR'
        },
        { status: 502 }
      );
    }

    console.log(`Successfully validated ${validatedResponse.tasks.length} tasks`);

    return NextResponse.json(validatedResponse);

  } catch (error) {
    console.error('Unexpected error processing Claude API request:', error);
    
    // Don't expose sensitive error details in production
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return NextResponse.json(
      { 
        error: 'An unexpected error occurred', 
        details: isDevelopment ? (error as Error).message : 'Please try again later',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    );
  }
}
