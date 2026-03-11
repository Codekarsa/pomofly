import {
  Firestore,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  increment,
  Timestamp
} from 'firebase/firestore';
import { ITaskService, Task, TaskFilter, TaskUpdate, CreateTaskData } from '../interfaces/ITaskService';
import { IAuthService } from '../interfaces/IAuthService';

export class FirebaseTaskService implements ITaskService {
  private readonly collectionName = 'tasks';

  constructor(
    private db: Firestore,
    private authService: IAuthService
  ) {}

  private validateAuthentication(): string {
    const userId = this.authService.getCurrentUserId();
    if (!userId) {
      throw new Error('User not authenticated');
    }
    return userId;
  }

  private mapFirestoreTask(doc: any): Task {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title,
      projectId: data.projectId,
      userId: data.userId,
      completed: data.completed,
      totalPomodoroSessions: data.totalPomodoroSessions,
      totalTimeSpent: data.totalTimeSpent,
      createdAt: data.createdAt?.toDate() || new Date(),
      estimatedPomodoros: data.estimatedPomodoros,
      archived: data.archived || false,
      focus: data.focus,
      deadline: data.deadline,
      manualTimeSpent: data.manualTimeSpent,
      trackingStartedAt: data.trackingStartedAt?.toDate() || null,
    };
  }

  private buildQuery(filter?: TaskFilter) {
    const userId = this.validateAuthentication();
    let baseQuery = query(collection(this.db, this.collectionName), where("userId", "==", userId));

    if (filter) {
      if (filter.projectId !== undefined) {
        baseQuery = query(baseQuery, where("projectId", "==", filter.projectId));
      }
      if (filter.completed !== undefined) {
        baseQuery = query(baseQuery, where("completed", "==", filter.completed));
      }
      if (filter.archived !== undefined) {
        baseQuery = query(baseQuery, where("archived", "==", filter.archived));
      }
      if (filter.focus !== undefined) {
        baseQuery = query(baseQuery, where("focus", "==", filter.focus));
      }
    }

    return baseQuery;
  }

  async getTasks(filter?: TaskFilter): Promise<Task[]> {
    try {
      const querySnapshot = await getDocs(this.buildQuery(filter));
      const tasks: Task[] = [];
      querySnapshot.forEach((doc) => {
        tasks.push(this.mapFirestoreTask(doc));
      });
      return tasks;
    } catch (error) {
      console.error('Error fetching tasks:', error);
      throw new Error('Failed to fetch tasks');
    }
  }

  async getTask(id: string): Promise<Task | null> {
    try {
      this.validateAuthentication();
      const docRef = doc(this.db, this.collectionName, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const task = this.mapFirestoreTask(docSnap);
        // Verify ownership
        if (task.userId !== this.authService.getCurrentUserId()) {
          throw new Error('Unauthorized access to task');
        }
        return task;
      }
      return null;
    } catch (error) {
      console.error('Error fetching task:', error);
      throw new Error('Failed to fetch task');
    }
  }

  async createTask(data: CreateTaskData): Promise<string> {
    try {
      const userId = this.validateAuthentication();
      
      const taskData = {
        title: data.title,
        projectId: data.projectId,
        userId,
        completed: false,
        totalPomodoroSessions: 0,
        totalTimeSpent: 0,
        createdAt: Timestamp.now(),
        estimatedPomodoros: data.estimatedPomodoros || null,
        archived: false,
        focus: data.focus || false,
        deadline: data.deadline || null,
        manualTimeSpent: 0,
        trackingStartedAt: null,
      };

      const docRef = await addDoc(collection(this.db, this.collectionName), taskData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating task:', error);
      throw new Error('Failed to create task');
    }
  }

  async updateTask(id: string, updates: TaskUpdate): Promise<void> {
    try {
      const userId = this.validateAuthentication();
      
      // First verify ownership
      const existingTask = await this.getTask(id);
      if (!existingTask) {
        throw new Error('Task not found');
      }

      const updateData: any = { ...updates };
      
      // Convert dates to Firestore timestamps
      if (updates.trackingStartedAt !== undefined) {
        updateData.trackingStartedAt = updates.trackingStartedAt ? 
          Timestamp.fromDate(updates.trackingStartedAt) : null;
      }

      const docRef = doc(this.db, this.collectionName, id);
      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error('Error updating task:', error);
      throw new Error('Failed to update task');
    }
  }

  async deleteTask(id: string): Promise<void> {
    try {
      // Verify ownership first
      const existingTask = await this.getTask(id);
      if (!existingTask) {
        throw new Error('Task not found');
      }

      const docRef = doc(this.db, this.collectionName, id);
      await deleteDoc(docRef);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw new Error('Failed to delete task');
    }
  }

  async updateMultipleTasks(taskIds: string[], updates: TaskUpdate): Promise<void> {
    try {
      const userId = this.validateAuthentication();
      const batch = writeBatch(this.db);

      // Verify ownership of all tasks first
      for (const taskId of taskIds) {
        const task = await this.getTask(taskId);
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }
      }

      // Prepare update data
      const updateData: any = { ...updates };
      if (updates.trackingStartedAt !== undefined) {
        updateData.trackingStartedAt = updates.trackingStartedAt ? 
          Timestamp.fromDate(updates.trackingStartedAt) : null;
      }

      // Add updates to batch
      for (const taskId of taskIds) {
        const docRef = doc(this.db, this.collectionName, taskId);
        batch.update(docRef, updateData);
      }

      await batch.commit();
    } catch (error) {
      console.error('Error updating multiple tasks:', error);
      throw new Error('Failed to update multiple tasks');
    }
  }

  async deleteMultipleTasks(taskIds: string[]): Promise<void> {
    try {
      const batch = writeBatch(this.db);

      // Verify ownership of all tasks first
      for (const taskId of taskIds) {
        const task = await this.getTask(taskId);
        if (!task) {
          throw new Error(`Task ${taskId} not found`);
        }
      }

      // Add deletions to batch
      for (const taskId of taskIds) {
        const docRef = doc(this.db, this.collectionName, taskId);
        batch.delete(docRef);
      }

      await batch.commit();
    } catch (error) {
      console.error('Error deleting multiple tasks:', error);
      throw new Error('Failed to delete multiple tasks');
    }
  }

  subscribeTasks(
    filter: TaskFilter | undefined,
    callback: (tasks: Task[]) => void,
    onError?: (error: Error) => void
  ): () => void {
    try {
      const queryRef = this.buildQuery(filter);
      
      return onSnapshot(
        queryRef,
        (querySnapshot) => {
          const tasks: Task[] = [];
          querySnapshot.forEach((doc) => {
            tasks.push(this.mapFirestoreTask(doc));
          });
          callback(tasks);
        },
        (error) => {
          console.error('Error in task subscription:', error);
          const errorObj = new Error('Task subscription failed');
          if (onError) {
            onError(errorObj);
          }
        }
      );
    } catch (error) {
      console.error('Error setting up task subscription:', error);
      throw new Error('Failed to setup task subscription');
    }
  }

  async markCompleted(id: string): Promise<void> {
    await this.updateTask(id, { completed: true });
  }

  async markIncomplete(id: string): Promise<void> {
    await this.updateTask(id, { completed: false });
  }

  async addPomodoroSession(id: string, sessionTime: number): Promise<void> {
    try {
      const docRef = doc(this.db, this.collectionName, id);
      await updateDoc(docRef, {
        totalPomodoroSessions: increment(1),
        totalTimeSpent: increment(sessionTime)
      });
    } catch (error) {
      console.error('Error adding pomodoro session:', error);
      throw new Error('Failed to add pomodoro session');
    }
  }

  async updateTimeSpent(id: string, additionalTime: number): Promise<void> {
    try {
      const docRef = doc(this.db, this.collectionName, id);
      await updateDoc(docRef, {
        totalTimeSpent: increment(additionalTime)
      });
    } catch (error) {
      console.error('Error updating time spent:', error);
      throw new Error('Failed to update time spent');
    }
  }
}