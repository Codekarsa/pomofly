import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Clock, 
  Target, 
  TrendingUp, 
  Settings, 
  AlertTriangle, 
  CheckCircle,
  Info,
  RotateCcw
} from 'lucide-react';
import { formatDrift, getAccuracyColor } from '@/lib/timerAccuracy';

interface TimerAccuracyIndicatorProps {
  accuracy: number;
  drift: number;
  showWarning: boolean;
  compensationEnabled: boolean;
  onToggleCompensation: () => void;
  onResetAccuracy: () => void;
  getAccuracyStatus: () => {
    level: 'excellent' | 'good' | 'fair' | 'poor';
    message: string;
    percentage: number;
  };
}

export const TimerAccuracyIndicator: React.FC<TimerAccuracyIndicatorProps> = ({
  accuracy,
  drift,
  showWarning,
  compensationEnabled,
  onToggleCompensation,
  onResetAccuracy,
  getAccuracyStatus,
}) => {
  const [expanded, setExpanded] = useState(false);
  const accuracyStatus = getAccuracyStatus();
  
  const getStatusIcon = (level: string) => {
    switch (level) {
      case 'excellent':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'good':
        return <Target className="h-4 w-4 text-blue-600" />;
      case 'fair':
        return <TrendingUp className="h-4 w-4 text-yellow-600" />;
      case 'poor':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };
  
  const getStatusColor = (level: string) => {
    switch (level) {
      case 'excellent':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'good':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'poor':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-2">
      {/* Accuracy Warning Alert */}
      {showWarning && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Timer drift detected ({formatDrift(drift)}). Consider resetting for better accuracy.
          </AlertDescription>
        </Alert>
      )}

      {/* Compact Accuracy Indicator */}
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm"
        >
          {getStatusIcon(accuracyStatus.level)}
          <span className={getAccuracyColor(accuracy)}>
            {accuracy.toFixed(1)}%
          </span>
          <Info className="h-3 w-3 opacity-50" />
        </Button>
        
        <Badge 
          variant="outline" 
          className={getStatusColor(accuracyStatus.level)}
        >
          {accuracyStatus.level}
        </Badge>

        {Math.abs(drift) > 100 && (
          <Badge variant="outline" className="text-xs">
            {formatDrift(drift)}
          </Badge>
        )}
      </div>

      {/* Expanded Accuracy Details */}
      {expanded && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Target className="h-4 w-4" />
              Timer Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status Message */}
            <div className="flex items-start gap-2">
              {getStatusIcon(accuracyStatus.level)}
              <div>
                <p className="text-sm font-medium">{accuracyStatus.message}</p>
                <p className="text-xs text-muted-foreground">
                  Current accuracy: {accuracy.toFixed(1)}%
                </p>
              </div>
            </div>

            {/* Drift Information */}
            {Math.abs(drift) > 0 && (
              <div className="space-y-1">
                <p className="text-sm font-medium">Current Drift</p>
                <p className="text-sm text-muted-foreground">
                  {formatDrift(drift)} {drift > 0 ? '(running slow)' : '(running fast)'}
                </p>
              </div>
            )}

            {/* Compensation Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Drift Compensation</span>
                <Badge 
                  variant={compensationEnabled ? "default" : "secondary"}
                  className="text-xs"
                >
                  {compensationEnabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {compensationEnabled 
                  ? 'Automatically adjusts for timing drift to improve accuracy'
                  : 'Basic timing without drift correction'
                }
              </p>
            </div>

            {/* Controls */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleCompensation}
                className="text-xs"
              >
                <Settings className="h-3 w-3 mr-1" />
                {compensationEnabled ? 'Disable' : 'Enable'} Compensation
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onResetAccuracy}
                className="text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset Tracking
              </Button>
            </div>

            {/* Help Text */}
            <div className="text-xs text-muted-foreground border-t pt-2">
              <p>
                <strong>Accuracy:</strong> How close the timer is to perfect timing<br/>
                <strong>Drift:</strong> Difference between expected and actual time<br/>
                <strong>Compensation:</strong> Automatic adjustment for browser timing issues
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TimerAccuracyIndicator;