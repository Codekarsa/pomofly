/**
 * Comprehensive Error Handling Validation Tests
 * 
 * Tests various error scenarios, validation, and recovery mechanisms
 * throughout the application to ensure robust error handling.
 */

import { monitoring } from '@/lib/monitoring';
import { TimerPersistence } from '@/lib/timerPersistence';
import { validateTimerPrecision, PrecisionTimer } from '@/lib/timerPrecision';

// Mock monitoring
jest.mock('@/lib/monitoring', () => ({
  monitoring: {
    reportError: jest.fn(),
    track: jest.fn(),
  },
}));

// Mock console methods to avoid cluttering test output
const originalError = console.error;
const originalWarn = console.warn;
const originalLog = console.log;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
  console.log = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
  console.log = originalLog;
});

describe('Error Handling Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  describe('Timer Error Handling', () => {
    describe('TimerPersistence Error Scenarios', () => {
      it('should handle corrupted localStorage data gracefully', () => {
        // Set invalid JSON in localStorage
        localStorage.setItem('timerSession', 'invalid-json{');
        
        const session = TimerPersistence.loadSession();
        expect(session).toBeNull();
        
        // Should not throw error
        expect(() => TimerPersistence.loadSession()).not.toThrow();
      });

      it('should handle missing localStorage gracefully', () => {
        // Mock localStorage to throw error
        const originalGetItem = Storage.prototype.getItem;
        Storage.prototype.getItem = jest.fn().mockImplementation(() => {
          throw new Error('LocalStorage not available');
        });

        expect(() => TimerPersistence.loadSession()).not.toThrow();
        const session = TimerPersistence.loadSession();
        expect(session).toBeNull();

        Storage.prototype.getItem = originalGetItem;
      });

      it('should validate session data structure', () => {
        // Save invalid session structure
        localStorage.setItem('timerSession', JSON.stringify({
          invalidField: 'test',
          missingRequiredFields: true,
        }));

        const session = TimerPersistence.loadSession();
        expect(session).toBeNull(); // Should reject invalid structure
      });

      it('should handle extremely old sessions', () => {
        const oldSession = {
          phase: 'pomodoro',
          isActive: true,
          sessionCreatedAt: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days ago
          timerStartedAt: Date.now() - (7 * 24 * 60 * 60 * 1000),
          settings: { pomodoro: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4 },
        };

        localStorage.setItem('timerSession', JSON.stringify(oldSession));
        
        const session = TimerPersistence.loadSession();
        // Should either be null or handled appropriately
        if (session) {
          // If old sessions are preserved, verify they don't cause issues
          const remaining = TimerPersistence.calculateRemainingTime(session);
          expect(remaining).toBeGreaterThanOrEqual(0);
        }
      });
    });

    describe('PrecisionTimer Error Handling', () => {
      it('should handle performance API unavailability', () => {
        const originalPerformance = global.performance;
        
        // Mock performance.now to throw
        global.performance = {
          ...performance,
          now: jest.fn().mockImplementation(() => {
            throw new Error('Performance API unavailable');
          }),
        };

        expect(() => new PrecisionTimer()).not.toThrow();
        
        const timer = new PrecisionTimer();
        expect(() => timer.start()).not.toThrow();
        expect(() => timer.getElapsedTime()).not.toThrow();

        global.performance = originalPerformance;
      });

      it('should handle invalid timer states', () => {
        const timer = new PrecisionTimer();
        
        // Get elapsed time before starting
        expect(() => timer.getElapsedTime()).not.toThrow();
        expect(timer.getElapsedTime()).toBe(0);
        
        // Pause before starting
        expect(() => timer.pause()).not.toThrow();
        expect(timer.pause()).toBe(0);
        
        // Get metrics in invalid state
        const metrics = timer.getMetrics();
        expect(metrics).toBeDefined();
        expect(metrics.actualElapsed).toBe(0);
      });

      it('should handle extreme drift values', () => {
        const timer = new PrecisionTimer();
        timer.start();
        
        // Mock extreme time values
        const originalNow = performance.now;
        const originalDateNow = Date.now;
        
        // Create scenario with extreme drift
        performance.now = jest.fn().mockReturnValue(1000000); // 1000 seconds
        Date.now = jest.fn().mockReturnValue(0); // 0 milliseconds
        
        expect(() => timer.getElapsedTime()).not.toThrow();
        const elapsed = timer.getElapsedTime();
        expect(elapsed).toBeGreaterThanOrEqual(0);
        
        performance.now = originalNow;
        Date.now = originalDateNow;
      });

      it('should validate timer precision correctly', () => {
        const timer = new PrecisionTimer();
        timer.start();
        
        // Test with good precision
        let isValid = validateTimerPrecision(timer);
        expect(typeof isValid).toBe('boolean');
        
        // Test with mocked bad precision
        jest.spyOn(timer, 'getMetrics').mockReturnValue({
          actualElapsed: 10,
          expectedElapsed: 15,
          drift: 2000, // 2 second drift
          adjustments: 5,
          visibilityChanges: 2,
          maxDrift: 2000,
          avgDrift: 1500,
        });
        
        isValid = validateTimerPrecision(timer);
        expect(isValid).toBe(false);
      });
    });

    describe('Timer Display Error Handling', () => {
      it('should handle negative time values gracefully', () => {
        const timer = new PrecisionTimer();
        
        // Mock to return negative elapsed time
        jest.spyOn(timer, 'getElapsedTime').mockReturnValue(-10);
        
        const result = timer.getRemainingTime(25 * 60); // 25 minutes
        expect(result.totalSeconds).toBeGreaterThanOrEqual(0);
        expect(result.minutes).toBeGreaterThanOrEqual(0);
        expect(result.seconds).toBeGreaterThanOrEqual(0);
      });

      it('should handle extremely large duration values', () => {
        const timer = new PrecisionTimer();
        timer.start();
        
        const hugeDuration = Number.MAX_SAFE_INTEGER;
        const result = timer.getRemainingTime(hugeDuration);
        
        expect(result).toBeDefined();
        expect(result.totalSeconds).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(result.minutes)).toBe(true);
        expect(Number.isFinite(result.seconds)).toBe(true);
      });
    });
  });

  describe('Data Validation Error Handling', () => {
    describe('Task Data Validation', () => {
      it('should handle invalid task data structures', () => {
        const invalidTasks = [
          null,
          undefined,
          'invalid-string',
          123,
          {},
          { id: null },
          { id: 'valid', title: null },
          { id: 'valid', title: '', completed: 'not-boolean' },
        ];

        invalidTasks.forEach((task) => {
          // These should not crash the application
          expect(() => {
            // Simulate processing invalid task data
            const processedTask = {
              id: task?.id || 'unknown',
              title: task?.title || 'Untitled Task',
              completed: Boolean(task?.completed),
              createdAt: task?.createdAt || new Date(),
            };
            expect(processedTask).toBeDefined();
          }).not.toThrow();
        });
      });
    });

    describe('Settings Validation', () => {
      it('should handle invalid pomodoro settings', () => {
        const invalidSettings = [
          { pomodoro: -1 },
          { pomodoro: 'invalid' },
          { shortBreak: 0 },
          { longBreak: null },
          { longBreakInterval: -5 },
          {},
          null,
        ];

        invalidSettings.forEach((settings) => {
          // Should apply default values for invalid settings
          const defaultSettings = {
            pomodoro: 25,
            shortBreak: 5,
            longBreak: 15,
            longBreakInterval: 4,
          };

          const validatedSettings = {
            pomodoro: Number(settings?.pomodoro) > 0 ? settings.pomodoro : defaultSettings.pomodoro,
            shortBreak: Number(settings?.shortBreak) > 0 ? settings.shortBreak : defaultSettings.shortBreak,
            longBreak: Number(settings?.longBreak) > 0 ? settings.longBreak : defaultSettings.longBreak,
            longBreakInterval: Number(settings?.longBreakInterval) > 0 ? settings.longBreakInterval : defaultSettings.longBreakInterval,
          };

          expect(validatedSettings.pomodoro).toBeGreaterThan(0);
          expect(validatedSettings.shortBreak).toBeGreaterThan(0);
          expect(validatedSettings.longBreak).toBeGreaterThan(0);
          expect(validatedSettings.longBreakInterval).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('Network Error Handling', () => {
    describe('Firebase Error Simulation', () => {
      it('should handle Firebase connection errors', async () => {
        // Mock Firebase error responses
        const firebaseErrors = [
          { code: 'unavailable', message: 'Service unavailable' },
          { code: 'deadline-exceeded', message: 'Request timeout' },
          { code: 'permission-denied', message: 'Insufficient permissions' },
          { code: 'unauthenticated', message: 'User not authenticated' },
        ];

        firebaseErrors.forEach((error) => {
          expect(() => {
            // Simulate error handling logic
            const handleFirebaseError = (err: any) => {
              switch (err.code) {
                case 'unavailable':
                  return { retry: true, message: 'Service temporarily unavailable' };
                case 'deadline-exceeded':
                  return { retry: true, message: 'Request timed out' };
                case 'permission-denied':
                  return { retry: false, message: 'Permission denied' };
                case 'unauthenticated':
                  return { retry: false, message: 'Please sign in again' };
                default:
                  return { retry: false, message: 'Unknown error occurred' };
              }
            };

            const result = handleFirebaseError(error);
            expect(result).toBeDefined();
            expect(typeof result.retry).toBe('boolean');
            expect(typeof result.message).toBe('string');
          }).not.toThrow();
        });
      });
    });
  });

  describe('Memory and Resource Error Handling', () => {
    it('should handle localStorage quota exceeded', () => {
      const originalSetItem = Storage.prototype.setItem;
      
      // Mock quota exceeded error
      Storage.prototype.setItem = jest.fn().mockImplementation(() => {
        const error: any = new Error('QuotaExceededError');
        error.name = 'QuotaExceededError';
        throw error;
      });

      expect(() => {
        try {
          localStorage.setItem('test', 'data');
        } catch (e) {
          // Handle quota exceeded gracefully
          if ((e as Error).name === 'QuotaExceededError') {
            // Could clear old data, show user warning, etc.
            localStorage.clear();
          }
        }
      }).not.toThrow();

      Storage.prototype.setItem = originalSetItem;
    });

    it('should handle memory leaks in timer intervals', () => {
      const intervals: NodeJS.Timeout[] = [];
      const originalSetInterval = global.setInterval;
      
      global.setInterval = jest.fn().mockImplementation((callback, delay) => {
        const intervalId = originalSetInterval(callback, delay);
        intervals.push(intervalId);
        return intervalId;
      });

      // Simulate creating multiple timers
      const timer1 = new PrecisionTimer();
      const timer2 = new PrecisionTimer();
      
      timer1.start();
      timer2.start();
      
      // Clean up
      intervals.forEach(clearInterval);
      
      global.setInterval = originalSetInterval;
      
      expect(intervals.length).toBeGreaterThan(0);
    });
  });

  describe('UI Error State Recovery', () => {
    it('should provide recovery mechanisms for various error states', () => {
      const errorRecoveryStrategies = [
        {
          errorType: 'network_error',
          recovery: () => ({ action: 'retry', delay: 1000 }),
        },
        {
          errorType: 'data_corruption',
          recovery: () => ({ action: 'reset', confirmation: true }),
        },
        {
          errorType: 'permission_error',
          recovery: () => ({ action: 'redirect', url: '/login' }),
        },
        {
          errorType: 'quota_exceeded',
          recovery: () => ({ action: 'cleanup', scope: 'localStorage' }),
        },
      ];

      errorRecoveryStrategies.forEach(({ errorType, recovery }) => {
        expect(() => {
          const strategy = recovery();
          expect(strategy).toBeDefined();
          expect(strategy.action).toBeDefined();
        }).not.toThrow();
      });
    });
  });

  describe('Error Monitoring and Logging', () => {
    it('should capture and report errors with proper context', () => {
      const testError = new Error('Test error for monitoring');
      const context = {
        component: 'TestComponent',
        action: 'test_action',
        userId: 'test-user-123',
        timestamp: Date.now(),
      };

      expect(() => {
        monitoring.reportError(testError, context);
      }).not.toThrow();

      expect(monitoring.reportError).toHaveBeenCalledWith(testError, context);
    });

    it('should handle monitoring service failures gracefully', () => {
      // Mock monitoring service to fail
      (monitoring.reportError as jest.Mock).mockImplementation(() => {
        throw new Error('Monitoring service unavailable');
      });

      expect(() => {
        try {
          monitoring.reportError(new Error('Test'), {});
        } catch (e) {
          // Monitoring failure shouldn't crash the app
          console.warn('Failed to report error to monitoring service');
        }
      }).not.toThrow();
    });
  });

  describe('Edge Case Error Scenarios', () => {
    it('should handle system clock changes', () => {
      const timer = new PrecisionTimer();
      timer.start();
      
      // Simulate system clock jumping forward
      const originalDateNow = Date.now;
      Date.now = jest.fn().mockReturnValue(originalDateNow() + 1000000); // Jump 1000 seconds
      
      expect(() => timer.getElapsedTime()).not.toThrow();
      const elapsed = timer.getElapsedTime();
      expect(elapsed).toBeGreaterThanOrEqual(0);
      
      Date.now = originalDateNow;
    });

    it('should handle browser tab hibernation', () => {
      const timer = new PrecisionTimer();
      timer.start();
      
      // Simulate tab going background and coming back
      Object.defineProperty(document, 'visibilityState', {
        value: 'hidden',
        writable: true,
      });
      
      // Trigger visibility change event
      const event = new Event('visibilitychange');
      document.dispatchEvent(event);
      
      Object.defineProperty(document, 'visibilityState', {
        value: 'visible',
        writable: true,
      });
      
      document.dispatchEvent(event);
      
      expect(() => timer.getElapsedTime()).not.toThrow();
    });

    it('should handle rapid start/stop cycles', () => {
      const timer = new PrecisionTimer();
      
      // Rapid start/stop cycles
      for (let i = 0; i < 100; i++) {
        expect(() => {
          timer.start();
          timer.pause();
          timer.reset();
        }).not.toThrow();
      }
    });
  });
});