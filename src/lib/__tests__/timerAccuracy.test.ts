import { timerAccuracy, formatDrift, getAccuracyColor } from '../timerAccuracy';

// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

// Mock console methods
const consoleMock = {
  log: jest.fn(),
  warn: jest.fn(),
};
global.console = { ...console, ...consoleMock };

// Mock window events
const mockAddEventListener = jest.fn();
const mockRemoveEventListener = jest.fn();
global.window = {
  ...global.window,
  addEventListener: mockAddEventListener,
  removeEventListener: mockRemoveEventListener,
} as any;

global.document = {
  ...global.document,
  addEventListener: mockAddEventListener,
  removeEventListener: mockRemoveEventListener,
  hidden: false,
} as any;

describe('Timer Accuracy System', () => {
  beforeEach(() => {
    // Clear mocks before each test
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    
    // Reset the timer accuracy tracker
    timerAccuracy.resetAccuracy();
  });

  describe('Drift Detection', () => {
    it('should detect positive drift (timer running slow)', () => {
      const startTime = Date.now() - 10000; // 10 seconds ago
      timerAccuracy.startMonitoring(startTime);

      // Simulate 11 seconds of actual time for 10 seconds expected
      const result = timerAccuracy.measureAndCompensate(
        startTime,
        10000, // 10 second expected duration
        startTime + 11000 // 11 seconds actual
      );

      expect(result.drift).toBeGreaterThan(0);
      expect(result.accuracy).toBeLessThan(100);
    });

    it('should detect negative drift (timer running fast)', () => {
      const startTime = Date.now() - 10000;
      timerAccuracy.startMonitoring(startTime);

      // Simulate 9 seconds of actual time for 10 seconds expected
      const result = timerAccuracy.measureAndCompensate(
        startTime,
        10000,
        startTime + 9000
      );

      expect(result.drift).toBeLessThan(0);
      expect(result.accuracy).toBeLessThan(100);
    });

    it('should apply compensation to reduce drift over time', () => {
      const startTime = Date.now() - 30000; // 30 seconds ago
      timerAccuracy.startMonitoring(startTime);

      // Simulate consistent drift over multiple measurements
      for (let i = 1; i <= 5; i++) {
        const measurementTime = startTime + (i * 5000) + (i * 100); // Adding 100ms drift each time
        timerAccuracy.measureAndCompensate(
          startTime,
          i * 5000,
          measurementTime
        );
      }

      // Final measurement should show compensation
      const result = timerAccuracy.measureAndCompensate(
        startTime,
        30000,
        startTime + 30600 // 600ms total drift
      );

      expect(result.compensatedElapsed).toBeLessThan(30600);
    });
  });

  describe('Accuracy Metrics', () => {
    it('should calculate accuracy metrics correctly', () => {
      timerAccuracy.startMonitoring(Date.now());
      
      // Add some test drift data
      const startTime = Date.now() - 10000;
      timerAccuracy.measureAndCompensate(startTime, 5000, startTime + 5100); // 100ms drift
      timerAccuracy.measureAndCompensate(startTime, 10000, startTime + 10200); // 200ms drift

      const metrics = timerAccuracy.getAccuracyMetrics();

      expect(metrics.measurementCount).toBeGreaterThan(0);
      expect(metrics.averageDrift).toBeGreaterThan(0);
      expect(metrics.accuracyPercentage).toBeLessThan(100);
      expect(metrics.accuracyPercentage).toBeGreaterThan(0);
    });

    it('should provide human-readable accuracy status', () => {
      timerAccuracy.startMonitoring(Date.now());
      
      const status = timerAccuracy.getAccuracyStatus();

      expect(status).toHaveProperty('level');
      expect(status).toHaveProperty('message');
      expect(status).toHaveProperty('percentage');
      expect(['excellent', 'good', 'fair', 'poor']).toContain(status.level);
    });
  });

  describe('System Event Handling', () => {
    it('should detect potential system sleep', () => {
      const now = Date.now();
      
      // Simulate blur event
      const blurResult = timerAccuracy.handleSystemEvent('blur', {
        startedAt: now - 5000,
        remainingTime: 1500,
        isActive: true
      });
      
      expect(blurResult.shouldRecalibrate).toBe(false);

      // Simulate focus after significant time (>1 minute)
      const focusResult = timerAccuracy.handleSystemEvent('focus', {
        startedAt: now - 65000, // 65 seconds ago
        remainingTime: 1500,
        isActive: true
      });

      expect(focusResult.shouldRecalibrate).toBe(true);
      expect(focusResult.suggestedAction).toContain('sleep detected');
    });

    it('should handle wake events correctly', () => {
      const result = timerAccuracy.handleSystemEvent('wake');
      
      expect(result).toHaveProperty('shouldRecalibrate');
      expect(result).toHaveProperty('suggestedAction');
    });
  });

  describe('Data Persistence', () => {
    it('should save and load metrics from localStorage', () => {
      timerAccuracy.startMonitoring(Date.now());
      
      // Generate some metrics
      const startTime = Date.now() - 5000;
      timerAccuracy.measureAndCompensate(startTime, 5000, startTime + 5100);
      
      const metrics = timerAccuracy.stopMonitoring();

      // Verify localStorage was called
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'pomofly_timer_accuracy',
        expect.any(String)
      );
    });

    it('should reset all accuracy data', () => {
      timerAccuracy.startMonitoring(Date.now());
      
      // Add some data
      const startTime = Date.now() - 5000;
      timerAccuracy.measureAndCompensate(startTime, 5000, startTime + 5100);
      
      timerAccuracy.resetAccuracy();

      // Verify reset
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('pomofly_timer_accuracy');
      
      const metrics = timerAccuracy.getAccuracyMetrics();
      expect(metrics.measurementCount).toBe(0);
      expect(metrics.accuracyPercentage).toBe(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero duration gracefully', () => {
      const result = timerAccuracy.measureAndCompensate(Date.now(), 0, Date.now());
      
      expect(result.drift).toBe(0);
      expect(result.accuracy).toBe(100);
    });

    it('should handle very large drift values', () => {
      const startTime = Date.now() - 60000; // 1 minute ago
      const result = timerAccuracy.measureAndCompensate(
        startTime,
        10000, // Expected 10 seconds
        startTime + 70000 // Actual 70 seconds (huge drift)
      );
      
      expect(result.drift).toBeGreaterThan(50000);
      expect(result.accuracy).toBeLessThan(50);
      expect(result.shouldAlert).toBe(true);
    });
  });

  describe('Utility Functions', () => {
    describe('formatDrift', () => {
      it('should format positive drift in milliseconds', () => {
        expect(formatDrift(500)).toBe('+500ms');
      });

      it('should format negative drift in milliseconds', () => {
        expect(formatDrift(-300)).toBe('-300ms');
      });

      it('should format positive drift in seconds', () => {
        expect(formatDrift(2500)).toBe('+2.5s');
      });

      it('should format negative drift in seconds', () => {
        expect(formatDrift(-1200)).toBe('-1.2s');
      });
    });

    describe('getAccuracyColor', () => {
      it('should return green for excellent accuracy', () => {
        expect(getAccuracyColor(99.95)).toBe('text-green-600');
      });

      it('should return blue for good accuracy', () => {
        expect(getAccuracyColor(99.5)).toBe('text-blue-600');
      });

      it('should return yellow for fair accuracy', () => {
        expect(getAccuracyColor(96)).toBe('text-yellow-600');
      });

      it('should return red for poor accuracy', () => {
        expect(getAccuracyColor(90)).toBe('text-red-600');
      });
    });
  });
});