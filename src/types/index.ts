// Common types used across the Pomofly app
export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  userId: string;
  projectId?: string;
  pomodorosRequired: number;
  pomodorosCompleted: number;
  priority?: 'low' | 'medium' | 'high';
  tags?: string[];
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
  completedAt?: FirebaseTimestamp;
}

export interface PomodoroSession {
  id: string;
  taskId: string;
  userId: string;
  duration: number; // in minutes
  completedAt: FirebaseTimestamp;
  type: 'work' | 'short-break' | 'long-break';
  interrupted?: boolean;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  userId: string;
  color?: string;
  createdAt: FirebaseTimestamp;
  updatedAt: FirebaseTimestamp;
}

export interface User {
  id: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  settings: UserSettings;
  createdAt: FirebaseTimestamp;
  lastActiveAt: FirebaseTimestamp;
}

export interface UserSettings {
  workDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  longBreakInterval: number; // after how many work sessions
  autoStartBreaks: boolean;
  autoStartPomodoros: boolean;
  notifications: {
    desktop: boolean;
    sound: boolean;
    email: boolean;
  };
  theme: 'light' | 'dark' | 'system';
  dailyGoal?: number; // target pomodoros per day
}

export interface Statistics {
  userId: string;
  date: string; // YYYY-MM-DD format
  completedPomodoros: number;
  totalWorkTime: number; // in minutes
  tasksCompleted: number;
  averageFocusTime: number; // in minutes
}

// Firebase timestamp type helper
export type FirebaseTimestamp = 
  | Date 
  | { toDate(): Date; toMillis(): number } 
  | string;

// Timer states
export type TimerState = 'idle' | 'running' | 'paused' | 'completed';

// Timer types
export type TimerType = 'work' | 'short-break' | 'long-break';

// API response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// Claude AI integration types
export interface TaskBreakdown {
  id: string;
  originalTask: string;
  subtasks: Subtask[];
  estimatedPomodoros: number;
  generatedAt: FirebaseTimestamp;
}

export interface Subtask {
  id: string;
  title: string;
  description?: string;
  estimatedDuration: number; // in minutes
  completed: boolean;
  order: number;
}

// Form types
export interface TaskFormData {
  title: string;
  description?: string;
  pomodorosRequired: number;
  priority?: 'low' | 'medium' | 'high';
  projectId?: string;
  tags?: string[];
}

export interface ProjectFormData {
  name: string;
  description?: string;
  color?: string;
}

// Hook return types
export interface UseTimerReturn {
  timeLeft: number;
  isRunning: boolean;
  isPaused: boolean;
  timerType: TimerType;
  currentSession: number;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  skipTimer: () => void;
}

export interface UseTasksReturn {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  createTask: (data: TaskFormData) => Promise<void>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskComplete: (id: string) => Promise<void>;
}

// Component prop types
export interface TimerDisplayProps {
  timeLeft: number;
  timerType: TimerType;
  isRunning: boolean;
  className?: string;
}

export interface TaskListProps {
  tasks: Task[];
  onTaskSelect?: (task: Task) => void;
  onTaskUpdate?: (task: Task) => void;
  onTaskDelete?: (taskId: string) => void;
  selectedTaskId?: string;
  showCompleted?: boolean;
}

// Event types for analytics
export type AnalyticsEvent = 
  | 'timer_started'
  | 'timer_paused'
  | 'timer_completed'
  | 'timer_skipped'
  | 'task_created'
  | 'task_completed'
  | 'task_updated'
  | 'task_deleted'
  | 'pomodoro_completed'
  | 'break_completed';

export interface AnalyticsEventData {
  event: AnalyticsEvent;
  properties?: Record<string, unknown>;
  timestamp: FirebaseTimestamp;
  userId: string;
}