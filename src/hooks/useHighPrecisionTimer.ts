import { useEffect, useRef, useCallback, useState } from 'react';

interface HighPrecisionTimerConfig {
  onTick: (timeRemaining: number) => void;
  onComplete: () => void;
  getDuration: () => number; // Total duration in seconds
  isActive: boolean;
  startTime?: number | null;
  pausedTime?: number | null;
}

interface TimerState {
  lastUpdateTime: number;
  frameCount: number;
  avgFrameTime: number;
  isTabVisible: boolean;
  performanceMode: 'high' | 'normal' | 'background';
}

export function useHighPrecisionTimer({
  onTick,
  onComplete,
  getDuration,
  isActive,
  startTime,
  pausedTime
}: HighPrecisionTimerConfig) {
  const animationFrameRef = useRef<number>();
  const intervalRef = useRef<NodeJS.Timeout>();
  const workerRef = useRef<Worker>();
  const stateRef = useRef<TimerState>({
    lastUpdateTime: 0,
    frameCount: 0,
    avgFrameTime: 16.67, // 60fps baseline
    isTabVisible: true,
    performanceMode: 'high'
  });

  const [timingStats, setTimingStats] = useState({
    accuracy: 100,
    avgUpdateInterval: 16.67,
    missedFrames: 0
  });

  // Calculate remaining time with high precision
  const getRemainingTime = useCallback((): number => {
    if (pausedTime !== null) {
      return pausedTime;
    }

    if (!startTime) {
      return getDuration();
    }

    const totalDuration = getDuration();
    const elapsed = (performance.now() - startTime) / 1000;
    return Math.max(0, totalDuration - elapsed);
  }, [startTime, pausedTime, getDuration]);

  // High-precision update function
  const updateTimer = useCallback((currentTime: number) => {
    const state = stateRef.current;
    const deltaTime = currentTime - state.lastUpdateTime;
    
    if (deltaTime > 0) {
      // Update frame statistics
      state.frameCount++;
      state.avgFrameTime = state.avgFrameTime * 0.9 + deltaTime * 0.1;
      
      // Adaptive performance mode based on frame rate
      if (state.avgFrameTime > 20) { // Below 50fps
        state.performanceMode = 'normal';
      } else if (state.avgFrameTime > 33.33) { // Below 30fps
        state.performanceMode = 'background';
      } else {
        state.performanceMode = 'high';
      }
    }

    const remaining = getRemainingTime();
    
    // Call the tick callback
    onTick(remaining);

    // Check for completion
    if (remaining <= 0) {
      onComplete();
      return;
    }

    state.lastUpdateTime = currentTime;

    // Update timing statistics every second
    if (state.frameCount % 60 === 0) {
      setTimingStats({
        accuracy: Math.max(0, 100 - Math.abs(state.avgFrameTime - 16.67) * 2),
        avgUpdateInterval: state.avgFrameTime,
        missedFrames: Math.max(0, state.frameCount - (currentTime / 16.67))
      });
    }
  }, [getRemainingTime, onTick, onComplete]);

  // RequestAnimationFrame-based updates for high precision
  const startAnimationFrame = useCallback(() => {
    const tick = (currentTime: number) => {
      updateTimer(currentTime);
      
      if (isActive) {
        const state = stateRef.current;
        
        // Adaptive frame rate based on performance
        if (state.performanceMode === 'high' && state.isTabVisible) {
          animationFrameRef.current = requestAnimationFrame(tick);
        } else {
          // Fallback to lower frequency updates for better performance
          setTimeout(() => {
            if (isActive) {
              animationFrameRef.current = requestAnimationFrame(tick);
            }
          }, state.performanceMode === 'normal' ? 100 : 500);
        }
      }
    };

    stateRef.current.lastUpdateTime = performance.now();
    animationFrameRef.current = requestAnimationFrame(tick);
  }, [isActive, updateTimer]);

  // Interval-based fallback for when tab is not visible
  const startIntervalFallback = useCallback(() => {
    const interval = stateRef.current.isTabVisible ? 100 : 1000;
    
    intervalRef.current = setInterval(() => {
      updateTimer(performance.now());
    }, interval);
  }, [updateTimer]);

  // Web Worker for background timing (when tab is inactive)
  const setupWorker = useCallback(() => {
    if (typeof Worker !== 'undefined' && !workerRef.current) {
      try {
        const workerCode = `
          let intervalId;
          
          self.onmessage = function(e) {
            const { type, interval } = e.data;
            
            if (type === 'start') {
              if (intervalId) clearInterval(intervalId);
              intervalId = setInterval(() => {
                self.postMessage({ type: 'tick', timestamp: Date.now() });
              }, interval || 1000);
            } else if (type === 'stop') {
              if (intervalId) {
                clearInterval(intervalId);
                intervalId = null;
              }
            }
          };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        workerRef.current = new Worker(URL.createObjectURL(blob));
        
        workerRef.current.onmessage = (e) => {
          if (e.data.type === 'tick' && !stateRef.current.isTabVisible) {
            updateTimer(performance.now());
          }
        };
      } catch (error) {
        console.warn('Web Worker not available for background timing:', error);
      }
    }
  }, [updateTimer]);

  // Page Visibility API integration
  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      stateRef.current.isTabVisible = isVisible;
      
      if (isActive) {
        if (isVisible) {
          // Tab became visible - switch to high precision mode
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = undefined;
          }
          if (workerRef.current) {
            workerRef.current.postMessage({ type: 'stop' });
          }
          startAnimationFrame();
        } else {
          // Tab became hidden - switch to background mode
          if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = undefined;
          }
          startIntervalFallback();
          if (workerRef.current) {
            workerRef.current.postMessage({ type: 'start', interval: 1000 });
          }
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, startAnimationFrame, startIntervalFallback]);

  // Main timer control effect
  useEffect(() => {
    if (isActive) {
      stateRef.current.frameCount = 0;
      stateRef.current.lastUpdateTime = performance.now();
      
      setupWorker();
      
      if (stateRef.current.isTabVisible) {
        startAnimationFrame();
      } else {
        startIntervalFallback();
        if (workerRef.current) {
          workerRef.current.postMessage({ type: 'start', interval: 1000 });
        }
      }
    } else {
      // Stop all timers
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = undefined;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = undefined;
      }
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'stop' });
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (workerRef.current) {
        workerRef.current.postMessage({ type: 'stop' });
      }
    };
  }, [isActive, startAnimationFrame, startIntervalFallback, setupWorker]);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = undefined;
      }
    };
  }, []);

  // Return timing statistics for debugging
  return {
    timingStats,
    performanceMode: stateRef.current.performanceMode
  };
}