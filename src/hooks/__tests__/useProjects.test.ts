import { renderHook, act, waitFor } from '@testing-library/react'
import { useProjects } from '../useProjects'
import { onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(() => ({ type: 'collection' })),
  query: jest.fn(() => ({ type: 'query' })),
  where: jest.fn(() => ({ type: 'where' })),
  onSnapshot: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  doc: jest.fn(() => ({ type: 'doc' })),
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

describe('useProjects', () => {
  // Loosely typed mocks: the firestore overloads (e.g. onSnapshot's
  // SnapshotListenOptions variant) make strict MockedFunction typings unusable here
  const mockOnSnapshot = onSnapshot as unknown as jest.Mock
  const mockAddDoc = addDoc as unknown as jest.Mock
  const mockUpdateDoc = updateDoc as unknown as jest.Mock
  const mockDeleteDoc = deleteDoc as unknown as jest.Mock

  beforeEach(() => {
    jest.clearAllMocks()

    // Mock successful Firebase operations
    mockAddDoc.mockResolvedValue({ id: 'new-project-id' })
    mockUpdateDoc.mockResolvedValue(undefined)
    mockDeleteDoc.mockResolvedValue(undefined)
  })

  it('should initialize with empty projects array', () => {
    // Snapshot never fires: projects stay empty and loading stays true
    mockOnSnapshot.mockImplementation(() => jest.fn())

    const { result } = renderHook(() => useProjects())

    expect(result.current.projects).toEqual([])
    expect(result.current.loading).toBe(true)
  })

  it('should load projects from Firebase', async () => {
    const mockProjects = [
      {
        id: 'project-1',
        name: 'Test Project 1',
        userId: 'test-user-id',
        createdAt: new Date(),
      },
      {
        id: 'project-2',
        name: 'Test Project 2',
        userId: 'test-user-id',
        createdAt: new Date(),
      },
    ]

    const mockSnapshot = {
      forEach: jest.fn((callback) => {
        mockProjects.forEach(project => callback({ id: project.id, data: () => project }))
      }),
    }

    mockOnSnapshot.mockImplementation((query, onNext) => {
      onNext(mockSnapshot)
      return jest.fn() // unsubscribe function
    })

    const { result } = renderHook(() => useProjects())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.projects).toHaveLength(2)
    expect(result.current.projects[0].name).toBe('Test Project 1')
    expect(result.current.projects[1].name).toBe('Test Project 2')
  })

  it('should add a new project', async () => {
    const mockSnapshot = {
      forEach: jest.fn(),
    }
    mockOnSnapshot.mockImplementation((query, onNext) => {
      onNext(mockSnapshot)
      return jest.fn()
    })

    const { result } = renderHook(() => useProjects())

    await act(async () => {
      const projectId = await result.current.addProject('New Project')
      expect(projectId).toBe('new-project-id')
    })

    expect(mockAddDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: 'New Project',
        userId: 'test-user-id',
      })
    )
  })

  it('should update a project', async () => {
    const mockSnapshot = {
      forEach: jest.fn(),
    }
    mockOnSnapshot.mockImplementation((query, onNext) => {
      onNext(mockSnapshot)
      return jest.fn()
    })

    const { result } = renderHook(() => useProjects())

    await act(async () => {
      await result.current.updateProject('project-1', 'Updated Project')
    })

    expect(mockUpdateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        name: 'Updated Project',
      })
    )
  })

  it('should delete a project', async () => {
    const mockSnapshot = {
      forEach: jest.fn(),
    }
    mockOnSnapshot.mockImplementation((query, onNext) => {
      onNext(mockSnapshot)
      return jest.fn()
    })

    const { result } = renderHook(() => useProjects())

    await act(async () => {
      await result.current.deleteProject('project-1')
    })

    expect(mockDeleteDoc).toHaveBeenCalledWith(expect.anything())
  })

  it('should handle Firebase errors', async () => {
    const mockError = new Error('Firebase error')
    mockOnSnapshot.mockImplementation((query, onNext, onError) => {
      onError(mockError)
      return jest.fn()
    })

    const { result } = renderHook(() => useProjects())

    await waitFor(() => {
      expect(result.current.error).toBe(mockError)
      expect(result.current.loading).toBe(false)
    })
  })
}) 