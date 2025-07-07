import { renderHook, act } from '@testing-library/react'
import { usePomodoro, defaultSettings } from '../usePomodoro'

describe('usePomodoro', () => {
  beforeEach(() => {
    jest.useFakeTimers()
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
}) 