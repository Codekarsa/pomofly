'use client';

import { useState, useEffect } from 'react';
import { getEnvironmentStatus, getFeatureAvailability } from '@/lib/firebase';

export interface ConfigurationStatus {
  isLoading: boolean;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  features: {
    firebaseAvailable: boolean;
    claudeAvailable: boolean;
    monitoringAvailable: boolean;
    supportedFeatures: string[];
    disabledFeatures: string[];
  } | null;
  setupInstructions?: string[];
}

/**
 * Hook to check application configuration status and feature availability
 */
export function useConfiguration(): ConfigurationStatus {
  const [status, setStatus] = useState<ConfigurationStatus>({
    isLoading: true,
    isValid: false,
    errors: [],
    warnings: [],
    features: null,
    setupInstructions: undefined
  });

  useEffect(() => {
    const checkConfiguration = () => {
      try {
        const envStatus = getEnvironmentStatus();
        const featureStatus = getFeatureAvailability();

        setStatus({
          isLoading: false,
          isValid: envStatus.isValid,
          errors: envStatus.errors,
          warnings: envStatus.warnings,
          features: featureStatus,
          setupInstructions: envStatus.setupInstructions
        });
      } catch (error) {
        console.error('Error checking configuration:', error);
        setStatus({
          isLoading: false,
          isValid: false,
          errors: ['Failed to check configuration status'],
          warnings: [],
          features: null
        });
      }
    };

    // Check immediately
    checkConfiguration();

    // Set up an interval to recheck periodically (in case user fixes config)
    const interval = setInterval(checkConfiguration, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, []);

  return status;
}

/**
 * Hook to check if a specific feature is available
 */
export function useFeatureAvailability() {
  const config = useConfiguration();

  return {
    isLoading: config.isLoading,
    firebase: config.features?.firebaseAvailable ?? false,
    claude: config.features?.claudeAvailable ?? false,
    monitoring: config.features?.monitoringAvailable ?? false,
    hasAnyFeatures: config.features ? config.features.supportedFeatures.length > 0 : false,
    canUseAuth: config.features?.firebaseAvailable ?? false,
    canUseTasks: config.features?.firebaseAvailable ?? false,
    canUseTimer: config.features?.firebaseAvailable ?? false,
    canUseAI: config.features?.claudeAvailable ?? false
  };
}

/**
 * Hook that returns a safe Firebase operation wrapper
 */
export function useFirebaseSafeOperation() {
  const config = useConfiguration();

  const safeExecute = async <T>(
    operation: () => Promise<T>,
    fallback: T,
    operationName: string = 'Operation'
  ): Promise<T> => {
    if (!config.features?.firebaseAvailable) {
      console.warn(`${operationName} skipped - Firebase not available`);
      return fallback;
    }

    try {
      return await operation();
    } catch (error) {
      console.error(`${operationName} failed:`, error);
      
      if (!config.isValid) {
        console.error('This may be due to Firebase configuration issues. Please check the configuration panel.');
      }
      
      return fallback;
    }
  };

  return {
    isFirebaseAvailable: config.features?.firebaseAvailable ?? false,
    safeExecute
  };
}