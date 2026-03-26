import { useCallback, useRef, useEffect } from 'react';
import { useTasks } from './useTasks';

// Mutex-like synchronization for task operations to prevent race conditions
class TaskOperationQueue {
  private queue: Array<() => Promise<void>> = [];
  private isProcessing = false;

  async enqueue<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    
    while (this.queue.length > 0) {
      const operation = this.queue.shift()!;
      try {
        await operation();
      } catch (error) {
        console.error('Task operation failed:', error);
      }
    }
    
    this.isProcessing = false;
  }
}

export interface TaskSyncState {
  selectedTaskIds: string[];
  isUpdating: boolean;
  lastUpdateTimestamp: number;
}

export function useTaskSynchronizer(initialSelectedTaskIds: string[] = []) {
  const {
    tasks,
    loading,
    incrementPomodoroSession,
    startAllTimeTracking,
    stopAllTimeTracking
  } = useTasks();

  // Task operation queue to prevent race conditions
  const operationQueueRef = useRef(new TaskOperationQueue());
  
  // Synchronized state management
  const syncStateRef = useRef<TaskSyncState>({
    selectedTaskIds: initialSelectedTaskIds,
    isUpdating: false,
    lastUpdateTimestamp: Date.now(),
  });

  // Cleanup invalid task IDs without race conditions
  const validateAndCleanTaskIds = useCallback((taskIds: string[]): string[] => {
    if (!tasks.length) return taskIds; // Keep IDs if tasks not loaded yet

    return taskIds.filter(id => {
      const task = tasks.find(t => t.id === id);
      return task && !task.completed && !task.archived;
    });
  }, [tasks]);

  // Thread-safe task ID updates
  const updateSelectedTaskIds = useCallback((newTaskIds: string[]) => {
    const validatedIds = validateAndCleanTaskIds(newTaskIds);
    
    syncStateRef.current = {
      ...syncStateRef.current,
      selectedTaskIds: validatedIds,
      lastUpdateTimestamp: Date.now(),
    };

    // Persist to localStorage
    try {
      localStorage.setItem('selectedTaskIds', JSON.stringify(validatedIds));
    } catch (error) {
      console.warn('Failed to persist selected task IDs:', error);
    }

    return validatedIds;
  }, [validateAndCleanTaskIds]);

  // Auto-cleanup invalid task IDs when tasks change
  useEffect(() => {
    if (!loading && tasks.length > 0) {
      const currentIds = syncStateRef.current.selectedTaskIds;
      const validIds = validateAndCleanTaskIds(currentIds);
      
      if (validIds.length !== currentIds.length) {
        updateSelectedTaskIds(validIds);
      }
    }
  }, [loading, tasks, validateAndCleanTaskIds, updateSelectedTaskIds]);

  // Synchronized time tracking operations
  const startTimeTrackingSync = useCallback(async (taskIds: string[]) => {
    if (taskIds.length === 0) return;

    return operationQueueRef.current.enqueue(async () => {
      syncStateRef.current.isUpdating = true;
      
      try {
        // Filter to only start tracking for tasks that aren't already tracking
        const validTasks = tasks.filter(task => 
          taskIds.includes(task.id) && !task.trackingStartedAt
        );
        
        const idsToStart = validTasks.map(t => t.id);
        
        if (idsToStart.length > 0) {
          await startAllTimeTracking(idsToStart);
        }
      } finally {
        syncStateRef.current.isUpdating = false;
      }
    });
  }, [tasks, startAllTimeTracking]);

  const stopTimeTrackingSync = useCallback(async (taskIds: string[]) => {
    if (taskIds.length === 0) return;

    return operationQueueRef.current.enqueue(async () => {
      syncStateRef.current.isUpdating = true;
      
      try {
        const activeTasks = tasks.filter(task => 
          taskIds.includes(task.id) && task.trackingStartedAt
        );

        const tasksToStop = activeTasks.map(task => {
          let elapsed = 0;
          if (task.trackingStartedAt) {
            const startTime = getTimestamp(task.trackingStartedAt);
            elapsed = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
          }
          
          return {
            taskId: task.id,
            elapsedSeconds: elapsed,
          };
        });

        if (tasksToStop.length > 0) {
          await stopAllTimeTracking(tasksToStop);
        }
      } finally {
        syncStateRef.current.isUpdating = false;
      }
    });
  }, [tasks, stopAllTimeTracking]);

  // Synchronized pomodoro completion
  const completePomodoroSync = useCallback(async (taskIds: string[], duration: number) => {
    if (taskIds.length === 0) return;

    return operationQueueRef.current.enqueue(async () => {
      syncStateRef.current.isUpdating = true;
      
      try {
        // Stop time tracking first
        await stopTimeTrackingSync(taskIds);

        // Then increment pomodoro sessions
        const validTasks = tasks.filter(task => 
          taskIds.includes(task.id) && !task.completed
        );

        for (const task of validTasks) {
          await incrementPomodoroSession(task.id, duration);
        }
      } finally {
        syncStateRef.current.isUpdating = false;
      }
    });
  }, [tasks, incrementPomodoroSession, stopTimeTrackingSync]);

  // Get current selected task IDs safely
  const getCurrentTaskIds = useCallback(() => {
    return [...syncStateRef.current.selectedTaskIds];
  }, []);

  // Get selected tasks with validation
  const getSelectedTasks = useCallback(() => {
    const currentIds = getCurrentTaskIds();
    return tasks.filter(task => currentIds.includes(task.id));
  }, [tasks, getCurrentTaskIds]);

  // Check if operations are in progress
  const isOperationInProgress = useCallback(() => {
    return syncStateRef.current.isUpdating;
  }, []);

  return {
    // State accessors
    selectedTaskIds: syncStateRef.current.selectedTaskIds,
    selectedTasks: getSelectedTasks(),
    isUpdating: syncStateRef.current.isUpdating,
    
    // Synchronized operations
    updateSelectedTaskIds,
    startTimeTrackingSync,
    stopTimeTrackingSync,
    completePomodoroSync,
    
    // Utilities
    getCurrentTaskIds,
    getSelectedTasks,
    isOperationInProgress,
  };
}

// Helper to handle various timestamp formats consistently
function getTimestamp(timestamp: any): number {
  if (typeof timestamp === 'number') {
    return timestamp;
  }
  
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  
  // Handle Firebase Timestamp
  if (timestamp && typeof timestamp.toDate === 'function') {
    return timestamp.toDate().getTime();
  }
  
  // Handle ISO string
  if (typeof timestamp === 'string') {
    return new Date(timestamp).getTime();
  }
  
  return Date.now();
}