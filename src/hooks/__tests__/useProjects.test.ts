import { renderHook, act, waitFor } from '@testing-library/react'
import { useProjects } from '../useProjects'
import { onSnapshot, addDoc, updateDoc, deleteDoc } from 'firebase/firestore'

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
  const mockOnSnapshot = onSnapshot as jest.MockedFunction<typeof onSnapshot>
  const mockAddDoc = addDoc as jest.MockedFunction<typeof addDoc>
  const mockUpdateDoc = updateDoc as jest.MockedFunction<typeof updateDoc>
  const mockDeleteDoc = deleteDoc as jest.MockedFunction<typeof deleteDoc>

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock successful Firebase operations
    mockAddDoc.mockResolvedValue({ id: 'new-project-id' } as { id: string })
    mockUpdateDoc.mockResolvedValue(undefined)
    mockDeleteDoc.mockResolvedValue(undefined)
  })

  it('should initialize with empty projects array', () => {
    const mockSnapshot = {
      forEach: jest.fn(),
    }
    mockOnSnapshot.mockImplementation((query, onNext) => {
      onNext(mockSnapshot)
      return jest.fn() // unsubscribe function
    })

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
      await result.current.updateProject('project-1', {
        name: 'Updated Project',
      })
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