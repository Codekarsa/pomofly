import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, deleteField, doc, increment, writeBatch } from "firebase/firestore";
import { db, auth, addEstimationRecord } from '../lib/firebase';
import {
  getGuestTasks,
  addGuestTask,
  updateGuestTask,
  deleteGuestTask,
  saveGuestTasks,
  generateGuestId,
  GUEST_TASKS_CHANGED_EVENT,
} from '../lib/guestStorage';
import {
  transformFirebaseTask,
  validateTaskCreate,
  validateTaskUpdate,
  type Task
} from '../lib/validation';

// Task types now live in validation.ts; re-export for consumers
export type { Task, TaskCreate, TaskUpdate } from '../lib/validation';

export function useTasks(projectId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      // Guest mode: use localStorage
      setIsGuest(true);
      const refresh = () => {
        const guestTasks = getGuestTasks();
        setTasks(projectId ? guestTasks.filter(t => t.projectId === projectId) : guestTasks);
      };
      refresh();
      window.addEventListener(GUEST_TASKS_CHANGED_EVENT, refresh);
      window.addEventListener('storage', refresh);
      setLoading(false);
      setError(null);
      return () => {
        window.removeEventListener(GUEST_TASKS_CHANGED_EVENT, refresh);
        window.removeEventListener('storage', refresh);
      };
    }

    setIsGuest(false);
    let tasksQuery = query(collection(db, "tasks"), where("userId", "==", user.uid));

    if (projectId) {
      tasksQuery = query(tasksQuery, where("projectId", "==", projectId));
    }

    const unsubscribe = onSnapshot(
      tasksQuery,
      (querySnapshot) => {
        const taskList: Task[] = [];
        querySnapshot.forEach((doc) => {
          try {
            const validatedTask = transformFirebaseTask({ id: doc.id, ...doc.data() });
            taskList.push(validatedTask);
          } catch (validationError) {
            console.error(`Invalid task data for document ${doc.id}:`, validationError);
            // Skip invalid tasks but continue processing others
          }
        });
        setTasks(taskList);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching tasks:", err);
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
        guestTasks = guestTasks.filter(t => t.projectId === projectId);
      }
      setTasks(guestTasks);
    }
  }, [isGuest, projectId]);

  const addTask = useCallback(async (title: string, taskProjectId = '', estimatedPomodoros?: number, focus?: boolean, labelIds?: string[], dates: Pick<Task, 'plannedFor' | 'deadline'> = { deadline: null }) => {
    const user = auth.currentUser;

    try {
      const newTaskData = validateTaskCreate({
        title,
        projectId: taskProjectId,
        userId: user?.uid || 'guest',
        completed: false,
        focus: focus ?? false,
        deadline: dates.deadline,
        plannedFor: dates.plannedFor ?? null,
        // Firestore rejects undefined values, so only include the key when provided
        ...(estimatedPomodoros !== undefined ? { estimatedPomodoros, estimationSource: 'manual' } : {}),
        ...(labelIds ? { labelIds } : {}),
      });

      if (!user) {
        // Guest mode
        const newTask = addGuestTask(newTaskData);
        return newTask.id;
      }

      const docRef = await addDoc(collection(db, "tasks"), { ...newTaskData, createdAt: new Date() });
      return docRef.id;
    } catch (err) {
      console.error("Error adding task:", err);
      throw err;
    }
  }, []);

  const addTasks = useCallback(async (titles: string[], taskProjectId = '', estimatedPomodoros?: number, focus = false, labelIds: string[] = [], dates: Pick<Task, 'plannedFor' | 'deadline'> = { deadline: null }) => {
    if (titles.length === 0 || titles.length > 500) throw new Error('Enter between 1 and 500 tasks.');
    const user = auth.currentUser;
    // Validate every line before writing any tasks, so a bad line cannot create a partial batch.
    const data = titles.map(title => validateTaskCreate({
      title: title.trim(), projectId: taskProjectId, userId: user?.uid || 'guest',
      completed: false, focus, labelIds, deadline: dates.deadline, plannedFor: dates.plannedFor ?? null,
      ...(estimatedPomodoros !== undefined ? { estimatedPomodoros, estimationSource: 'manual' } : {}),
    }));
    const createdAt = new Date();
    if (!user) {
      const newTasks = data.map(task => ({ ...task, id: generateGuestId(), createdAt }));
      saveGuestTasks([...getGuestTasks(), ...newTasks]);
      return newTasks.map(task => task.id);
    }
    const batch = writeBatch(db);
    const refs = data.map(task => {
      const ref = doc(collection(db, 'tasks'));
      batch.set(ref, { ...task, createdAt });
      return ref;
    });
    await batch.commit();
    return refs.map(ref => ref.id);
  }, []);

  const setTaskDates = useCallback(async (taskIds: string[], dates: Partial<Pick<Task, 'plannedFor' | 'deadline'>>) => {
    if (taskIds.length === 0) return;
    if (taskIds.length > 500) throw new Error('Select at most 500 tasks at a time.');
    const validated = validateTaskUpdate({ id: taskIds[0], ...dates });
    const updates = Object.fromEntries(Object.entries(validated).filter(([key]) =>
      (key === 'plannedFor' || key === 'deadline') && Object.prototype.hasOwnProperty.call(dates, key)
    ));
    if (!auth.currentUser) {
      saveGuestTasks(getGuestTasks().map(task => taskIds.includes(task.id) ? { ...task, ...updates } : task));
      return;
    }
    const batch = writeBatch(db);
    taskIds.forEach(id => batch.update(doc(db, 'tasks', id), updates));
    await batch.commit();
  }, []);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const user = auth.currentUser;

    try {
      // Validate the updates
      const validatedUpdates = validateTaskUpdate({ id: taskId, ...updates });
      // Schema defaults belong to creation, not to fields omitted from an edit.
      const updateData = Object.fromEntries(Object.entries(validatedUpdates).filter(([key]) =>
        key !== 'id' && Object.prototype.hasOwnProperty.call(updates, key)
      ));

      if (!user) {
        // Guest mode
        updateGuestTask(taskId, updateData);
        return;
      }

      const taskRef = doc(db, "tasks", taskId);
      // Clearing an optional field must remove it, not send undefined to Firestore.
      const firestoreUpdates = Object.fromEntries(Object.entries(updateData).map(([key, value]) =>
        [key, value === undefined ? deleteField() : value]
      ));
      await updateDoc(taskRef, firestoreUpdates);
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    const user = auth.currentUser;

    if (!user) {
      // Guest mode
      deleteGuestTask(id);
      return;
    }

    try {
      await deleteDoc(doc(db, "tasks", id));
    } catch (err) {
      console.error("Error deleting task:", err);
      throw err;
    }
  }, []);

  const toggleTaskCompletion = useCallback(async (id: string, currentCompletionState: boolean) => {
    const user = auth.currentUser;

    // Find the task to get its details
    const task = tasks.find(t => t.id === id);
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
      return;
    }

    try {
      const taskRef = doc(db, "tasks", id);

      if (!currentCompletionState) {
        // Store completion data
        await updateDoc(taskRef, {
          completed: true,
          completedAt: new Date(),
          completedPomodoros: task.totalPomodoroSessions || 0
        });
        // Add to estimation history
        await addEstimationRecord(user.uid, task);
      } else {
        // Mark as incomplete
        await updateDoc(taskRef, {
          completed: false
        });
      }
    } catch (err) {
      console.error("Error toggling task completion:", err);
      throw err;
    }
  }, [tasks]);

  const incrementPomodoroSession = useCallback(async (id: string, duration: number) => {
    const user = auth.currentUser;

    if (!user) {
      // Guest mode
      const task = tasks.find(t => t.id === id);
      if (task) {
        const updates = {
          totalPomodoroSessions: task.totalPomodoroSessions + 1,
          totalTimeSpent: task.totalTimeSpent + duration
        };
        updateGuestTask(id, updates);
      }
      return;
    }

    try {
      await updateDoc(doc(db, "tasks", id), {
        totalPomodoroSessions: increment(1),
        totalTimeSpent: increment(duration)
      });
    } catch (err) {
      console.error("Error incrementing pomodoro session:", err);
      throw err;
    }
  }, [tasks]);

  const archiveTask = useCallback(async (id: string) => {
    const user = auth.currentUser;

    if (!user) {
      // Guest mode
      updateGuestTask(id, { archived: true });
      return;
    }

    try {
      await updateDoc(doc(db, "tasks", id), { archived: true });
    } catch (err) {
      console.error("Error archiving task:", err);
      throw err;
    }
  }, []);

  const toggleTaskFocus = useCallback(async (id: string, currentFocusState: boolean) => {
    const user = auth.currentUser;

    if (!user) {
      // Guest mode
      updateGuestTask(id, { focus: !currentFocusState });
      return;
    }

    try {
      await updateDoc(doc(db, "tasks", id), {
        focus: !currentFocusState
      });
    } catch (err) {
      console.error("Error toggling task focus:", err);
      throw err;
    }
  }, []);

  const setTaskDeadline = useCallback(async (id: string, deadline: string | null) => {
    const user = auth.currentUser;

    if (!user) {
      // Guest mode
      updateGuestTask(id, { deadline });
      return;
    }

    try {
      await updateDoc(doc(db, "tasks", id), {
        deadline
      });
    } catch (err) {
      console.error("Error setting task deadline:", err);
      throw err;
    }
  }, []);

  const startTimeTracking = useCallback(async (taskId: string) => {
    const user = auth.currentUser;
    const now = new Date();

    if (!user) {
      // Guest mode
      updateGuestTask(taskId, { trackingStartedAt: now });
      return;
    }

    try {
      await updateDoc(doc(db, "tasks", taskId), {
        trackingStartedAt: now
      });
    } catch (err) {
      console.error("Error starting time tracking:", err);
      throw err;
    }
  }, []);

  const stopTimeTracking = useCallback(async (taskId: string, elapsedSeconds: number) => {
    const user = auth.currentUser;

    if (!user) {
      // Guest mode
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const updates = {
          trackingStartedAt: null,
          manualTimeSpent: task.manualTimeSpent + elapsedSeconds
        };
        updateGuestTask(taskId, updates);
      }
      return;
    }

    try {
      await updateDoc(doc(db, "tasks", taskId), {
        trackingStartedAt: null,
        manualTimeSpent: increment(elapsedSeconds)
      });
    } catch (err) {
      console.error("Error stopping time tracking:", err);
      throw err;
    }
  }, [tasks]);

  const startAllTimeTracking = useCallback(async (taskIds: string[]) => {
    if (taskIds.length === 0) return;
    const user = auth.currentUser;
    const now = new Date();

    if (!user) {
      // Guest mode
      const allTasks = getGuestTasks();
      const updatedTasks = allTasks.map(t =>
        taskIds.includes(t.id) ? { ...t, trackingStartedAt: now } : t
      );
      saveGuestTasks(updatedTasks);
      return;
    }

    const batch = writeBatch(db);
    taskIds.forEach(taskId => {
      const taskRef = doc(db, "tasks", taskId);
      batch.update(taskRef, { trackingStartedAt: now });
    });
    try {
      await batch.commit();
    } catch (err) {
      console.error("Error starting all time tracking:", err);
      throw err;
    }
  }, []);

  const stopAllTimeTracking = useCallback(async (tasksToStop: Array<{ taskId: string; elapsedSeconds: number }>) => {
    if (tasksToStop.length === 0) return;
    const user = auth.currentUser;

    if (!user) {
      // Guest mode
      const allTasks = getGuestTasks();
      const updatedTasks = allTasks.map(t => {
        const stopInfo = tasksToStop.find(s => s.taskId === t.id);
        if (stopInfo) {
          return {
            ...t,
            trackingStartedAt: null,
            manualTimeSpent: t.manualTimeSpent + stopInfo.elapsedSeconds
          };
        }
        return t;
      });
      saveGuestTasks(updatedTasks);
      return;
    }

    const batch = writeBatch(db);
    tasksToStop.forEach(({ taskId, elapsedSeconds }) => {
      const taskRef = doc(db, "tasks", taskId);
      batch.update(taskRef, {
        trackingStartedAt: null,
        manualTimeSpent: increment(elapsedSeconds)
      });
    });
    try {
      await batch.commit();
    } catch (err) {
      console.error("Error stopping all time tracking:", err);
      throw err;
    }
  }, []);

  return {
    tasks,
    loading,
    error,
    isGuest,
    addTask,
    addTasks,
    setTaskDates,
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
    refreshGuestTasks
  };
}
