import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

interface TaskBreakdown {
  tasks: {
    title: string;
    estimatedPomodoros: number;
  }[];
}

// Supported Claude models (based on Anthropic's current offerings)
// NOTE: Update this list when new Claude models are released
const SUPPORTED_CLAUDE_MODELS = [
  'claude-3-5-sonnet-20241022',
  'claude-3-5-sonnet-20240620',
  'claude-3-5-haiku-20241022',
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
] as const;

type SupportedClaudeModel = typeof SUPPORTED_CLAUDE_MODELS[number];

const DEFAULT_CLAUDE_MODEL: SupportedClaudeModel = 'claude-3-5-sonnet-20241022';

/**
 * Validates if the provided model is supported by Anthropic SDK
 * @param model - The model string to validate
 * @returns The validated model or default model with warning
 */
function validateClaudeModel(model: string | undefined): {
  model: SupportedClaudeModel;
  isValid: boolean;
  warning?: string;
} {
  if (!model) {
    return {
      model: DEFAULT_CLAUDE_MODEL,
      isValid: false,
      warning: 'CLAUDE_MODEL environment variable is not set. Using default model.'
    };
  }

  const isSupported = SUPPORTED_CLAUDE_MODELS.includes(model as SupportedClaudeModel);
  
  if (!isSupported) {
    return {
      model: DEFAULT_CLAUDE_MODEL,
      isValid: false,
      warning: `Configured model '${model}' is not supported. Using default model '${DEFAULT_CLAUDE_MODEL}'. Supported models: ${SUPPORTED_CLAUDE_MODELS.join(', ')}`
    };
  }

  return {
    model: model as SupportedClaudeModel,
    isValid: true
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      description,
      startDate,
      endDate,
      pomodoroDuration,
      shortBreakDuration,
      longBreakDuration,
    } = body;

    const apiKey = process.env.CLAUDE_API_KEY;
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY is not set in the environment variables');
    }
    
    // Basic API key format validation (should start with sk-)
    if (!apiKey.startsWith('sk-')) {
      console.warn('Claude API key format appears invalid (should start with "sk-")');
    }

    // Validate Claude model configuration
    const modelValidation = validateClaudeModel(process.env.CLAUDE_MODEL);
    const claudeModel = modelValidation.model;

    // Log warning if model configuration is invalid
    if (!modelValidation.isValid && modelValidation.warning) {
      console.warn('Claude model configuration warning:', modelValidation.warning);
    }

    const anthropic = new Anthropic({
      apiKey: apiKey,
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
}`;
    const message = await anthropic.messages.create({
      model: claudeModel, // Now properly validated
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

    return NextResponse.json(taskBreakdown);
  } catch (error) {
    console.error('Error processing Claude API request:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: (error as Error).message },
      { status: 500 }
    );
  }
}
