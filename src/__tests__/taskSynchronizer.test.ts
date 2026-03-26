/**
 * Tests for TaskSynchronizer - race condition prevention in task operations
 */

import { TaskSynchronizer, TaskOperation } from '@/lib/taskSynchronizer';

// Mock the task operations
jest.mock('@/hooks/useTasks', () => ({
  startAllTimeTracking: jest.fn().mockResolvedValue(undefined),
  stopAllTimeTracking: jest.fn().mockResolvedValue(undefined),
  incrementPomodoroSession: jest.fn().mockResolvedValue(undefined)
}));

describe('TaskSynchronizer', () => {
  let synchronizer: TaskSynchronizer;

  beforeEach(() => {
    synchronizer = new TaskSynchronizer();
    jest.clearAllMocks();
  });

  describe('Operation Queuing', () => {
    test('should queue and execute single operation', async () => {
      const operation: TaskOperation = {
        taskId: 'task-1',
        operation: 'start-tracking',
        timestamp: Date.now()
      };

      await synchronizer.queueOperation(operation);
      
      expect(synchronizer.getPendingOperationsCount()).toBe(0);
      expect(synchronizer.isOperationPending('task-1', 'start-tracking')).toBe(false);
    });

    test('should deduplicate operations for same task', async () => {
      const baseTime = Date.now();
      
      const operations: TaskOperation[] = [
        {
          taskId: 'task-1',
          operation: 'start-tracking',
          timestamp: baseTime
        },
        {
          taskId: 'task-1',
          operation: 'start-tracking',
          timestamp: baseTime + 50
        },
        {
          taskId: 'task-1',
          operation: 'start-tracking',
          timestamp: baseTime + 100
        }
      ];

      const promises = operations.map(op => synchronizer.queueOperation(op));
      await Promise.all(promises);

      // Should only execute the latest operation
      const { startAllTimeTracking } = require('@/hooks/useTasks');
      expect(startAllTimeTracking).toHaveBeenCalledTimes(1);
      expect(startAllTimeTracking).toHaveBeenCalledWith(['task-1']);
    });

    test('should handle different operation types separately', async () => {
      const operations: TaskOperation[] = [
        {
          taskId: 'task-1',
          operation: 'start-tracking',
          timestamp: Date.now()
        },
        {
          taskId: 'task-1',
          operation: 'stop-tracking',
          timestamp: Date.now() + 50,
          metadata: { elapsedSeconds: 1500 }
        }
      ];

      const promises = operations.map(op => synchronizer.queueOperation(op));
      await Promise.all(promises);

      const { startAllTimeTracking, stopAllTimeTracking } = require('@/hooks/useTasks');
      expect(startAllTimeTracking).toHaveBeenCalledWith(['task-1']);
      expect(stopAllTimeTracking).toHaveBeenCalledWith([{
        taskId: 'task-1',
        elapsedSeconds: 1500
      }]);
    });
  });

  describe('Batch Processing', () => {
    test('should batch multiple start-tracking operations', async () => {
      const operations: TaskOperation[] = [
        {
          taskId: 'task-1',
          operation: 'start-tracking',
          timestamp: Date.now()
        },
        {
          taskId: 'task-2',
          operation: 'start-tracking',
          timestamp: Date.now() + 10
        },
        {
          taskId: 'task-3',
          operation: 'start-tracking',
          timestamp: Date.now() + 20
        }
      ];

      const promises = operations.map(op => synchronizer.queueOperation(op));
      await Promise.all(promises);

      const { startAllTimeTracking } = require('@/hooks/useTasks');
      expect(startAllTimeTracking).toHaveBeenCalledTimes(1);
      expect(startAllTimeTracking).toHaveBeenCalledWith(['task-1', 'task-2', 'task-3']);
    });

    test('should batch multiple stop-tracking operations', async () => {
      const operations: TaskOperation[] = [
        {
          taskId: 'task-1',
          operation: 'stop-tracking',
          timestamp: Date.now(),
          metadata: { elapsedSeconds: 1500 }
        },
        {
          taskId: 'task-2',
          operation: 'stop-tracking',
          timestamp: Date.now() + 10,
          metadata: { elapsedSeconds: 1200 }
        }
      ];

      const promises = operations.map(op => synchronizer.queueOperation(op));
      await Promise.all(promises);

      const { stopAllTimeTracking } = require('@/hooks/useTasks');
      expect(stopAllTimeTracking).toHaveBeenCalledTimes(1);
      expect(stopAllTimeTracking).toHaveBeenCalledWith([
        { taskId: 'task-1', elapsedSeconds: 1500 },
        { taskId: 'task-2', elapsedSeconds: 1200 }
      ]);
    });

    test('should batch session increments by duration', async () => {
      const operations: TaskOperation[] = [
        {
          taskId: 'task-1',
          operation: 'increment-session',
          timestamp: Date.now(),
          metadata: { duration: 25 }
        },
        {
          taskId: 'task-2',
          operation: 'increment-session',
          timestamp: Date.now() + 10,
          metadata: { duration: 25 }
        },
        {
          taskId: 'task-3',
          operation: 'increment-session',
          timestamp: Date.now() + 20,
          metadata: { duration: 15 } // Different duration
        }
      ];

      const promises = operations.map(op => synchronizer.queueOperation(op));
      await Promise.all(promises);

      const { incrementPomodoroSession } = require('@/hooks/useTasks');
      
      // Should be called once per task (can't truly batch these)
      expect(incrementPomodoroSession).toHaveBeenCalledTimes(3);
      expect(incrementPomodoroSession).toHaveBeenCalledWith('task-1', 25);
      expect(incrementPomodoroSession).toHaveBeenCalledWith('task-2', 25);
      expect(incrementPomodoroSession).toHaveBeenCalledWith('task-3', 15);
    });
  });

  describe('Race Condition Prevention', () => {
    test('should handle rapid concurrent operations', async () => {
      const operations: TaskOperation[] = [];
      const taskIds = ['task-1', 'task-2', 'task-3'];
      
      // Simulate rapid start/stop operations
      for (let i = 0; i < 10; i++) {
        taskIds.forEach(taskId => {
          operations.push({
            taskId,
            operation: Math.random() > 0.5 ? 'start-tracking' : 'stop-tracking',
            timestamp: Date.now() + i * 10,
            metadata: { elapsedSeconds: 1500 }
          });
        });
      }

      const promises = operations.map(op => synchronizer.queueOperation(op));
      await Promise.allSettled(promises);

      // Should not throw errors and should complete all operations
      expect(synchronizer.getPendingOperationsCount()).toBe(0);
    });

    test('should prevent duplicate operations from executing', async () => {
      const operationKey = 'task-1-start-tracking';
      
      // Queue the same operation multiple times rapidly
      const promises = Array.from({ length: 5 }, () =>
        synchronizer.queueOperation({
          taskId: 'task-1',
          operation: 'start-tracking',
          timestamp: Date.now()
        })
      );

      await Promise.all(promises);

      const { startAllTimeTracking } = require('@/hooks/useTasks');
      // Should only execute once despite multiple queued operations
      expect(startAllTimeTracking).toHaveBeenCalledTimes(1);
    });
  });

  describe('Error Handling', () => {
    test('should handle operation failures gracefully', async () => {
      const { startAllTimeTracking } = require('@/hooks/useTasks');
      startAllTimeTracking.mockRejectedValueOnce(new Error('Network error'));

      const operation: TaskOperation = {
        taskId: 'task-1',
        operation: 'start-tracking',
        timestamp: Date.now()
      };

      // Should not throw
      await expect(synchronizer.queueOperation(operation)).resolves.toBeUndefined();
    });

    test('should retry failed operations with backoff', async () => {
      const { startAllTimeTracking } = require('@/hooks/useTasks');
      startAllTimeTracking
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(undefined);

      const operation: TaskOperation = {
        taskId: 'task-1',
        operation: 'start-tracking',
        timestamp: Date.now()
      };

      await synchronizer.queueOperation(operation);
      
      // Wait for potential retry
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Should have retried after failure
      expect(startAllTimeTracking).toHaveBeenCalledTimes(2);
    });
  });

  describe('State Management', () => {
    test('should track pending operations', () => {
      expect(synchronizer.getPendingOperationsCount()).toBe(0);
      expect(synchronizer.isOperationPending('task-1', 'start-tracking')).toBe(false);
    });

    test('should clear pending operations', () => {
      // Add some operations to pending queue
      synchronizer['state'].pendingOperations.push({
        taskId: 'task-1',
        operation: 'start-tracking',
        timestamp: Date.now()
      });

      expect(synchronizer.getPendingOperationsCount()).toBe(1);
      
      synchronizer.clearPendingOperations();
      
      expect(synchronizer.getPendingOperationsCount()).toBe(0);
    });
  });

  describe('Timing and Batching', () => {
    test('should respect batch delay timing', async () => {
      const startTime = Date.now();
      
      const operation: TaskOperation = {
        taskId: 'task-1',
        operation: 'start-tracking',
        timestamp: Date.now()
      };

      await synchronizer.queueOperation(operation);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should have waited at least the batch delay
      expect(duration).toBeGreaterThanOrEqual(100);
    });

    test('should not delay when no batching is needed', async () => {
      // Process operations immediately when there's only one
      const operation: TaskOperation = {
        taskId: 'task-1',
        operation: 'start-tracking',
        timestamp: Date.now()
      };

      const startTime = Date.now();
      await synchronizer.queueOperation(operation);
      const endTime = Date.now();
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(200);
    });
  });
});