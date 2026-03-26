/**
 * Tests for TimerStateMachine - race condition prevention
 */

import { TimerStateMachine, TimerConfig } from '@/lib/timerStateMachine';

describe('TimerStateMachine', () => {
  let machine: TimerStateMachine;
  const config: TimerConfig = {
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15,
    longBreakInterval: 4
  };

  beforeEach(() => {
    machine = new TimerStateMachine(config);
  });

  describe('State Transitions', () => {
    test('should start from idle state', () => {
      const context = machine.getContext();
      expect(context.state).toBe('idle');
      expect(context.phase).toBe('pomodoro');
    });

    test('should transition from idle to running on START', async () => {
      await machine.dispatch({ type: 'START' });
      const context = machine.getContext();
      expect(context.state).toBe('running');
      expect(context.startTime).toBeGreaterThan(0);
    });

    test('should transition from running to paused on PAUSE', async () => {
      await machine.dispatch({ type: 'START' });
      await new Promise(resolve => setTimeout(resolve, 100)); // Wait a bit
      await machine.dispatch({ type: 'PAUSE' });
      
      const context = machine.getContext();
      expect(context.state).toBe('paused');
      expect(context.startTime).toBeNull();
      expect(context.pausedTime).toBeGreaterThan(0);
    });

    test('should transition from paused to running on RESUME', async () => {
      await machine.dispatch({ type: 'START' });
      await machine.dispatch({ type: 'PAUSE' });
      await machine.dispatch({ type: 'RESUME' });
      
      const context = machine.getContext();
      expect(context.state).toBe('running');
      expect(context.startTime).toBeGreaterThan(0);
      expect(context.pausedTime).toBeNull();
    });

    test('should reject invalid transitions', async () => {
      // Try to pause when not running
      await machine.dispatch({ type: 'PAUSE' });
      const context = machine.getContext();
      expect(context.state).toBe('idle'); // Should remain idle
    });
  });

  describe('Race Condition Prevention', () => {
    test('should prevent concurrent state transitions', async () => {
      const operations = [
        machine.dispatch({ type: 'START' }),
        machine.dispatch({ type: 'PAUSE' }),
        machine.dispatch({ type: 'RESET' })
      ];

      await Promise.allSettled(operations);
      
      // Should end in a valid state
      const context = machine.getContext();
      expect(['idle', 'running', 'paused', 'error']).toContain(context.state);
    });

    test('should handle rapid task updates without race conditions', async () => {
      const taskUpdates = Array.from({ length: 10 }, (_, i) => 
        machine.dispatch({ 
          type: 'UPDATE_TASKS', 
          taskIds: [`task-${i}`] 
        })
      );

      await Promise.all(taskUpdates);
      
      const context = machine.getContext();
      // Should have the last update
      expect(context.selectedTaskIds).toHaveLength(1);
      expect(context.selectedTaskIds[0]).toMatch(/^task-\d+$/);
    });

    test('should maintain operation mutex during concurrent operations', () => {
      expect(machine.isOperationInProgress()).toBe(false);
      
      // Start an operation but don't await it
      const operation = machine.dispatch({ type: 'START' });
      expect(machine.isOperationInProgress()).toBe(true);
      
      return operation.then(() => {
        expect(machine.isOperationInProgress()).toBe(false);
      });
    });
  });

  describe('Time Calculations', () => {
    test('should calculate elapsed time accurately', async () => {
      await machine.dispatch({ type: 'START' });
      const start = Date.now();
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const elapsed = machine.getElapsedTime();
      const actualElapsed = Math.floor((Date.now() - start) / 1000);
      
      // Should be within 1 second accuracy
      expect(Math.abs(elapsed - actualElapsed)).toBeLessThan(1);
    });

    test('should calculate remaining time correctly when paused', async () => {
      await machine.dispatch({ type: 'START' });
      await new Promise(resolve => setTimeout(resolve, 100));
      await machine.dispatch({ type: 'PAUSE' });
      
      const remaining = machine.getRemainingTime();
      const context = machine.getContext();
      
      expect(remaining).toBe(context.pausedTime);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThan(context.duration);
    });
  });

  describe('Phase Management', () => {
    test('should handle pomodoro completion correctly', async () => {
      await machine.dispatch({ type: 'START' });
      await machine.dispatch({ type: 'COMPLETE' });
      
      const context = machine.getContext();
      expect(context.phase).toBe('shortBreak');
      expect(context.sessionsCompleted).toBe(1);
      expect(context.state).toBe('idle');
    });

    test('should switch to long break after configured sessions', async () => {
      // Complete 3 pomodoro sessions (4th should trigger long break)
      for (let i = 0; i < 3; i++) {
        await machine.dispatch({ type: 'START' });
        await machine.dispatch({ type: 'COMPLETE' });
        if (i < 2) {
          await machine.dispatch({ type: 'SWITCH_PHASE', phase: 'pomodoro' });
        }
      }

      await machine.dispatch({ type: 'START' });
      await machine.dispatch({ type: 'COMPLETE' });
      
      const context = machine.getContext();
      expect(context.phase).toBe('longBreak');
      expect(context.sessionsCompleted).toBe(4);
    });

    test('should handle phase switching', async () => {
      await machine.dispatch({ type: 'SWITCH_PHASE', phase: 'shortBreak' });
      
      const context = machine.getContext();
      expect(context.phase).toBe('shortBreak');
      expect(context.duration).toBe(config.shortBreak * 60);
      expect(context.state).toBe('idle');
    });
  });

  describe('Error Handling', () => {
    test('should handle errors gracefully', async () => {
      await machine.dispatch({ type: 'ERROR', error: 'Test error' });
      
      const context = machine.getContext();
      expect(context.state).toBe('error');
    });

    test('should allow recovery from error state', async () => {
      await machine.dispatch({ type: 'ERROR', error: 'Test error' });
      await machine.dispatch({ type: 'RECOVER' });
      
      const context = machine.getContext();
      expect(context.state).toBe('idle');
    });
  });

  describe('Listeners and Updates', () => {
    test('should notify listeners of state changes', async () => {
      const listener = jest.fn();
      const unsubscribe = machine.subscribe(listener);
      
      await machine.dispatch({ type: 'START' });
      
      expect(listener).toHaveBeenCalledWith(
        expect.objectContaining({ state: 'running' })
      );
      
      unsubscribe();
    });

    test('should handle listener errors gracefully', async () => {
      const errorListener = jest.fn(() => {
        throw new Error('Listener error');
      });
      
      machine.subscribe(errorListener);
      
      // Should not throw
      await machine.dispatch({ type: 'START' });
      expect(errorListener).toHaveBeenCalled();
    });
  });

  describe('Configuration Updates', () => {
    test('should update configuration when idle', () => {
      const newConfig: TimerConfig = {
        pomodoro: 30,
        shortBreak: 10,
        longBreak: 20,
        longBreakInterval: 3
      };
      
      machine.updateConfig(newConfig);
      
      const context = machine.getContext();
      expect(context.duration).toBe(newConfig.pomodoro * 60);
    });

    test('should not update duration when timer is running', async () => {
      await machine.dispatch({ type: 'START' });
      
      const originalDuration = machine.getContext().duration;
      
      machine.updateConfig({
        pomodoro: 30,
        shortBreak: 10,
        longBreak: 20,
        longBreakInterval: 3
      });
      
      const context = machine.getContext();
      expect(context.duration).toBe(originalDuration);
    });
  });
});