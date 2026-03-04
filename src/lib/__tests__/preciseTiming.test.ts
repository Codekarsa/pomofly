import { PreciseTimer } from '../preciseTiming';

// Mock performance API for testing
global.performance = {
  now: jest.fn(() => 1000.5), // Mock precise timestamp
} as any;

describe('PreciseTimer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset static properties
    (PreciseTimer as any).performanceStart = performance.now();
    (PreciseTimer as any).dateStart = Date.now();
  });

  describe('now()', () => {
    it('should use performance.now() when available', () => {
      const timestamp = PreciseTimer.now();
      expect(performance.now).toHaveBeenCalled();
      expect(typeof timestamp).toBe('number');
    });

    it('should fall back to Date.now() when performance is unavailable', () => {
      const originalPerformance = global.performance;
      delete (global as any).performance;
      
      const timestamp = PreciseTimer.now();
      expect(typeof timestamp).toBe('number');
      
      global.performance = originalPerformance;
    });
  });

  describe('detectTimeJump()', () => {
    it('should detect significant time jumps', () => {
      const lastTime = 1000;
      const currentTime = 8000; // 7 second jump
      const expectedDelta = 1000; // Expected 1 second
      
      const result = PreciseTimer.detectTimeJump(lastTime, currentTime, expectedDelta);
      expect(result).toBe(true);
    });

    it('should not detect normal time progression', () => {
      const lastTime = 1000;
      const currentTime = 2000; // Normal 1 second progression
      const expectedDelta = 1000;
      
      const result = PreciseTimer.detectTimeJump(lastTime, currentTime, expectedDelta);
      expect(result).toBe(false);
    });
  });

  describe('calculateRemainingTime()', () => {
    it('should calculate remaining time correctly', () => {
      const startTime = Date.now() - 10000; // Started 10 seconds ago
      const totalDuration = 60; // 1 minute total
      
      const result = PreciseTimer.calculateRemainingTime(startTime, totalDuration);
      
      expect(result.remaining).toBeCloseTo(50, 1); // About 50 seconds remaining
      expect(result.timeJumpDetected).toBe(false);
      expect(typeof result.driftMs).toBe('number');
    });

    it('should return paused time when provided', () => {
      const startTime = Date.now();
      const totalDuration = 60;
      const pausedTime = 30;
      
      const result = PreciseTimer.calculateRemainingTime(startTime, totalDuration, pausedTime);
      
      expect(result.remaining).toBe(30);
      expect(result.timeJumpDetected).toBe(false);
      expect(result.driftMs).toBe(0);
    });

    it('should detect time jumps in calculation', () => {
      const startTime = Date.now() - 120000; // Started 2 minutes ago
      const totalDuration = 60; // 1 minute total (should have finished)
      
      const result = PreciseTimer.calculateRemainingTime(startTime, totalDuration);
      
      expect(result.remaining).toBe(0);
      expect(result.timeJumpDetected).toBe(true);
    });
  });

  describe('getUpdateInterval()', () => {
    it('should return longer interval for background tabs', () => {
      Object.defineProperty(document, 'hidden', { value: true, writable: true });
      
      const interval = PreciseTimer.getUpdateInterval();
      expect(interval).toBe(1000);
    });

    it('should return shorter interval for foreground tabs', () => {
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      
      const interval = PreciseTimer.getUpdateInterval();
      expect(interval).toBe(100);
    });
  });

  describe('formatPreciseTime()', () => {
    it('should format time correctly without milliseconds', () => {
      const formatted = PreciseTimer.formatPreciseTime(125.5); // 2:05.500
      expect(formatted).toBe('02:05');
    });

    it('should format time correctly with milliseconds', () => {
      const formatted = PreciseTimer.formatPreciseTime(125.5, true); // 2:05.500
      expect(formatted).toBe('02:05.500');
    });

    it('should handle zero values correctly', () => {
      const formatted = PreciseTimer.formatPreciseTime(0);
      expect(formatted).toBe('00:00');
    });
  });

  describe('validateTimestamp()', () => {
    it('should accept recent timestamps', () => {
      const recentTimestamp = Date.now() - 1000; // 1 second ago
      expect(PreciseTimer.validateTimestamp(recentTimestamp)).toBe(true);
    });

    it('should reject future timestamps', () => {
      const futureTimestamp = Date.now() + 120000; // 2 minutes in future
      expect(PreciseTimer.validateTimestamp(futureTimestamp)).toBe(false);
    });

    it('should reject very old timestamps', () => {
      const oldTimestamp = Date.now() - (2 * 365 * 24 * 60 * 60 * 1000); // 2 years ago
      expect(PreciseTimer.validateTimestamp(oldTimestamp)).toBe(false);
    });

    it('should accept timestamps within tolerance', () => {
      const slightlyFutureTimestamp = Date.now() + 30000; // 30 seconds in future (within 1 min tolerance)
      expect(PreciseTimer.validateTimestamp(slightlyFutureTimestamp)).toBe(true);
    });
  });

  describe('createVisibilityChangeHandler()', () => {
    it('should handle visibility changes', () => {
      const mockCallback = jest.fn();
      const cleanup = PreciseTimer.createVisibilityChangeHandler(mockCallback);
      
      // Simulate visibility change
      Object.defineProperty(document, 'hidden', { value: false, writable: true });
      Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
      
      const event = new Event('visibilitychange');
      document.dispatchEvent(event);
      
      expect(mockCallback).toHaveBeenCalledWith(true);
      
      cleanup();
    });

    it('should return no-op cleanup for SSR', () => {
      const originalDocument = global.document;
      delete (global as any).document;
      
      const mockCallback = jest.fn();
      const cleanup = PreciseTimer.createVisibilityChangeHandler(mockCallback);
      
      expect(typeof cleanup).toBe('function');
      cleanup(); // Should not throw
      
      global.document = originalDocument;
    });
  });
});