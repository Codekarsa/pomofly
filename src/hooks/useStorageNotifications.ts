/**
 * Hook for handling storage error notifications and user feedback
 */

import { useEffect, useCallback } from 'react';
import { toast } from '@/lib/toast';
import { storageManager, type StorageError } from '@/lib/storageManager';

interface StorageNotificationOptions {
  enableToasts: boolean;
  enableConsoleLogging: boolean;
  customErrorHandler?: (error: StorageError) => void;
}

const DEFAULT_OPTIONS: StorageNotificationOptions = {
  enableToasts: true,
  enableConsoleLogging: true,
};

export function useStorageNotifications(
  options: Partial<StorageNotificationOptions> = {}
) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  const handleStorageError = useCallback((error: StorageError) => {
    // Log to console if enabled
    if (config.enableConsoleLogging) {
      console.warn(`Storage Error [${error.type}]:`, error.message, error.originalError);
    }

    // Show toast notification if enabled
    if (config.enableToasts) {
      switch (error.type) {
        case 'quota_exceeded':
          toast.error('Storage Full', {
            description: 'Your browser storage is full. Please sign in to sync your data to the cloud or clear some data.',
            duration: 8000,
            action: {
              label: 'Sign In',
              onClick: () => {
                // This could trigger a sign-in modal
                window.dispatchEvent(new CustomEvent('show-auth-modal'));
              },
            },
          });
          break;

        case 'data_corruption':
          toast.warning('Data Issue', {
            description: 'Some data may be corrupted. Your work has been preserved in memory.',
            duration: 6000,
          });
          break;

        case 'unavailable':
          toast.info('Storage Unavailable', {
            description: 'Browser storage is not available. Using temporary storage - sign in to save permanently.',
            duration: 6000,
            action: {
              label: 'Sign In',
              onClick: () => {
                window.dispatchEvent(new CustomEvent('show-auth-modal'));
              },
            },
          });
          break;

        default:
          toast.error('Storage Error', {
            description: 'There was an issue with saving your data. Please try again.',
            duration: 5000,
          });
      }
    }

    // Call custom error handler if provided
    if (config.customErrorHandler) {
      try {
        config.customErrorHandler(error);
      } catch (err) {
        console.error('Error in custom storage error handler:', err);
      }
    }
  }, [config]);

  useEffect(() => {
    // Subscribe to storage errors
    const unsubscribe = storageManager.onError(handleStorageError);

    return unsubscribe;
  }, [handleStorageError]);

  const checkStorageHealth = useCallback(async () => {
    try {
      const storageInfo = await storageManager.getStorageInfo();
      
      if (!storageInfo.available) {
        handleStorageError({
          type: 'unavailable',
          message: 'localStorage is not available',
        });
        return false;
      }

      // Warn if storage is getting full (>90%)
      const usageRatio = storageInfo.usage / storageInfo.quota;
      if (usageRatio > 0.9) {
        toast.warning('Storage Almost Full', {
          description: `Your browser storage is ${Math.round(usageRatio * 100)}% full. Consider signing in to sync your data to the cloud.`,
          duration: 8000,
          action: {
            label: 'Sign In',
            onClick: () => {
              window.dispatchEvent(new CustomEvent('show-auth-modal'));
            },
          },
        });
      }

      return true;
    } catch (error) {
      handleStorageError({
        type: 'unknown',
        message: 'Failed to check storage health',
        originalError: error as Error,
      });
      return false;
    }
  }, [handleStorageError]);

  const getStorageStatus = useCallback(async () => {
    try {
      const storageInfo = await storageManager.getStorageInfo();
      const isUsingFallback = storageManager.isUsingFallback();
      
      return {
        ...storageInfo,
        isUsingFallback,
        usagePercentage: storageInfo.quota > 0 ? (storageInfo.usage / storageInfo.quota) * 100 : 0,
      };
    } catch {
      return {
        available: false,
        quota: 0,
        usage: 0,
        remaining: 0,
        isUsingFallback: true,
        usagePercentage: 0,
      };
    }
  }, []);

  return {
    checkStorageHealth,
    getStorageStatus,
  };
}