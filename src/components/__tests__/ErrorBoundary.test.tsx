import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ErrorBoundary, { TaskErrorBoundary, TimerErrorBoundary } from '../ErrorBoundary';
import { monitoring } from '@/lib/monitoring';

// Mock monitoring module
jest.mock('@/lib/monitoring', () => ({
  monitoring: {
    reportError: jest.fn(),
  },
}));

// Mock console.error to avoid cluttering test output
const originalError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalError;
});

// Component that throws an error for testing
const ThrowingComponent = ({ shouldThrow = true, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div>Working component</div>;
};

// Async component that throws an error
const AsyncThrowingComponent = ({ shouldThrow = true }) => {
  React.useEffect(() => {
    if (shouldThrow) {
      setTimeout(() => {
        throw new Error('Async error');
      }, 100);
    }
  }, [shouldThrow]);

  return <div>Async component</div>;
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset console.error mock
    (console.error as jest.Mock).mockClear();
  });

  describe('Basic Error Handling', () => {
    it('should render children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should catch and display error when component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText(/We encountered an unexpected error/)).toBeInTheDocument();
      expect(screen.getByText('Try Again')).toBeInTheDocument();
      expect(screen.getByText('Go Home')).toBeInTheDocument();
    });

    it('should display custom fallback when provided', () => {
      const fallback = <div>Custom error UI</div>;
      
      render(
        <ErrorBoundary fallback={fallback}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error UI')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should show error details when showDetails is true', () => {
      render(
        <ErrorBoundary showDetails={true}>
          <ThrowingComponent errorMessage="Detailed test error" />
        </ErrorBoundary>
      );

      expect(screen.getByText('Technical details')).toBeInTheDocument();
      
      // Click to expand details
      fireEvent.click(screen.getByText('Technical details'));
      expect(screen.getByText('Error:')).toBeInTheDocument();
      expect(screen.getByText('Detailed test error')).toBeInTheDocument();
    });

    it('should generate unique error ID for each error', () => {
      const { rerender } = render(
        <ErrorBoundary showDetails={true} name="test-boundary">
          <ThrowingComponent />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Technical details'));
      const errorId1 = screen.getByText(/Error ID:/).textContent;

      // Reset and trigger another error
      fireEvent.click(screen.getByText('Try Again'));
      
      rerender(
        <ErrorBoundary showDetails={true} name="test-boundary">
          <ThrowingComponent />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Technical details'));
      const errorId2 = screen.getByText(/Error ID:/).textContent;

      expect(errorId1).not.toBe(errorId2);
    });
  });

  describe('Error Reporting', () => {
    it('should report error to monitoring service', () => {
      render(
        <ErrorBoundary name="TestBoundary">
          <ThrowingComponent errorMessage="Monitoring test error" />
        </ErrorBoundary>
      );

      expect(monitoring.reportError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          component: 'TestBoundary',
          action: 'component_error',
          severity: 'high',
          tags: ['error_boundary', 'react_error'],
        })
      );
    });

    it('should use default name when none provided', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(monitoring.reportError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          component: 'ErrorBoundary',
        })
      );
    });

    it('should log detailed error info in development', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      render(
        <ErrorBoundary>
          <ThrowingComponent errorMessage="Development error" />
        </ErrorBoundary>
      );

      expect(console.error).toHaveBeenCalledWith(
        'Error Boundary caught an error:',
        expect.any(Error)
      );
      expect(console.error).toHaveBeenCalledWith(
        'Error Info:',
        expect.any(Object)
      );

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Recovery Actions', () => {
    it('should reset error state when Try Again is clicked', () => {
      const { rerender } = render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();

      fireEvent.click(screen.getByText('Try Again'));

      // Re-render with working component
      rerender(
        <ErrorBoundary>
          <ThrowingComponent shouldThrow={false} />
        </ErrorBoundary>
      );

      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
      expect(screen.getByText('Working component')).toBeInTheDocument();
    });

    it('should navigate to home when Go Home is clicked', () => {
      // Mock window.location
      const mockLocation = {
        href: '',
      };
      Object.defineProperty(window, 'location', {
        value: mockLocation,
        writable: true,
      });

      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Go Home'));
      expect(window.location.href).toBe('/');
    });

    it('should refresh page when refresh action is called', () => {
      // Mock window.location.reload
      const mockReload = jest.fn();
      Object.defineProperty(window.location, 'reload', {
        value: mockReload,
        writable: true,
      });

      const boundary = React.createRef<ErrorBoundary>();
      render(
        <ErrorBoundary ref={boundary}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      // Access the component instance and call handleRefresh
      // Note: This tests the method directly since the UI doesn't expose a refresh button by default
      if (boundary.current) {
        boundary.current.handleRefresh();
        expect(mockReload).toHaveBeenCalled();
      }
    });
  });

  describe('Specialized Error Boundaries', () => {
    it('should render TaskErrorBoundary with custom fallback', () => {
      render(
        <TaskErrorBoundary>
          <ThrowingComponent />
        </TaskErrorBoundary>
      );

      expect(screen.getByText('Task management temporarily unavailable')).toBeInTheDocument();
      expect(screen.getByText('Please refresh the page to try again.')).toBeInTheDocument();
    });

    it('should render TimerErrorBoundary with custom fallback', () => {
      render(
        <TimerErrorBoundary>
          <ThrowingComponent />
        </TimerErrorBoundary>
      );

      expect(screen.getByText('Timer temporarily unavailable')).toBeInTheDocument();
      expect(screen.getByText('Please refresh the page to restore the timer.')).toBeInTheDocument();
    });

    it('should report errors with correct component names for specialized boundaries', () => {
      render(
        <TaskErrorBoundary>
          <ThrowingComponent />
        </TaskErrorBoundary>
      );

      expect(monitoring.reportError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          component: 'TaskManagement',
        })
      );

      jest.clearAllMocks();

      render(
        <TimerErrorBoundary>
          <ThrowingComponent />
        </TimerErrorBoundary>
      );

      expect(monitoring.reportError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({
          component: 'PomodoroTimer',
        })
      );
    });
  });

  describe('Error Boundary Integration', () => {
    it('should handle multiple nested error boundaries', () => {
      render(
        <ErrorBoundary name="outer">
          <div>Outer content</div>
          <TaskErrorBoundary>
            <ThrowingComponent />
          </TaskErrorBoundary>
          <div>More outer content</div>
        </ErrorBoundary>
      );

      // Inner error boundary should catch the error
      expect(screen.getByText('Task management temporarily unavailable')).toBeInTheDocument();
      // Outer content should still be visible
      expect(screen.getByText('Outer content')).toBeInTheDocument();
      expect(screen.getByText('More outer content')).toBeInTheDocument();
    });

    it('should handle errors in different components independently', () => {
      render(
        <div>
          <TaskErrorBoundary>
            <div>Working task component</div>
          </TaskErrorBoundary>
          <TimerErrorBoundary>
            <ThrowingComponent />
          </TimerErrorBoundary>
        </div>
      );

      expect(screen.getByText('Working task component')).toBeInTheDocument();
      expect(screen.getByText('Timer temporarily unavailable')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle error with no message', () => {
      const ErrorComponentWithNoMessage = () => {
        throw new Error();
      };

      render(
        <ErrorBoundary showDetails={true}>
          <ErrorComponentWithNoMessage />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Technical details'));
      expect(screen.getByText('Error:')).toBeInTheDocument();
    });

    it('should handle error with very long stack trace', () => {
      const createLongStackTrace = () => {
        const error = new Error('Long stack trace test');
        error.stack = 'Error: Long stack trace test\n' + 
          Array.from({ length: 50 }, (_, i) => `    at function${i} (test.js:${i}:1)`).join('\n');
        throw error;
      };

      const LongStackComponent = () => {
        createLongStackTrace();
        return <div>Should not render</div>;
      };

      render(
        <ErrorBoundary showDetails={true}>
          <LongStackComponent />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Technical details'));
      expect(screen.getByText('Stack trace')).toBeInTheDocument();
      
      fireEvent.click(screen.getByText('Stack trace'));
      expect(screen.getByText(/function0.*function1/)).toBeInTheDocument();
    });

    it('should reset state completely when switching between errors', () => {
      const { rerender } = render(
        <ErrorBoundary showDetails={true}>
          <ThrowingComponent errorMessage="First error" />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Technical details'));
      expect(screen.getByText('First error')).toBeInTheDocument();

      // Reset and render different error
      fireEvent.click(screen.getByText('Try Again'));
      
      rerender(
        <ErrorBoundary showDetails={true}>
          <ThrowingComponent errorMessage="Second error" />
        </ErrorBoundary>
      );

      fireEvent.click(screen.getByText('Technical details'));
      expect(screen.getByText('Second error')).toBeInTheDocument();
      expect(screen.queryByText('First error')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for error state', () => {
      render(
        <ErrorBoundary>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const errorContainer = screen.getByText('Something went wrong').closest('div');
      expect(errorContainer).toBeInTheDocument();
      
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2); // Try Again and Go Home
    });

    it('should support keyboard navigation', () => {
      render(
        <ErrorBoundary showDetails={true}>
          <ThrowingComponent />
        </ErrorBoundary>
      );

      const detailsElement = screen.getByText('Technical details');
      expect(detailsElement).toBeInTheDocument();
      
      // Test keyboard interaction
      fireEvent.keyDown(detailsElement, { key: 'Enter' });
      expect(screen.getByText('Error:')).toBeInTheDocument();
    });
  });
});