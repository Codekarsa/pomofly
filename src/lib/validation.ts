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
  labelIds: z.array(z.string()).optional(),
  // Fields added after launch — default them so legacy documents still validate
  focus: z.boolean().default(false),
  deadline: z.string().nullable().default(null),
  manualTimeSpent: z.number().min(0, 'Manual time spent cannot be negative').default(0),
  trackingStartedAt: z.date().nullable().default(null),
  // NEW: Estimation tracking fields
  completedPomodoros: z.number().int().min(0).optional(),
  estimationSource: z.enum(['manual', 'ai-suggested', 'ai-accepted']).optional(),
  aiSuggestedEstimate: z.number().int().min(1).optional(),
  completedAt: z.date().optional(),
});

// Project validation schema
export const ProjectSchema = z.object({
  id: z.string().min(1, 'Project ID is required'),
  name: z.string().min(1, 'Project name is required').max(200, 'Project name too long'),
  userId: z.string().min(1, 'User ID is required'),
  createdAt: z.date(),
});

// Estimation Record validation schema
export const EstimationRecordSchema = z.object({
  id: z.string().min(1, 'Estimation record ID is required'),
  userId: z.string().min(1, 'User ID is required'),
  taskId: z.string().min(1, 'Task ID is required'),
  taskTitle: z.string().min(1, 'Task title is required'),
  projectId: z.string().optional(),
  estimatedPomodoros: z.number().int().min(1, 'Estimated pomodoros must be at least 1'),
  actualPomodoros: z.number().int().min(0, 'Actual pomodoros cannot be negative'),
  accuracy: z.number().min(0, 'Accuracy cannot be negative'),
  completedAt: z.date(),
  keywords: z.array(z.string()).default([]),
  createdAt: z.date(),
});

// Partial schemas for updates (all fields optional except id)
export const TaskUpdateSchema = TaskSchema.partial().extend({
  id: z.string().min(1, 'Task ID is required'),
});

export const ProjectUpdateSchema = ProjectSchema.partial().extend({
  id: z.string().min(1, 'Project ID is required'),
});

export const EstimationRecordUpdateSchema = EstimationRecordSchema.partial().extend({
  id: z.string().min(1, 'Estimation record ID is required'),
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

export const EstimationRecordCreateSchema = EstimationRecordSchema.omit({
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

export const FirebaseEstimationRecordSchema = EstimationRecordSchema.extend({
  createdAt: z.union([z.date(), z.any()]), // Firestore timestamps
  completedAt: z.union([z.date(), z.any()]), // Firestore timestamps
});

// Type exports for TypeScript
export type Task = z.infer<typeof TaskSchema>;
export type Project = z.infer<typeof ProjectSchema>;
export type EstimationRecord = z.infer<typeof EstimationRecordSchema>;
export type TaskCreate = z.infer<typeof TaskCreateSchema>;
export type ProjectCreate = z.infer<typeof ProjectCreateSchema>;
export type EstimationRecordCreate = z.infer<typeof EstimationRecordCreateSchema>;
export type TaskUpdate = z.infer<typeof TaskUpdateSchema>;
export type ProjectUpdate = z.infer<typeof ProjectUpdateSchema>;
export type EstimationRecordUpdate = z.infer<typeof EstimationRecordUpdateSchema>;

/**
 * Validation helper functions
 */
export function validateTask(data: unknown): Task {
  return TaskSchema.parse(data);
}

export function validateProject(data: unknown): Project {
  return ProjectSchema.parse(data);
}

export function validateEstimationRecord(data: unknown): EstimationRecord {
  return EstimationRecordSchema.parse(data);
}

export function validateTaskCreate(data: unknown): TaskCreate {
  return TaskCreateSchema.parse(data);
}

export function validateProjectCreate(data: unknown): ProjectCreate {
  return ProjectCreateSchema.parse(data);
}

export function validateEstimationRecordCreate(data: unknown): EstimationRecordCreate {
  return EstimationRecordCreateSchema.parse(data);
}

export function validateTaskUpdate(data: unknown): TaskUpdate {
  return TaskUpdateSchema.parse(data);
}

export function validateProjectUpdate(data: unknown): ProjectUpdate {
  return ProjectUpdateSchema.parse(data);
}

export function validateEstimationRecordUpdate(data: unknown): EstimationRecordUpdate {
  return EstimationRecordUpdateSchema.parse(data);
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

export function safeValidateEstimationRecord(data: unknown) {
  return EstimationRecordSchema.safeParse(data);
}

export function safeValidateFirebaseTask(data: unknown) {
  return FirebaseTaskSchema.safeParse(data);
}

export function safeValidateFirebaseProject(data: unknown) {
  return FirebaseProjectSchema.safeParse(data);
}

export function safeValidateFirebaseEstimationRecord(data: unknown) {
  return FirebaseEstimationRecordSchema.safeParse(data);
}

/**
 * Transform Firebase document data to validated types
 */

// Firestore Timestamp-like value: has an optional toDate() (Firestore Timestamp),
// or is a raw Date/string/number that the Date constructor accepts.
type FirestoreDateValue = (Date | string | number) & { toDate?: () => Date };

interface FirestoreDocData extends Record<string, unknown> {
  createdAt?: FirestoreDateValue;
  trackingStartedAt?: FirestoreDateValue | null;
  completedAt?: FirestoreDateValue;
}

export function transformFirebaseTask(docData: FirestoreDocData): Task {
  const transformed = {
    ...docData,
    createdAt: docData.createdAt?.toDate?.() || new Date(docData.createdAt as Date | string | number),
    trackingStartedAt: docData.trackingStartedAt?.toDate?.() || 
                      (docData.trackingStartedAt ? new Date(docData.trackingStartedAt) : null),
  };
  return validateTask(transformed);
}

export function transformFirebaseProject(docData: FirestoreDocData): Project {
  const transformed = {
    ...docData,
    createdAt: docData.createdAt?.toDate?.() || new Date(docData.createdAt as Date | string | number),
  };
  return validateProject(transformed);
}

export function transformFirebaseEstimationRecord(docData: FirestoreDocData): EstimationRecord {
  const transformed = {
    ...docData,
    createdAt: docData.createdAt?.toDate?.() || new Date(docData.createdAt as Date | string | number),
    completedAt: docData.completedAt?.toDate?.() || new Date(docData.completedAt as Date | string | number),
  };
  return validateEstimationRecord(transformed);
}

/**
 * Utility functions for estimation system
 */
export function extractKeywords(title: string): string[] {
  const stopWords = ['the', 'a', 'an', 'to', 'for', 'of', 'and', 'in', 'on'];
  return title
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));
}