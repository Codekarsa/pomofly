import { renderHook, act, waitFor } from '@testing-library/react';
import { useTaskSynchronizer } from '../useTaskSynchronizer';
import { useTasks } from '../useTasks';

// Mock the useTasks hook
jest.mock('../useTasks', () => ({
  useTasks: jest.fn(),
}));

const mockUseTasks = useTasks as jest.MockedFunction<typeof useTasks>;

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('useTaskSynchronizer', () => {
  const mockTasks = [
    {
      id: 'task1',
      title: 'Task 1',
      completed: false,
      archived: false,
      trackingStartedAt: null,
    },
    {
      id: 'task2',
      title: 'Task 2',
      completed: false,
      archived: false,
      trackingStartedAt: new Date(Date.now() - 5000), // Started 5 seconds ago
    },
    {
      id: 'task3',
      title: 'Task 3',
      completed: true, // Completed task
      archived: false,
      trackingStartedAt: null,
    },
    {
      id: 'task4',
      title: 'Task 4',
      completed: false,
      archived: true, // Archived task
      trackingStartedAt: null,
    },
  ];

  const mockTasksHook = {
    tasks: mockTasks,
    loading: false,
    incrementPomodoroSession: jest.fn(),
    startAllTimeTracking: jest.fn(),
    stopAllTimeTracking: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTasks.mockReturnValue(mockTasksHook);
  });

  it('should initialize with provided task IDs', () => {
    const initialTaskIds = ['task1', 'task2'];
    const { result } = renderHook(() => useTaskSynchronizer(initialTaskIds));

    expect(result.current.selectedTaskIds).toEqual(initialTaskIds);
    expect(result.current.selectedTasks).toEqual([mockTasks[0], mockTasks[1]]);
  });

  it('should filter out invalid task IDs during initialization', () => {
    const initialTaskIds = ['task1', 'task3', 'task4', 'nonexistent']; // Completed, archived, and non-existent tasks
    const { result } = renderHook(() => useTaskSynchronizer(initialTaskIds));

    expect(result.current.selectedTaskIds).toEqual(['task1']); // Only valid task
  });

  it('should update selected task IDs and persist to localStorage', () => {
    const { result } = renderHook(() => useTaskSynchronizer());

    act(() => {
      result.current.updateSelectedTaskIds(['task1', 'task2']);
    });

    expect(result.current.selectedTaskIds).toEqual(['task1', 'task2']);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      'selectedTaskIds',
      JSON.stringify(['task1', 'task2'])
    );
  });

  it('should filter out invalid tasks during update', () => {
    const { result } = renderHook(() => useTaskSynchronizer());

    act(() => {
      result.current.updateSelectedTaskIds(['task1', 'task3', 'task4', 'nonexistent']);
    });

    expect(result.current.selectedTaskIds).toEqual(['task1']);
  });

  it('should start time tracking only for tasks not already tracking', async () => {
    const { result } = renderHook(() => useTaskSynchronizer(['task1', 'task2']));

    await act(async () => {
      await result.current.startTimeTrackingSync(['task1', 'task2']);
    });

    // Should only start tracking for task1 (task2 is already tracking)
    expect(mockTasksHook.startAllTimeTracking).toHaveBeenCalledWith(['task1']);
  });

  it('should stop time tracking with correct elapsed time calculation', async () => {
    const { result } = renderHook(() => useTaskSynchronizer(['task1', 'task2']));

    await act(async () => {
      await result.current.stopTimeTrackingSync(['task1', 'task2']);
    });

    expect(mockTasksHook.stopAllTimeTracking).toHaveBeenCalledWith([
      {
        taskId: 'task2',
        elapsedSeconds: 5, // 5 seconds elapsed
      },
    ]);
  });

  it('should complete pomodoro session with synchronized operations', async () => {
    const { result } = renderHook(() => useTaskSynchronizer(['task1', 'task2']));

    await act(async () => {
      await result.current.completePomodoroSync(['task1', 'task2'], 1500); // 25 minutes
    });

    // Should stop time tracking first, then increment pomodoro sessions
    expect(mockTasksHook.stopAllTimeTracking).toHaveBeenCalled();
    expect(mockTasksHook.incrementPomodoroSession).toHaveBeenCalledWith('task1', 1500);
    expect(mockTasksHook.incrementPomodoroSession).toHaveBeenCalledWith('task2', 1500);
  });

  it('should handle empty task arrays gracefully', async () => {
    const { result } = renderHook(() => useTaskSynchronizer());

    await act(async () => {
      await result.current.startTimeTrackingSync([]);
      await result.current.stopTimeTrackingSync([]);
      await result.current.completePomodoroSync([], 1500);
    });

    // Should not call any task operations
    expect(mockTasksHook.startAllTimeTracking).not.toHaveBeenCalled();
    expect(mockTasksHook.stopAllTimeTracking).not.toHaveBeenCalled();
    expect(mockTasksHook.incrementPomodoroSession).not.toHaveBeenCalled();
  });

  it('should serialize operations to prevent race conditions', async () => {
    const { result } = renderHook(() => useTaskSynchronizer(['task1', 'task2']));

    // Make the operations slower to test serialization
    let resolveStart: () => void;
    let resolveStop: () => void;

    const startPromise = new Promise<void>(resolve => { resolveStart = resolve; });
    const stopPromise = new Promise<void>(resolve => { resolveStop = resolve; });

    mockTasksHook.startAllTimeTracking.mockReturnValue(startPromise);
    mockTasksHook.stopAllTimeTracking.mockReturnValue(stopPromise);

    // Start multiple operations concurrently
    const operations = [
      result.current.startTimeTrackingSync(['task1']),
      result.current.stopTimeTrackingSync(['task2']),
      result.current.startTimeTrackingSync(['task1']),
    ];

    expect(result.current.isUpdating).toBe(true);

    // Resolve the first operation
    resolveStart!();
    await waitFor(() => {
      expect(mockTasksHook.startAllTimeTracking).toHaveBeenCalledTimes(1);
    });

    // Second operation should now be processing
    resolveStop!();
    await waitFor(() => {
      expect(mockTasksHook.stopAllTimeTracking).toHaveBeenCalledTimes(1);
    });

    // Wait for all operations to complete
    await Promise.all(operations);

    expect(result.current.isUpdating).toBe(false);
    expect(mockTasksHook.startAllTimeTracking).toHaveBeenCalledTimes(2);
    expect(mockTasksHook.stopAllTimeTracking).toHaveBeenCalledTimes(1);
  });

  it('should handle operation errors gracefully', async () => {
    const { result } = renderHook(() => useTaskSynchronizer(['task1']));

    mockTasksHook.startAllTimeTracking.mockRejectedValue(new Error('Network error'));

    await act(async () => {
      await result.current.startTimeTrackingSync(['task1']);
    });

    // Should not crash and should reset updating state
    expect(result.current.isUpdating).toBe(false);
  });

  it('should auto-clean invalid task IDs when tasks change', () => {
    const { result, rerender } = renderHook(() => useTaskSynchronizer(['task1', 'task2', 'task3']));

    // Initially should include all valid tasks
    expect(result.current.selectedTaskIds).toEqual(['task1', 'task2']);

    // Change tasks to remove task2
    const newTasks = mockTasks.filter(t => t.id !== 'task2');
    mockUseTasks.mockReturnValue({
      ...mockTasksHook,
      tasks: newTasks,
    });

    rerender();

    // Should auto-remove invalid task ID
    expect(result.current.selectedTaskIds).toEqual(['task1']);
  });

  it('should handle various timestamp formats correctly', async () => {
    const tasksWithDifferentTimestamps = [
      {
        id: 'task1',
        title: 'Task 1',
        completed: false,
        archived: false,
        trackingStartedAt: new Date(Date.now() - 3000), // Date object
      },
      {
        id: 'task2',
        title: 'Task 2',
        completed: false,
        archived: false,
        trackingStartedAt: Date.now() - 4000, // Number
      },
      {
        id: 'task3',
        title: 'Task 3',
        completed: false,
        archived: false,
        trackingStartedAt: '2024-01-01T10:00:00Z', // ISO string
      },
    ];

    mockUseTasks.mockReturnValue({
      ...mockTasksHook,
      tasks: tasksWithDifferentTimestamps,
    });

    const { result } = renderHook(() => useTaskSynchronizer(['task1', 'task2', 'task3']));

    await act(async () => {
      await result.current.stopTimeTrackingSync(['task1', 'task2', 'task3']);
    });

    expect(mockTasksHook.stopAllTimeTracking).toHaveBeenCalledWith([
      { taskId: 'task1', elapsedSeconds: 3 },
      { taskId: 'task2', elapsedSeconds: 4 },
      { taskId: 'task3', elapsedSeconds: expect.any(Number) }, // Large number for old timestamp
    ]);
  });

  it('should provide current state accessors', () => {
    const { result } = renderHook(() => useTaskSynchronizer(['task1', 'task2']));

    expect(result.current.getCurrentTaskIds()).toEqual(['task1', 'task2']);
    expect(result.current.getSelectedTasks()).toEqual([mockTasks[0], mockTasks[1]]);
    expect(result.current.isOperationInProgress()).toBe(false);
  });
});