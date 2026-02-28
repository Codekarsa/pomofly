import { useState } from 'react';

interface BreakdownResult {
  tasks: {
    title: string;
    estimatedPomodoros: number;
  }[];
}

interface ErrorResponse {
  error: string;
  message: string;
}

// Client-side timeout configuration (35 seconds, slightly longer than server)
const CLIENT_TIMEOUT_MS = 35000;

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

    try {
      // Create an AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

      const response = await fetch('/api/claude-breakdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          description,
          startDate,
          endDate,
          pomodoroDuration,
          shortBreakDuration,
          longBreakDuration,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData: ErrorResponse = await response.json();
        
        // Handle specific error types with user-friendly messages
        let errorMessage = errorData.message || 'Failed to get task breakdown';
        
        switch (response.status) {
          case 400:
            errorMessage = 'Please provide a valid task description';
            break;
          case 401:
            errorMessage = 'Authentication error. Please contact support.';
            break;
          case 408:
            errorMessage = 'Request timed out. Please try again with a shorter description.';
            break;
          case 429:
            errorMessage = 'Too many requests. Please wait a moment and try again.';
            break;
          case 503:
            errorMessage = 'Service temporarily unavailable. Please try again later.';
            break;
          case 502:
            errorMessage = 'AI service error. Please try again or simplify your request.';
            break;
          default:
            errorMessage = errorData.message || 'An unexpected error occurred';
        }
        
        throw new Error(errorMessage);
      }

      const result: BreakdownResult = await response.json();
      return result;
    } catch (err) {
      let errorMessage: string;
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Request timed out. Please try again with a shorter description.';
        } else {
          errorMessage = err.message;
        }
      } else {
        errorMessage = 'An unexpected error occurred';
      }
      
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return { getTaskBreakdown, loading, error };
};