import { useState } from 'react';

interface BreakdownResult {
  tasks: {
    title: string;
    estimatedPomodoros: number;
  }[];
}

interface ClaudeAPIError {
  error: string;
  details: string;
  code: string;
}

export class ClaudeValidationError extends Error {
  public readonly code: string;
  public readonly details: string;

  constructor(code: string, message: string, details: string) {
    super(message);
    this.name = 'ClaudeValidationError';
    this.code = code;
    this.details = details;
  }
}

export const useClaudeAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTaskBreakdown = async (
    description: string,
    startDate?: Date,
    endDate?: Date,
    pomodoroDuration: number = 25,
    shortBreakDuration: number = 5,
    longBreakDuration: number = 15
  ): Promise<BreakdownResult> => {
    setLoading(true);
    setError(null);

    // Client-side validation before making the request
    if (!description || description.trim().length === 0) {
      const error = new ClaudeValidationError(
        'VALIDATION_ERROR',
        'Task description is required',
        'Please provide a description of the task you want to break down'
      );
      setError(error.message);
      setLoading(false);
      throw error;
    }

    if (description.length > 5000) {
      const error = new ClaudeValidationError(
        'VALIDATION_ERROR',
        'Task description is too long',
        'Please limit your task description to 5000 characters or less'
      );
      setError(error.message);
      setLoading(false);
      throw error;
    }

    // Check for invalid duration values
    if (pomodoroDuration < 5 || pomodoroDuration > 60) {
      const error = new ClaudeValidationError(
        'VALIDATION_ERROR',
        'Invalid pomodoro duration',
        'Pomodoro duration must be between 5 and 60 minutes'
      );
      setError(error.message);
      setLoading(false);
      throw error;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

      const response = await fetch('/api/claude-breakdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description: description.trim(),
          startDate: startDate?.toISOString(),
          endDate: endDate?.toISOString(),
          pomodoroDuration,
          shortBreakDuration,
          longBreakDuration,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData: ClaudeAPIError = await response.json().catch(() => ({
          error: 'Network Error',
          details: `Request failed with status ${response.status}`,
          code: 'NETWORK_ERROR',
        }));

        const error = new ClaudeValidationError(
          errorData.code,
          errorData.error,
          errorData.details
        );
        
        setError(getUserFriendlyErrorMessage(error));
        throw error;
      }

      const result: BreakdownResult = await response.json();
      
      // Validate the response structure on the client side as well
      if (!result.tasks || !Array.isArray(result.tasks) || result.tasks.length === 0) {
        const error = new ClaudeValidationError(
          'RESPONSE_ERROR',
          'Invalid response from AI service',
          'The AI service returned an invalid response. Please try again.'
        );
        setError(error.message);
        throw error;
      }

      return result;
    } catch (err) {
      if (err instanceof ClaudeValidationError) {
        throw err; // Re-throw validation errors as-is
      }

      if (err instanceof DOMException && err.name === 'AbortError') {
        const error = new ClaudeValidationError(
          'TIMEOUT_ERROR',
          'Request timed out',
          'The AI service is taking too long to respond. Please try again with a simpler task description.'
        );
        setError(error.message);
        throw error;
      }

      // Handle network and other unexpected errors
      const error = new ClaudeValidationError(
        'NETWORK_ERROR',
        'Network error occurred',
        'Please check your internet connection and try again.'
      );
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { getTaskBreakdown, loading, error };
};

// Helper function to provide user-friendly error messages
function getUserFriendlyErrorMessage(error: ClaudeValidationError): string {
  switch (error.code) {
    case 'VALIDATION_ERROR':
      return error.details;
    case 'SECURITY_VIOLATION':
      return 'Your task description contains content that cannot be processed. Please rephrase and try again.';
    case 'CONFIG_ERROR':
      return 'The AI service is temporarily unavailable. Please try again later.';
    case 'PARSE_ERROR':
    case 'RESPONSE_VALIDATION_ERROR':
      return 'The AI service returned an unexpected response. Please try again with a simpler task description.';
    case 'TIMEOUT_ERROR':
      return 'The request took too long to process. Please try again with a shorter task description.';
    case 'NETWORK_ERROR':
      return 'Unable to connect to the AI service. Please check your internet connection and try again.';
    default:
      return error.details || error.message || 'An unexpected error occurred. Please try again.';
  }
}