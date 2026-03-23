import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  increment,
  writeBatch,
} from 'firebase/firestore';
import { db, auth, addEstimationRecord } from '../lib/firebase';
import { useErrorReporting } from './useErrorReporting';
import {
  getGuestTasks,
  addGuestTask,
  updateGuestTask,
  deleteGuestTask,
  saveGuestTasks,
} from '../lib/guestStorage';
<<<<<<< HEAD
import { 
  transformFirebaseTask, 
  validateTaskUpdate,
  type Task
=======
import {
  transformFirebaseTask,
  validateTaskCreate,
  validateTaskUpdate,
  safeValidateTask,
  type Task,
  type TaskCreate,
  type TaskUpdate,
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)
} from '../lib/validation';
import { AppCacheManager } from '@/lib/appCache';

// Re-export types for components
export type { Task } from '../lib/validation';

// Task interface now imported from validation.ts

export function useTasks(projectId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isGuest, setIsGuest] = useState(false);
  const { reportError } = useErrorReporting();

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      // Guest mode: use localStorage
      setIsGuest(true);
      let guestTasks = getGuestTasks();
      if (projectId) {
        guestTasks = guestTasks.filter((t) => t.projectId === projectId);
      }
      setTasks(guestTasks);
      setLoading(false);
      setError(null);
      return;
    }

    setIsGuest(false);
    let tasksQuery = query(
      collection(db, 'tasks'),
      where('userId', '==', user.uid)
    );

    if (projectId) {
      tasksQuery = query(tasksQuery, where('projectId', '==', projectId));
    }

    const unsubscribe = onSnapshot(
      tasksQuery,
      (querySnapshot) => {
        const taskList: Task[] = [];
        querySnapshot.forEach((doc) => {
          try {
            const validatedTask = transformFirebaseTask({
              id: doc.id,
              ...doc.data(),
            });
            taskList.push(validatedTask);
          } catch (validationError) {
            console.error(
              `Invalid task data for document ${doc.id}:`,
              validationError
            );
            // Skip invalid tasks but continue processing others
          }
        });
        setTasks(taskList);
        setLoading(false);
        
        // Validate task-related caches now that we have current task list
        const availableTaskIds = taskList.map(task => task.id);
        AppCacheManager.validateTaskRelatedCaches(availableTaskIds);
      },
      (err) => {
        console.error('Error fetching tasks:', err);
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [projectId]);

  // Re-fetch guest tasks when they might have changed
  const refreshGuestTasks = useCallback(() => {
    if (isGuest) {
      let guestTasks = getGuestTasks();
      if (projectId) {
        guestTasks = guestTasks.filter((t) => t.projectId === projectId);
      }
      setTasks(guestTasks);
    }
  }, [isGuest, projectId]);

  const addTask = useCallback(
    async (
      title: string,
      taskProjectId: string,
      estimatedPomodoros?: number,
      focus?: boolean,
      labelIds?: string[]
    ) => {
      const user = auth.currentUser;

<<<<<<< HEAD
    try {
      const newTaskData = {
        title,
        projectId: taskProjectId,
        userId: user?.uid || 'guest',
        completed: false,
        estimatedPomodoros,
        focus: focus ?? false,
        deadline: null,
        labelIds: labelIds || [],
        estimationSource: estimatedPomodoros ? 'manual' : undefined,
        totalPomodoroSessions: 0,
        totalTimeSpent: 0,
        manualTimeSpent: 0,
        trackingStartedAt: null,
        archived: false,
        createdAt: new Date(),
      };

      if (!user) {
        // Guest mode
        const newTask = addGuestTask(newTaskData as Omit<Task, 'id'>);
        setTasks(prev => [...prev, newTask]);
        return newTask.id;
=======
      try {
        const newTaskData = validateTaskCreate({
          title,
          projectId: taskProjectId,
          userId: user?.uid || 'guest',
          completed: false,
          estimatedPomodoros,
          focus: focus ?? false,
          deadline: null,
          estimationSource: estimatedPomodoros ? 'manual' : undefined,
        });

        if (!user) {
          // Guest mode
          const newTask = addGuestTask(newTaskData);
          setTasks((prev) => [...prev, newTask]);
          return newTask.id;
        }

        const docRef = await addDoc(collection(db, 'tasks'), newTaskData);
        return docRef.id;
      } catch (err) {
        console.error('Error adding task:', err);
        throw err;
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)
      }
    },
    []
  );

<<<<<<< HEAD
      const docRef = await addDoc(collection(db, "tasks"), newTaskData);
      return docRef.id;
    } catch (err) {
      console.error("Error adding task:", err);
      if (err instanceof Error) {
        reportError(err, { context: 'task_creation', projectId });
      }
      throw err;
    }
  }, []);
=======
  const updateTask = useCallback(
    async (taskId: string, updates: Partial<Task>) => {
      const user = auth.currentUser;
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)

      try {
        // Validate the updates
        const validatedUpdates = validateTaskUpdate({ id: taskId, ...updates });
        // Remove the id from updates since we don't want to update the document ID
        const { id, ...updateData } = validatedUpdates;

<<<<<<< HEAD
    try {
      // Validate the updates
      const validatedUpdates = validateTaskUpdate({ id: taskId, ...updates });
      // Remove the id from updates since we don't want to update the document ID
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _, ...updateData } = validatedUpdates;

      if (!user) {
        // Guest mode
        updateGuestTask(taskId, updateData);
      setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
      return;
    }

      const taskRef = doc(db, "tasks", taskId);
      await updateDoc(taskRef, updateData);
    } catch (error) {
      console.error("Error updating task:", error);
      if (error instanceof Error) {
        reportError(error, { context: 'task_update', taskId });
      }
      throw error;
    }
  }, []);
=======
        if (!user) {
          // Guest mode
          updateGuestTask(taskId, updateData);
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
          );
          return;
        }

        const taskRef = doc(db, 'tasks', taskId);
        await updateDoc(taskRef, updateData);
      } catch (error) {
        console.error('Error updating task:', error);
        throw error;
      }
    },
    []
  );
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)

  const deleteTask = useCallback(async (id: string) => {
    const user = auth.currentUser;

    if (!user) {
      // Guest mode
      deleteGuestTask(id);
<<<<<<< HEAD
      setTasks(prev => prev.filter(t => t.id !== id));
      AppCacheManager.onTasksDeleted([id]);
=======
      setTasks((prev) => prev.filter((t) => t.id !== id));
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)
      return;
    }

    try {
<<<<<<< HEAD
      await deleteDoc(doc(db, "tasks", id));
      AppCacheManager.onTasksDeleted([id]);
=======
      await deleteDoc(doc(db, 'tasks', id));
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)
    } catch (err) {
      console.error('Error deleting task:', err);
      throw err;
    }
  }, []);

  const toggleTaskCompletion = useCallback(
    async (id: string, currentCompletionState: boolean) => {
      const user = auth.currentUser;

      // Find the task to get its details
      const task = tasks.find((t) => t.id === id);
      if (!task) {
        throw new Error('Task not found');
      }

      if (!user) {
        // Guest mode
        const updates: Partial<Task> = { completed: !currentCompletionState };

        // On completion, store completion data
        if (!currentCompletionState) {
          updates.completedAt = new Date();
          updates.completedPomodoros = task.totalPomodoroSessions || 0;
        }

        updateGuestTask(id, updates);
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
        );
        return;
      }

      try {
        const taskRef = doc(db, 'tasks', id);

        if (!currentCompletionState) {
          // Store completion data
          await updateDoc(taskRef, {
            completed: true,
            completedAt: new Date(),
            completedPomodoros: task.totalPomodoroSessions || 0,
          });
          // Add to estimation history
          await addEstimationRecord(user.uid, task);
        } else {
          // Mark as incomplete
          await updateDoc(taskRef, {
            completed: false,
          });
        }
      } catch (err) {
        console.error('Error toggling task completion:', err);
        throw err;
      }
    },
    [tasks]
  );

  const incrementPomodoroSession = useCallback(
    async (id: string, duration: number) => {
      const user = auth.currentUser;

      if (!user) {
        // Guest mode
        const task = tasks.find((t) => t.id === id);
        if (task) {
          const updates = {
            totalPomodoroSessions: task.totalPomodoroSessions + 1,
            totalTimeSpent: task.totalTimeSpent + duration,
          };
          updateGuestTask(id, updates);
          setTasks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
          );
        }
        return;
      }

      try {
        await updateDoc(doc(db, 'tasks', id), {
          totalPomodoroSessions: increment(1),
          totalTimeSpent: increment(duration),
        });
      } catch (err) {
        console.error('Error incrementing pomodoro session:', err);
        throw err;
      }
    },
    [tasks]
  );

  const archiveTask = useCallback(async (id: string) => {
    const user = auth.currentUser;

    if (!user) {
      // Guest mode
      updateGuestTask(id, { archived: true });
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, archived: true } : t))
      );
      return;
    }

    try {
      await updateDoc(doc(db, 'tasks', id), { archived: true });
    } catch (err) {
      console.error('Error archiving task:', err);
      throw err;
    }
  }, []);

  const toggleTaskFocus = useCallback(
    async (id: string, currentFocusState: boolean) => {
      const user = auth.currentUser;

      if (!user) {
        // Guest mode
        updateGuestTask(id, { focus: !currentFocusState });
        setTasks((prev) =>
          prev.map((t) =>
            t.id === id ? { ...t, focus: !currentFocusState } : t
          )
        );
        return;
      }

      try {
        await updateDoc(doc(db, 'tasks', id), {
          focus: !currentFocusState,
        });
      } catch (err) {
        console.error('Error toggling task focus:', err);
        throw err;
      }
    },
    []
  );

  const setTaskDeadline = useCallback(
    async (id: string, deadline: string | null) => {
      const user = auth.currentUser;

      if (!user) {
        // Guest mode
        updateGuestTask(id, { deadline });
        setTasks((prev) =>
          prev.map((t) => (t.id === id ? { ...t, deadline } : t))
        );
        return;
      }

      try {
        await updateDoc(doc(db, 'tasks', id), {
          deadline,
        });
      } catch (err) {
        console.error('Error setting task deadline:', err);
        throw err;
      }
    },
    []
  );

  const startTimeTracking = useCallback(async (taskId: string) => {
    const user = auth.currentUser;
    const now = new Date();

    if (!user) {
      // Guest mode
      updateGuestTask(taskId, { trackingStartedAt: now });
      setTasks((prev) =>
        prev.map((t) =>
          t.id === taskId ? { ...t, trackingStartedAt: now } : t
        )
      );
      return;
    }

    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        trackingStartedAt: now,
      });
    } catch (err) {
      console.error('Error starting time tracking:', err);
      throw err;
    }
  }, []);

  const stopTimeTracking = useCallback(
    async (taskId: string, elapsedSeconds: number) => {
      const user = auth.currentUser;

      if (!user) {
        // Guest mode
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          const updates = {
            trackingStartedAt: null,
            manualTimeSpent: task.manualTimeSpent + elapsedSeconds,
          };
          updateGuestTask(taskId, updates);
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
          );
        }
        return;
      }

      try {
        await updateDoc(doc(db, 'tasks', taskId), {
          trackingStartedAt: null,
          manualTimeSpent: increment(elapsedSeconds),
        });
      } catch (err) {
        console.error('Error stopping time tracking:', err);
        throw err;
      }
    },
    [tasks]
  );

  const startAllTimeTracking = useCallback(async (taskIds: string[]) => {
    if (taskIds.length === 0) return;
    const user = auth.currentUser;
    const now = new Date();

    if (!user) {
      // Guest mode
      const allTasks = getGuestTasks();
      const updatedTasks = allTasks.map((t) =>
        taskIds.includes(t.id) ? { ...t, trackingStartedAt: now } : t
      );
      saveGuestTasks(updatedTasks);
      setTasks((prev) =>
        prev.map((t) =>
          taskIds.includes(t.id) ? { ...t, trackingStartedAt: now } : t
        )
      );
      return;
    }

    const batch = writeBatch(db);
    taskIds.forEach((taskId) => {
      const taskRef = doc(db, 'tasks', taskId);
      batch.update(taskRef, { trackingStartedAt: now });
    });
    try {
      await batch.commit();
    } catch (err) {
      console.error('Error starting all time tracking:', err);
      throw err;
    }
  }, []);

  const stopAllTimeTracking = useCallback(
    async (tasksToStop: Array<{ taskId: string; elapsedSeconds: number }>) => {
      if (tasksToStop.length === 0) return;
      const user = auth.currentUser;

      if (!user) {
        // Guest mode
        const allTasks = getGuestTasks();
        const updatedTasks = allTasks.map((t) => {
          const stopInfo = tasksToStop.find((s) => s.taskId === t.id);
          if (stopInfo) {
            return {
              ...t,
              trackingStartedAt: null,
              manualTimeSpent: t.manualTimeSpent + stopInfo.elapsedSeconds,
            };
          }
          return t;
        });
        saveGuestTasks(updatedTasks);
        setTasks((prev) =>
          prev.map((t) => {
            const stopInfo = tasksToStop.find((s) => s.taskId === t.id);
            if (stopInfo) {
              return {
                ...t,
                trackingStartedAt: null,
                manualTimeSpent: t.manualTimeSpent + stopInfo.elapsedSeconds,
              };
            }
            return t;
          })
        );
        return;
      }

      const batch = writeBatch(db);
      tasksToStop.forEach(({ taskId, elapsedSeconds }) => {
        const taskRef = doc(db, 'tasks', taskId);
        batch.update(taskRef, {
          trackingStartedAt: null,
          manualTimeSpent: increment(elapsedSeconds),
        });
      });
      try {
        await batch.commit();
      } catch (err) {
        console.error('Error stopping all time tracking:', err);
        throw err;
      }
    },
    []
  );

  return {
    tasks,
    loading,
    error,
    isGuest,
    addTask,
    updateTask,
    deleteTask,
    toggleTaskCompletion,
    incrementPomodoroSession,
    archiveTask,
    toggleTaskFocus,
    setTaskDeadline,
    startTimeTracking,
    stopTimeTracking,
    startAllTimeTracking,
    stopAllTimeTracking,
    refreshGuestTasks,
  };
}
