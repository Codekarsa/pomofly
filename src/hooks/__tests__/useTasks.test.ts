import { renderHook, act, waitFor } from '@testing-library/react'
import { useTasks } from '../useTasks'
import { onSnapshot, addDoc, updateDoc, deleteDoc, increment } from 'firebase/firestore'

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  onSnapshot: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(),
  increment: jest.fn(),
}))

// Mock Firebase auth
jest.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-id',
      email: 'test@example.com',
    },
  },
  db: {},
}))

describe('useTasks', () => {
  const mockOnSnapshot = onSnapshot as jest.Mock
  const mockAddDoc = addDoc as jest.Mock
  const mockUpdateDoc = updateDoc as jest.Mock
  const mockDeleteDoc = deleteDoc as jest.Mock
  const mockIncrement = increment as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock successful Firebase operations
    mockAddDoc.mockResolvedValue({ id: 'new-task-id' })
    mockUpdateDoc.mockResolvedValue(undefined)
    mockDeleteDoc.mockResolvedValue(undefined)
    mockIncrement.mockReturnValue('increment-value')
  })

  it('should initialize with empty tasks array', () => {
    const mockSnapshot = {
      forEach: jest.fn(),
    }
    mockOnSnapshot.mockImplementation((_query: unknown, onNext: (snapshot: typeof mockSnapshot) => void) => {
      onNext(mockSnapshot)
      return jest.fn() // unsubscribe function
    })

    const { result } = renderHook(() => useTasks())

    expect(result.current.tasks).toEqual([])
    expect(result.current.loading).toBe(true)
  })

  it('should load tasks from Firebase', async () => {
    const mockTasks = [
      {
        id: 'task-1',
        title: 'Test Task 1',
        projectId: 'project-1',
        userId: 'test-user-id',
        completed: false,
        totalPomodoroSessions: 0,
        totalTimeSpent: 0,
        createdAt: new Date(),
        estimatedPomodoros: 2,
        focus: false,
        deadline: null,
      },
      {
        id: 'task-2',
        title: 'Test Task 2',
        projectId: 'project-2',
        userId: 'test-user-id',
        completed: true,
        totalPomodoroSessions: 3,
        totalTimeSpent: 75,
        createdAt: new Date(),
        estimatedPomodoros: 4,
        focus: true,
        deadline: '2024-01-01',
      },
    ]

    const mockSnapshot = {
      forEach: jest.fn((callback) => {
        mockTasks.forEach(task => callback({ id: task.id, data: () => task }))
      }),
    }

    mockOnSnapshot.mockImplementation((_query: unknown, onNext: (snapshot: typeof mockSnapshot) => void) => {
      onNext(mockSnapshot)
      return jest.fn() // unsubscribe function
    })

    const { result } = renderHook(() => useTasks())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.tasks).toHaveLength(2)
    expect(result.current.tasks[0].title).toBe('Test Task 1')
    expect(result.current.tasks[1].title).toBe('Test Task 2')
  })

  it('should add a new task', async () => {
    const mockSnapshot = {
      forEach: jest.fn(),
    }
    mockOnSnapshot.mockImplementation((_query: unknown, onNext: (snapshot: typeof mockSnapshot) => void) => {
      onNext(mockSnapshot)
      return jest.fn()
    })

    const { result } = renderHook(() => useTasks())

    await act(async () => {
      const taskId = await result.current.addTask('New Task', 'project-1', 3)
      expect(taskId).toBe('new-task-id')
    })

    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        title: 'New Task',
        projectId: 'project-1',
        userId: 'test-user-id',
        completed: false,
        totalPomodoroSessions: 0,
        totalTimeSpent: 0,
        estimatedPomodoros: 3,
        focus: false,
        deadline: null,
      })
    )
  })

  it('should update a task', async () => {
    const mockSnapshot = {
      forEach: jest.fn(),
    }
    mockOnSnapshot.mockImplementation((_query: unknown, onNext: (snapshot: typeof mockSnapshot) => void) => {
      onNext(mockSnapshot)
      return jest.fn()
    })

    const { result } = renderHook(() => useTasks())

    await act(async () => {
      await result.current.updateTask('task-1', {
        title: 'Updated Task',
        estimatedPomodoros: 5,
      })
    })

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        title: 'Updated Task',
        estimatedPomodoros: 5,
      })
    )
  })

  it('should delete a task', async () => {
    const mockSnapshot = {
      forEach: jest.fn(),
    }
    mockOnSnapshot.mockImplementation((_query: unknown, onNext: (snapshot: typeof mockSnapshot) => void) => {
      onNext(mockSnapshot)
      return jest.fn()
    })

    const { result } = renderHook(() => useTasks())

    await act(async () => {
      await result.current.deleteTask('task-1')
    })

    expect(mockDeleteDoc).toHaveBeenCalledWith(expect.anything())
  })

  it('should toggle task completion', async () => {
    const mockSnapshot = {
      forEach: jest.fn(),
    }
    mockOnSnapshot.mockImplementation((_query: unknown, onNext: (snapshot: typeof mockSnapshot) => void) => {
      onNext(mockSnapshot)
      return jest.fn()
    })

    const { result } = renderHook(() => useTasks())

    await act(async () => {
      await result.current.toggleTaskCompletion('task-1', false)
    })

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        completed: true,
      })
    )
  })

  it('should increment pomodoro session', async () => {
    const mockSnapshot = {
      forEach: jest.fn(),
    }
    mockOnSnapshot.mockImplementation((_query: unknown, onNext: (snapshot: typeof mockSnapshot) => void) => {
      onNext(mockSnapshot)
      return jest.fn()
    })

    const { result } = renderHook(() => useTasks())

    await act(async () => {
      await result.current.incrementPomodoroSession('task-1', 25)
    })

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        totalPomodoroSessions: 'increment-value',
        totalTimeSpent: 'increment-value',
      })
    )
  })

  it('should toggle task focus', async () => {
    const mockSnapshot = {
      forEach: jest.fn(),
    }
    mockOnSnapshot.mockImplementation((_query: unknown, onNext: (snapshot: typeof mockSnapshot) => void) => {
      onNext(mockSnapshot)
      return jest.fn()
    })

    const { result } = renderHook(() => useTasks())

    await act(async () => {
      await result.current.toggleTaskFocus('task-1', false)
    })

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        focus: true,
      })
    )
  })

  it('should set task deadline', async () => {
    const mockSnapshot = {
      forEach: jest.fn(),
    }
    mockOnSnapshot.mockImplementation((_query: unknown, onNext: (snapshot: typeof mockSnapshot) => void) => {
      onNext(mockSnapshot)
      return jest.fn()
    })

    const { result } = renderHook(() => useTasks())

    await act(async () => {
      await result.current.setTaskDeadline('task-1', '2024-12-31')
    })

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        deadline: '2024-12-31',
      })
    )
  })

  it('should handle Firebase errors', async () => {
    const mockError = new Error('Firebase error')
    mockOnSnapshot.mockImplementation((_query: unknown, _onNext: unknown, onError: (error: Error) => void) => {
      onError(mockError)
      return jest.fn()
    })

    const { result } = renderHook(() => useTasks())

    await waitFor(() => {
      expect(result.current.error).toBe(mockError)
      expect(result.current.loading).toBe(false)
    })
  })

  it('should filter tasks by project when projectId is provided', () => {
    const mockQuery = jest.fn()
    const mockWhere = jest.fn()
    
    mockQuery.mockReturnValue('filtered-query')
    mockWhere.mockReturnValue('where-clause')

    renderHook(() => useTasks('project-1'))

    expect(mockQuery).toHaveBeenCalled()
    expect(mockWhere).toHaveBeenCalledWith('projectId', '==', 'project-1')
  })
}) 