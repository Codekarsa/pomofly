/**
 * Component to display storage status and warnings to users
 */

'use client';

import { useState, useEffect } from 'react';
import { AlertTriangle, Cloud, Database, Info, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useStorageNotifications } from '@/hooks/useStorageNotifications';
import { getStorageHealth, getGuestDataSummary } from '@/lib/guestStorage';

interface StorageStatus {
  isHealthy: boolean;
  issues: string[];
  recommendation: string | null;
  usagePercentage: number;
  isUsingFallback: boolean;
  taskCount: number;
  projectCount: number;
}

interface StorageStatusIndicatorProps {
  className?: string;
  showDetails?: boolean;
}

export function StorageStatusIndicator({ 
  className = '', 
  showDetails = false 
}: StorageStatusIndicatorProps) {
  const [status, setStatus] = useState<StorageStatus | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const { getStorageStatus } = useStorageNotifications();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const [health, storageInfo, dataSummary] = await Promise.all([
          getStorageHealth(),
          getStorageStatus(),
          getGuestDataSummary(),
        ]);

        setStatus({
          isHealthy: health.isHealthy,
          issues: health.issues,
          recommendation: health.recommendation,
          usagePercentage: storageInfo.usagePercentage,
          isUsingFallback: storageInfo.isUsingFallback,
          taskCount: dataSummary.taskCount,
          projectCount: dataSummary.projectCount,
        });
      } catch (error) {
        console.error('Failed to check storage status:', error);
        setStatus({
          isHealthy: false,
          issues: ['Unable to check storage status'],
          recommendation: 'Try refreshing the page',
          usagePercentage: 0,
          isUsingFallback: true,
          taskCount: 0,
          projectCount: 0,
        });
      }
    };

    checkStatus();

    // Check status periodically
    const interval = setInterval(checkStatus, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [getStorageStatus]);

  // Don't show if dismissed or no issues
  if (isDismissed || !status || (status.isHealthy && !showDetails)) {
    return null;
  }

  const handleSignIn = () => {
    window.dispatchEvent(new CustomEvent('show-auth-modal'));
  };

  const getStatusIcon = () => {
    if (status.isUsingFallback) {
      return <Database className="h-4 w-4 text-orange-500" />;
    }
    if (!status.isHealthy) {
      return <AlertTriangle className="h-4 w-4 text-red-500" />;
    }
    if (status.usagePercentage > 80) {
      return <Info className="h-4 w-4 text-yellow-500" />;
    }
    return <Cloud className="h-4 w-4 text-green-500" />;
  };

  const getAlertVariant = () => {
    if (status.isUsingFallback) return 'default';
    if (!status.isHealthy) return 'destructive';
    return 'default';
  };

  const getPrimaryIssue = () => {
    if (status.issues.length === 0) return 'Storage is healthy';
    return status.issues[0];
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <Alert variant={getAlertVariant()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <AlertDescription>
              {getPrimaryIssue()}
              {status.issues.length > 1 && (
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 ml-1 text-sm underline"
                  onClick={() => setIsExpanded(!isExpanded)}
                >
                  {isExpanded ? 'Show less' : `+${status.issues.length - 1} more`}
                </Button>
              )}
            </AlertDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            {status.recommendation && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignIn}
                className="text-xs"
              >
                <Cloud className="h-3 w-3 mr-1" />
                Sign In
              </Button>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsDismissed(true)}
              className="h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Dismiss</span>
            </Button>
          </div>
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            {status.issues.slice(1).map((issue, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="h-1 w-1 bg-current rounded-full" />
                <span>{issue}</span>
              </div>
            ))}
          </div>
        )}

        {/* Storage usage progress */}
        {status.usagePercentage > 0 && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Storage Usage</span>
              <span>{Math.round(status.usagePercentage)}%</span>
            </div>
            <Progress 
              value={status.usagePercentage} 
              className="h-2"
            />
          </div>
        )}

        {/* Data summary */}
        {showDetails && (status.taskCount > 0 || status.projectCount > 0) && (
          <div className="mt-3 text-xs text-muted-foreground">
            Storing {status.taskCount} tasks and {status.projectCount} projects
            {status.isUsingFallback && ' (temporary)'}
          </div>
        )}

        {/* Recommendation */}
        {status.recommendation && (
          <div className="mt-3 text-sm text-muted-foreground">
            <strong>Recommendation:</strong> {status.recommendation}
          </div>
        )}
      </Alert>
    </div>
  );
}

export default StorageStatusIndicator;