import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, X, AlertCircle, Check } from 'lucide-react';

interface NotificationPermissionPromptProps {
  onRequestPermission: () => Promise<boolean>;
  onDismiss: () => void;
  className?: string;
}

export function NotificationPermissionPrompt({
  onRequestPermission,
  onDismiss,
  className
}: NotificationPermissionPromptProps) {
  const [isRequesting, setIsRequesting] = React.useState(false);
  const [showSuccess, setShowSuccess] = React.useState(false);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const granted = await onRequestPermission();
      if (granted) {
        setShowSuccess(true);
        // Auto-dismiss after showing success
        setTimeout(() => {
          onDismiss();
        }, 2000);
      }
    } finally {
      setIsRequesting(false);
    }
  };

  if (showSuccess) {
    return (
      <Card className={`border-green-200 bg-green-50 ${className || ''}`}>
        <CardContent className="pt-6">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">
                Notifications enabled successfully!
              </p>
              <p className="text-xs text-green-600 mt-1">
                You'll now receive alerts when your Pomodoro timers complete.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-blue-200 bg-blue-50 ${className || ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-sm font-medium text-blue-900">
              Enable Notifications
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDismiss}
            className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          <p className="text-sm text-blue-800">
            Get desktop notifications when your Pomodoro timers complete, even when 
            the tab isn't visible. Stay focused and never miss a break!
          </p>
          
          <div className="flex items-start space-x-2 text-xs text-blue-700">
            <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
            <p>
              Your browser will ask for permission. This is safe and only sends 
              timer completion alerts.
            </p>
          </div>

          <div className="flex items-center space-x-2 pt-2">
            <Button
              onClick={handleRequestPermission}
              disabled={isRequesting}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Bell className="mr-2 h-3 w-3" />
              {isRequesting ? 'Requesting...' : 'Enable Notifications'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onDismiss}
              className="text-blue-600 hover:text-blue-800"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}