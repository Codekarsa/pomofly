import { renderHook, act } from '@testing-library/react'
import { useClaudeAI } from '../useClaudeAI'

// Mock the API route
global.fetch = jest.fn()

describe('useClaudeAI', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useClaudeAI())

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(null)
    expect(result.current.response).toBe('')
  })

  it('should send message successfully', async () => {
    const mockResponse = {
      breakdown: [
        { title: 'Task 1', estimatedPomodoros: 2 },
        { title: 'Task 2', estimatedPomodoros: 3 },
      ],
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    })

    const { result } = renderHook(() => useClaudeAI())

    await act(async () => {
      await result.current.sendMessage('Break down this complex task')
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(null)
    expect(result.current.response).toBeDefined()
    expect(global.fetch).toHaveBeenCalledWith('/api/claude-breakdown', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Break down this complex task',
      }),
    })
  })

  it('should handle API errors', async () => {
    const mockError = new Error('API Error')
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(mockError)

    const { result } = renderHook(() => useClaudeAI())

    await act(async () => {
      await result.current.sendMessage('Break down this complex task')
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBe(mockError)
  })

  it('should handle non-ok responses', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    })

    const { result } = renderHook(() => useClaudeAI())

    await act(async () => {
      await result.current.sendMessage('Break down this complex task')
    })

    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeInstanceOf(Error)
  })

  it('should set loading state during API call', async () => {
    let resolvePromise: (value: unknown) => void
    const promise = new Promise((resolve) => {
      resolvePromise = resolve
    })

    ;(global.fetch as jest.Mock).mockReturnValueOnce(promise)

    const { result } = renderHook(() => useClaudeAI())

    act(() => {
      result.current.sendMessage('Break down this complex task')
    })

    expect(result.current.loading).toBe(true)

    resolvePromise!({
      ok: true,
      json: async () => ({ breakdown: [] }),
    })

    await act(async () => {
      await promise
    })

    expect(result.current.loading).toBe(false)
  })

  it('should clear error when starting new request', async () => {
    const mockError = new Error('Previous error')
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(mockError)

    const { result } = renderHook(() => useClaudeAI())

    // First call that fails
    await act(async () => {
      await result.current.sendMessage('First message')
    })

    expect(result.current.error).toBe(mockError)

    // Second call that succeeds
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ breakdown: [] }),
    })

    await act(async () => {
      await result.current.sendMessage('Second message')
    })

    expect(result.current.error).toBe(null)
  })
}) 