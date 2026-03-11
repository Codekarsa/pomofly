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
  manualTimeSpent: number;
  trackingStartedAt: Date | null;
}

export interface TaskFilter {
  projectId?: string;
  completed?: boolean;
  archived?: boolean;
  focus?: boolean;
}

export interface TaskUpdate {
  title?: string;
  projectId?: string;
  completed?: boolean;
  totalPomodoroSessions?: number;
  totalTimeSpent?: number;
  estimatedPomodoros?: number;
  archived?: boolean;
  focus?: boolean;
  deadline?: string | null;
  manualTimeSpent?: number;
  trackingStartedAt?: Date | null;
}

export interface CreateTaskData {
  title: string;
  projectId: string;
  estimatedPomodoros?: number;
  focus?: boolean;
  deadline?: string | null;
}

export interface ITaskService {
  // CRUD operations
  getTasks(filter?: TaskFilter): Promise<Task[]>;
  getTask(id: string): Promise<Task | null>;
  createTask(data: CreateTaskData): Promise<string>;
  updateTask(id: string, updates: TaskUpdate): Promise<void>;
  deleteTask(id: string): Promise<void>;
  
  // Bulk operations
  updateMultipleTasks(taskIds: string[], updates: TaskUpdate): Promise<void>;
  deleteMultipleTasks(taskIds: string[]): Promise<void>;
  
  // Real-time subscriptions
  subscribeTasks(
    filter: TaskFilter | undefined,
    callback: (tasks: Task[]) => void,
    onError?: (error: Error) => void
  ): () => void;
  
  // Task-specific operations
  markCompleted(id: string): Promise<void>;
  markIncomplete(id: string): Promise<void>;
  addPomodoroSession(id: string, sessionTime: number): Promise<void>;
  updateTimeSpent(id: string, additionalTime: number): Promise<void>;
}