/**
 * Timer Accuracy and Drift Compensation System
 * 
 * This module implements advanced timer precision features:
 * - Drift detection and compensation
 * - System sleep/resume handling
 * - Timer accuracy measurement and reporting
 * - Performance-based timing adjustments
 */

interface DriftData {
  expectedElapsed: number;
  actualElapsed: number;
  drift: number;
  timestamp: number;
}

interface AccuracyMetrics {
  averageDrift: number;
  maxDrift: number;
  driftStandardDeviation: number;
  accuracyPercentage: number;
  measurementCount: number;
  lastUpdated: number;
}

interface SystemEventData {
  type: 'sleep' | 'wake' | 'blur' | 'focus';
  timestamp: number;
  timerState?: {
    startedAt: number;
    remainingTime: number;
    isActive: boolean;
  };
}

class TimerAccuracyTracker {
  private driftHistory: DriftData[] = [];
  private systemEvents: SystemEventData[] = [];
  private lastMeasurement: number = 0;
  private compensationOffset: number = 0;
  private isMonitoring: boolean = false;
  private maxHistorySize: number = 100;
  
  // Drift detection thresholds
  private readonly DRIFT_WARNING_THRESHOLD = 1000; // 1 second
  private readonly DRIFT_CRITICAL_THRESHOLD = 5000; // 5 seconds
  private readonly MIN_MEASUREMENT_INTERVAL = 5000; // 5 seconds between measurements
  
  constructor() {
    this.setupSystemEventListeners();
  }
  
  /**
   * Start monitoring timer accuracy for a new session
   */
  startMonitoring(initialTimestamp: number) {
    this.lastMeasurement = initialTimestamp;
    this.isMonitoring = true;
    this.compensationOffset = 0;
    console.log('🕐 Timer accuracy monitoring started');
  }
  
  /**
   * Stop monitoring and save final metrics
   */
  stopMonitoring(): AccuracyMetrics {
    this.isMonitoring = false;
    const metrics = this.calculateAccuracyMetrics();
    this.saveMetricsToStorage(metrics);
    console.log('🏁 Timer accuracy monitoring stopped', metrics);
    return metrics;
  }
  
  /**
   * Measure current drift and apply compensation
   */
  measureAndCompensate(
    startedAt: number, 
    expectedDuration: number,
    currentTime: number = Date.now()
  ): { 
    compensatedElapsed: number; 
    drift: number; 
    accuracy: number;
    shouldAlert: boolean;
  } {
    const actualElapsed = currentTime - startedAt;
    const expectedElapsed = this.lastMeasurement ? 
      (currentTime - this.lastMeasurement) : 
      actualElapsed;
    
    const drift = actualElapsed - expectedElapsed;
    const driftAbs = Math.abs(drift);
    
    // Record drift data if enough time has passed
    if (currentTime - this.lastMeasurement >= this.MIN_MEASUREMENT_INTERVAL) {
      this.recordDrift(expectedElapsed, actualElapsed, drift, currentTime);
      this.lastMeasurement = currentTime;
    }
    
    // Calculate compensation based on historical drift
    const compensation = this.calculateCompensation(drift);
    this.compensationOffset += compensation;
    
    const compensatedElapsed = actualElapsed + this.compensationOffset;
    const accuracy = this.calculateInstantaneousAccuracy(drift, expectedElapsed);
    const shouldAlert = driftAbs > this.DRIFT_WARNING_THRESHOLD;
    
    return {
      compensatedElapsed,
      drift,
      accuracy,
      shouldAlert
    };
  }
  
  /**
   * Handle system sleep/wake detection
   */
  handleSystemEvent(
    type: 'sleep' | 'wake' | 'blur' | 'focus',
    timerState?: { startedAt: number; remainingTime: number; isActive: boolean }
  ): { shouldRecalibrate: boolean; suggestedAction: string } {
    const event: SystemEventData = {
      type,
      timestamp: Date.now(),
      timerState
    };
    
    this.systemEvents.push(event);
    
    // Keep only recent events
    this.systemEvents = this.systemEvents.slice(-50);
    
    // Detect potential sleep/wake cycles
    if (type === 'focus' && timerState?.isActive) {
      const lastBlur = this.systemEvents
        .filter(e => e.type === 'blur')
        .pop();
      
      if (lastBlur && (event.timestamp - lastBlur.timestamp) > 60000) {
        // Potential sleep detected (blur for >1 minute)
        console.warn('🚨 Potential system sleep detected, timer may need recalibration');
        return {
          shouldRecalibrate: true,
          suggestedAction: 'System sleep detected. Timer accuracy may be affected. Consider resetting.'
        };
      }
    }
    
    return {
      shouldRecalibrate: false,
      suggestedAction: ''
    };
  }
  
  /**
   * Get current accuracy metrics
   */
  getAccuracyMetrics(): AccuracyMetrics {
    return this.calculateAccuracyMetrics();
  }
  
  /**
   * Reset accuracy tracking
   */
  resetAccuracy() {
    this.driftHistory = [];
    this.systemEvents = [];
    this.compensationOffset = 0;
    this.lastMeasurement = 0;
    localStorage.removeItem('pomofly_timer_accuracy');
    console.log('🔄 Timer accuracy tracking reset');
  }
  
  /**
   * Get human-readable accuracy status
   */
  getAccuracyStatus(): {
    level: 'excellent' | 'good' | 'fair' | 'poor';
    message: string;
    percentage: number;
  } {
    const metrics = this.calculateAccuracyMetrics();
    
    if (metrics.accuracyPercentage >= 99.9) {
      return {
        level: 'excellent',
        message: 'Timer is highly accurate',
        percentage: metrics.accuracyPercentage
      };
    } else if (metrics.accuracyPercentage >= 99.0) {
      return {
        level: 'good',
        message: 'Timer accuracy is good',
        percentage: metrics.accuracyPercentage
      };
    } else if (metrics.accuracyPercentage >= 95.0) {
      return {
        level: 'fair',
        message: 'Timer accuracy is fair - consider resetting',
        percentage: metrics.accuracyPercentage
      };
    } else {
      return {
        level: 'poor',
        message: 'Timer accuracy is poor - reset recommended',
        percentage: metrics.accuracyPercentage
      };
    }
  }
  
  private recordDrift(expected: number, actual: number, drift: number, timestamp: number) {
    const driftData: DriftData = {
      expectedElapsed: expected,
      actualElapsed: actual,
      drift,
      timestamp
    };
    
    this.driftHistory.push(driftData);
    
    // Keep only recent measurements
    if (this.driftHistory.length > this.maxHistorySize) {
      this.driftHistory = this.driftHistory.slice(-this.maxHistorySize);
    }
    
    // Log significant drift
    if (Math.abs(drift) > this.DRIFT_WARNING_THRESHOLD) {
      console.warn(`⚠️  Timer drift detected: ${drift}ms (${(drift/1000).toFixed(1)}s)`);
    }
  }
  
  private calculateCompensation(currentDrift: number): number {
    if (this.driftHistory.length < 3) {
      return 0; // Need more data for compensation
    }
    
    // Calculate trend-based compensation
    const recentDrifts = this.driftHistory.slice(-5).map(d => d.drift);
    const averageRecentDrift = recentDrifts.reduce((a, b) => a + b, 0) / recentDrifts.length;
    
    // Apply conservative compensation (50% of detected drift)
    const compensation = -averageRecentDrift * 0.5;
    
    // Cap compensation to prevent overcorrection
    return Math.max(-500, Math.min(500, compensation));
  }
  
  private calculateAccuracyMetrics(): AccuracyMetrics {
    if (this.driftHistory.length === 0) {
      return {
        averageDrift: 0,
        maxDrift: 0,
        driftStandardDeviation: 0,
        accuracyPercentage: 100,
        measurementCount: 0,
        lastUpdated: Date.now()
      };
    }
    
    const drifts = this.driftHistory.map(d => Math.abs(d.drift));
    const averageDrift = drifts.reduce((a, b) => a + b, 0) / drifts.length;
    const maxDrift = Math.max(...drifts);
    
    // Calculate standard deviation
    const variance = drifts.reduce((acc, drift) => {
      return acc + Math.pow(drift - averageDrift, 2);
    }, 0) / drifts.length;
    const standardDeviation = Math.sqrt(variance);
    
    // Calculate accuracy percentage (100% - average drift as percentage of expected time)
    const averageExpectedTime = this.driftHistory
      .map(d => d.expectedElapsed)
      .reduce((a, b) => a + b, 0) / this.driftHistory.length;
    
    const accuracyPercentage = Math.max(0, 100 - (averageDrift / averageExpectedTime) * 100);
    
    return {
      averageDrift,
      maxDrift,
      driftStandardDeviation: standardDeviation,
      accuracyPercentage,
      measurementCount: this.driftHistory.length,
      lastUpdated: Date.now()
    };
  }
  
  private calculateInstantaneousAccuracy(drift: number, expectedElapsed: number): number {
    if (expectedElapsed === 0) return 100;
    const driftPercentage = (Math.abs(drift) / expectedElapsed) * 100;
    return Math.max(0, 100 - driftPercentage);
  }
  
  private setupSystemEventListeners() {
    if (typeof window === 'undefined') return;
    
    // Listen for visibility changes (sleep/wake detection)
    document.addEventListener('visibilitychange', () => {
      const type = document.hidden ? 'blur' : 'focus';
      this.handleSystemEvent(type);
    });
    
    // Listen for window focus/blur
    window.addEventListener('blur', () => {
      this.handleSystemEvent('blur');
    });
    
    window.addEventListener('focus', () => {
      this.handleSystemEvent('focus');
    });
    
    // Listen for page freeze/resume (better sleep detection)
    window.addEventListener('freeze', () => {
      this.handleSystemEvent('sleep');
    });
    
    window.addEventListener('resume', () => {
      this.handleSystemEvent('wake');
    });
  }
  
  private saveMetricsToStorage(metrics: AccuracyMetrics) {
    try {
      localStorage.setItem('pomofly_timer_accuracy', JSON.stringify({
        metrics,
        driftHistory: this.driftHistory.slice(-20), // Save last 20 measurements
        lastSaved: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to save timer accuracy metrics:', error);
    }
  }
  
  private loadMetricsFromStorage(): { metrics?: AccuracyMetrics; driftHistory?: DriftData[] } {
    try {
      const stored = localStorage.getItem('pomofly_timer_accuracy');
      if (!stored) return {};
      
      const data = JSON.parse(stored);
      const ageHours = (Date.now() - data.lastSaved) / (1000 * 60 * 60);
      
      // Only use data if it's less than 24 hours old
      if (ageHours < 24) {
        return {
          metrics: data.metrics,
          driftHistory: data.driftHistory || []
        };
      }
    } catch (error) {
      console.warn('Failed to load timer accuracy metrics:', error);
    }
    return {};
  }
}

// Create global instance
export const timerAccuracy = new TimerAccuracyTracker();

/**
 * React hook for timer accuracy monitoring
 */
export function useTimerAccuracy() {
  return {
    startMonitoring: timerAccuracy.startMonitoring.bind(timerAccuracy),
    stopMonitoring: timerAccuracy.stopMonitoring.bind(timerAccuracy),
    measureAndCompensate: timerAccuracy.measureAndCompensate.bind(timerAccuracy),
    handleSystemEvent: timerAccuracy.handleSystemEvent.bind(timerAccuracy),
    getAccuracyMetrics: timerAccuracy.getAccuracyMetrics.bind(timerAccuracy),
    getAccuracyStatus: timerAccuracy.getAccuracyStatus.bind(timerAccuracy),
    resetAccuracy: timerAccuracy.resetAccuracy.bind(timerAccuracy)
  };
}

/**
 * Utility function to format drift time
 */
export function formatDrift(driftMs: number): string {
  const absMs = Math.abs(driftMs);
  const sign = driftMs >= 0 ? '+' : '-';
  
  if (absMs >= 1000) {
    return `${sign}${(absMs / 1000).toFixed(1)}s`;
  } else {
    return `${sign}${Math.round(absMs)}ms`;
  }
}

/**
 * Utility function to get accuracy color for UI
 */
export function getAccuracyColor(accuracy: number): string {
  if (accuracy >= 99.9) return 'text-green-600';
  if (accuracy >= 99.0) return 'text-blue-600';
  if (accuracy >= 95.0) return 'text-yellow-600';
  return 'text-red-600';
}