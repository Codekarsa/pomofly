import { useState, useEffect } from 'react';
import { PreciseTimer } from '@/lib/preciseTiming';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, AlertTriangle, TrendingUp, Eye, EyeOff } from 'lucide-react';

interface TimerPerformanceMonitorProps {
  timerStartedAt: number | null;
  isActive: boolean;
  timeJumpDetected: boolean;
  isVisible: boolean;
  phase: string;
  totalDuration: number;
}

export function TimerPerformanceMonitor({
  timerStartedAt,
  isActive,
  timeJumpDetected,
  isVisible,
  phase,
  totalDuration
}: TimerPerformanceMonitorProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [performanceData, setPerformanceData] = useState({
    updateCount: 0,
    averageDrift: 0,
    maxDrift: 0,
    lastUpdateTime: 0,
    updateFrequency: 0
  });

  // Monitor performance in development mode
  useEffect(() => {
    if (!isActive || process.env.NODE_ENV !== 'development') return;

    const startTime = performance.now();
    let updateCount = 0;
    let totalDrift = 0;
    let maxDrift = 0;

    const monitor = setInterval(() => {
      updateCount++;
      const now = performance.now();
      const expectedDrift = (now - startTime) % 1000;
      const actualDrift = Math.abs(expectedDrift - 500); // Expect ~500ms intervals
      
      totalDrift += actualDrift;
      maxDrift = Math.max(maxDrift, actualDrift);
      
      setPerformanceData({
        updateCount,
        averageDrift: totalDrift / updateCount,
        maxDrift,
        lastUpdateTime: now,
        updateFrequency: updateCount / ((now - startTime) / 1000)
      });
    }, PreciseTimer.getUpdateInterval());

    return () => clearInterval(monitor);
  }, [isActive]);

  // Don't show in production
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!isExpanded) {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsExpanded(true)}
        className="fixed bottom-4 right-4 z-50 opacity-50 hover:opacity-100"
      >
        <TrendingUp className="w-4 h-4" />
        Performance
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 z-50 bg-white/95 backdrop-blur-sm border-2">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Timer Performance Monitor
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
          >
            ×
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-3 text-xs">
        {/* Timer Status */}
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center justify-between">
            <span>Status:</span>
            <Badge variant={isActive ? 'default' : 'secondary'}>
              {isActive ? 'Active' : 'Paused'}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span>Visibility:</span>
            <Badge variant={isVisible ? 'default' : 'secondary'}>
              {isVisible ? (
                <><Eye className="w-3 h-3 mr-1" />Visible</>
              ) : (
                <><EyeOff className="w-3 h-3 mr-1" />Hidden</>
              )}
            </Badge>
          </div>
        </div>

        {/* Time Jump Detection */}
        {timeJumpDetected && (
          <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="text-amber-800">System time jump detected</span>
          </div>
        )}

        {/* Performance Metrics */}
        {isActive && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-gray-700">Performance Metrics</div>
            
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div>Updates: {performanceData.updateCount}</div>
              <div>Frequency: {performanceData.updateFrequency.toFixed(1)} Hz</div>
              <div>Avg Drift: {performanceData.averageDrift.toFixed(1)}ms</div>
              <div>Max Drift: {performanceData.maxDrift.toFixed(1)}ms</div>
            </div>

            <div className="text-xs text-gray-500">
              Update Interval: {PreciseTimer.getUpdateInterval()}ms
            </div>
          </div>
        )}

        {/* Timing Information */}
        {timerStartedAt && (
          <div className="space-y-1">
            <div className="text-xs font-medium text-gray-700">Timing Details</div>
            <div className="text-xs space-y-1">
              <div>Phase: {phase}</div>
              <div>Duration: {totalDuration}s</div>
              <div>Started: {new Date(timerStartedAt).toLocaleTimeString()}</div>
              <div>Precision: {PreciseTimer.formatPreciseTime(
                (PreciseTimer.now() - timerStartedAt) / 1000, 
                true
              )}</div>
            </div>
          </div>
        )}

        {/* Timing Accuracy Status */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-600">Timing Accuracy:</span>
            <Badge 
              variant={performanceData.maxDrift < 100 ? 'default' : 
                     performanceData.maxDrift < 500 ? 'secondary' : 'destructive'}
            >
              {performanceData.maxDrift < 100 ? 'Excellent' :
               performanceData.maxDrift < 500 ? 'Good' : 'Poor'}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}