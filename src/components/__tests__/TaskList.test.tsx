import React from 'react'
import { render, screen, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TaskList from '../TaskList'
import TodayFocusSection from '../TodayFocusSection'
import PomodoroTimer from '../PomodoroTimer'
import { defaultSettings } from '@/hooks/usePomodoro'

jest.mock('@/lib/firebase', () => ({ auth: { currentUser: null }, db: {} }))
jest.mock('@/app/contexts/AuthContext', () => ({ useAuth: () => ({ user: null }) }))
jest.mock('@/hooks/useGoogleAnalytics', () => ({ useGoogleAnalytics: () => ({ event: jest.fn() }) }))

beforeAll(() => {
  Object.defineProperty(window, 'ResizeObserver', {
    value: class { observe() {} unobserve() {} disconnect() {} }
  })
  Element.prototype.scrollIntoView = jest.fn()
})

it('keeps creation project separate from list filtering and explains empty search results', async () => {
  localStorage.clear()
  localStorage.setItem('pomofly_guest_projects', JSON.stringify([
    { id: 'work', name: 'Work', userId: 'guest', createdAt: new Date() },
    { id: 'home', name: 'Personal', userId: 'guest', createdAt: new Date() },
  ]))
  localStorage.setItem('pomofly_guest_tasks', JSON.stringify([
    { id: 'draft', title: 'Draft launch email', projectId: 'work', createdAt: new Date(), completed: false },
    { id: 'shop', title: 'Buy groceries', projectId: 'home', createdAt: new Date(), completed: false },
  ]))
  const user = userEvent.setup()
  render(<TaskList />)
  await user.click(screen.getByRole('button', { name: 'Add Task' }))
  await user.click(screen.getByRole('combobox', { name: 'Project (required)' }))
  await user.click(screen.getByRole('option', { name: 'Personal' }))
  expect(screen.getByText('Draft launch email')).toBeVisible()
  expect(screen.getByText('Buy groceries')).toBeVisible()
  await user.type(screen.getByRole('textbox', { name: 'Search tasks' }), 'unmatched title')
  expect(screen.getByRole('status')).toHaveTextContent('No tasks match your search or filters')
  await user.clear(screen.getByRole('textbox', { name: 'Search tasks' }))
  expect(screen.getByText('Draft launch email')).toBeVisible()
  expect(screen.getByText('Buy groceries')).toBeVisible()
})

it('requires confirmation to delete a focused task and preserves it on cancel', async () => {
  localStorage.clear()
  localStorage.setItem('pomofly_guest_tasks', JSON.stringify([
    { id: 'draft', title: 'Draft launch email', focus: true, createdAt: new Date(), completed: false },
    { id: 'shop', title: 'Buy groceries', focus: true, createdAt: new Date(), completed: false },
  ]))
  const user = userEvent.setup()
  render(<TodayFocusSection settings={defaultSettings} />)
  await user.click(screen.getByRole('button', { name: 'Actions for Draft launch email' }))
  await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
  expect(screen.getByRole('alertdialog')).toHaveTextContent('Draft launch email')
  expect(JSON.parse(localStorage.getItem('pomofly_guest_tasks')!)).toHaveLength(2)
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.getByText('Draft launch email')).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Actions for Draft launch email' }))
  await user.click(screen.getByRole('menuitem', { name: 'Delete' }))
  await user.click(screen.getByRole('button', { name: 'Delete' }))
  expect(screen.queryByText('Draft launch email')).not.toBeInTheDocument()
  expect(screen.getByText('Buy groceries')).toBeVisible()
  expect(JSON.parse(localStorage.getItem('pomofly_guest_tasks')!).map((task: { id: string }) => task.id)).toEqual(['shop'])
})

it('saves actual guest task time on an early ending without full-session credit', async () => {
  jest.useFakeTimers()
  try {
    localStorage.clear()
    localStorage.setItem('selectedTaskIds', JSON.stringify(['draft']))
    localStorage.setItem('pomofly_guest_tasks', JSON.stringify([
      { id: 'draft', title: 'Draft launch email', createdAt: new Date(), completed: false,
        manualTimeSpent: 0, totalTimeSpent: 0, totalPomodoroSessions: 0 },
    ]))
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<PomodoroTimer settings={defaultSettings} />)
    await user.click(screen.getByRole('button', { name: 'Start' }))
    act(() => jest.advanceTimersByTime(7000))
    await user.click(screen.getByRole('button', { name: 'End early' }))
    const [task] = JSON.parse(localStorage.getItem('pomofly_guest_tasks')!)
    expect(task.manualTimeSpent).toBe(7)
    expect(task.trackingStartedAt).toBeNull()
    expect(task.totalTimeSpent).toBe(0)
    expect(task.totalPomodoroSessions).toBe(0)
    expect(JSON.parse(localStorage.getItem('pomofly_completed_sessions')!)).toEqual([])
    expect(screen.getByText('05:00')).toBeInTheDocument()
  } finally {
    jest.useRealTimers()
  }
})
