import React from 'react'
import { render, screen, act, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TaskList from '../TaskList'
import TodayFocusSection from '../TodayFocusSection'
import PomodoroTimer from '../PomodoroTimer'
import { defaultSettings } from '@/hooks/usePomodoro'
import { TimerPersistence } from '@/lib/timerPersistence'

jest.mock('@/lib/firebase', () => ({ auth: { currentUser: null }, db: {} }))
jest.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(window.location.search) }))
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
  await user.click(screen.getByText('Optional details: project, estimate, star & labels'))
  await user.click(screen.getByRole('combobox', { name: 'Project (optional)' }))
  await user.click(screen.getByRole('option', { name: 'Personal' }))
  expect(screen.getByText('Draft launch email')).toBeVisible()
  expect(screen.getByText('Buy groceries')).toBeVisible()
  await user.type(screen.getByRole('textbox', { name: 'Search tasks' }), 'unmatched title')
  expect(screen.getByRole('status')).toHaveTextContent('No tasks match your search or filters')
  await user.clear(screen.getByRole('textbox', { name: 'Search tasks' }))
  expect(screen.getByText('Draft launch email')).toBeVisible()
  expect(screen.getByText('Buy groceries')).toBeVisible()
  await user.click(screen.getByRole('combobox', { name: 'Project (optional)' }))
  await user.click(screen.getByRole('option', { name: 'Inbox (no project)' }))
  await user.type(screen.getByRole('textbox', { name: 'Task title (required)' }), 'Unsorted idea')
  await user.click(screen.getByRole('button', { name: 'Add Task' }))
  expect(JSON.parse(localStorage.getItem('pomofly_guest_tasks')!).find((task: { title: string }) => task.title === 'Unsorted idea').projectId).toBe('')
})

it('creates a title-only Inbox task and hands it to an idle focus timer without auto-starting', async () => {
  localStorage.clear()
  const user = userEvent.setup()
  const list = render(<TaskList />)
  await user.type(screen.getByRole('textbox', { name: 'Task title (required)' }), 'Write the first chapter')
  await user.click(screen.getByRole('button', { name: 'Add Task' }))
  const [task] = JSON.parse(localStorage.getItem('pomofly_guest_tasks')!)
  expect(task).toMatchObject({ title: 'Write the first chapter', projectId: '', focus: false })
  expect(screen.getByText('Write the first chapter')).toBeVisible()
  const focusLink = screen.getByRole('link', { name: 'Focus on Write the first chapter' })
  window.history.replaceState({}, '', focusLink.getAttribute('href'))
  list.unmount()
  // Even an idle break should hand off to a focus countdown, not another break.
  TimerPersistence.saveSession({ phase: 'shortBreak', isActive: false, timerStartedAt: null,
    pausedTimeRemaining: null, sessionsCompleted: 2, sessionCreatedAt: Date.now(), settings: defaultSettings })
  render(<PomodoroTimer settings={defaultSettings} />)
  expect(screen.getByText('Write the first chapter')).toBeVisible()
  expect(screen.getByText('25:00')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Start' })).toBeVisible()
  expect(JSON.parse(localStorage.getItem('selectedTaskIds')!)).toEqual([task.id])
  expect(window.location.search).toBe('')
  await user.click(screen.getByRole('button', { name: 'Start' }))
  expect(screen.getByRole('button', { name: 'Pause' })).toBeVisible()
  expect(JSON.parse(localStorage.getItem('pomofly_guest_tasks')!)[0].trackingStartedAt).not.toBeNull()
})

it('creates and selects a task directly from the empty timer', async () => {
  localStorage.clear()
  const user = userEvent.setup()
  render(<PomodoroTimer settings={defaultSettings} />)
  await user.click(screen.getByRole('button', { name: 'Choose or create task' }))
  expect(screen.getByRole('button', { name: 'Create and select task' })).toBeDisabled()
  await user.type(screen.getByRole('textbox', { name: 'Search or name a new task' }), 'Prepare a presentation')
  await user.click(screen.getByRole('button', { name: 'Create and select task' }))
  expect(screen.getByText('Prepare a presentation')).toBeVisible()
  const [task] = JSON.parse(localStorage.getItem('pomofly_guest_tasks')!)
  expect(task.projectId).toBe('')
  expect(JSON.parse(localStorage.getItem('selectedTaskIds')!)).toEqual([task.id])
  expect(screen.getByRole('button', { name: 'Start' })).toBeVisible()
})

it('filters starred tasks in place without starting a timer or duplicating rows', async () => {
  localStorage.clear()
  localStorage.setItem('pomofly_guest_tasks', JSON.stringify([
    { id: 'draft', title: 'Draft launch email', createdAt: new Date(), completed: false },
    { id: 'shop', title: 'Buy groceries', createdAt: new Date(), completed: false },
  ]))
  const user = userEvent.setup()
  render(<TaskList />)
  await user.click(within(screen.getByText('Draft launch email').closest('li')!).getByRole('button', { name: 'Star task' }))
  await user.click(screen.getByRole('button', { name: 'Starred' }))
  expect(screen.getAllByText('Draft launch email')).toHaveLength(1)
  expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument()
  expect(localStorage.getItem('pomofly_timer_session')).toBeNull()
  await user.click(screen.getByRole('button', { name: 'All tasks' }))
  expect(screen.getByText('Buy groceries')).toBeVisible()
})

it.each([true, false])('preserves an existing running=%s session when opening another task', async (isActive) => {
  localStorage.clear()
  window.history.replaceState({}, '', '/?task=shop')
  localStorage.setItem('selectedTaskIds', JSON.stringify(['draft']))
  localStorage.setItem('pomofly_guest_tasks', JSON.stringify([
    { id: 'draft', title: 'Draft launch email', createdAt: new Date(), completed: false },
    { id: 'shop', title: 'Buy groceries', createdAt: new Date(), completed: false },
  ]))
  TimerPersistence.saveSession({ phase: 'pomodoro', isActive, timerStartedAt: Date.now() - 60000,
    pausedTimeRemaining: isActive ? null : 1440, sessionsCompleted: 2, sessionCreatedAt: Date.now(),
    selectedTaskIds: ['draft'], settings: defaultSettings })
  const user = userEvent.setup()
  render(<PomodoroTimer settings={defaultSettings} />)
  expect(screen.getByRole('dialog')).toHaveTextContent('Resume Previous Session?')
  expect(JSON.parse(localStorage.getItem('selectedTaskIds')!)).toEqual(['draft'])
  await user.click(screen.getByRole('button', { name: 'Resume Session' }))
  expect(screen.getByText('24:00')).toBeVisible()
  expect(screen.getByText(/Your previous timer has been kept/)).toBeVisible()
  await user.click(screen.getByRole('button', { name: 'Keep current tasks' }))
  expect(screen.queryByText('Buy groceries')).not.toBeInTheDocument()
  expect(screen.getByText('Draft launch email')).toBeVisible()
  expect(JSON.parse(localStorage.getItem('selectedTaskIds')!)).toEqual(['draft'])
  expect(screen.getByRole('button', { name: isActive ? 'Pause' : 'Start' })).toBeVisible()
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
