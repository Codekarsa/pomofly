import { renderHook, act } from '@testing-library/react'
import { usePomodoro, defaultSettings } from '../usePomodoro'
import { TimerPersistence } from '@/lib/timerPersistence'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

// Mock sessionStorage  
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
})

describe('usePomodoro', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    localStorageMock.getItem.mockReturnValue(null)
    localStorageMock.setItem.mockClear()
    localStorageMock.removeItem.mockClear()
    sessionStorageMock.getItem.mockReturnValue(null)
    sessionStorageMock.setItem.mockClear()
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  it('should initialize with default settings', () => {
    const { result } = renderHook(() => usePomodoro(defaultSettings))

    expect(result.current.phase).toBe('pomodoro')
    expect(result.current.minutes).toBe(25)
    expect(result.current.seconds).toBe(0)
    expect(result.current.isActive).toBe(false)
  })

  it('should initialize with custom settings', () => {
    const customSettings = {
      pomodoro: 30,
      shortBreak: 10,
      longBreak: 20,
      longBreakInterval: 3
    }

    const { result } = renderHook(() => usePomodoro(customSettings))

    expect(result.current.phase).toBe('pomodoro')
    expect(result.current.minutes).toBe(30)
    expect(result.current.seconds).toBe(0)
  })

  it('should toggle timer state', () => {
    const { result } = renderHook(() => usePomodoro(defaultSettings))

    expect(result.current.isActive).toBe(false)

    act(() => {
      result.current.toggleTimer()
    })

    expect(result.current.isActive).toBe(true)

    act(() => {
      result.current.toggleTimer()
    })

    expect(result.current.isActive).toBe(false)
  })

  it('should reset timer', () => {
    const { result } = renderHook(() => usePomodoro(defaultSettings))

    // Start timer and advance time
    act(() => {
      result.current.toggleTimer()
    })

    act(() => {
      jest.advanceTimersByTime(60000) // 1 minute
    })

    expect(result.current.minutes).toBe(24)

    // Reset timer
    act(() => {
      result.current.resetTimer()
    })

    expect(result.current.minutes).toBe(25)
    expect(result.current.seconds).toBe(0)
    expect(result.current.isActive).toBe(false)
  })

  it('should switch phases', () => {
    const { result } = renderHook(() => usePomodoro(defaultSettings))

    expect(result.current.phase).toBe('pomodoro')

    act(() => {
      result.current.switchPhase('shortBreak')
    })

    expect(result.current.phase).toBe('shortBreak')
    expect(result.current.minutes).toBe(5)
    expect(result.current.seconds).toBe(0)
    expect(result.current.isActive).toBe(false)
  })

  it('should complete pomodoro session and switch to short break', () => {
    const onComplete = jest.fn()
    const { result } = renderHook(() => usePomodoro(defaultSettings, onComplete))

    act(() => {
      result.current.toggleTimer()
    })

    // Advance time to complete pomodoro session
    act(() => {
      jest.advanceTimersByTime(25 * 60 * 1000) // 25 minutes
    })

    expect(result.current.phase).toBe('shortBreak')
    expect(result.current.minutes).toBe(5)
    expect(result.current.seconds).toBe(0)
    expect(result.current.isActive).toBe(false)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('should complete short break and switch back to pomodoro', () => {
    const onComplete = jest.fn()
    const { result } = renderHook(() => usePomodoro(defaultSettings, onComplete))

    // Switch to short break
    act(() => {
      result.current.switchPhase('shortBreak')
      result.current.toggleTimer()
    })

    // Advance time to complete short break
    act(() => {
      jest.advanceTimersByTime(5 * 60 * 1000) // 5 minutes
    })

    expect(result.current.phase).toBe('pomodoro')
    expect(result.current.minutes).toBe(25)
    expect(result.current.seconds).toBe(0)
    expect(result.current.isActive).toBe(false)
    expect(onComplete).toHaveBeenCalledTimes(1)
  })

  it('should switch to long break after completing long break interval', () => {
    const customSettings = {
      pomodoro: 25,
      shortBreak: 5,
      longBreak: 15,
      longBreakInterval: 2
    }
    const onComplete = jest.fn()
    const { result } = renderHook(() => usePomodoro(customSettings, onComplete))

    // Complete first pomodoro session
    act(() => {
      result.current.toggleTimer()
      jest.advanceTimersByTime(25 * 60 * 1000)
    })

    expect(result.current.phase).toBe('shortBreak')

    // Complete short break
    act(() => {
      result.current.toggleTimer()
      jest.advanceTimersByTime(5 * 60 * 1000)
    })

    expect(result.current.phase).toBe('pomodoro')

    // Complete second pomodoro session
    act(() => {
      result.current.toggleTimer()
      jest.advanceTimersByTime(25 * 60 * 1000)
    })

    expect(result.current.phase).toBe('longBreak')
    expect(result.current.minutes).toBe(15)
  })

  it('should update settings', () => {
    const { result } = renderHook(() => usePomodoro(defaultSettings))

    const newSettings = {
      pomodoro: 30,
      shortBreak: 10,
      longBreak: 20,
      longBreakInterval: 4
    }

    act(() => {
      result.current.updateSettings(newSettings)
    })

    expect(result.current.settings).toEqual(newSettings)
  })

  it('should count down seconds correctly', () => {
    const { result } = renderHook(() => usePomodoro(defaultSettings))

    act(() => {
      result.current.toggleTimer()
    })

    expect(result.current.seconds).toBe(0)

    act(() => {
      jest.advanceTimersByTime(1000) // 1 second
    })

    expect(result.current.seconds).toBe(59)
    expect(result.current.minutes).toBe(24)
  })

  it('should format time correctly', () => {
    const { result } = renderHook(() => usePomodoro(defaultSettings))

    expect(result.current.minutes.toString().padStart(2, '0')).toBe('25')
    expect(result.current.seconds.toString().padStart(2, '0')).toBe('00')
  })

  // Timer Recovery Edge Cases Tests
  describe('Timer Recovery Edge Cases', () => {
    it('should handle corrupted session data gracefully', () => {
      // Mock corrupted localStorage data
      localStorageMock.getItem.mockReturnValue('{"invalid":"json"corrupted}')

      const { result } = renderHook(() => usePomodoro(defaultSettings))

      // Should start fresh and not crash
      expect(result.current.phase).toBe('pomodoro')
      expect(result.current.showRecoveryModal).toBe(false)
    })

    it('should handle session with invalid timestamps', () => {
      const futureTimestamp = Date.now() + 1000000 // 1000 seconds in future
      const invalidSession = {
        phase: 'pomodoro',
        isActive: true,
        timerStartedAt: futureTimestamp,
        pausedTimeRemaining: null,
        sessionsCompleted: 0,
        sessionCreatedAt: Date.now(),
        lastUpdatedAt: Date.now(),
        settings: defaultSettings,
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(invalidSession))

      const { result } = renderHook(() => usePomodoro(defaultSettings))

      // Should detect invalid timestamp and start fresh
      expect(result.current.showRecoveryModal).toBe(false)
    })

    it('should handle very old session gracefully', () => {
      const oldTimestamp = Date.now() - (25 * 60 * 60 * 1000) // 25 hours ago
      const oldSession = {
        phase: 'pomodoro',
        isActive: false,
        timerStartedAt: null,
        pausedTimeRemaining: null,
        sessionsCompleted: 0,
        sessionCreatedAt: oldTimestamp,
        lastUpdatedAt: oldTimestamp,
        settings: defaultSettings,
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(oldSession))

      const { result } = renderHook(() => usePomodoro(defaultSettings))

      // Should clear old session and start fresh
      expect(result.current.showRecoveryModal).toBe(false)
      expect(localStorageMock.removeItem).toHaveBeenCalled()
    })

    it('should handle paused vs active state recovery correctly', () => {
      const pausedSession = {
        phase: 'pomodoro',
        isActive: false,
        timerStartedAt: null,
        pausedTimeRemaining: 300, // 5 minutes remaining
        sessionsCompleted: 0,
        sessionCreatedAt: Date.now() - 60000, // 1 minute ago
        lastUpdatedAt: Date.now() - 60000,
        settings: defaultSettings,
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(pausedSession))

      const { result } = renderHook(() => usePomodoro(defaultSettings))

      expect(result.current.showRecoveryModal).toBe(true)

      // Restore the session
      act(() => {
        result.current.restoreSession(pausedSession)
      })

      expect(result.current.isActive).toBe(false)
      expect(result.current.minutes).toBe(5)
      expect(result.current.seconds).toBe(0)
    })

    it('should handle multiple task IDs in session recovery', () => {
      const sessionWithTasks = {
        phase: 'pomodoro',
        isActive: true,
        timerStartedAt: Date.now() - 30000, // 30 seconds ago
        pausedTimeRemaining: null,
        sessionsCompleted: 0,
        sessionCreatedAt: Date.now() - 60000,
        lastUpdatedAt: Date.now() - 30000,
        selectedTaskIds: ['task1', 'task2', 'task3'],
        settings: defaultSettings,
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessionWithTasks))

      const { result } = renderHook(() => usePomodoro(defaultSettings))

      expect(result.current.showRecoveryModal).toBe(true)

      // Get recovery session info
      const recoveryInfo = result.current.getRecoverySessionInfo()
      expect(recoveryInfo?.taskCount).toBe(3)
      expect(recoveryInfo?.wasActive).toBe(true)
    })

    it('should handle browser restart detection', () => {
      // Simulate different browser session
      sessionStorageMock.getItem.mockReturnValue('different_session_id')
      
      const activeSession = {
        phase: 'pomodoro',
        isActive: true,
        timerStartedAt: Date.now() - 60000, // 1 minute ago
        pausedTimeRemaining: null,
        sessionsCompleted: 0,
        sessionCreatedAt: Date.now() - 120000,
        lastUpdatedAt: Date.now() - 60000,
        browserSessionId: 'old_session_id',
        settings: defaultSettings,
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(activeSession))

      const { result } = renderHook(() => usePomodoro(defaultSettings))

      expect(result.current.showRecoveryModal).toBe(true)
      
      // Session should be marked as paused due to browser restart
      const recoveryInfo = result.current.getRecoverySessionInfo()
      expect(recoveryInfo?.wasActive).toBe(false) // Should be converted to paused
    })

    it('should validate timer state logical consistency', () => {
      const inconsistentSession = {
        phase: 'pomodoro',
        isActive: true,
        timerStartedAt: null, // Inconsistent: active but no start time
        pausedTimeRemaining: null,
        sessionsCompleted: 0,
        sessionCreatedAt: Date.now(),
        lastUpdatedAt: Date.now(),
        settings: defaultSettings,
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(inconsistentSession))

      const { result } = renderHook(() => usePomodoro(defaultSettings))

      // Should detect inconsistency and start fresh
      expect(result.current.showRecoveryModal).toBe(false)
    })

    it('should handle negative pause time gracefully', () => {
      const invalidPauseSession = {
        phase: 'pomodoro',
        isActive: false,
        timerStartedAt: null,
        pausedTimeRemaining: -300, // Invalid negative pause time
        sessionsCompleted: 0,
        sessionCreatedAt: Date.now(),
        lastUpdatedAt: Date.now(),
        settings: defaultSettings,
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(invalidPauseSession))

      const { result } = renderHook(() => usePomodoro(defaultSettings))

      // Should detect invalid pause time and start fresh
      expect(result.current.showRecoveryModal).toBe(false)
    })

    it('should update selected task IDs correctly', () => {
      const { result } = renderHook(() => usePomodoro(defaultSettings))

      act(() => {
        result.current.toggleTimer()
      })

      act(() => {
        result.current.updateSelectedTasks(['task1', 'task2'])
      })

      // Should have called persistence update
      expect(localStorageMock.setItem).toHaveBeenCalled()
    })

    it('should provide accurate recovery session info', () => {
      const sessionWithDetails = {
        phase: 'shortBreak',
        isActive: false,
        timerStartedAt: null,
        pausedTimeRemaining: 180, // 3 minutes
        sessionsCompleted: 2,
        sessionCreatedAt: Date.now() - 300000, // 5 minutes ago
        lastUpdatedAt: Date.now() - 60000,
        selectedTaskIds: ['task1'],
        settings: defaultSettings,
      }
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(sessionWithDetails))

      const { result } = renderHook(() => usePomodoro(defaultSettings))

      const recoveryInfo = result.current.getRecoverySessionInfo()
      
      expect(recoveryInfo?.phase).toBe('shortBreak')
      expect(recoveryInfo?.remaining).toBe(180)
      expect(recoveryInfo?.taskCount).toBe(1)
      expect(recoveryInfo?.wasActive).toBe(false)
      expect(recoveryInfo?.sessionAge).toBeGreaterThan(300000)
    })
  })
}) 