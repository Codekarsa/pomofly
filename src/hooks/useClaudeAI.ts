import { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useApiMonitoring } from '@/hooks/useMonitoring';
import { sanitizeTaskTitle, checkClientRateLimit } from '@/lib/security';

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
  const { user } = useAuth();
  const { monitorApiCall } = useApiMonitoring();

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
      // Check if user is authenticated
      if (!user) {
        throw new Error('User must be authenticated to use AI features');
      }

      // Client-side rate limiting (5 requests per minute)
      const rateLimitCheck = checkClientRateLimit(user.uid, 5, 60000);
      if (!rateLimitCheck.allowed) {
        const waitTime = Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000);
        throw new Error(`Rate limit exceeded. Please wait ${waitTime} seconds before trying again.`);
      }

      // Basic input validation
      if (!description?.trim() || description.trim().length === 0) {
        throw new Error('Task description is required');
      }

      if (description.length > 2000) {
        throw new Error('Task description must be less than 2000 characters');
      }

      // Get ID token for authentication
      const idToken = await user.getIdToken();
      
      // Monitor the API call with comprehensive error handling
      const result = await monitorApiCall('/api/claude-breakdown', 'POST', async () => {
        // Create an AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
        
        const response = await fetch('/api/claude-breakdown', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${idToken}`,
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
              errorMessage = errorData.message || 'Please provide a valid task description';
              break;
            case 401:
              errorMessage = 'Authentication required. Please log in to use AI features.';
              break;
            case 408:
              errorMessage = 'Request timed out. Please try again with a shorter description.';
              break;
            case 429:
              errorMessage = 'Too many requests. Please wait a moment before trying again.';
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

        const data = await response.json();
        
        // Additional client-side sanitization for task titles
        if (data?.tasks && Array.isArray(data.tasks)) {
          data.tasks = data.tasks.map((task: any) => ({
            ...task,
            title: sanitizeTaskTitle(task.title || ''),
          }));
        }
        
        return data;
      });
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