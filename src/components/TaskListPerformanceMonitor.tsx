import React, { useState, useEffect, useMemo } from 'react';
import { Task } from '../hooks/useTasks';
import { measureTaskListPerformance, type TaskListMetrics, processTaskList } from '../lib/taskListOptimizations';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, TrendingDown, TrendingUp, Zap, Database } from 'lucide-react';

interface PerformanceMonitorProps {
  tasks: Task[];
  isOptimizedVersion: boolean;
}

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  taskCount: number;
  timestamp: number;
}

const TaskListPerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ 
  tasks, 
  isOptimizedVersion 
}) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Performance thresholds
  const PERFORMANCE_THRESHOLDS = {
    renderTime: { good: 16, warning: 50, critical: 100 }, // milliseconds
    memoryUsage: { good: 10, warning: 25, critical: 50 }, // MB
    taskCount: { good: 50, warning: 100, critical: 500 }
  };

  // Current performance stats
  const currentMetrics = useMemo(() => {
    const taskCount = tasks.length;
    
    // Simulate render time measurement
    const startTime = performance.now();
    
    // Mock processing to simulate work
    tasks.forEach(task => {
      // Simulate filtering/sorting work
      const _ = task.title.toLowerCase() + (task.completed ? 'completed' : 'active');
    });
    
    const renderTime = performance.now() - startTime;
    
    // Estimate memory usage (rough approximation)
    const avgTaskSize = 1024; // bytes per task (estimated)
    const memoryUsage = (taskCount * avgTaskSize) / (1024 * 1024); // MB
    
    return {
      renderTime,
      memoryUsage,
      taskCount,
      timestamp: Date.now()
    };
  }, [tasks]);

  // Update metrics periodically
  useEffect(() => {
    if (isMonitoring) {
      const interval = setInterval(() => {
        setMetrics(prev => {
          const newMetrics = [...prev, currentMetrics];
          // Keep only last 20 measurements
          return newMetrics.slice(-20);
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [isMonitoring, currentMetrics]);

  // Performance status calculations
  const getPerformanceStatus = (value: number, thresholds: typeof PERFORMANCE_THRESHOLDS.renderTime) => {
    if (value <= thresholds.good) return { status: 'excellent', color: 'green' };
    if (value <= thresholds.warning) return { status: 'good', color: 'yellow' };
    if (value <= thresholds.critical) return { status: 'warning', color: 'orange' };
    return { status: 'critical', color: 'red' };
  };

  const renderTimeStatus = getPerformanceStatus(currentMetrics.renderTime, PERFORMANCE_THRESHOLDS.renderTime);
  const memoryStatus = getPerformanceStatus(currentMetrics.memoryUsage, PERFORMANCE_THRESHOLDS.memoryUsage);
  const taskCountStatus = getPerformanceStatus(currentMetrics.taskCount, PERFORMANCE_THRESHOLDS.taskCount);

  // Calculate trends
  const trend = useMemo(() => {
    if (metrics.length < 5) return null;
    
    const recent = metrics.slice(-5);
    const avgRecent = recent.reduce((sum, m) => sum + m.renderTime, 0) / recent.length;
    const older = metrics.slice(-10, -5);
    const avgOlder = older.reduce((sum, m) => sum + m.renderTime, 0) / older.length;
    
    const change = ((avgRecent - avgOlder) / avgOlder) * 100;
    
    return {
      percentage: Math.abs(change),
      direction: change > 0 ? 'up' : 'down',
      improving: change < 0 // Lower render time is better
    };
  }, [metrics]);

  // Performance recommendations
  const recommendations = useMemo(() => {
    const recs = [];
    
    if (currentMetrics.taskCount > PERFORMANCE_THRESHOLDS.taskCount.warning && !isOptimizedVersion) {
      recs.push({
        type: 'upgrade',
        message: 'Consider switching to the optimized task list for better performance with large datasets',
        icon: Zap
      });
    }
    
    if (currentMetrics.renderTime > PERFORMANCE_THRESHOLDS.renderTime.warning) {
      recs.push({
        type: 'performance',
        message: 'High render time detected. Consider implementing virtual scrolling or pagination',
        icon: AlertTriangle
      });
    }
    
    if (currentMetrics.memoryUsage > PERFORMANCE_THRESHOLDS.memoryUsage.warning) {
      recs.push({
        type: 'memory',
        message: 'High memory usage detected. Consider implementing data virtualization',
        icon: Database
      });
    }
    
    return recs;
  }, [currentMetrics, isOptimizedVersion]);

  const formatNumber = (num: number, decimals = 2) => {
    return Number(num.toFixed(decimals));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="w-5 h-5" />
          Performance Monitor
          <Badge variant={isOptimizedVersion ? "default" : "secondary"}>
            {isOptimizedVersion ? 'Optimized' : 'Standard'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Render Time</span>
              <Badge 
                variant={renderTimeStatus.color === 'green' ? 'default' : 'destructive'}
              >
                {renderTimeStatus.status}
              </Badge>
            </div>
            <div className="text-2xl font-bold">
              {formatNumber(currentMetrics.renderTime)}ms
            </div>
            <Progress 
              value={(currentMetrics.renderTime / PERFORMANCE_THRESHOLDS.renderTime.critical) * 100}
              className="mt-2"
            />
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Memory Usage</span>
              <Badge 
                variant={memoryStatus.color === 'green' ? 'default' : 'destructive'}
              >
                {memoryStatus.status}
              </Badge>
            </div>
            <div className="text-2xl font-bold">
              {formatNumber(currentMetrics.memoryUsage)}MB
            </div>
            <Progress 
              value={(currentMetrics.memoryUsage / PERFORMANCE_THRESHOLDS.memoryUsage.critical) * 100}
              className="mt-2"
            />
          </div>
          
          <div className="p-4 border rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Task Count</span>
              <Badge 
                variant={taskCountStatus.color === 'green' ? 'default' : 'destructive'}
              >
                {taskCountStatus.status}
              </Badge>
            </div>
            <div className="text-2xl font-bold">
              {currentMetrics.taskCount}
            </div>
            <Progress 
              value={(currentMetrics.taskCount / PERFORMANCE_THRESHOLDS.taskCount.critical) * 100}
              className="mt-2"
            />
          </div>
        </div>

        {/* Performance Trend */}
        {trend && (
          <div className="p-4 border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Performance Trend</span>
              {trend.improving ? (
                <TrendingDown className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingUp className="w-4 h-4 text-red-500" />
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Render time has {trend.improving ? 'improved' : 'degraded'} by{' '}
              <span className={`font-medium ${trend.improving ? 'text-green-600' : 'text-red-600'}`}>
                {formatNumber(trend.percentage)}%
              </span>{' '}
              in the last 5 measurements
            </div>
          </div>
        )}

        {/* Optimization Features */}
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium mb-3">Active Optimizations</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOptimizedVersion ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm">Virtual Scrolling</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOptimizedVersion ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm">Memoized Filtering</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOptimizedVersion ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm">Optimized Rendering</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOptimizedVersion ? 'bg-green-500' : 'bg-gray-300'}`} />
              <span className="text-sm">Batch Operations</span>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Recommendations</h4>
            {recommendations.map((rec, index) => (
              <Alert key={index}>
                <rec.icon className="h-4 w-4" />
                <AlertDescription>{rec.message}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Performance Comparison */}
        <div className="p-4 border rounded-lg bg-muted/50">
          <h4 className="font-medium mb-3">Performance Comparison</h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="font-medium text-muted-foreground mb-2">Standard Version</div>
              <div className="space-y-1">
                <div>• DOM renders all items</div>
                <div>• Re-filters on every render</div>
                <div>• Basic memoization</div>
                <div>• Single-threaded operations</div>
              </div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground mb-2">Optimized Version</div>
              <div className="space-y-1">
                <div>• Virtual scrolling (100+ items)</div>
                <div>• Memoized filter/sort pipelines</div>
                <div>• Component-level optimizations</div>
                <div>• Batched async operations</div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TaskListPerformanceMonitor;