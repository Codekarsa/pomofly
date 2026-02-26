import { useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';

interface BreakdownResult {
  tasks: {
    title: string;
    estimatedPomodoros: number;
  }[];
}

export const useClaudeAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

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

      // Get ID token for authentication
      const idToken = await user.getIdToken();
      
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
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (response.status === 401) {
          throw new Error('Authentication required. Please log in to use AI features.');
        } else if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment before trying again.');
        } else if (response.status === 400) {
          throw new Error(errorData.details || 'Invalid request. Please check your input.');
        } else {
          throw new Error(errorData.details || 'Failed to get task breakdown');
        }
      }

      const result: BreakdownResult = await response.json();
      return result;
    } catch (err) {
      setError((err as Error).message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { getTaskBreakdown, loading, error };
};