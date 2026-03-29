import '@testing-library/jest-dom'
import 'jest-axe/extend-expect'

// Configure axe for consistent accessibility testing
import { configureAxe } from 'jest-axe'

const axe = configureAxe({
  rules: {
    // Disable some rules that might be too strict for development
    'color-contrast': { enabled: false }, // Enable when design is finalized
    // Add any other rule configurations as needed
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa'], // Focus on WCAG 2.1 AA compliance
})

// Make axe available globally for tests
global.axe = axe

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock Firebase
jest.mock('@/lib/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-id',
      email: 'test@example.com',
    },
  },
  db: {},
  googleProvider: {},
}))

// Mock Google Analytics
global.gtag = jest.fn()

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
global.localStorage = localStorageMock

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
}) 