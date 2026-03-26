import { renderHook, act } from '@testing-library/react';
import { useTimerStateMachine, TimerSettings } from '../useTimerStateMachine';

// Mock timer functions
jest.useFakeTimers();

const defaultSettings: TimerSettings = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4,
};

describe('useTimerStateMachine', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useTimerStateMachine(defaultSettings));

    expect(result.current.phase).toBe('pomodoro');
    expect(result.current.minutes).toBe(25);
    expect(result.current.seconds).toBe(0);
    expect(result.current.isActive).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.isCompleted).toBe(false);
    expect(result.current.sessionsCompleted).toBe(0);
  });

  it('should start timer correctly', () => {
    const { result } = renderHook(() => useTimerStateMachine(defaultSettings));

    act(() => {
      result.current.startTimer();
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.isPaused).toBe(false);
  });

  it('should pause and resume timer correctly', () => {
    const { result } = renderHook(() => useTimerStateMachine(defaultSettings));

    // Start timer
    act(() => {
      result.current.startTimer();
    });

    // Advance time slightly
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Pause timer
    act(() => {
      result.current.pauseTimer();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.isPaused).toBe(true);

    // Resume timer
    act(() => {
      result.current.startTimer();
    });

    expect(result.current.isActive).toBe(true);
    expect(result.current.isPaused).toBe(false);
  });

  it('should prevent invalid state transitions', () => {
    const { result } = renderHook(() => useTimerStateMachine(defaultSettings));

    // Try to pause without starting
    act(() => {
      result.current.pauseTimer();
    });

    // Should remain in idle state
    expect(result.current.isActive).toBe(false);
    expect(result.current.isPaused).toBe(false);
  });

  it('should reset timer correctly', () => {
    const { result } = renderHook(() => useTimerStateMachine(defaultSettings));

    // Start and advance timer
    act(() => {
      result.current.startTimer();
      jest.advanceTimersByTime(5000);
    });

    // Reset
    act(() => {
      result.current.resetTimer();
    });

    expect(result.current.isActive).toBe(false);
    expect(result.current.isPaused).toBe(false);
    expect(result.current.minutes).toBe(25);
    expect(result.current.seconds).toBe(0);
  });

  it('should complete pomodoro and call onComplete', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useTimerStateMachine(defaultSettings, onComplete));

    // Start timer
    act(() => {
      result.current.startTimer();
    });

    // Advance to completion
    act(() => {
      jest.advanceTimersByTime(25 * 60 * 1000); // 25 minutes
    });

    expect(result.current.isCompleted).toBe(true);
    expect(result.current.minutes).toBe(0);
    expect(result.current.seconds).toBe(0);
    expect(onComplete).toHaveBeenCalled();
  });

  it('should transition to short break after pomodoro', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useTimerStateMachine(defaultSettings, onComplete));

    // Start and complete pomodoro
    act(() => {
      result.current.startTimer();
      jest.advanceTimersByTime(25 * 60 * 1000);
    });

    // Allow auto-transition
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current.phase).toBe('shortBreak');
    expect(result.current.minutes).toBe(5);
    expect(result.current.isActive).toBe(false);
  });

  it('should transition to long break after specified intervals', () => {
    const onComplete = jest.fn();
    const { result } = renderHook(() => useTimerStateMachine(defaultSettings, onComplete));

    // Complete 4 pomodoros
    for (let i = 0; i < 4; i++) {
      act(() => {
        result.current.switchPhase('pomodoro');
        result.current.startTimer();
        jest.advanceTimersByTime(25 * 60 * 1000);
        jest.advanceTimersByTime(200); // Allow transition
      });
    }

    expect(result.current.phase).toBe('longBreak');
    expect(result.current.minutes).toBe(15);
  });

  it('should switch phases correctly', () => {
    const { result } = renderHook(() => useTimerStateMachine(defaultSettings));

    act(() => {
      result.current.switchPhase('shortBreak');
    });

    expect(result.current.phase).toBe('shortBreak');
    expect(result.current.minutes).toBe(5);
    expect(result.current.seconds).toBe(0);
    expect(result.current.isActive).toBe(false);

    act(() => {
      result.current.switchPhase('longBreak');
    });

    expect(result.current.phase).toBe('longBreak');
    expect(result.current.minutes).toBe(15);
  });

  it('should restore session state correctly', () => {
    const { result } = renderHook(() => useTimerStateMachine(defaultSettings));

    const sessionState = {
      phase: 'shortBreak' as const,
      remainingMs: 3 * 60 * 1000, // 3 minutes
      sessionsCompleted: 2,
    };

    act(() => {
      result.current.restoreSession(sessionState);
    });

    expect(result.current.phase).toBe('shortBreak');
    expect(result.current.minutes).toBe(3);
    expect(result.current.seconds).toBe(0);
    expect(result.current.sessionsCompleted).toBe(2);
    expect(result.current.isRecovering).toBe(true);

    act(() => {
      result.current.finishRecovery();
    });

    expect(result.current.isRecovering).toBe(false);
  });

  it('should handle settings updates correctly', () => {
    const { result, rerender } = renderHook(
      ({ settings }) => useTimerStateMachine(settings),
      { initialProps: { settings: defaultSettings } }
    );

    const newSettings: TimerSettings = {
      pomodoro: 30,
      shortBreak: 10,
      longBreak: 20,
      longBreakInterval: 3,
    };

    act(() => {
      rerender({ settings: newSettings });
    });

    expect(result.current.minutes).toBe(30);
  });

  it('should maintain accurate time calculation during pause/resume cycles', () => {
    const { result } = renderHook(() => useTimerStateMachine(defaultSettings));

    // Start timer
    act(() => {
      result.current.startTimer();
    });

    // Run for 5 minutes
    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });

    expect(result.current.minutes).toBe(20);

    // Pause
    act(() => {
      result.current.pauseTimer();
    });

    // Wait while paused (should not affect remaining time)
    act(() => {
      jest.advanceTimersByTime(2 * 60 * 1000);
    });

    expect(result.current.minutes).toBe(20);

    // Resume
    act(() => {
      result.current.startTimer();
    });

    // Run for another 5 minutes
    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });

    expect(result.current.minutes).toBe(15);
  });

  it('should cleanup timers on unmount', () => {
    const { result, unmount } = renderHook(() => useTimerStateMachine(defaultSettings));

    act(() => {
      result.current.startTimer();
    });

    const intervalCount = jest.getTimerCount();
    
    unmount();

    expect(jest.getTimerCount()).toBeLessThan(intervalCount);
  });
});