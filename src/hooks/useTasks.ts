import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc, increment } from "firebase/firestore";
import { db, auth } from '../lib/firebase';

export interface Task {
  id: string;
  title: string;
  projectId: string;
  userId: string;
  completed: boolean;
  totalPomodoroSessions: number;
  totalTimeSpent: number;
  createdAt: Date;
  estimatedPomodoros?: number;
  archived?: boolean;
  focus: boolean;
  deadline: string | null;
}

export function useTasks(projectId?: string) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      setError(new Error('User not authenticated'));
      return;
    }

    let tasksQuery = query(collection(db, "tasks"), where("userId", "==", user.uid));
    
    if (projectId) {
      tasksQuery = query(tasksQuery, where("projectId", "==", projectId));
    }
    
    const unsubscribe = onSnapshot(
      tasksQuery,
      (querySnapshot) => {
        const taskList: Task[] = [];
        querySnapshot.forEach((doc) => {
          taskList.push({ id: doc.id, ...doc.data() } as Task);
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

  const addTask = useCallback(async (title: string, projectId: string, estimatedPomodoros?: number) => {
    const user = auth.currentUser;
    if (!user) throw new Error('User not authenticated');

    try {
      const newTask = {
        title,
        projectId,
        userId: user.uid,
        completed: false,
        totalPomodoroSessions: 0,
        totalTimeSpent: 0,
        createdAt: new Date(),
        estimatedPomodoros,
        focus: false,
        deadline: null
      };
      const docRef = await addDoc(collection(db, "tasks"), newTask);
      return docRef.id;
    } catch (err) {
      console.error("Error adding task:", err);
      throw err;
    }
  }, []);

  const updateTask = useCallback(async (taskId: string, updates: Partial<Task>) => {
    const taskRef = doc(db, "tasks", taskId);
    try {
      await updateDoc(taskRef, updates);
    } catch (error) {
      console.error("Error updating task:", error);
      throw error;
    }
  }, []);

  const deleteTask = useCallback(async (id: string) => {
    try {
      await deleteDoc(doc(db, "tasks", id));
    } catch (err) {
      console.error("Error deleting task:", err);
      throw err;
    }
  }, []);

  const toggleTaskCompletion = useCallback(async (id: string, currentCompletionState: boolean) => {
    try {
      await updateDoc(doc(db, "tasks", id), {
        completed: !currentCompletionState
      });
    } catch (err) {
      console.error("Error toggling task completion:", err);
      throw err;
    }
  }, []);

  const incrementPomodoroSession = useCallback(async (id: string, duration: number) => {
    try {
      await updateDoc(doc(db, "tasks", id), {
        totalPomodoroSessions: increment(1),
        totalTimeSpent: increment(duration)
      });
    } catch (err) {
      console.error("Error incrementing pomodoro session:", err);
      throw err;
    }
  }, []);

  const archiveTask = useCallback(async (id: string) => {
    try {
      await updateDoc(doc(db, "tasks", id), { archived: true });
    } catch (err) {
      console.error("Error archiving task:", err);
      throw err;
    }
  }, []);

  const toggleTaskFocus = useCallback(async (id: string, currentFocusState: boolean) => {
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
    try {
      await updateDoc(doc(db, "tasks", id), {
        deadline
      });
    } catch (err) {
      console.error("Error setting task deadline:", err);
      throw err;
    }
  }, []);

  return { 
    tasks, 
    loading, 
    error, 
    addTask, 
    updateTask, 
    deleteTask, 
    toggleTaskCompletion, 
    incrementPomodoroSession, 
    archiveTask, 
    toggleTaskFocus,
    setTaskDeadline
  };
}