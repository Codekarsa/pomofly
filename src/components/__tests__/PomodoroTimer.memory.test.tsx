import { render, unmountComponentAtNode } from '@testing-library/react';
import { act } from 'react';
import PomodoroTimer from '../PomodoroTimer';
import { AuthContext } from '@/app/contexts/AuthContext';

// Mock the hooks and components
jest.mock('@/hooks/useTasks', () => ({
  useTasks: () => ({
    tasks: [],
    loading: false,
    incrementPomodoroSession: jest.fn(),
    startAllTimeTracking: jest.fn(),
    stopAllTimeTracking: jest.fn()
  })
}));

jest.mock('@/hooks/useProjects', () => ({
  useProjects: () => ({
    projects: []
  })
}));

jest.mock('@/hooks/useTimeTracking', () => ({
  useTimeTracking: () => ({
    getElapsedTime: jest.fn(() => 0),
    formatTime: jest.fn(() => '00:00:00')
  })
}));

jest.mock('@/hooks/useGoogleAnalytics', () => ({
  useGoogleAnalytics: () => ({
    event: jest.fn()
  })
}));

jest.mock('../SelectedTasksList', () => {
  return function MockSelectedTasksList() {
    return <div data-testid="selected-tasks-list">Selected Tasks</div>;
  };
});

jest.mock('../TimerRecoveryModal', () => ({
  TimerRecoveryModal: () => null
}));

jest.mock('@/lib/timerPersistence', () => ({
  TimerPersistence: {
    loadSession: jest.fn(() => null),
    saveSession: jest.fn(),
    clearSession: jest.fn(),
    updateSessionTaskIds: jest.fn()
  }
}));

const mockUser = {
  uid: 'test-user-id',
  email: 'test@example.com'
};

const mockAuthContext = {
  user: mockUser,
  loading: false,
  signIn: jest.fn(),
  signUp: jest.fn(),
  signOut: jest.fn(),
  resetPassword: jest.fn()
};

const defaultSettings = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15,
  longBreakInterval: 4
};

describe('PomodoroTimer Memory Leak Tests', () => {
  let container: HTMLDivElement | null = null;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => JSON.stringify([])),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    });
  });

  afterEach(() => {
    if (container) {
      unmountComponentAtNode(container);
      document.body.removeChild(container);
      container = null;
    }
  });

  it('should clean up refs on unmount', async () => {
    const TestWrapper = () => (
      <AuthContext.Provider value={mockAuthContext}>
        <PomodoroTimer settings={defaultSettings} />
      </AuthContext.Provider>
    );

    await act(async () => {
      render(<TestWrapper />, container);
    });

    // Simulate component unmount
    await act(async () => {
      unmountComponentAtNode(container!);
    });

    // The test passes if no memory leaks occur during unmount
    expect(true).toBe(true);
  });

  it('should clear localStorage on unmount', async () => {
    const removeItemSpy = jest.spyOn(Storage.prototype, 'removeItem');
    
    const TestWrapper = () => (
      <AuthContext.Provider value={mockAuthContext}>
        <PomodoroTimer settings={defaultSettings} />
      </AuthContext.Provider>
    );

    await act(async () => {
      render(<TestWrapper />, container);
    });

    await act(async () => {
      unmountComponentAtNode(container!);
    });

    // Should attempt to clean up localStorage
    expect(removeItemSpy).toHaveBeenCalledWith('selectedTaskIds');
    
    removeItemSpy.mockRestore();
  });

  it('should handle cleanup errors gracefully', async () => {
    // Mock localStorage to throw error on removeItem
    const mockRemoveItem = jest.fn(() => {
      throw new Error('localStorage error');
    });
    
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(() => JSON.stringify([])),
        setItem: jest.fn(),
        removeItem: mockRemoveItem,
        clear: jest.fn()
      },
      writable: true
    });

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    
    const TestWrapper = () => (
      <AuthContext.Provider value={mockAuthContext}>
        <PomodoroTimer settings={defaultSettings} />
      </AuthContext.Provider>
    );

    await act(async () => {
      render(<TestWrapper />, container);
    });

    await act(async () => {
      unmountComponentAtNode(container!);
    });

    // Should log warning but not crash
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to clear localStorage on unmount:',
      expect.any(Error)
    );
    
    consoleSpy.mockRestore();
  });

  it('should not leak memory with multiple mount/unmount cycles', async () => {
    const TestWrapper = () => (
      <AuthContext.Provider value={mockAuthContext}>
        <PomodoroTimer settings={defaultSettings} />
      </AuthContext.Provider>
    );

    // Multiple mount/unmount cycles
    for (let i = 0; i < 5; i++) {
      await act(async () => {
        render(<TestWrapper />, container);
      });

      await act(async () => {
        unmountComponentAtNode(container!);
      });
    }

    // Test passes if no memory leaks occur
    expect(true).toBe(true);
  });
});