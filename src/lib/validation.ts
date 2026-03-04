import { z } from 'zod';

/**
 * Validation schemas for Firebase data models
 * Ensures data integrity and type safety for all Firebase operations
 */

// Task validation schema
export const TaskSchema = z.object({
  id: z.string().min(1, 'Task ID is required'),
  title: z.string().min(1, 'Task title is required').max(500, 'Task title too long'),
  projectId: z.string().min(1, 'Project ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  completed: z.boolean(),
  totalPomodoroSessions: z.number().int().min(0, 'Total sessions cannot be negative'),
  totalTimeSpent: z.number().min(0, 'Total time spent cannot be negative'),
  createdAt: z.date(),
  estimatedPomodoros: z.number().int().min(1, 'Estimated pomodoros must be at least 1').optional(),
  archived: z.boolean().optional().default(false),
  focus: z.boolean(),
  deadline: z.string().nullable(),
  manualTimeSpent: z.number().min(0, 'Manual time spent cannot be negative'),
  trackingStartedAt: z.date().nullable(),
});

// Project validation schema
export const ProjectSchema = z.object({
  id: z.string().min(1, 'Project ID is required'),
  name: z.string().min(1, 'Project name is required').max(200, 'Project name too long'),
  userId: z.string().min(1, 'User ID is required'),
  createdAt: z.date(),
});

// Partial schemas for updates (all fields optional except id)
export const TaskUpdateSchema = TaskSchema.partial().extend({
  id: z.string().min(1, 'Task ID is required'),
});

export const ProjectUpdateSchema = ProjectSchema.partial().extend({
  id: z.string().min(1, 'Project ID is required'),
});

// Creation schemas (without id and auto-generated fields)
export const TaskCreateSchema = TaskSchema.omit({
  id: true,
  createdAt: true,
  totalPomodoroSessions: true,
  totalTimeSpent: true,
  manualTimeSpent: true,
  trackingStartedAt: true,
}).extend({
  totalPomodoroSessions: z.number().int().min(0).default(0),
  totalTimeSpent: z.number().min(0).default(0),
  manualTimeSpent: z.number().min(0).default(0),
  trackingStartedAt: z.date().nullable().default(null),
});

export const ProjectCreateSchema = ProjectSchema.omit({
  id: true,
  createdAt: true,
});

// Firebase document schemas (for data coming from Firestore)
export const FirebaseTaskSchema = TaskSchema.extend({
  createdAt: z.union([z.date(), z.any()]), // Firestore timestamps
  trackingStartedAt: z.union([z.date(), z.any(), z.null()]),
});

export const FirebaseProjectSchema = ProjectSchema.extend({
  createdAt: z.union([z.date(), z.any()]), // Firestore timestamps
});

// Type exports for TypeScript
export type Task = z.infer<typeof TaskSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type TaskCreate = z.infer<typeof TaskCreateSchema>;
export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;
export type TaskUpdate = z.infer<typeof TaskUpdateSchema>;
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;

/**
 * Validation helper functions
 */
export function validateTask(data: unknown): Task {
  return TaskSchema.parse(data);
}

export function validateProject(data: unknown): Project {
  return ProjectSchema.parse(data);
}

export function validateTaskCreate(data: unknown): TaskCreate {
  return TaskCreateSchema.parse(data);
}

export function validateProjectCreate(data: unknown): ProjectCreate {
  return ProjectCreateSchema.parse(data);
}

export function validateTaskUpdate(data: unknown): TaskUpdate {
  return TaskUpdateSchema.parse(data);
}

export function validateProjectUpdate(data: unknown): ProjectUpdate {
  return ProjectUpdateSchema.parse(data);
}

/**
 * Safe validation functions that return validation results instead of throwing
 */
export function safeValidateTask(data: unknown) {
  return TaskSchema.safeParse(data);
}

export function safeValidateProject(data: unknown) {
  return ProjectSchema.safeParse(data);
}

export function safeValidateFirebaseTask(data: unknown) {
  return FirebaseTaskSchema.safeParse(data);
}

export function safeValidateFirebaseProject(data: unknown) {
  return FirebaseProjectSchema.safeParse(data);
}

/**
 * Transform Firebase document data to validated types
 */
export function transformFirebaseTask(docData: any): Task {
  const transformed = {
    ...docData,
    createdAt: docData.createdAt?.toDate?.() || new Date(docData.createdAt),
    trackingStartedAt: docData.trackingStartedAt?.toDate?.() || 
                      (docData.trackingStartedAt ? new Date(docData.trackingStartedAt) : null),
  };
  return validateTask(transformed);
}

export function transformFirebaseProject(docData: any): Project {
  const transformed = {
    ...docData,
    createdAt: docData.createdAt?.toDate?.() || new Date(docData.createdAt),
  };
  return validateProject(transformed);
}