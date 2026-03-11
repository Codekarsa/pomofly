import { useState, useEffect, useCallback } from 'react';
import { useTaskService } from '@/services/ServiceProvider';
import { Task, TaskFilter, CreateTaskData, TaskUpdate } from '@/services/interfaces/ITaskService';

export interface UseTasksResult {
  tasks: Task[];
  loading: boolean;
  error: Error | null;
  
  // CRUD operations
  createTask: (data: CreateTaskData) => Promise<string | void>;
  updateTask: (id: string, updates: TaskUpdate) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  
  // Bulk operations
  updateMultipleTasks: (taskIds: string[], updates: TaskUpdate) => Promise<void>;
  deleteMultipleTasks: (taskIds: string[]) => Promise<void>;
  
  // Convenience methods
  markCompleted: (id: string) => Promise<void>;
  markIncomplete: (id: string) => Promise<void>;
  addPomodoroSession: (id: string, sessionTime: number) => Promise<void>;
  updateTimeSpent: (id: string, additionalTime: number) => Promise<void>;
  
  // Utility
  refreshTasks: () => Promise<void>;
}

export function useTasks(filter?: TaskFilter): UseTasksResult {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const taskService = useTaskService();

  // Set up real-time subscription
  useEffect(() => {
    setLoading(true);
    setError(null);

    const unsubscribe = taskService.subscribeTasks(
      filter,
      (tasks) => {
        setTasks(tasks);
        setLoading(false);
      },
      (error) => {
        console.error('Task subscription error:', error);
        setError(error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [taskService, filter]);

  // CRUD operations
  const createTask = useCallback(async (data: CreateTaskData) => {
    try {
      setError(null);
      const taskId = await taskService.createTask(data);
      return taskId;
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to create task');
      setError(errorObj);
      console.error('Create task error:', error);
      throw errorObj;
    }
  }, [taskService]);

  const updateTask = useCallback(async (id: string, updates: TaskUpdate) => {
    try {
      setError(null);
      await taskService.updateTask(id, updates);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to update task');
      setError(errorObj);
      console.error('Update task error:', error);
      throw errorObj;
    }
  }, [taskService]);

  const deleteTask = useCallback(async (id: string) => {
    try {
      setError(null);
      await taskService.deleteTask(id);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to delete task');
      setError(errorObj);
      console.error('Delete task error:', error);
      throw errorObj;
    }
  }, [taskService]);

  // Bulk operations
  const updateMultipleTasks = useCallback(async (taskIds: string[], updates: TaskUpdate) => {
    try {
      setError(null);
      await taskService.updateMultipleTasks(taskIds, updates);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to update multiple tasks');
      setError(errorObj);
      console.error('Update multiple tasks error:', error);
      throw errorObj;
    }
  }, [taskService]);

  const deleteMultipleTasks = useCallback(async (taskIds: string[]) => {
    try {
      setError(null);
      await taskService.deleteMultipleTasks(taskIds);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to delete multiple tasks');
      setError(errorObj);
      console.error('Delete multiple tasks error:', error);
      throw errorObj;
    }
  }, [taskService]);

  // Convenience methods
  const markCompleted = useCallback(async (id: string) => {
    try {
      setError(null);
      await taskService.markCompleted(id);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to mark task as completed');
      setError(errorObj);
      console.error('Mark completed error:', error);
      throw errorObj;
    }
  }, [taskService]);

  const markIncomplete = useCallback(async (id: string) => {
    try {
      setError(null);
      await taskService.markIncomplete(id);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to mark task as incomplete');
      setError(errorObj);
      console.error('Mark incomplete error:', error);
      throw errorObj;
    }
  }, [taskService]);

  const addPomodoroSession = useCallback(async (id: string, sessionTime: number) => {
    try {
      setError(null);
      await taskService.addPomodoroSession(id, sessionTime);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to add pomodoro session');
      setError(errorObj);
      console.error('Add pomodoro session error:', error);
      throw errorObj;
    }
  }, [taskService]);

  const updateTimeSpent = useCallback(async (id: string, additionalTime: number) => {
    try {
      setError(null);
      await taskService.updateTimeSpent(id, additionalTime);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to update time spent');
      setError(errorObj);
      console.error('Update time spent error:', error);
      throw errorObj;
    }
  }, [taskService]);

  // Manual refresh
  const refreshTasks = useCallback(async () => {
    try {
      setError(null);
      setLoading(true);
      const refreshedTasks = await taskService.getTasks(filter);
      setTasks(refreshedTasks);
    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error('Failed to refresh tasks');
      setError(errorObj);
      console.error('Refresh tasks error:', error);
    } finally {
      setLoading(false);
    }
  }, [taskService, filter]);

  return {
    tasks,
    loading,
    error,
    createTask,
    updateTask,
    deleteTask,
    updateMultipleTasks,
    deleteMultipleTasks,
    markCompleted,
    markIncomplete,
    addPomodoroSession,
    updateTimeSpent,
    refreshTasks,
  };
}

// Export the Task type for convenience
export type { Task, TaskFilter, CreateTaskData, TaskUpdate } from '@/services/interfaces/ITaskService';