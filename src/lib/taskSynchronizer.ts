/**
 * Task Synchronizer for preventing race conditions in task operations
 * Coordinates between timer state and task tracking
 */

export interface TaskOperation {
  taskId: string;
  operation: 'start-tracking' | 'stop-tracking' | 'increment-session';
  timestamp: number;
  metadata?: any;
}

export interface TaskSyncState {
  activeOperations: Set<string>;
  pendingOperations: TaskOperation[];
  lastSync: number;
}

export class TaskSynchronizer {
  private state: TaskSyncState;
  private operationQueue: Map<string, Promise<void>> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private readonly BATCH_DELAY = 100; // ms

  constructor() {
    this.state = {
      activeOperations: new Set(),
      pendingOperations: [],
      lastSync: Date.now()
    };
  }

  /**
   * Queue a task operation with deduplication and batching
   */
  public async queueOperation(operation: TaskOperation): Promise<void> {
    const operationKey = `${operation.taskId}-${operation.operation}`;
    
    // Cancel any existing operation of the same type for the same task
    if (this.operationQueue.has(operationKey)) {
      return this.operationQueue.get(operationKey)!;
    }

    const promise = this.executeOperation(operation);
    this.operationQueue.set(operationKey, promise);

    try {
      await promise;
    } finally {
      this.operationQueue.delete(operationKey);
    }
  }

  private async executeOperation(operation: TaskOperation): Promise<void> {
    // Add to pending operations
    this.state.pendingOperations.push(operation);
    
    // Schedule batch processing
    this.scheduleBatchProcessing();
  }

  private scheduleBatchProcessing(): void {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    this.batchTimeout = setTimeout(() => {
      this.processPendingOperations();
    }, this.BATCH_DELAY);
  }

  private async processPendingOperations(): Promise<void> {
    if (this.state.pendingOperations.length === 0) {
      return;
    }

    // Group operations by type and deduplicate
    const operationMap = new Map<string, TaskOperation>();
    
    this.state.pendingOperations.forEach(op => {
      const key = `${op.taskId}-${op.operation}`;
      // Keep the latest operation for each task+operation type
      if (!operationMap.has(key) || operationMap.get(key)!.timestamp < op.timestamp) {
        operationMap.set(key, op);
      }
    });

    const operations = Array.from(operationMap.values());
    this.state.pendingOperations = [];

    // Execute operations in batches by type
    const trackingStarts = operations.filter(op => op.operation === 'start-tracking');
    const trackingStops = operations.filter(op => op.operation === 'stop-tracking');
    const sessionIncrements = operations.filter(op => op.operation === 'increment-session');

    try {
      // Process tracking starts
      if (trackingStarts.length > 0) {
        await this.batchStartTracking(trackingStarts);
      }

      // Process tracking stops
      if (trackingStops.length > 0) {
        await this.batchStopTracking(trackingStops);
      }

      // Process session increments
      if (sessionIncrements.length > 0) {
        await this.batchIncrementSessions(sessionIncrements);
      }

      this.state.lastSync = Date.now();
    } catch (error) {
      console.error('Error processing task operations:', error);
      // Re-queue failed operations with exponential backoff
      this.requeueFailedOperations(operations);
    }
  }

  private async batchStartTracking(operations: TaskOperation[]): Promise<void> {
    const taskIds = operations.map(op => op.taskId);
    
    // Import the hook function dynamically to avoid circular dependencies
    const { startAllTimeTracking } = await import('../hooks/useTasks');
    
    if (startAllTimeTracking) {
      await startAllTimeTracking(taskIds);
    }
  }

  private async batchStopTracking(operations: TaskOperation[]): Promise<void> {
    const taskData = operations.map(op => ({
      taskId: op.taskId,
      elapsedSeconds: op.metadata?.elapsedSeconds || 0
    }));

    // Import the hook function dynamically to avoid circular dependencies
    const { stopAllTimeTracking } = await import('../hooks/useTasks');
    
    if (stopAllTimeTracking) {
      await stopAllTimeTracking(taskData);
    }
  }

  private async batchIncrementSessions(operations: TaskOperation[]): Promise<void> {
    // Group by session duration for batch processing
    const sessionGroups = new Map<number, string[]>();
    
    operations.forEach(op => {
      const duration = op.metadata?.duration || 25;
      if (!sessionGroups.has(duration)) {
        sessionGroups.set(duration, []);
      }
      sessionGroups.get(duration)!.push(op.taskId);
    });

    // Process each group
    for (const [duration, taskIds] of sessionGroups) {
      // Import the hook function dynamically
      const { incrementPomodoroSession } = await import('../hooks/useTasks');
      
      if (incrementPomodoroSession) {
        await Promise.all(
          taskIds.map(taskId => incrementPomodoroSession(taskId, duration))
        );
      }
    }
  }

  private requeueFailedOperations(operations: TaskOperation[]): void {
    // Add failed operations back to pending with updated timestamp
    operations.forEach(op => {
      this.state.pendingOperations.push({
        ...op,
        timestamp: Date.now()
      });
    });

    // Schedule retry with exponential backoff
    setTimeout(() => {
      this.processPendingOperations();
    }, Math.min(1000 * Math.pow(2, this.getRetryCount()), 10000));
  }

  private getRetryCount(): number {
    // Simple retry count based on pending operations age
    const oldestOp = this.state.pendingOperations.reduce((oldest, op) => 
      !oldest || op.timestamp < oldest.timestamp ? op : oldest, null);
    
    if (!oldestOp) return 0;
    
    const age = Date.now() - oldestOp.timestamp;
    return Math.floor(age / 1000); // Roughly 1 retry per second of age
  }

  public isOperationPending(taskId: string, operation: string): boolean {
    return this.state.pendingOperations.some(op => 
      op.taskId === taskId && op.operation === operation
    );
  }

  public getPendingOperationsCount(): number {
    return this.state.pendingOperations.length;
  }

  public clearPendingOperations(): void {
    this.state.pendingOperations = [];
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
  }
}

// Singleton instance
export const taskSynchronizer = new TaskSynchronizer();