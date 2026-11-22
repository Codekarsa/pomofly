import React from 'react'
import { render, screen, act, within, fireEvent, waitFor } from '@testing-library/react'
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
  Element.prototype.hasPointerCapture = jest.fn(() => false)
  Element.prototype.setPointerCapture = jest.fn()
  Element.prototype.releasePointerCapture = jest.fn()
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
  await user.click(screen.getByText('Optional details: project, dates, estimate, star & labels'))
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
  expect(screen.getByRole('heading', { name: 'Write the first chapter' })).toBeVisible()
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
  expect(screen.getByRole('heading', { name: 'Prepare a presentation' })).toBeVisible()
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
  expect(screen.getByRole('heading', { name: 'Draft launch email' })).toBeVisible()
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
    await user.click(screen.getByRole('button', { name: 'Begin focus' }))
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

it('suggests planned work first and separates a completed session from finishing the task', async () => {
  jest.useFakeTimers({ now: new Date(2026, 10, 21, 12) })
  try {
    localStorage.clear()
    const taskDefaults = { createdAt: new Date(), completed: false, manualTimeSpent: 0, totalTimeSpent: 0, totalPomodoroSessions: 0 }
    localStorage.setItem('pomofly_guest_tasks', JSON.stringify([
      { ...taskDefaults, id: 'future', title: 'Future starred work', plannedFor: '2026-11-24', focus: true },
      { ...taskDefaults, id: 'inbox', title: 'An unscheduled idea' },
      { ...taskDefaults, id: 'today', title: 'Work planned for today', plannedFor: '2026-11-21' },
    ]))
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime })
    render(<PomodoroTimer settings={{ ...defaultSettings, pomodoro: 1 }} />)
    expect(screen.getByRole('heading', { name: 'Work planned for today' })).toBeVisible()
    await act(async () => { await user.click(screen.getByRole('button', { name: 'Begin focus' })) })
    await act(async () => { await user.click(screen.getByRole('button', { name: 'Start' })) })
    await act(async () => { jest.advanceTimersByTime(60000) })
    expect(screen.getByRole('progressbar', { name: 'Daily focus goal' })).toHaveAttribute('aria-valuenow', '1')
    expect(screen.getByRole('status')).toHaveTextContent('Session complete. 1 focused minute')
    const tasks = () => JSON.parse(localStorage.getItem('pomofly_guest_tasks')!)
    expect(tasks().find((task: { id: string }) => task.id === 'today')).toMatchObject({ completed: false, totalPomodoroSessions: 1, totalTimeSpent: 1, manualTimeSpent: 60, trackingStartedAt: null })
    await user.click(screen.getByRole('button', { name: 'Mark task done' }))
    expect(tasks().find((task: { id: string }) => task.id === 'today').completed).toBe(true)
    expect(tasks().find((task: { id: string }) => task.id === 'future')).toMatchObject({ completed: false, plannedFor: '2026-11-24', totalPomodoroSessions: 0 })
    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.queryByRole('button', { name: 'Mark task done' })).not.toBeInTheDocument()
    expect(screen.getByRole('progressbar', { name: 'Daily focus goal' })).toHaveAttribute('aria-valuenow', '1')
  } finally {
    jest.useRealTimers()
  }
})

it('pastes 50 tasks in four project batches with shared planning dates and keeps intake open', async () => {
  localStorage.clear()
  const groups = [['Launch', 13], ['Website', 13], ['Client', 12], ['Operations', 12]] as const
  localStorage.setItem('pomofly_guest_projects', JSON.stringify(groups.map(([name]) => ({ id: name, name, userId: 'guest', createdAt: new Date() }))))
  const user = userEvent.setup()
  const view = render(<TaskList />)
  await user.click(screen.getByRole('button', { name: 'Paste multiple tasks' }))
  fireEvent.change(screen.getByLabelText('Planned for (optional)'), { target: { value: '2026-11-22' } })
  fireEvent.change(screen.getByLabelText('Due by (optional)'), { target: { value: '2026-11-27' } })
  for (const [name, count] of groups) {
    await user.click(screen.getByRole('combobox', { name: 'Project (optional)' }))
    await user.click(screen.getByRole('option', { name }))
    await user.click(screen.getByRole('textbox', { name: 'Task titles (one per line)' }))
    await user.paste(Array.from({ length: count }, (_, index) => `  ${name} task ${index + 1}  `).join('\r\n\n'))
    await user.click(screen.getByRole('button', { name: `Add ${count} tasks` }))
    expect(screen.getByRole('textbox', { name: 'Task titles (one per line)' })).toHaveValue('')
    expect(screen.getByRole('status')).toHaveTextContent(`Added ${count} tasks`)
  }
  const stored = JSON.parse(localStorage.getItem('pomofly_guest_tasks')!)
  expect(stored).toHaveLength(50)
  expect(new Set(stored.map((task: { id: string }) => task.id)).size).toBe(50)
  for (const [name, count] of groups) {
    expect(stored.filter((task: { projectId: string }) => task.projectId === name)).toHaveLength(count)
  }
  expect(stored.every((task: { plannedFor: string; deadline: string; title: string }) => task.plannedFor === '2026-11-22' && task.deadline === '2026-11-27' && task.title === task.title.trim())).toBe(true)
  view.unmount()
  render(<TaskList />)
  expect(screen.getByText('Showing 5 of 50 active tasks · 50 active in total')).toBeVisible()
})

it('rejects an invalid batch without adding its valid lines and keeps the pasted input', async () => {
  localStorage.clear()
  const user = userEvent.setup()
  render(<TaskList />)
  await user.click(screen.getByRole('button', { name: 'Paste multiple tasks' }))
  const input = `Valid task\n${'x'.repeat(501)}`
  fireEvent.change(screen.getByRole('textbox', { name: 'Task titles (one per line)' }), { target: { value: input } })
  await user.click(screen.getByRole('button', { name: 'Add 2 tasks' }))
  expect(screen.getByRole('alert')).toHaveTextContent('Nothing has been added')
  expect(JSON.parse(localStorage.getItem('pomofly_guest_tasks') || '[]')).toEqual([])
  expect(screen.getByRole('textbox', { name: 'Task titles (one per line)' })).toHaveValue(input)
})

it('plans a week, moves work, adds a forgotten task in context, and bulk edits dates independently', async () => {
  jest.useFakeTimers({ now: new Date(2026, 10, 21, 12) })
  try {
    localStorage.clear()
    localStorage.setItem('pomofly_guest_projects', JSON.stringify([{ id: 'work', name: 'Work', createdAt: new Date() }]))
    localStorage.setItem('pomofly_guest_tasks', JSON.stringify([
      { id: 'sun', title: 'Work review', projectId: 'work', plannedFor: '2026-11-22', deadline: '2026-11-28', estimatedPomodoros: 3, createdAt: new Date(), completed: false },
      { id: 'unscheduled', title: 'Work backlog', projectId: 'work', deadline: '2026-11-22', createdAt: new Date(), completed: false },
      { id: 'personal', title: 'Personal errand', projectId: '', createdAt: new Date(), completed: false },
    ]))
    // jsdom does not render Radix portal pointer styles; real pointer behavior is checked in Chromium.
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, pointerEventsCheck: 0 })
    render(<TaskList />)
    await user.click(screen.getByRole('button', { name: 'Week' }))
    await user.click(screen.getByRole('combobox', { name: 'Sort tasks by' }))
    await user.keyboard('{ArrowDown}')
    await user.click(screen.getByRole('option', { name: 'Due date' }))
    await user.click(screen.getByRole('button', { name: 'Filter tasks' }))
    await user.click(screen.getByRole('combobox', { name: 'Filter by project' }))
    await user.keyboard('{ArrowDown}')
    await user.click(screen.getByRole('option', { name: 'Work' }))
    await user.keyboard('{Escape}')
    expect(screen.getByRole('region', { name: 'Sun, Nov 22' })).toHaveTextContent('1 task · 🍅 3 estimated focus sessions')
    expect(within(screen.getByRole('region', { name: 'Not planned yet' })).getByText('Work backlog')).toBeVisible()
    expect(screen.queryByText('Personal errand')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Actions for Work review' }))
    await user.click(screen.getByRole('menuitem', { name: 'Plan task / move to day' }))
    fireEvent.change(screen.getByLabelText('Planned for', { exact: true }), { target: { value: '2026-11-23' } })
    await user.click(screen.getByRole('button', { name: 'Save dates' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.queryByText('Work review')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Next week' }))
    expect(within(screen.getByRole('region', { name: 'Mon, Nov 23' })).getByText('Work review')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Add task to Mon, Nov 23' }))
    await user.type(screen.getByRole('textbox', { name: 'Task title (required)' }), 'Work forgotten follow-up')
    await user.click(screen.getByRole('button', { name: 'Add Task' }))
    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('combobox', { name: 'Sort tasks by' })).toHaveTextContent('Due date')
    expect(within(screen.getByRole('region', { name: 'Mon, Nov 23' })).getByText('Work forgotten follow-up')).toBeVisible()
    const added = JSON.parse(localStorage.getItem('pomofly_guest_tasks')!).find((task: { title: string }) => task.title === 'Work forgotten follow-up')
    expect(added).toMatchObject({ projectId: 'work', plannedFor: '2026-11-23', deadline: null })
    await user.click(screen.getByRole('checkbox', { name: 'Select task: Work review' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select task: Work forgotten follow-up' }))
    await user.click(screen.getByRole('button', { name: 'Set deadline' }))
    fireEvent.change(screen.getByLabelText('Due by', { exact: true }), { target: { value: '2026-11-30' } })
    await user.click(screen.getByRole('button', { name: 'Save dates' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    let tasks = JSON.parse(localStorage.getItem('pomofly_guest_tasks')!)
    expect(tasks.filter((task: { id: string }) => ['sun', added.id].includes(task.id)).map((task: { plannedFor: string; deadline: string }) => [task.plannedFor, task.deadline])).toEqual([['2026-11-23', '2026-11-30'], ['2026-11-23', '2026-11-30']])
    await user.click(screen.getByRole('checkbox', { name: 'Select task: Work review' }))
    await user.click(screen.getByRole('button', { name: 'Plan work' }))
    // Clearing the planned day must not erase the independent deadline.
    await user.click(screen.getByRole('button', { name: 'Clear dates' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    tasks = JSON.parse(localStorage.getItem('pomofly_guest_tasks')!)
    expect(tasks.find((task: { id: string }) => task.id === 'sun')).toMatchObject({ plannedFor: null, deadline: '2026-11-30' })
    expect(within(screen.getByRole('region', { name: 'Not planned yet' })).getByText('Work review')).toBeVisible()
  } finally {
    jest.useRealTimers()
  }
})

it('reschedules by dragging in the week board and shows planned work on the month calendar', async () => {
  jest.useFakeTimers({ now: new Date(2026, 10, 25, 12) })
  try {
    localStorage.clear()
    localStorage.setItem('pomofly_guest_tasks', JSON.stringify([
      { id: 'wed', title: 'Write report', projectId: '', plannedFor: '2026-11-25', estimatedPomodoros: 2, createdAt: new Date(), completed: false },
      { id: 'loose', title: 'Call the bank', projectId: '', deadline: '2026-12-03', createdAt: new Date(), completed: false },
      { id: 'dec', title: 'Plan holidays', projectId: '', plannedFor: '2026-12-02', createdAt: new Date(), completed: false },
    ]))
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, pointerEventsCheck: 0 })
    render(<TaskList />)
    await user.click(screen.getByRole('button', { name: 'Week' }))
    // Weeks start on Monday, so Wednesday Nov 25 belongs to Nov 23 – Nov 29.
    expect(screen.getByText(/Mon, Nov 23 – Sun, Nov 29/)).toBeVisible()
    expect(within(screen.getByRole('region', { name: 'Today · Wed, Nov 25' })).getByText('Write report')).toBeVisible()
    const drag = (taskTitle: string, target: HTMLElement) => {
      const store: Record<string, string> = {}
      const dataTransfer = { types: [] as string[], setData: (type: string, value: string) => { store[type] = value; dataTransfer.types.push(type) }, getData: (type: string) => store[type] || '', dropEffect: '', effectAllowed: '' }
      fireEvent.dragStart(screen.getByText(taskTitle).closest('li')!, { dataTransfer })
      fireEvent.dragOver(target, { dataTransfer })
      fireEvent.drop(target, { dataTransfer })
    }
    drag('Call the bank', screen.getByRole('region', { name: 'Fri, Nov 27' }))
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Fri, Nov 27' })).getByText('Call the bank')).toBeVisible())
    drag('Write report', screen.getByRole('region', { name: 'Not planned yet' }))
    await waitFor(() => expect(within(screen.getByRole('region', { name: 'Not planned yet' })).getByText('Write report')).toBeVisible())
    let tasks = JSON.parse(localStorage.getItem('pomofly_guest_tasks')!)
    // Moving the planned day keeps the independent deadline.
    expect(tasks.find((task: { id: string }) => task.id === 'loose')).toMatchObject({ plannedFor: '2026-11-27', deadline: '2026-12-03' })
    expect(tasks.find((task: { id: string }) => task.id === 'wed').plannedFor).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Calendar' }))
    expect(screen.getByRole('heading', { name: 'November 2026' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Fri, Nov 27: 1 task planned' })).toBeVisible()
    // December days that fill the last week are shown and counted too.
    expect(screen.getByRole('button', { name: 'Wed, Dec 2: 1 task planned' })).toBeVisible()
    expect(screen.getByRole('button', { name: 'Thu, Dec 3: 0 tasks planned, 1 due' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Fri, Nov 27: 1 task planned' }))
    expect(within(screen.getByRole('region', { name: 'Fri, Nov 27' })).getByText('Call the bank')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Next month' }))
    expect(screen.getByRole('heading', { name: 'December 2026' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Wed, Dec 2: 1 task planned' }))
    expect(within(screen.getByRole('region', { name: 'Wed, Dec 2' })).getByText('Plan holidays')).toBeVisible()
    drag('Write report', screen.getByRole('button', { name: 'Thu, Dec 31: 0 tasks planned' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Thu, Dec 31: 1 task planned' })).toBeVisible())
    tasks = JSON.parse(localStorage.getItem('pomofly_guest_tasks')!)
    expect(tasks.find((task: { id: string }) => task.id === 'wed').plannedFor).toBe('2026-12-31')
    await user.click(screen.getByRole('button', { name: 'Add task to Wed, Dec 2' }))
    expect(screen.getByText('Planned for Wed, Dec 2', { exact: false })).toBeVisible()
  } finally {
    jest.useRealTimers()
  }
})

it('keeps leftovers with today and plans not-yet-planned work in one tap, with undo', async () => {
  jest.useFakeTimers({ now: new Date(2026, 10, 23, 12) })
  try {
    localStorage.clear()
    localStorage.setItem('pomofly_guest_tasks', JSON.stringify([
      { id: 'left', title: 'Fix Safari sound', projectId: '', plannedFor: '2026-11-20', createdAt: new Date(), completed: false },
      { id: 'plain', title: 'Clean up labels', projectId: '', createdAt: new Date(), completed: false },
      { id: 'star', title: 'Refactor hook', projectId: '', focus: true, createdAt: new Date(), completed: false },
      { id: 'later', title: 'Write retro', projectId: '', deadline: '2026-11-27', createdAt: new Date(), completed: false },
      { id: 'soon', title: 'Renew domain', projectId: '', deadline: '2026-11-25', createdAt: new Date(), completed: false },
    ]))
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime, pointerEventsCheck: 0 })
    render(<TaskList />)
    await user.click(screen.getByRole('button', { name: 'Today' }))
    const today = () => screen.getByRole('region', { name: 'Today · Mon, Nov 23' })
    const notPlanned = () => screen.getByRole('region', { name: 'Not planned yet' })
    expect(within(today()).getByText('Fix Safari sound')).toBeVisible()
    expect(screen.queryByRole('region', { name: /Earlier/ })).not.toBeInTheDocument()
    // Soonest deadline first, then the other deadline, then starred, then the rest.
    expect(within(notPlanned()).getAllByRole('listitem').map(item => item.textContent)).toEqual([
      expect.stringContaining('Renew domain'), expect.stringContaining('Write retro'), expect.stringContaining('Refactor hook'), expect.stringContaining('Clean up labels'),
    ])
    const plannedFor = (id: string) => JSON.parse(localStorage.getItem('pomofly_guest_tasks')!).find((task: { id: string }) => task.id === id).plannedFor
    await user.click(screen.getByRole('button', { name: 'Add Write retro to today' }))
    await waitFor(() => expect(within(today()).getByText('Write retro')).toBeVisible())
    expect(within(notPlanned()).queryByText('Write retro')).not.toBeInTheDocument()
    expect(plannedFor('later')).toBe('2026-11-23')
    expect(screen.getByRole('status')).toHaveTextContent('Added “Write retro” to today.')
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(within(notPlanned()).getByText('Write retro')).toBeVisible())
    expect(plannedFor('later')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Tomorrow' }))
    await user.click(screen.getByRole('button', { name: 'Add Clean up labels to tomorrow' }))
    await waitFor(() => expect(plannedFor('plain')).toBe('2026-11-24'))
  } finally {
    jest.useRealTimers()
  }
})
