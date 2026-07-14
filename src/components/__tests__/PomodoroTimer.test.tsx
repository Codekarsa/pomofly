import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PomodoroTimer from '../PomodoroTimer'
import { defaultSettings } from '@/hooks/usePomodoro'

// Mock the hooks
jest.mock('@/app/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'test-user-id',
      email: 'test@example.com',
    },
  }),
}))

jest.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({
    tasks: [
      {
        id: 'task-1',
        title: 'Test Task 1',
        completed: false,
        trackingStartedAt: null,
        manualTimeSpent: 0,
        totalTimeSpent: 0,
      },
      {
        id: 'task-2',
        title: 'Test Task 2',
        completed: false,
        trackingStartedAt: null,
        manualTimeSpent: 0,
        totalTimeSpent: 0,
      },
    ],
    loading: false,
    incrementPomodoroSession: jest.fn(),
    startAllTimeTracking: jest.fn(),
    stopAllTimeTracking: jest.fn(),
  }),
}))

jest.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({
    projects: [],
    loading: false,
    error: null,
  }),
}))

jest.mock('@/hooks/useGoogleAnalytics', () => ({
  useGoogleAnalytics: () => ({
    event: jest.fn(),
  }),
}))

describe('PomodoroTimer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    // Clear persisted timer sessions so the recovery modal doesn't leak between tests
    window.localStorage.clear()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should render timer with default settings', () => {
    render(<PomodoroTimer settings={defaultSettings} />)

    expect(screen.getByText('Pomodoro Timer')).toBeInTheDocument()
    expect(screen.getByText('25:00')).toBeInTheDocument()
    expect(screen.getByText('Today\'s Sessions:')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('should render phase buttons', () => {
    render(<PomodoroTimer settings={defaultSettings} />)

    expect(screen.getByText('Pomodoro')).toBeInTheDocument()
    expect(screen.getByText('Short Break')).toBeInTheDocument()
    expect(screen.getByText('Long Break')).toBeInTheDocument()
  })

  it('should start and pause timer', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<PomodoroTimer settings={defaultSettings} />)

    const startButton = screen.getByRole('button', { name: /start/i })
    expect(startButton).toBeInTheDocument()

    await user.click(startButton)

    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /pause/i }))

    expect(screen.getByRole('button', { name: /start/i })).toBeInTheDocument()
  })

  it('should reset timer', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<PomodoroTimer settings={defaultSettings} />)

    const startButton = screen.getByRole('button', { name: /start/i })
    const resetButton = screen.getByRole('button', { name: /reset/i })

    await user.click(startButton)

    // Advance time by 1 minute
    jest.advanceTimersByTime(60000)

    await user.click(resetButton)

    expect(screen.getByText('25:00')).toBeInTheDocument()
  })

  it('should switch between phases', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<PomodoroTimer settings={defaultSettings} />)

    const shortBreakButton = screen.getByText('Short Break')
    await user.click(shortBreakButton)

    expect(screen.getByText('05:00')).toBeInTheDocument()

    const longBreakButton = screen.getByText('Long Break')
    await user.click(longBreakButton)

    expect(screen.getByText('15:00')).toBeInTheDocument()

    const pomodoroButton = screen.getByText('Pomodoro')
    await user.click(pomodoroButton)

    expect(screen.getByText('25:00')).toBeInTheDocument()
  })

  it('should show task selector when user is authenticated', () => {
    render(<PomodoroTimer settings={defaultSettings} />)

    expect(screen.getByText('Working on:')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument()
  })

  it('should show Done/Next button when timer is active', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<PomodoroTimer settings={defaultSettings} />)

    const startButton = screen.getByRole('button', { name: /start/i })
    await user.click(startButton)

    expect(screen.getByRole('button', { name: /done\/next/i })).toBeInTheDocument()
  })

  it('should not show Done/Next button when timer is not active', () => {
    render(<PomodoroTimer settings={defaultSettings} />)

    expect(screen.queryByRole('button', { name: /done\/next/i })).not.toBeInTheDocument()
  })

  it('should display correct time format', () => {
    render(<PomodoroTimer settings={defaultSettings} />)

    expect(screen.getByText('25:00')).toBeInTheDocument()
  })

  it('should handle custom settings', () => {
    const customSettings = {
      pomodoro: 30,
      shortBreak: 10,
      longBreak: 20,
      longBreakInterval: 4,
    }

    render(<PomodoroTimer settings={customSettings} />)

    expect(screen.getByText('30:00')).toBeInTheDocument()
  })

  // The timer ticks every 100ms, so advancing 25 minutes fires 15k callbacks — allow extra time
  it('should count completed sessions', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    // Sessions are only counted when tasks are selected; the component reads this on mount
    window.localStorage.setItem('selectedTaskIds', JSON.stringify(['task-1']))
    render(<PomodoroTimer settings={defaultSettings} />)

    const startButton = screen.getByRole('button', { name: /start/i })
    await user.click(startButton)

    // Complete a pomodoro session
    await act(async () => {
      jest.advanceTimersByTime(25 * 60 * 1000)
    })

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  }, 30000)
}) 