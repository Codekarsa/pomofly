import { renderHook } from '@testing-library/react'
import { useGoogleAnalytics } from '../useGoogleAnalytics'

describe('useGoogleAnalytics', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock gtag
    global.gtag = jest.fn()
  })

  it('should return event function', () => {
    const { result } = renderHook(() => useGoogleAnalytics())

    expect(result.current.event).toBeDefined()
    expect(typeof result.current.event).toBe('function')
  })

  it('should call gtag with correct parameters', () => {
    const { result } = renderHook(() => useGoogleAnalytics())

    result.current.event('test_event', { param1: 'value1', param2: 'value2' })

    expect(global.gtag).toHaveBeenCalledWith('event', 'test_event', {
      param1: 'value1',
      param2: 'value2',
    })
  })

  it('should handle empty parameters', () => {
    const { result } = renderHook(() => useGoogleAnalytics())

    result.current.event('test_event', {})

    expect(global.gtag).toHaveBeenCalledWith('event', 'test_event', {})
  })

  it('should handle complex parameters', () => {
    const { result } = renderHook(() => useGoogleAnalytics())

    const complexParams = {
      user_id: '123',
      task_id: 'task-456',
      duration: 1500,
      completed: true,
      metadata: {
        project: 'test-project',
        category: 'productivity',
      },
    }

    result.current.event('task_completed', complexParams)

    expect(global.gtag).toHaveBeenCalledWith('event', 'task_completed', complexParams)
  })
}) 