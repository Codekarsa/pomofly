import { useState } from 'react';

interface BreakdownResult {
  tasks: {
    title: string;
    estimatedPomodoros: number;
  }[];
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

    try {
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
      });

      if (!response.ok) {
        throw new Error('Failed to get task breakdown');
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