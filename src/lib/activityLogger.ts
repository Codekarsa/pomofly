import { z } from 'zod';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  getDocs, 
  orderBy, 
  limit as firestoreLimit,
  Timestamp 
} from "firebase/firestore";
import { getDB } from "./firebase";

/**
 * Activity Logger - Comprehensive audit trail system
 * Tracks all user activities for debugging, compliance, and security
 */

// Activity types enum
export const ActivityTypes = {
  // Authentication events
  USER_LOGIN: 'user_login',
  USER_LOGOUT: 'user_logout',
  USER_REGISTRATION: 'user_registration',
  
  // Task operations
  TASK_CREATED: 'task_created',
  TASK_UPDATED: 'task_updated',
  TASK_DELETED: 'task_deleted',
  TASK_COMPLETED: 'task_completed',
  TASK_ARCHIVED: 'task_archived',
  TASK_RESTORED: 'task_restored',
  
  // Project operations
  PROJECT_CREATED: 'project_created',
  PROJECT_UPDATED: 'project_updated',
  PROJECT_DELETED: 'project_deleted',
  
  // Timer events
  TIMER_STARTED: 'timer_started',
  TIMER_PAUSED: 'timer_paused',
  TIMER_RESUMED: 'timer_resumed',
  TIMER_STOPPED: 'timer_stopped',
  TIMER_COMPLETED: 'timer_completed',
  TIMER_RESET: 'timer_reset',
  
  // Settings and preferences
  SETTINGS_UPDATED: 'settings_updated',
  NOTIFICATION_SETTINGS_UPDATED: 'notification_settings_updated',
  
  // Data operations
  DATA_EXPORTED: 'data_exported',
  DATA_IMPORTED: 'data_imported',
  
  // Security events
  UNAUTHORIZED_ACCESS_ATTEMPT: 'unauthorized_access_attempt',
  PERMISSION_DENIED: 'permission_denied',
  
  // System events
  SESSION_CREATED: 'session_created',
  SESSION_EXPIRED: 'session_expired',
  
} as const;

export type ActivityType = typeof ActivityTypes[keyof typeof ActivityTypes];

// Activity log entry schema
export const ActivityLogSchema = z.object({
  id: z.string().optional(),
  userId: z.string().min(1, 'User ID is required'),
  sessionId: z.string().min(1, 'Session ID is required'),
  activityType: z.string().min(1, 'Activity type is required'),
  timestamp: z.date(),
  ipAddress: z.string().optional(),
  userAgent: z.string().optional(),
  resourceId: z.string().optional(), // ID of the resource being acted upon (task, project, etc.)
  resourceType: z.string().optional(), // Type of resource (task, project, etc.)
  metadata: z.record(z.any()).optional(), // Flexible metadata for additional context
  beforeValue: z.record(z.any()).optional(), // State before the change
  afterValue: z.record(z.any()).optional(), // State after the change
  success: z.boolean().default(true),
  errorMessage: z.string().optional(),
  severity: z.enum(['info', 'warning', 'error']).default('info'),
});

export type ActivityLog = z.infer<typeof ActivityLogSchema>;

// Helper type for creating activity logs
export type ActivityLogCreate = Omit<ActivityLog, 'id' | 'timestamp'> & {
  timestamp?: Date;
};

/**
 * Core activity logging class
 */
export class ActivityLogger {
  private static instance: ActivityLogger;
  private enabled: boolean = true;
  private maxRetries: number = 3;
  
  private constructor() {}
  
  static getInstance(): ActivityLogger {
    if (!ActivityLogger.instance) {
      ActivityLogger.instance = new ActivityLogger();
    }
    return ActivityLogger.instance;
  }
  
  /**
   * Enable or disable activity logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  /**
   * Log an activity with automatic retry on failure
   */
  async log(activity: ActivityLogCreate): Promise<string | null> {
    if (!this.enabled) {
      return null;
    }
    
    // Validate activity data
    const validatedActivity = ActivityLogSchema.parse({
      ...activity,
      timestamp: activity.timestamp || new Date(),
    });
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        return await this.writeToFirestore(validatedActivity);
      } catch (error) {
        console.error(`Activity log attempt ${attempt} failed:`, error);
        
        if (attempt === this.maxRetries) {
          console.error('Activity logging failed after all retries:', error);
          // Don't throw error to prevent disrupting user experience
          return null;
        }
        
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
    
    return null;
  }
  
  /**
   * Write activity log to Firestore
   */
  private async writeToFirestore(activity: ActivityLog): Promise<string> {
    const db = getDB();
    
    // Convert Date objects to Firestore Timestamps
    const firestoreActivity = {
      ...activity,
      timestamp: Timestamp.fromDate(activity.timestamp),
    };
    
    const docRef = await addDoc(collection(db, 'activity_logs'), firestoreActivity);
    return docRef.id;
  }
  
  /**
   * Retrieve activity logs for a user
   */
  async getUserActivityLogs(
    userId: string, 
    options: {
      limit?: number;
      activityType?: ActivityType;
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<ActivityLog[]> {
    const db = getDB();
    const { limit = 50, activityType, startDate, endDate } = options;
    
    let q = query(
      collection(db, 'activity_logs'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      firestoreLimit(limit)
    );
    
    // Add activity type filter if specified
    if (activityType) {
      q = query(
        collection(db, 'activity_logs'),
        where('userId', '==', userId),
        where('activityType', '==', activityType),
        orderBy('timestamp', 'desc'),
        firestoreLimit(limit)
      );
    }
    
    const querySnapshot = await getDocs(q);
    const logs: ActivityLog[] = [];
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Filter by date range if specified
      const timestamp = data.timestamp?.toDate();
      if (startDate && timestamp < startDate) return;
      if (endDate && timestamp > endDate) return;
      
      logs.push({
        id: doc.id,
        ...data,
        timestamp: timestamp || new Date(),
      } as ActivityLog);
    });
    
    return logs;
  }
}

/**
 * Convenience functions for common activities
 */
export const activityLogger = ActivityLogger.getInstance();

// Authentication activities
export async function logUserLogin(userId: string, sessionId: string, metadata?: Record<string, any>): Promise<void> {
  await activityLogger.log({
    userId,
    sessionId,
    activityType: ActivityTypes.USER_LOGIN,
    metadata,
    severity: 'info',
  });
}

export async function logUserLogout(userId: string, sessionId: string): Promise<void> {
  await activityLogger.log({
    userId,
    sessionId,
    activityType: ActivityTypes.USER_LOGOUT,
    severity: 'info',
  });
}

// Task activities
export async function logTaskCreated(
  userId: string, 
  sessionId: string, 
  taskId: string, 
  taskData: any
): Promise<void> {
  await activityLogger.log({
    userId,
    sessionId,
    activityType: ActivityTypes.TASK_CREATED,
    resourceId: taskId,
    resourceType: 'task',
    afterValue: taskData,
    severity: 'info',
  });
}

export async function logTaskUpdated(
  userId: string, 
  sessionId: string, 
  taskId: string, 
  beforeData: any, 
  afterData: any
): Promise<void> {
  await activityLogger.log({
    userId,
    sessionId,
    activityType: ActivityTypes.TASK_UPDATED,
    resourceId: taskId,
    resourceType: 'task',
    beforeValue: beforeData,
    afterValue: afterData,
    severity: 'info',
  });
}

export async function logTaskDeleted(
  userId: string, 
  sessionId: string, 
  taskId: string, 
  taskData: any
): Promise<void> {
  await activityLogger.log({
    userId,
    sessionId,
    activityType: ActivityTypes.TASK_DELETED,
    resourceId: taskId,
    resourceType: 'task',
    beforeValue: taskData,
    severity: 'info',
  });
}

// Timer activities
export async function logTimerStarted(
  userId: string, 
  sessionId: string, 
  taskId?: string, 
  metadata?: Record<string, any>
): Promise<void> {
  await activityLogger.log({
    userId,
    sessionId,
    activityType: ActivityTypes.TIMER_STARTED,
    resourceId: taskId,
    resourceType: 'task',
    metadata,
    severity: 'info',
  });
}

export async function logTimerCompleted(
  userId: string, 
  sessionId: string, 
  taskId?: string, 
  duration?: number
): Promise<void> {
  await activityLogger.log({
    userId,
    sessionId,
    activityType: ActivityTypes.TIMER_COMPLETED,
    resourceId: taskId,
    resourceType: 'task',
    metadata: { duration },
    severity: 'info',
  });
}

// Project activities
export async function logProjectCreated(
  userId: string, 
  sessionId: string, 
  projectId: string, 
  projectData: any
): Promise<void> {
  await activityLogger.log({
    userId,
    sessionId,
    activityType: ActivityTypes.PROJECT_CREATED,
    resourceId: projectId,
    resourceType: 'project',
    afterValue: projectData,
    severity: 'info',
  });
}

// Security activities
export async function logUnauthorizedAccess(
  userId: string | null, 
  sessionId: string, 
  resource: string, 
  ipAddress?: string, 
  userAgent?: string
): Promise<void> {
  await activityLogger.log({
    userId: userId || 'anonymous',
    sessionId,
    activityType: ActivityTypes.UNAUTHORIZED_ACCESS_ATTEMPT,
    resourceId: resource,
    ipAddress,
    userAgent,
    severity: 'warning',
    success: false,
  });
}

/**
 * Session management for activity logging
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Utility to extract client information
 */
export function getClientInfo(): { ipAddress?: string; userAgent?: string } {
  if (typeof window === 'undefined') {
    return {};
  }
  
  return {
    userAgent: navigator.userAgent,
    // IP address would be extracted server-side in a real implementation
    // For now, we'll leave it undefined for client-side logging
    ipAddress: undefined,
  };
}

/**
 * Cleanup old activity logs (should be run periodically)
 */
export async function cleanupOldLogs(olderThanDays: number = 90): Promise<number> {
  const db = getDB();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
  
  // This is a simplified version - in production, you'd want to implement
  // batch deletion to handle large datasets efficiently
  console.log(`Cleanup would remove logs older than ${cutoffDate.toISOString()}`);
  
  // For now, just return 0 as this would require server-side implementation
  // for efficient batch deletion
  return 0;
}