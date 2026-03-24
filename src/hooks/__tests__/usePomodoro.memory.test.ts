/**
 * Memory leak tests for usePomodoro hook
 * These tests verify that cleanup functions work properly and refs are cleared
 */

import { renderHook, act } from '@testing-library/react';
import { usePomodoro } from '../usePomodoro';

// Mock TimerPersistence
jest.mock('@/lib/timerPersistence', () => ({
  TimerPersistence: {
    loadSession: jest.fn(() => null),
    saveSession: jest.fn(),
    clearSession: jest.fn(),
    updateSessionTaskIds: jest.fn(),
    calculateRemainingTime: jest.fn(() => 0),
    hasActiveSession: jest.fn(() => false),
    getSessionAge: jest.fn(() => null)
  }
}));

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('usePomodoro - Memory Leak Prevention', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const defaultSettings = {
    pomodoro: 25,
    shortBreak: 5,
    longBreak: 15,
    longBreakInterval: 4
  };

  describe('Interval Cleanup', () => {
    it('should clear interval when component unmounts', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      const { unmount } = renderHook(() => 
        usePomodoro(defaultSettings)
      );

      // Start timer to create interval
      const { result } = renderHook(() => 
        usePomodoro(defaultSettings)
      );

      act(() => {
        result.current.toggleTimer();
      });

      // Advance timer to ensure interval is created
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Unmount should clear interval
      unmount();

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should clear interval when isActive becomes false', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      const { result } = renderHook(() => 
        usePomodoro(defaultSettings)
      );

      // Start timer
      act(() => {
        result.current.toggleTimer();
      });

      // Stop timer should clear interval
      act(() => {
        result.current.toggleTimer();
      });

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });

    it('should clear interval when resetting timer', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      
      const { result } = renderHook(() => 
        usePomodoro(defaultSettings)
      );

      // Start timer
      act(() => {
        result.current.toggleTimer();
      });

      // Reset should clear interval
      act(() => {
        result.current.resetTimer();
      });

      expect(clearIntervalSpy).toHaveBeenCalled();
      clearIntervalSpy.mockRestore();
    });
  });

  describe('Timeout Cleanup', () => {
    it('should clear persist timeout on unmount', () => {
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
      
      const { unmount } = renderHook(() => 
        usePomodoro(defaultSettings)
      );

      // Change state to trigger persist timeout
      const { result } = renderHook(() => 
        usePomodoro(defaultSettings)
      );

      act(() => {
        result.current.toggleTimer();
      });

      // Unmount before timeout completes
      unmount();

      expect(clearTimeoutSpy).toHaveBeenCalled();
      clearTimeoutSpy.mockRestore();
    });

    it('should handle multiple rapid state changes without memory leaks', () => {
      const { result } = renderHook(() => 
        usePomodoro(defaultSettings)
      );

      // Rapid state changes should not accumulate timeouts
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.toggleTimer();
        }
      });

      // Only one persist timeout should be active
      expect(jest.getTimerCount()).toBeLessThanOrEqual(1);
    });
  });

  describe('Callback Stability', () => {
    it('should not recreate callbacks unnecessarily', () => {
      const { result, rerender } = renderHook(() => 
        usePomodoro(defaultSettings)
      );

      const firstToggleTimer = result.current.toggleTimer;
      const firstResetTimer = result.current.resetTimer;
      const firstSwitchPhase = result.current.switchPhase;

      // Rerender with same settings
      rerender();

      // Callbacks should be stable
      expect(result.current.toggleTimer).toBe(firstToggleTimer);
      expect(result.current.resetTimer).toBe(firstResetTimer);
      expect(result.current.switchPhase).toBe(firstSwitchPhase);
    });

    it('should handle onComplete callback changes without timer reset', () => {
      let onCompleteCallCount = 0;
      const onComplete1 = jest.fn(() => onCompleteCallCount++);
      
      const { result, rerender } = renderHook(
        ({ onComplete }) => usePomodoro(defaultSettings, onComplete),
        { initialProps: { onComplete: onComplete1 } }
      );

      // Start timer
      act(() => {
        result.current.toggleTimer();
      });

      const timerState1 = result.current;

      // Change onComplete callback
      const onComplete2 = jest.fn(() => onCompleteCallCount++);
      rerender({ onComplete: onComplete2 });

      // Timer state should remain stable
      expect(result.current.isActive).toBe(timerState1.isActive);
      expect(result.current.phase).toBe(timerState1.phase);
    });
  });

  describe('Memory Usage Patterns', () => {
    it('should not accumulate state over multiple timer cycles', () => {
      const { result } = renderHook(() => 
        usePomodoro(defaultSettings)
      );

      // Run multiple timer cycles
      for (let cycle = 0; cycle < 5; cycle++) {
        act(() => {
          result.current.toggleTimer(); // Start
        });
        
        act(() => {
          jest.advanceTimersByTime(1000); // Run for 1 second
        });
        
        act(() => {
          result.current.resetTimer(); // Reset
        });
      }

      // Timer should return to initial state
      expect(result.current.isActive).toBe(false);
      expect(result.current.minutes).toBe(defaultSettings.pomodoro);
      expect(result.current.seconds).toBe(0);
    });

    it('should handle rapid mount/unmount cycles', () => {
      // Simulate rapid component mount/unmount
      for (let i = 0; i < 10; i++) {
        const { unmount } = renderHook(() => 
          usePomodoro(defaultSettings)
        );
        unmount();
      }

      // Should not throw errors or leave hanging references
      expect(() => {
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });
  });

  describe('Ref Cleanup', () => {
    it('should clear refs on unmount', () => {
      const { result, unmount } = renderHook(() => 
        usePomodoro(defaultSettings)
      );

      // Start timer to initialize refs
      act(() => {
        result.current.toggleTimer();
      });

      // Unmount should clear refs (can't directly test refs, but should not cause errors)
      unmount();

      // Advancing timers after unmount should not cause errors
      expect(() => {
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });

    it('should handle callback execution after unmount gracefully', () => {
      const onComplete = jest.fn();
      const { result, unmount } = renderHook(() => 
        usePomodoro(defaultSettings, onComplete)
      );

      // Start timer
      act(() => {
        result.current.toggleTimer();
      });

      // Unmount component
      unmount();

      // Simulate timer completion after unmount (shouldn't call callback)
      act(() => {
        jest.advanceTimersByTime(25 * 60 * 1000); // 25 minutes
      });

      // Callback should not be called after unmount
      expect(onComplete).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle localStorage errors gracefully', () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });

      const { result } = renderHook(() => 
        usePomodoro(defaultSettings)
      );

      // Should not throw error when localStorage fails
      expect(() => {
        act(() => {
          result.current.updateSettings({ ...defaultSettings, pomodoro: 30 });
        });
      }).not.toThrow();
    });

    it('should handle persistence errors without affecting timer functionality', () => {
      const { TimerPersistence } = require('@/lib/timerPersistence');
      TimerPersistence.saveSession.mockImplementation(() => {
        throw new Error('Persistence error');
      });

      const { result } = renderHook(() => 
        usePomodoro(defaultSettings)
      );

      // Timer should still work despite persistence errors
      expect(() => {
        act(() => {
          result.current.toggleTimer();
        });
      }).not.toThrow();

      expect(result.current.isActive).toBe(true);
    });
  });

  describe('Debouncing', () => {
    it('should debounce localStorage writes', () => {
      const { result } = renderHook(() => 
        usePomodoro(defaultSettings)
      );

      // Rapid state changes
      act(() => {
        result.current.toggleTimer();
        result.current.toggleTimer();
        result.current.toggleTimer();
      });

      // Only one setTimeout should be scheduled for debouncing
      expect(jest.getTimerCount()).toBeLessThanOrEqual(1);
    });

    it('should clear pending debounced operations on unmount', () => {
      const { result, unmount } = renderHook(() => 
        usePomodoro(defaultSettings)
      );

      // Start operation that will be debounced
      act(() => {
        result.current.toggleTimer();
      });

      // Unmount before debounce completes
      unmount();

      // Advancing timers should not cause errors
      expect(() => {
        jest.advanceTimersByTime(1000);
      }).not.toThrow();
    });
  });
});