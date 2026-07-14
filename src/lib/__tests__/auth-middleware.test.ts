import { validateAuth, checkRateLimit } from '../auth-middleware'
import { getAdminAuth } from '../firebase-admin'
import type { NextRequest } from 'next/server'

jest.mock('../firebase-admin', () => ({
  getAdminAuth: jest.fn(),
}))

const mockGetAdminAuth = getAdminAuth as jest.Mock

function makeRequest(authorization?: string): NextRequest {
  return {
    headers: {
      get: (name: string) =>
        name.toLowerCase() === 'authorization' ? authorization ?? null : null,
    },
  } as unknown as NextRequest
}

describe('validateAuth', () => {
  const mockVerifyIdToken = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetAdminAuth.mockReturnValue({ verifyIdToken: mockVerifyIdToken })
  })

  it('rejects requests without an Authorization header', async () => {
    const result = await validateAuth(makeRequest())

    expect(result).toEqual({
      isAuthenticated: false,
      error: 'Missing or invalid authorization header',
    })
    expect(mockVerifyIdToken).not.toHaveBeenCalled()
  })

  it('rejects non-Bearer Authorization headers', async () => {
    const result = await validateAuth(makeRequest('Basic dXNlcjpwYXNz'))

    expect(result.isAuthenticated).toBe(false)
    expect(mockVerifyIdToken).not.toHaveBeenCalled()
  })

  it('rejects an empty Bearer token', async () => {
    const result = await validateAuth(makeRequest('Bearer   '))

    expect(result).toEqual({ isAuthenticated: false, error: 'No token provided' })
    expect(mockVerifyIdToken).not.toHaveBeenCalled()
  })

  it('returns the uid for a token that verifies', async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: 'user-123' })

    const result = await validateAuth(makeRequest('Bearer valid-token'))

    expect(mockVerifyIdToken).toHaveBeenCalledWith('valid-token')
    expect(result).toEqual({ isAuthenticated: true, uid: 'user-123' })
  })

  it('rejects an expired token with a distinct message', async () => {
    mockVerifyIdToken.mockRejectedValue({ code: 'auth/id-token-expired' })

    const result = await validateAuth(makeRequest('Bearer expired-token'))

    expect(result).toEqual({
      isAuthenticated: false,
      error: 'Token expired, please sign in again',
    })
  })

  it('rejects tokens that fail verification (e.g. forged signature)', async () => {
    mockVerifyIdToken.mockRejectedValue({ code: 'auth/argument-error' })

    // A forged unsigned JWT like this passed the old base64-decode implementation
    const forged = 'eyJhbGciOiJub25lIn0.eyJ1c2VyX2lkIjoiaGFja2VyIn0.sig'
    const result = await validateAuth(makeRequest(`Bearer ${forged}`))

    expect(result).toEqual({
      isAuthenticated: false,
      error: 'Invalid authentication token',
    })
  })
})

describe('checkRateLimit', () => {
  it('allows requests under the limit and blocks past it', () => {
    const uid = `rate-limit-user-${Date.now()}`

    expect(checkRateLimit(uid, 2, 60000)).toMatchObject({ allowed: true, remaining: 1 })
    expect(checkRateLimit(uid, 2, 60000)).toMatchObject({ allowed: true, remaining: 0 })
    expect(checkRateLimit(uid, 2, 60000)).toMatchObject({ allowed: false, remaining: 0 })
  })
})
