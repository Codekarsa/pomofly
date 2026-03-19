'use client';

import React from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';

interface AuthErrorDisplayProps {
  showRetry?: boolean;
  className?: string;
}

export const AuthErrorDisplay: React.FC<AuthErrorDisplayProps> = ({
  showRetry = true,
  className = '',
}) => {
  const { error, clearError, retryAuth } = useAuth();

  if (!error) {
    return null;
  }

  return (
    <Alert variant="destructive" className={`relative ${className}`}>
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="pr-8">Authentication Error</AlertTitle>
      <AlertDescription className="mt-2">
        <p className="mb-3">{error.message}</p>
        <div className="flex gap-2">
          {showRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={retryAuth}
              className="border-destructive text-destructive hover:bg-destructive hover:text-white"
            >
              <RefreshCw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={clearError}
            className="border-destructive text-destructive hover:bg-destructive hover:text-white"
          >
            <X className="mr-1 h-3 w-3" />
            Dismiss
          </Button>
        </div>
        {error.code && (
          <p className="mt-2 text-xs text-muted-foreground">
            Error Code: {error.code}
          </p>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default AuthErrorDisplay;
