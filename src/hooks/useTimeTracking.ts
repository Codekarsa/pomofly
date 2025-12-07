import { useState, useEffect, useCallback, useMemo } from 'react';
import { Task } from './useTasks';

export function useTimeTracking(tasks: Task[]) {
  const [tick, setTick] = useState(0);

  // Get all tasks that are currently being tracked
  const activelyTrackedTasks = useMemo(() =>
    tasks.filter(task => task.trackingStartedAt != null && !task.completed),
    [tasks]
  );

  // Check if any task is being tracked
  const hasActiveTracking = activelyTrackedTasks.length > 0;

  // Update tick every second to force re-render for timer display
  useEffect(() => {
    if (!hasActiveTracking) return;

    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [hasActiveTracking]);

  // Calculate current elapsed time for a task (in seconds)
  const getElapsedTime = useCallback((task: Task): number => {
    const baseTime = task.manualTimeSpent ?? 0;
    if (task.trackingStartedAt) {
      // Handle Firestore Timestamp or Date
      let startTime: number;
      if (task.trackingStartedAt instanceof Date) {
        startTime = task.trackingStartedAt.getTime();
      } else if (typeof (task.trackingStartedAt as { toDate?: () => Date }).toDate === 'function') {
        startTime = (task.trackingStartedAt as { toDate: () => Date }).toDate().getTime();
      } else {
        startTime = new Date(task.trackingStartedAt as unknown as string).getTime();
      }
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      return baseTime + Math.max(0, elapsed);
    }
    return baseTime;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  // Format seconds to HH:MM:SS or MM:SS
  const formatTime = useCallback((totalSeconds: number): string => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  return {
    activelyTrackedTasks,
    hasActiveTracking,
    getElapsedTime,
    formatTime
  };
}
