import { 
  runTransaction,
  writeBatch,
  doc,
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  updateDoc,
  increment,
  serverTimestamp,
  Timestamp,
  WriteBatch
} from 'firebase/firestore';
import { getDB } from './firebase';
import { addEstimationRecord } from './firebase';
import type { Task, Project } from './validation';

/**
 * Transaction service for atomic Firestore operations
 * Implements proper error handling and rollback for critical user operations
 */

export class TransactionError extends Error {
  constructor(message: string, public readonly operation: string, public readonly cause?: Error) {
    super(`Transaction failed in ${operation}: ${message}`);
    this.name = 'TransactionError';
  }
}

/**
 * Retry configuration for failed transactions
 */
interface RetryConfig {
  maxRetries: number;
  baseDelay: number; // ms
  maxDelay: number; // ms
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 100,
  maxDelay: 2000
};

/**
 * Exponential backoff retry logic
 */
async function retryTransaction<T>(
  operation: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on the last attempt
      if (attempt === config.maxRetries) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(2, attempt),
        config.maxDelay
      );
      
      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 100;
      
      console.warn(`Transaction attempt ${attempt + 1} failed, retrying in ${Math.round(jitteredDelay)}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }
  
  throw new TransactionError('Maximum retry attempts exceeded', 'retry', lastError!);
}

/**
 * 1. Task Completion Workflow Transaction
 * Atomically updates task completion, time tracking, and project statistics
 */
export async function completeTaskTransaction(
  userId: string,
  taskId: string,
  task: Task,
  completedPomodoros: number
): Promise<void> {
  const db = getDB();
  
  return retryTransaction(async () => {
    return runTransaction(db, async (transaction) => {
      try {
        const taskRef = doc(db, 'tasks', taskId);
        
        // Update task completion
        transaction.update(taskRef, {
          completed: true,
          completedAt: serverTimestamp(),
          completedPomodoros: completedPomodoros
        });
        
        // Update project statistics if task belongs to a project
        if (task.projectId) {
          const projectRef = doc(db, 'projects', task.projectId);
          
          // Read current project data to update stats
          const projectDoc = await transaction.get(projectRef);
          if (projectDoc.exists()) {
            transaction.update(projectRef, {
              totalCompletedTasks: increment(1),
              totalPomodoroSessions: increment(completedPomodoros),
              lastActivityAt: serverTimestamp()
            });
          }
        }
        
        // Update user statistics
        const userStatsRef = doc(db, 'user_stats', userId);
        transaction.set(userStatsRef, {
          totalCompletedTasks: increment(1),
          totalPomodoroSessions: increment(completedPomodoros),
          lastActiveAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        }, { merge: true });
        
        // Add to estimation history (this is a separate write outside transaction)
        // Will be executed after transaction commits successfully
      } catch (error) {
        throw new TransactionError('Failed to complete task workflow', 'task_completion', error as Error);
      }
    }).then(async () => {
      // Add estimation record after successful transaction
      try {
        await addEstimationRecord(userId, { ...task, totalPomodoroSessions: completedPomodoros });
      } catch (error) {
        console.warn('Failed to add estimation record (non-critical):', error);
        // Don't fail the entire operation for estimation history
      }
    });
  });
}

/**
 * 2. Timer Session Completion Transaction
 * Records session completion and updates task progress atomically
 */
export async function completePomodoroSessionTransaction(
  userId: string,
  taskId: string,
  sessionDuration: number, // in seconds
  sessionType: 'pomodoro' | 'shortBreak' | 'longBreak'
): Promise<void> {
  const db = getDB();
  
  return retryTransaction(async () => {
    return runTransaction(db, async (transaction) => {
      try {
        // Create session record
        const sessionRef = doc(collection(db, 'pomodoro_sessions'));
        transaction.set(sessionRef, {
          userId,
          taskId,
          sessionType,
          duration: sessionDuration,
          completedAt: serverTimestamp(),
          createdAt: serverTimestamp()
        });
        
        // Update task progress
        const taskRef = doc(db, 'tasks', taskId);
        if (sessionType === 'pomodoro') {
          transaction.update(taskRef, {
            totalPomodoroSessions: increment(1),
            totalTimeSpent: increment(sessionDuration),
            lastPomodoroAt: serverTimestamp()
          });
        }
        
        // Update user session statistics
        const userStatsRef = doc(db, 'user_stats', userId);
        transaction.set(userStatsRef, {
          totalSessions: increment(1),
          totalTimeSpent: increment(sessionDuration),
          lastActiveAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          ...(sessionType === 'pomodoro' && { totalPomodoroSessions: increment(1) })
        }, { merge: true });
        
      } catch (error) {
        throw new TransactionError('Failed to record session completion', 'session_completion', error as Error);
      }
    });
  });
}

/**
 * 3. Project Deletion Transaction
 * Safely deletes project with cleanup of associated tasks, statistics, and references
 */
export async function deleteProjectTransaction(
  userId: string,
  projectId: string,
  options: { deleteTasksAction: 'delete' | 'unlink' } = { deleteTasksAction: 'unlink' }
): Promise<void> {
  const db = getDB();
  
  return retryTransaction(async () => {
    return runTransaction(db, async (transaction) => {
      try {
        // Get all tasks in this project
        const tasksQuery = query(
          collection(db, 'tasks'),
          where('userId', '==', userId),
          where('projectId', '==', projectId)
        );
        const tasksSnapshot = await getDocs(tasksQuery);
        
        // Handle tasks based on delete action
        tasksSnapshot.forEach((taskDoc) => {
          const taskRef = doc(db, 'tasks', taskDoc.id);
          
          if (options.deleteTasksAction === 'delete') {
            // Delete the task
            transaction.delete(taskRef);
          } else {
            // Unlink from project (set projectId to null)
            transaction.update(taskRef, {
              projectId: null,
              updatedAt: serverTimestamp()
            });
          }
        });
        
        // Delete project
        const projectRef = doc(db, 'projects', projectId);
        transaction.delete(projectRef);
        
        // Update user statistics
        const userStatsRef = doc(db, 'user_stats', userId);
        transaction.set(userStatsRef, {
          totalProjects: increment(-1),
          lastActiveAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          ...(options.deleteTasksAction === 'delete' && {
            totalTasks: increment(-tasksSnapshot.size)
          })
        }, { merge: true });
        
      } catch (error) {
        throw new TransactionError('Failed to delete project', 'project_deletion', error as Error);
      }
    });
  });
}

/**
 * 4. Bulk Task Operations Transaction
 * Handles bulk operations on tasks (complete all, archive all, delete all, etc.)
 */
export async function bulkTaskOperationTransaction(
  userId: string,
  taskIds: string[],
  operation: 'complete' | 'archive' | 'delete' | 'unarchive' | 'incomplete',
  batchSize: number = 400 // Firestore batch limit is 500
): Promise<void> {
  const db = getDB();
  
  // Process in batches to stay within Firestore limits
  const batches: string[][] = [];
  for (let i = 0; i < taskIds.length; i += batchSize) {
    batches.push(taskIds.slice(i, i + batchSize));
  }
  
  return retryTransaction(async () => {
    for (const batchTaskIds of batches) {
      const batch = writeBatch(db);
      
      try {
        batchTaskIds.forEach((taskId) => {
          const taskRef = doc(db, 'tasks', taskId);
          
          switch (operation) {
            case 'complete':
              batch.update(taskRef, {
                completed: true,
                completedAt: serverTimestamp()
              });
              break;
            case 'incomplete':
              batch.update(taskRef, {
                completed: false,
                completedAt: null
              });
              break;
            case 'archive':
              batch.update(taskRef, {
                archived: true,
                archivedAt: serverTimestamp()
              });
              break;
            case 'unarchive':
              batch.update(taskRef, {
                archived: false,
                archivedAt: null
              });
              break;
            case 'delete':
              batch.delete(taskRef);
              break;
            default:
              throw new Error(`Unknown bulk operation: ${operation}`);
          }
        });
        
        // Update user statistics for this batch
        if (operation === 'complete') {
          const userStatsRef = doc(db, 'user_stats', userId);
          batch.set(userStatsRef, {
            totalCompletedTasks: increment(batchTaskIds.length),
            lastActiveAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
        
        await batch.commit();
        
      } catch (error) {
        throw new TransactionError('Failed bulk task operation', 'bulk_tasks', error as Error);
      }
    }
  });
}

/**
 * 5. Data Migration Transaction Helper
 * Provides utilities for safe data migration operations
 */
export class DataMigration {
  private static async migrationTransaction<T>(
    migrationName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    return retryTransaction(async () => {
      try {
        console.log(`Starting migration: ${migrationName}`);
        const result = await operation();
        console.log(`Completed migration: ${migrationName}`);
        return result;
      } catch (error) {
        throw new TransactionError(`Migration failed: ${migrationName}`, 'data_migration', error as Error);
      }
    });
  }
  
  /**
   * Migrate user data with rollback capability
   */
  static async migrateUserData(
    userId: string,
    migrationFn: (batch: WriteBatch) => void,
    migrationName: string
  ): Promise<void> {
    const db = getDB();
    
    return this.migrationTransaction(migrationName, async () => {
      const batch = writeBatch(db);
      
      // Record migration start
      const migrationRef = doc(db, 'migrations', `${userId}_${migrationName}_${Date.now()}`);
      batch.set(migrationRef, {
        userId,
        migrationName,
        status: 'started',
        startedAt: serverTimestamp()
      });
      
      // Apply migration
      migrationFn(batch);
      
      // Record migration completion
      batch.update(migrationRef, {
        status: 'completed',
        completedAt: serverTimestamp()
      });
      
      await batch.commit();
    });
  }
}

/**
 * Utility function to handle transaction errors gracefully
 */
export function handleTransactionError(error: Error, operation: string): void {
  if (error instanceof TransactionError) {
    console.error(`Transaction error in ${operation}:`, {
      operation: error.operation,
      message: error.message,
      cause: error.cause
    });
  } else {
    console.error(`Unexpected error in ${operation}:`, error);
  }
  
  // Could integrate with monitoring service here
  // e.g., Sentry.captureException(error);
}