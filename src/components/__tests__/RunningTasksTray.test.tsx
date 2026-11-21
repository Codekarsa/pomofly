import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import RunningTasksTray from '../RunningTasksTray';
import * as guestStorage from '@/lib/guestStorage';
import * as tasksHook from '@/hooks/useTasks';
import { TaskSchema } from '@/lib/validation';

jest.mock('@/lib/firebase', () => ({ auth: { currentUser: null }, db: {} }));
jest.mock('@/lib/guestStorage', () => {
  const actual = jest.requireActual('@/lib/guestStorage');
  return { ...actual, updateGuestTask: jest.fn(actual.updateGuestTask) };
});
jest.mock('@/hooks/useTasks', () => {
  const actual = jest.requireActual('@/hooks/useTasks');
  return { ...actual, useTasks: jest.fn(actual.useTasks) };
});

const now = new Date('2026-11-21T12:00:00Z');
const storageDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');

beforeAll(() => {
  // Use a real browser Storage implementation instead of the global no-op mock.
  Object.defineProperty(window, 'localStorage', { configurable: true, value: window.sessionStorage });
});

beforeEach(() => {
  localStorage.clear();
  jest.useFakeTimers();
  jest.setSystemTime(now);
  jest.mocked(guestStorage.updateGuestTask).mockReset().mockImplementation(jest.requireActual('@/lib/guestStorage').updateGuestTask);
  jest.mocked(tasksHook.useTasks).mockReset().mockImplementation(jest.requireActual('@/hooks/useTasks').useTasks);
});

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

afterAll(() => {
  if (storageDescriptor) Object.defineProperty(window, 'localStorage', storageDescriptor);
});

function addTask(id: string, title: string, secondsAgo: number, manualTimeSpent = 0, projectId = '') {
  return guestStorage.addGuestTask(TaskSchema.parse({
    id,
    title,
    userId: 'guest',
    createdAt: now,
    completed: false,
    totalPomodoroSessions: 0,
    totalTimeSpent: 0,
    projectId,
    manualTimeSpent,
    trackingStartedAt: new Date(now.getTime() - secondsAgo * 1000),
  }));
}

it('renders nothing without running tasks and responds to guest changes', () => {
  const { container } = render(<RunningTasksTray />);
  expect(container).toBeEmptyDOMElement();
  act(() => { addTask('first', 'Newly running task', 0); });
  expect(screen.getByRole('region', { name: 'Running tasks (1)' })).toBeVisible();
  expect(screen.getByRole('button', { name: 'Show trackers' })).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByRole('button', { name: 'Stop tracking Newly running task' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Show trackers' }));
  expect(screen.getByText('Newly running task')).toBeVisible();
});

it('shows staggered tasks, stops only one without double counting, and persists across remounts', async () => {
  const project = guestStorage.addGuestProject('Launch');
  const first = addTask('first', 'Write the entire launch announcement without truncation', 120, 30, project.id);
  const second = addTask('second', 'Plan the next week', 45, 10);
  const view = render(<RunningTasksTray />);
  fireEvent.click(screen.getByRole('button', { name: 'Show trackers' }));
  expect(screen.getByText(first.title)).toBeVisible();
  expect(screen.getByText('Launch')).toBeVisible();
  expect(screen.getByText('Inbox')).toBeVisible();
  expect(screen.getByLabelText(`Elapsed time for ${first.title}`)).toHaveTextContent('2:30');
  expect(screen.getByLabelText(`Elapsed time for ${second.title}`)).toHaveTextContent('0:55');
  const row = screen.getByText(first.title).closest('li')!;
  expect(within(row).getByText('Started', { exact: false }).querySelector('time'))
    .toHaveAttribute('dateTime', new Date(now.getTime() - 120000).toISOString());
  expect(screen.getByText(/doesn’t pause a Pomodoro/)).toHaveTextContent('Overlapping task times count separately.');

  act(() => { jest.advanceTimersByTime(5000); });
  expect(screen.getByLabelText(`Elapsed time for ${second.title}`)).toHaveTextContent('1:00');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: `Stop tracking ${first.title}` })); });
  expect(screen.queryByText(first.title)).not.toBeInTheDocument();
  expect(screen.getByText(second.title)).toBeVisible();
  expect(guestStorage.getGuestTasks().find(task => task.id === first.id))
    .toMatchObject({ manualTimeSpent: 155, trackingStartedAt: null });
  expect(guestStorage.getGuestTasks().find(task => task.id === second.id))
    .toMatchObject({ manualTimeSpent: 10, trackingStartedAt: second.trackingStartedAt });

  view.unmount();
  act(() => { jest.advanceTimersByTime(10000); });
  render(<RunningTasksTray />);
  fireEvent.click(screen.getByRole('button', { name: 'Show trackers' }));
  expect(screen.queryByText(first.title)).not.toBeInTheDocument();
  expect(screen.getByLabelText(`Elapsed time for ${second.title}`)).toHaveTextContent('1:10');
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: `Stop tracking ${second.title}` })); });
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
  expect(guestStorage.getGuestTasks().find(task => task.id === second.id))
    .toMatchObject({ manualTimeSpent: 70, trackingStartedAt: null });
});

it('keeps a rejected task running, displays an error, and allows retry', async () => {
  const task = addTask('first', 'Retry this task', 60, 15);
  render(<RunningTasksTray />);
  fireEvent.click(screen.getByRole('button', { name: 'Show trackers' }));
  jest.mocked(guestStorage.updateGuestTask).mockImplementationOnce(() => {
    throw new Error('Storage unavailable');
  });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: `Stop tracking ${task.title}` })); });
  expect(screen.getByRole('alert')).toHaveTextContent('Could not stop tracking. Please try again.');
  expect(screen.getByRole('button', { name: `Stop tracking ${task.title}` })).toBeEnabled();
  expect(guestStorage.getGuestTasks()[0]).toMatchObject({ manualTimeSpent: 15, trackingStartedAt: task.trackingStartedAt });

  await act(async () => { fireEvent.click(screen.getByRole('button', { name: `Stop tracking ${task.title}` })); });
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
  expect(guestStorage.getGuestTasks()[0]).toMatchObject({ manualTimeSpent: 75, trackingStartedAt: null });
});

it('disables only the pending stop until its save completes', async () => {
  const first = addTask('first', 'Saving task', 60);
  const second = addTask('second', 'Other running task', 30);
  let finishSave!: () => void;
  const saveReady = new Promise<void>(resolve => { finishSave = resolve; });
  const useRealTasks: typeof tasksHook.useTasks = jest.requireActual('@/hooks/useTasks').useTasks;
  // Add network-like latency while retaining the real guest persistence path.
  jest.mocked(tasksHook.useTasks).mockImplementation(() => {
    const result = useRealTasks();
    return {
      ...result,
      stopTimeTracking: async (id, elapsed) => {
        await saveReady;
        await result.stopTimeTracking(id, elapsed);
      },
    };
  });
  render(<RunningTasksTray />);
  fireEvent.click(screen.getByRole('button', { name: 'Show trackers' }));
  fireEvent.click(screen.getByRole('button', { name: `Stop tracking ${first.title}` }));
  expect(screen.getByRole('button', { name: `Stop tracking ${first.title}` })).toBeDisabled();
  expect(screen.getByText('Stopping…')).toBeVisible();
  expect(screen.getByRole('button', { name: `Stop tracking ${second.title}` })).toBeEnabled();
  expect(guestStorage.getGuestTasks().find(task => task.id === first.id)?.trackingStartedAt).not.toBeNull();

  await act(async () => { finishSave(); });
  expect(screen.queryByText(first.title)).not.toBeInTheDocument();
  expect(screen.getByText(second.title)).toBeVisible();
  expect(guestStorage.getGuestTasks().find(task => task.id === first.id))
    .toMatchObject({ manualTimeSpent: 60, trackingStartedAt: null });
});
