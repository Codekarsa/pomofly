import { useRef } from 'react';

/**
 * Timer Precision and Drift Compensation Utilities
 * 
 * Provides high-precision timing with drift compensation for Pomodoro timers.
 * Addresses timer drift, tab switching, system sleep, and performance monitoring.
 */

interface PrecisionTimerMetrics {
  actualElapsed: number;
  expectedElapsed: number;
  drift: number;
  adjustments: number;
  visibilityChanges: number;
  maxDrift: number;
  avgDrift: number;
}

interface TimerSnapshot {
  timestamp: number;
  performanceNow: number;
  systemTime: number;
}

export class PrecisionTimer {
  private startSnapshot: TimerSnapshot | null = null;
  private pausedDuration = 0;
  private driftHistory: number[] = [];
  private adjustmentCount = 0;
  private visibilityChangeCount = 0;
  private lastVisibilityState = document.visibilityState;
  
  private readonly DRIFT_THRESHOLD_MS = 100; // Compensate if drift > 100ms
  private readonly DRIFT_HISTORY_SIZE = 10; // Keep last 10 drift measurements
  private readonly UPDATE_INTERVAL_MS = 100; // Update every 100ms for smooth display

  constructor() {
    this.setupVisibilityTracking();
  }

  /**
   * Start the precision timer
   * @param resumeFromPausedTime - If resuming, the paused time in seconds
   */
  start(resumeFromPausedTime?: number): void {
    this.startSnapshot = this.createSnapshot();
    
    if (resumeFromPausedTime !== undefined) {
      // When resuming, adjust start time to account for paused duration
      this.pausedDuration = resumeFromPausedTime * 1000; // Convert to ms
    } else {
      this.pausedDuration = 0;
    }
    
    this.driftHistory = [];
    this.adjustmentCount = 0;
  }

  /**
   * Get the current elapsed time with drift compensation
   */
  getElapsedTime(): number {
    if (!this.startSnapshot) {
      return 0;
    }

    const currentSnapshot = this.createSnapshot();
    const rawElapsed = currentSnapshot.performanceNow - this.startSnapshot.performanceNow;
    const systemElapsed = currentSnapshot.systemTime - this.startSnapshot.systemTime;
    
    // Calculate drift between performance timer and system timer
    const drift = rawElapsed - systemElapsed;
    this.driftHistory.push(drift);
    
    // Keep history size manageable
    if (this.driftHistory.length > this.DRIFT_HISTORY_SIZE) {
      this.driftHistory.shift();
    }

    // Apply drift compensation if significant drift detected
    let compensatedElapsed = rawElapsed;
    if (Math.abs(drift) > this.DRIFT_THRESHOLD_MS) {
      // Use average drift to smooth out temporary spikes
      const avgDrift = this.driftHistory.reduce((sum, d) => sum + d, 0) / this.driftHistory.length;
      compensatedElapsed = rawElapsed - avgDrift;
      this.adjustmentCount++;
    }

    // Subtract paused duration and convert to seconds
    const totalElapsedMs = compensatedElapsed - this.pausedDuration;
    return Math.max(0, totalElapsedMs / 1000);
  }

  /**
   * Pause the timer and return the current elapsed time
   */
  pause(): number {
    const elapsed = this.getElapsedTime();
    this.startSnapshot = null;
    return elapsed;
  }

  /**
   * Reset the timer completely
   */
  reset(): void {
    this.startSnapshot = null;
    this.pausedDuration = 0;
    this.driftHistory = [];
    this.adjustmentCount = 0;
    this.visibilityChangeCount = 0;
  }

  /**
   * Get precision metrics for monitoring and debugging
   */
  getMetrics(): PrecisionTimerMetrics {
    const currentDrift = this.driftHistory[this.driftHistory.length - 1] || 0;
    const avgDrift = this.driftHistory.length > 0 
      ? this.driftHistory.reduce((sum, d) => sum + d, 0) / this.driftHistory.length 
      : 0;
    const maxDrift = Math.max(...this.driftHistory.map(Math.abs));

    return {
      actualElapsed: this.getElapsedTime(),
      expectedElapsed: this.startSnapshot 
        ? (performance.now() - this.startSnapshot.performanceNow - this.pausedDuration) / 1000 
        : 0,
      drift: currentDrift,
      adjustments: this.adjustmentCount,
      visibilityChanges: this.visibilityChangeCount,
      maxDrift,
      avgDrift
    };
  }

  /**
   * Calculate remaining time for a session with given duration
   */
  getRemainingTime(totalDurationSeconds: number, onTimeUp?: () => void): {
    minutes: number;
    seconds: number;
    totalSeconds: number;
    isTimeUp: boolean;
  } {
    const elapsed = this.getElapsedTime();
    const totalRemaining = Math.max(0, totalDurationSeconds - elapsed);
    const isTimeUp = totalRemaining <= 0;
    
    if (isTimeUp && onTimeUp) {
      onTimeUp();
    }
    
    return {
      minutes: Math.floor(totalRemaining / 60),
      seconds: Math.floor(totalRemaining % 60),
      totalSeconds: totalRemaining,
      isTimeUp
    };
  }

  /**
   * Create a high-precision timestamp snapshot
   */
  private createSnapshot(): TimerSnapshot {
    return {
      timestamp: Date.now(),
      performanceNow: performance.now(),
      systemTime: Date.now()
    };
  }

  /**
   * Track visibility changes that can affect timer accuracy
   */
  private setupVisibilityTracking(): void {
    document.addEventListener('visibilitychange', () => {
      if (this.lastVisibilityState !== document.visibilityState) {
        this.visibilityChangeCount++;
        this.lastVisibilityState = document.visibilityState;
        
        // Page became visible again - check for potential time jumps
        if (document.visibilityState === 'visible' && this.startSnapshot) {
          // Force a drift calculation on next getElapsedTime() call
          this.driftHistory.push(0); // This will trigger drift detection
        }
      }
    });
  }
}

/**
 * Enhanced timer hook that uses the PrecisionTimer for drift compensation
 */
export function usePrecisionTimer() {
  const timerRef = useRef<PrecisionTimer | null>(null);
  
  if (!timerRef.current) {
    timerRef.current = new PrecisionTimer();
  }

  return timerRef.current;
}

/**
 * Utility to validate timer precision and log metrics
 */
export function validateTimerPrecision(timer: PrecisionTimer): boolean {
  const metrics = timer.getMetrics();
  const ACCEPTABLE_DRIFT_MS = 500; // 500ms is acceptable drift
  const ACCEPTABLE_MAX_DRIFT_MS = 1000; // 1 second max drift
  
  const isPrecise = Math.abs(metrics.avgDrift) < ACCEPTABLE_DRIFT_MS 
    && metrics.maxDrift < ACCEPTABLE_MAX_DRIFT_MS;
  
  // Log metrics in development or if precision is poor
  if (process.env.NODE_ENV === 'development' || !isPrecise) {
    console.log('Timer Precision Metrics:', {
      avgDrift: `${metrics.avgDrift.toFixed(2)}ms`,
      maxDrift: `${metrics.maxDrift.toFixed(2)}ms`,
      adjustments: metrics.adjustments,
      visibilityChanges: metrics.visibilityChanges,
      isPrecise
    });
  }
  
  return isPrecise;
}