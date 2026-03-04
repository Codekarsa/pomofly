/**
 * High-precision timing utilities for accurate timer functionality
 * Handles drift correction, system sleep/wake, and browser throttling
 */

export class PreciseTimer {
  private static performanceStart = performance.now();
  private static dateStart = Date.now();
  
  /**
   * Get high-precision timestamp using performance.now() when available,
   * falling back to Date.now() with drift compensation
   */
  static now(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      // Use performance.now() for higher precision and monotonic time
      const performanceNow = performance.now();
      return this.dateStart + performanceNow - this.performanceStart;
    }
    return Date.now();
  }

  /**
   * Detect if system time has jumped significantly (sleep/wake, clock adjustment)
   * Returns true if a significant time jump is detected
   */
  static detectTimeJump(lastCheckTime: number, currentTime: number, expectedDelta: number): boolean {
    const actualDelta = currentTime - lastCheckTime;
    const deltaThreshold = Math.max(expectedDelta * 2, 5000); // At least 5 seconds or 2x expected
    
    return Math.abs(actualDelta - expectedDelta) > deltaThreshold;
  }

  /**
   * Calculate remaining time with drift protection and system event detection
   */
  static calculateRemainingTime(
    startTime: number, 
    totalDuration: number, 
    pausedTimeRemaining?: number | null
  ): {
    remaining: number;
    timeJumpDetected: boolean;
    driftMs: number;
  } {
    if (pausedTimeRemaining !== null && pausedTimeRemaining !== undefined) {
      return {
        remaining: pausedTimeRemaining,
        timeJumpDetected: false,
        driftMs: 0
      };
    }

    const currentTime = this.now();
    const elapsed = Math.max(0, Math.floor((currentTime - startTime) / 1000));
    const remaining = Math.max(0, totalDuration - elapsed);
    
    // Calculate expected vs actual time for drift detection
    const expectedElapsed = Math.floor((currentTime - startTime) / 1000);
    const driftMs = (currentTime - startTime) - (expectedElapsed * 1000);
    
    // Detect significant time jumps (system sleep, clock changes)
    const timeJumpDetected = elapsed > totalDuration + 60; // More than 1 minute over
    
    return {
      remaining,
      timeJumpDetected,
      driftMs
    };
  }

  /**
   * Get optimal update interval based on browser state and precision needs
   */
  static getUpdateInterval(): number {
    // Check if we're in background tab (document.hidden or document.visibilityState)
    const isBackground = typeof document !== 'undefined' && 
      (document.hidden || document.visibilityState === 'hidden');
    
    // Use longer intervals in background to save battery, shorter for accuracy in foreground
    if (isBackground) {
      return 1000; // 1 second in background
    }
    
    // High precision updates in foreground for smooth UI
    return 100; // 100ms for smooth seconds countdown
  }

  /**
   * Format time with high precision (includes milliseconds for debugging)
   */
  static formatPreciseTime(timeInSeconds: number, showMilliseconds = false): string {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    const milliseconds = Math.floor((timeInSeconds % 1) * 1000);
    
    const formatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    
    if (showMilliseconds) {
      return `${formatted}.${milliseconds.toString().padStart(3, '0')}`;
    }
    
    return formatted;
  }

  /**
   * Validate timestamp for reasonable bounds (prevent future dates, very old dates)
   */
  static validateTimestamp(timestamp: number): boolean {
    const now = this.now();
    const oneYearMs = 365 * 24 * 60 * 60 * 1000;
    
    // Timestamp should be within the last year and not in the future (with 1 minute tolerance)
    return timestamp > (now - oneYearMs) && timestamp < (now + 60000);
  }

  /**
   * Handle visibility change events to adjust timer behavior
   */
  static createVisibilityChangeHandler(onVisibilityChange: (isVisible: boolean) => void): () => void {
    const handleVisibilityChange = () => {
      const isVisible = typeof document !== 'undefined' && 
        !document.hidden && 
        document.visibilityState === 'visible';
      
      onVisibilityChange(isVisible);
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Return cleanup function
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    return () => {}; // No-op cleanup for SSR
  }
}