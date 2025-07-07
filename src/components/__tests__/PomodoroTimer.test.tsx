import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
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
      },
      {
        id: 'task-2',
        title: 'Test Task 2',
        completed: false,
      },
    ],
    loading: false,
    incrementPomodoroSession: jest.fn(),
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

    expect(screen.getByPlaceholderText('Select a task')).toBeInTheDocument()
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

  it('should count completed sessions', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<PomodoroTimer settings={defaultSettings} />)

    const startButton = screen.getByRole('button', { name: /start/i })
    await user.click(startButton)

    // Complete a pomodoro session
    jest.advanceTimersByTime(25 * 60 * 1000)

    await waitFor(() => {
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })
}) 