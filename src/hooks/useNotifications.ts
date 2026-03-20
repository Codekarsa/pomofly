import { useState, useEffect, useCallback } from 'react';
import {
  notificationService,
  NotificationSettings,
  getNotificationSettings,
  saveNotificationSettings,
  defaultNotificationSettings
} from '@/lib/notifications';

interface UseNotificationsReturn {
  // Permission state
  isSupported: boolean;
  permissionGranted: boolean;
  permissionDenied: boolean;
  needsPermission: boolean;
  
  // Settings
  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;
  
  // Actions
  requestPermission: () => Promise<boolean>;
  showTimerComplete: (phase: 'pomodoro' | 'shortBreak' | 'longBreak', nextPhase?: string) => Promise<void>;
  showTaskReminder: (taskName: string) => Promise<void>;
  
  // UI helpers
  shouldShowPermissionPrompt: boolean;
}

export function useNotifications(): UseNotificationsReturn {
  const [isSupported] = useState(() => notificationService.isSupported());
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>(defaultNotificationSettings);

  // Load settings and check permission on mount
  useEffect(() => {
    const loadedSettings = getNotificationSettings();
    setSettings(loadedSettings);

    if (isSupported) {
      const permissionStatus = notificationService.getPermissionStatus();
      setPermissionGranted(permissionStatus.granted);
      setPermissionDenied(permissionStatus.denied);
    }
  }, [isSupported]);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    saveNotificationSettings(updatedSettings);
  }, [settings]);

  // Request permission
  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;

    const result = await notificationService.requestPermission();
    setPermissionGranted(result.granted);
    setPermissionDenied(result.denied);

    // Mark that we've requested permission
    updateSettings({ requestedPermission: true });

    return result.granted;
  }, [isSupported, updateSettings]);

  // Show timer completion notification
  const showTimerComplete = useCallback(async (
    phase: 'pomodoro' | 'shortBreak' | 'longBreak',
    nextPhase?: string
  ) => {
    if (!settings.enabled || !settings.browserNotifications) {
      return;
    }

    if (phase === 'pomodoro' && !settings.pomodoroComplete) {
      return;
    }

    if ((phase === 'shortBreak' || phase === 'longBreak') && !settings.breakComplete) {
      return;
    }

    try {
      await notificationService.showTimerComplete(phase, nextPhase);
    } catch (error) {
      console.error('Error showing timer completion notification:', error);
    }
  }, [settings]);

  // Show task reminder notification
  const showTaskReminder = useCallback(async (taskName: string) => {
    if (!settings.enabled || !settings.browserNotifications || !settings.taskReminders) {
      return;
    }

    try {
      await notificationService.showTaskReminder(taskName);
    } catch (error) {
      console.error('Error showing task reminder notification:', error);
    }
  }, [settings]);

  // Derived state
  const needsPermission = isSupported && !permissionGranted && !permissionDenied;
  const shouldShowPermissionPrompt = needsPermission && !settings.requestedPermission && settings.enabled;

  return {
    // Permission state
    isSupported,
    permissionGranted,
    permissionDenied,
    needsPermission,
    
    // Settings
    settings,
    updateSettings,
    
    // Actions
    requestPermission,
    showTimerComplete,
    showTaskReminder,
    
    // UI helpers
    shouldShowPermissionPrompt
  };
}