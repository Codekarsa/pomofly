/**
 * Browser notification service for timer completion alerts
 */

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  silent?: boolean;
}

export interface NotificationPermissionResult {
  granted: boolean;
  denied: boolean;
  prompt: boolean;
}

export class NotificationService {
  private static instance: NotificationService | null = null;

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  /**
   * Check if notifications are supported in the current browser
   */
  isSupported(): boolean {
    return 'Notification' in window;
  }

  /**
   * Get current permission status
   */
  getPermissionStatus(): NotificationPermissionResult {
    if (!this.isSupported()) {
      return { granted: false, denied: true, prompt: false };
    }

    const permission = Notification.permission;
    return {
      granted: permission === 'granted',
      denied: permission === 'denied',
      prompt: permission === 'default'
    };
  }

  /**
   * Request notification permission from the user
   */
  async requestPermission(): Promise<NotificationPermissionResult> {
    if (!this.isSupported()) {
      return { granted: false, denied: true, prompt: false };
    }

    try {
      const permission = await Notification.requestPermission();
      return {
        granted: permission === 'granted',
        denied: permission === 'denied',
        prompt: permission === 'default'
      };
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return { granted: false, denied: true, prompt: false };
    }
  }

  /**
   * Show a notification if permission is granted
   */
  async showNotification(options: NotificationOptions): Promise<Notification | null> {
    const permissionStatus = this.getPermissionStatus();
    
    if (!permissionStatus.granted) {
      console.warn('Notification permission not granted. Current status:', Notification.permission);
      return null;
    }

    try {
      const notification = new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/favicon.ico',
        tag: options.tag,
        silent: options.silent || false,
        requireInteraction: true, // Keep notification until user interacts
      });

      // Auto-close notification after 8 seconds
      setTimeout(() => {
        notification.close();
      }, 8000);

      return notification;
    } catch (error) {
      console.error('Error showing notification:', error);
      return null;
    }
  }

  /**
   * Show timer completion notification
   */
  async showTimerComplete(phase: 'pomodoro' | 'shortBreak' | 'longBreak', nextPhase?: string): Promise<Notification | null> {
    const messages = {
      pomodoro: {
        title: '🍅 Pomodoro Complete!',
        body: nextPhase ? `Time for a ${nextPhase.replace('Break', ' break')}!` : 'Great work! Time for a break!'
      },
      shortBreak: {
        title: '☕ Short Break Complete!',
        body: 'Break time is over. Ready for another Pomodoro?'
      },
      longBreak: {
        title: '🎉 Long Break Complete!',
        body: 'Refreshed and ready! Time to start a new Pomodoro cycle.'
      }
    };

    const message = messages[phase];
    return this.showNotification({
      title: message.title,
      body: message.body,
      tag: `timer-${phase}-complete`,
      icon: '/favicon.ico'
    });
  }

  /**
   * Show task reminder notification
   */
  async showTaskReminder(taskName: string): Promise<Notification | null> {
    return this.showNotification({
      title: '📝 Task Reminder',
      body: `Don't forget: ${taskName}`,
      tag: 'task-reminder',
      icon: '/favicon.ico'
    });
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();

// Storage keys for notification preferences
export const NOTIFICATION_SETTINGS_KEY = 'pomodoroNotificationSettings';

export interface NotificationSettings {
  enabled: boolean;
  browserNotifications: boolean;
  pomodoroComplete: boolean;
  breakComplete: boolean;
  taskReminders: boolean;
  requestedPermission: boolean;
}

export const defaultNotificationSettings: NotificationSettings = {
  enabled: true,
  browserNotifications: true,
  pomodoroComplete: true,
  breakComplete: true,
  taskReminders: false,
  requestedPermission: false
};

/**
 * Get notification settings from localStorage
 */
export function getNotificationSettings(): NotificationSettings {
  if (typeof window === 'undefined') {
    return defaultNotificationSettings;
  }

  try {
    const stored = localStorage.getItem(NOTIFICATION_SETTINGS_KEY);
    if (stored) {
      return { ...defaultNotificationSettings, ...JSON.parse(stored) };
    }
  } catch (error) {
    console.error('Error reading notification settings:', error);
  }

  return defaultNotificationSettings;
}

/**
 * Save notification settings to localStorage
 */
export function saveNotificationSettings(settings: NotificationSettings): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(NOTIFICATION_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving notification settings:', error);
  }
}