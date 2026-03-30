'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { getEnvironmentStatus, getFeatureAvailability } from '@/lib/firebase';

interface ConfigStatus {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  setupInstructions?: string[];
}

interface FeatureStatus {
  firebaseAvailable: boolean;
  claudeAvailable: boolean;
  monitoringAvailable: boolean;
  supportedFeatures: string[];
  disabledFeatures: string[];
}

export function ConfigurationError() {
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);
  const [featureStatus, setFeatureStatus] = useState<FeatureStatus | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Check configuration status
    const status = getEnvironmentStatus();
    const features = getFeatureAvailability();
    
    setConfigStatus(status);
    setFeatureStatus(features);

    // Auto-expand if there are critical errors
    if (!status.isValid) {
      setIsExpanded(true);
    }
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleToggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Don't render anything if we haven't loaded status yet
  if (!configStatus || !featureStatus) {
    return null;
  }

  // Don't render if everything is working fine with no warnings
  if (configStatus.isValid && configStatus.warnings.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      {/* Collapsed state - show summary */}
      {!isExpanded && (
        <Alert 
          className={`cursor-pointer transition-all hover:shadow-md ${
            configStatus.isValid 
              ? 'border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20' 
              : 'border-red-200 bg-red-50 dark:bg-red-950/20'
          }`}
          onClick={handleToggleExpanded}
        >
          <AlertTriangle className={`h-4 w-4 ${
            configStatus.isValid ? 'text-yellow-600' : 'text-red-600'
          }`} />
          <AlertDescription className="text-sm">
            {configStatus.isValid 
              ? `Configuration warnings (${configStatus.warnings.length})` 
              : `Configuration errors (${configStatus.errors.length})`
            }
            <span className="ml-2 text-xs opacity-70">Click to view</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Expanded state - show full details */}
      {isExpanded && (
        <Card className={`max-w-md ${
          configStatus.isValid 
            ? 'border-yellow-200' 
            : 'border-red-200'
        }`}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                {configStatus.isValid ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                Configuration {configStatus.isValid ? 'Warnings' : 'Errors'}
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleExpanded}
                className="h-8 w-8 p-0"
              >
                ×
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Error messages */}
            {configStatus.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-red-700 dark:text-red-300">
                  Critical Issues:
                </h4>
                <div className="space-y-1">
                  {configStatus.errors.map((error, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-red-700 dark:text-red-300">{error}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Warning messages */}
            {configStatus.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-700 dark:text-yellow-300">
                  Optional Features Disabled:
                </h4>
                <div className="space-y-1">
                  {configStatus.warnings.map((warning, index) => (
                    <div key={index} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <span className="text-yellow-700 dark:text-yellow-300">{warning}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Feature availability status */}
            <div className="space-y-2">
              <h4 className="font-medium text-gray-700 dark:text-gray-300">
                Available Features:
              </h4>
              <div className="grid grid-cols-1 gap-1 text-sm">
                {featureStatus.supportedFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <CheckCircle className="h-3 w-3 text-green-500" />
                    <span className="text-green-700 dark:text-green-300">{feature}</span>
                  </div>
                ))}
                {featureStatus.disabledFeatures.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <XCircle className="h-3 w-3 text-red-500" />
                    <span className="text-red-700 dark:text-red-300">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Setup instructions for errors */}
            {!configStatus.isValid && configStatus.setupInstructions && (
              <div className="space-y-2">
                <h4 className="font-medium text-gray-700 dark:text-gray-300">
                  Setup Instructions:
                </h4>
                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded text-xs font-mono space-y-1 max-h-32 overflow-y-auto">
                  {configStatus.setupInstructions.slice(0, 10).map((instruction, index) => (
                    <div key={index} className="text-gray-600 dark:text-gray-400">
                      {instruction}
                    </div>
                  ))}
                  {configStatus.setupInstructions.length > 10 && (
                    <div className="text-gray-500 dark:text-gray-500">
                      ... (check console for full instructions)
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleRefresh}
                size="sm"
                className="flex-1"
                variant={configStatus.isValid ? "outline" : "default"}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
              {!configStatus.isValid && (
                <Button
                  onClick={() => {
                    console.log('Full configuration details:', {
                      configStatus,
                      featureStatus,
                      instructions: configStatus.setupInstructions
                    });
                  }}
                  size="sm"
                  variant="outline"
                >
                  Log Details
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}