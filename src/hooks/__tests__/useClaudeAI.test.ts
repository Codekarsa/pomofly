import { renderHook, act } from '@testing-library/react'
import { useClaudeAI } from '../useClaudeAI'

// Mock the API route
global.fetch = jest.fn()

// Mock auth context with an authenticated user
const mockGetIdToken = jest.fn().mockResolvedValue('test-id-token')
jest.mock('@/app/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'test-user-id',
      email: 'test@example.com',
      getIdToken: () => mockGetIdToken(),
    },
  }),
}))

// Mock monitoring: pass the API call straight through
jest.mock('@/hooks/useMonitoring', () => ({
  useApiMonitoring: () => ({
    monitorApiCall: (_endpoint: string, _method: string, fn: () => Promise<unknown>) => fn(),
  }),
}))

// Mock security helpers
jest.mock('@/lib/security', () => ({
  sanitizeTaskTitle: (title: string) => title,
  checkClientRateLimit: jest.fn(() => ({ allowed: true, resetTime: 0 })),
}))

describe('useClaudeAI', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useClaudeAI())

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(null)
    expect(typeof result.current.getTaskBreakdown).toBe('function')
  })

  it('should get task breakdown successfully', async () => {
    const mockResponse = {
      tasks: [
        { title: 'Task 1', estimatedPomodoros: 2 },
        { title: 'Task 2', estimatedPomodoros: 3 },
      ],
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const { result } = renderHook(() => useClaudeAI())

    let breakdown: unknown
    await act(async () => {
      breakdown = await result.current.getTaskBreakdown('Break down this complex task')
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(null)
    expect(breakdown).toEqual(mockResponse)
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/claude-breakdown',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-id-token',
        }),
      })
    )
  })

  it('should handle API errors', async () => {
    const mockError = new Error('API Error')
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(mockError)

    const { result } = renderHook(() => useClaudeAI())

    await act(async () => {
      await expect(result.current.getTaskBreakdown('Break down this complex task')).rejects.toThrow(
        'API Error'
      )
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('API Error')
  })

  it('should handle non-ok responses', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      json: async () => ({ error: 'server_error', message: 'Something went wrong' }),
    })

    const { result } = renderHook(() => useClaudeAI())

    await act(async () => {
      await expect(result.current.getTaskBreakdown('Break down this complex task')).rejects.toThrow()
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe('Something went wrong')
  })

  it('should reject empty descriptions', async () => {
    const { result } = renderHook(() => useClaudeAI())

    await act(async () => {
      await expect(result.current.getTaskBreakdown('   ')).rejects.toThrow(
        'Task description is required'
      )
    })

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should reject descriptions over 2000 characters', async () => {
    const { result } = renderHook(() => useClaudeAI())

    await act(async () => {
      await expect(result.current.getTaskBreakdown('x'.repeat(2001))).rejects.toThrow(
        'less than 2000 characters'
      )
    })

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should surface rate limit errors', async () => {
    const { checkClientRateLimit } = jest.requireMock('@/lib/security')
    checkClientRateLimit.mockReturnValueOnce({ allowed: false, resetTime: Date.now() + 30000 })

    const { result } = renderHook(() => useClaudeAI())

    await act(async () => {
      await expect(result.current.getTaskBreakdown('Break down this complex task')).rejects.toThrow(
        'Rate limit exceeded'
      )
    })

    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('should clear error when starting new request', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Previous error'))

    const { result } = renderHook(() => useClaudeAI())

    // First call that fails
    await act(async () => {
      await expect(result.current.getTaskBreakdown('First message')).rejects.toThrow()
    })

    expect(result.current.error).toBe('Previous error')

    // Second call that succeeds
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tasks: [] }),
    })

    await act(async () => {
      await result.current.getTaskBreakdown('Second message')
    })

    expect(result.current.error).toBe(null)
  })
})
