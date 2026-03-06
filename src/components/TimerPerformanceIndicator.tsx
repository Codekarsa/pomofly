'use client'

import React from 'react';
import { Card } from '@/components/ui/card';
import { Activity, Clock, Zap } from 'lucide-react';

interface TimingStats {
  accuracy: number;
  avgUpdateInterval: number;
  missedFrames: number;
}

interface TimerPerformanceIndicatorProps {
  timingStats?: TimingStats;
  performanceMode?: string;
  isActive: boolean;
  className?: string;
}

export const TimerPerformanceIndicator: React.FC<TimerPerformanceIndicatorProps> = ({
  timingStats,
  performanceMode,
  isActive,
  className = ''
}) => {
  // Only show in development or when timer is active and there are performance issues
  const shouldShow = process.env.NODE_ENV === 'development' || 
    (isActive && timingStats && timingStats.accuracy < 90);

  if (!shouldShow || !timingStats) {
    return null;
  }

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 95) return 'text-green-600';
    if (accuracy >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceModeIcon = (mode: string) => {
    switch (mode) {
      case 'high': return <Zap className="h-3 w-3" />;
      case 'normal': return <Clock className="h-3 w-3" />;
      case 'background': return <Activity className="h-3 w-3" />;
      default: return <Clock className="h-3 w-3" />;
    }
  };

  const formatInterval = (interval: number) => {
    return `${interval.toFixed(1)}ms`;
  };

  return (
    <Card className={`p-2 text-xs bg-gray-50 border-gray-200 ${className}`}>
      <div className="flex items-center justify-between space-x-4">
        <div className="flex items-center space-x-1">
          <span className="text-gray-500">Precision:</span>
          <span className={getAccuracyColor(timingStats.accuracy)}>
            {timingStats.accuracy.toFixed(1)}%
          </span>
        </div>
        
        <div className="flex items-center space-x-1">
          {getPerformanceModeIcon(performanceMode || 'normal')}
          <span className="text-gray-500">{performanceMode || 'normal'}</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <span className="text-gray-500">Interval:</span>
          <span className="text-gray-700">
            {formatInterval(timingStats.avgUpdateInterval)}
          </span>
        </div>
        
        {timingStats.missedFrames > 0 && (
          <div className="flex items-center space-x-1">
            <span className="text-red-500">Missed:</span>
            <span className="text-red-600">{timingStats.missedFrames}</span>
          </div>
        )}
      </div>
      
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-1 text-gray-400 text-xs">
          Timer performance metrics (dev only)
        </div>
      )}
    </Card>
  );
};