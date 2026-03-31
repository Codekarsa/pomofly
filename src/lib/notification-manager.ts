// Notification Management System with intelligent retry and persistence

export type NotificationPermissionState = 'default' | 'granted' | 'denied'

export interface NotificationPreferences {
  enabled: boolean
  timerCompletions: boolean
  breakReminders: boolean
  taskReminders: boolean
  soundEnabled: boolean
  volume: number
  lastPermissionRequest?: string
  lastDenialTime?: string
  retryAfterDenial: number // days
}

export interface NotificationManagerOptions {
  retryDelayDays?: number
  maxRetries?: number
  fallbackEnabled?: boolean
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  timerCompletions: true,
  breakReminders: true,
  taskReminders: false,
  soundEnabled: true,
  volume: 0.7,
  retryAfterDenial: 7, // Wait 7 days before asking again
}

const STORAGE_KEY = 'pomofly-notification-preferences'
const PERMISSION_HISTORY_KEY = 'pomofly-notification-history'

export class NotificationManager {
  private preferences: NotificationPreferences
  private fallbackMethods: Array<() => void> = []
  private options: Required<NotificationManagerOptions>

  constructor(options: NotificationManagerOptions = {}) {
    this.options = {
      retryDelayDays: options.retryDelayDays || 7,
      maxRetries: options.maxRetries || 3,
      fallbackEnabled: options.fallbackEnabled ?? true,
    }
    
    this.preferences = this.loadPreferences()
    this.initializeFallbackMethods()
  }

  // Load preferences from localStorage
  private loadPreferences(): NotificationPreferences {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...DEFAULT_PREFERENCES, ...parsed }
      }
    } catch (error) {
      console.warn('Failed to load notification preferences:', error)
    }
    return { ...DEFAULT_PREFERENCES }
  }

  // Save preferences to localStorage
  private savePreferences(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.preferences))
    } catch (error) {
      console.warn('Failed to save notification preferences:', error)
    }
  }

  // Get current notification permission status
  getPermissionStatus(): NotificationPermissionState {
    if (!('Notification' in window)) {
      return 'denied'
    }
    return Notification.permission as NotificationPermissionState
  }

  // Check if we should ask for permission again
  shouldRequestPermission(): boolean {
    const permission = this.getPermissionStatus()
    
    // Already granted or not supported
    if (permission !== 'default' && permission !== 'denied') {
      return permission === 'default'
    }

    // If denied, check if enough time has passed
    if (permission === 'denied' && this.preferences.lastDenialTime) {
      const daysSinceDenial = (Date.now() - new Date(this.preferences.lastDenialTime).getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceDenial >= this.preferences.retryAfterDenial
    }

    // Check if we've asked too many times recently
    if (this.preferences.lastPermissionRequest) {
      const daysSinceRequest = (Date.now() - new Date(this.preferences.lastPermissionRequest).getTime()) / (1000 * 60 * 60 * 24)
      return daysSinceRequest >= 1 // Wait at least 1 day between requests
    }

    return permission === 'default'
  }

  // Request notification permission with intelligent retry
  async requestPermission(context?: string): Promise<NotificationPermissionState> {
    if (!('Notification' in window)) {
      console.log('Notifications not supported')
      return 'denied'
    }

    const currentPermission = this.getPermissionStatus()
    
    if (currentPermission === 'granted') {
      return 'granted'
    }

    if (!this.shouldRequestPermission()) {
      console.log('Permission request delayed due to recent denial or request')
      return currentPermission
    }

    try {
      // Update request timestamp
      this.preferences.lastPermissionRequest = new Date().toISOString()
      this.savePreferences()

      // Request permission
      const permission = await Notification.requestPermission()

      // Handle response
      if (permission === 'denied') {
        this.preferences.lastDenialTime = new Date().toISOString()
        console.log(`Notification permission denied${context ? ` in context: ${context}` : ''}`)
      } else if (permission === 'granted') {
        // Clear denial timestamp on grant
        delete this.preferences.lastDenialTime
        console.log(`Notification permission granted${context ? ` in context: ${context}` : ''}`)
      }

      this.savePreferences()
      return permission as NotificationPermissionState
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      return 'denied'
    }
  }

  // Show a notification with fallbacks
  async showNotification(title: string, options: NotificationOptions & { 
    fallback?: boolean
    priority?: 'low' | 'normal' | 'high'
  } = {}): Promise<void> {
    const { fallback = true, priority = 'normal', ...notificationOptions } = options

    // Check if notifications are enabled in preferences
    if (!this.preferences.enabled) {
      console.log('Notifications disabled in preferences')
      if (fallback && this.options.fallbackEnabled) {
        this.triggerFallbackNotification(title, options)
      }
      return
    }

    const permission = this.getPermissionStatus()

    if (permission === 'granted') {
      try {
        const notification = new Notification(title, {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-96x96.png',
          tag: 'pomofly-notification',
          renotify: true,
          requireInteraction: priority === 'high',
          ...notificationOptions,
        })

        // Auto-close after 8 seconds for non-critical notifications
        if (priority !== 'high') {
          setTimeout(() => {
            notification.close()
          }, 8000)
        }

        // Handle notification clicks
        notification.onclick = () => {
          window.focus()
          notification.close()
          if (options.onclick) {
            options.onclick.call(notification, new Event('click'))
          }
        }

        return
      } catch (error) {
        console.error('Failed to show notification:', error)
      }
    }

    // Use fallback methods if permission denied or error occurred
    if (fallback && this.options.fallbackEnabled) {
      this.triggerFallbackNotification(title, options)
    }
  }

  // Initialize fallback notification methods
  private initializeFallbackMethods(): void {
    // Document title notification
    this.fallbackMethods.push(() => {
      const originalTitle = document.title
      let flashCount = 0
      const maxFlashes = 6
      
      const flash = () => {
        document.title = flashCount % 2 === 0 ? '🔔 Pomofly - Timer Complete!' : originalTitle
        flashCount++
        
        if (flashCount < maxFlashes) {
          setTimeout(flash, 1000)
        } else {
          document.title = originalTitle
        }
      }
      
      flash()
    })

    // Favicon notification (if supported)
    this.fallbackMethods.push(() => {
      try {
        const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement
        if (link) {
          const originalHref = link.href
          link.href = '/icons/icon-notification.png' // Would need to create this
          setTimeout(() => {
            link.href = originalHref
          }, 3000)
        }
      } catch (error) {
        console.warn('Favicon notification failed:', error)
      }
    })

    // Visual flash notification
    this.fallbackMethods.push(() => {
      const flash = document.createElement('div')
      flash.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(59, 130, 246, 0.3);
        z-index: 10000;
        pointer-events: none;
        animation: flash 0.5s ease-in-out 3;
      `
      
      // Add flash animation CSS if not exists
      if (!document.querySelector('#flash-animation-style')) {
        const style = document.createElement('style')
        style.id = 'flash-animation-style'
        style.textContent = `
          @keyframes flash {
            0%, 100% { opacity: 0; }
            50% { opacity: 1; }
          }
        `
        document.head.appendChild(style)
      }
      
      document.body.appendChild(flash)
      setTimeout(() => {
        document.body.removeChild(flash)
      }, 1500)
    })
  }

  // Trigger fallback notification methods
  private triggerFallbackNotification(title: string, options: NotificationOptions): void {
    console.log(`Fallback notification: ${title}`)
    
    // Execute all fallback methods
    this.fallbackMethods.forEach(method => {
      try {
        method()
      } catch (error) {
        console.warn('Fallback notification method failed:', error)
      }
    })

    // Play sound if enabled and supported
    if (this.preferences.soundEnabled) {
      this.playNotificationSound()
    }
  }

  // Play notification sound
  private playNotificationSound(): void {
    try {
      // Create a simple notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.frequency.value = 800 // Hz
      gainNode.gain.value = this.preferences.volume * 0.1 // Keep volume low
      
      oscillator.start()
      oscillator.stop(audioContext.currentTime + 0.3) // 300ms beep
      
      // Clean up
      setTimeout(() => {
        audioContext.close()
      }, 1000)
    } catch (error) {
      console.warn('Failed to play notification sound:', error)
    }
  }

  // Update preferences
  updatePreferences(updates: Partial<NotificationPreferences>): void {
    this.preferences = { ...this.preferences, ...updates }
    this.savePreferences()
  }

  // Get current preferences
  getPreferences(): NotificationPreferences {
    return { ...this.preferences }
  }

  // Context-specific notification methods
  async notifyTimerComplete(phase: 'work' | 'shortBreak' | 'longBreak'): Promise<void> {
    if (!this.preferences.timerCompletions) return

    const messages = {
      work: {
        title: '🍅 Pomodoro Complete!',
        body: 'Great focus! Time for a well-deserved break.',
      },
      shortBreak: {
        title: '☕ Short Break Over',
        body: 'Refreshed and ready? Let\'s get back to work!',
      },
      longBreak: {
        title: '🎉 Long Break Complete',
        body: 'You\'ve earned this rest! Ready for another productive session?',
      },
    }

    const message = messages[phase]
    await this.showNotification(message.title, {
      body: message.body,
      priority: 'high',
      requireInteraction: true,
    })
  }

  async notifyBreakReminder(minutesLeft: number): Promise<void> {
    if (!this.preferences.breakReminders) return

    await this.showNotification(`⏰ Break ends in ${minutesLeft} minute${minutesLeft === 1 ? '' : 's'}`, {
      body: 'Get ready to return to your focused work session.',
      priority: 'normal',
    })
  }

  async notifyTaskReminder(taskTitle: string): Promise<void> {
    if (!this.preferences.taskReminders) return

    await this.showNotification(`📋 Task Reminder`, {
      body: `Don't forget: ${taskTitle}`,
      priority: 'normal',
    })
  }

  // Check if user has dismissed notifications recently (for smart prompting)
  hasRecentDismissal(days: number = 1): boolean {
    if (!this.preferences.lastDenialTime) return false
    
    const daysSinceDenial = (Date.now() - new Date(this.preferences.lastDenialTime).getTime()) / (1000 * 60 * 60 * 24)
    return daysSinceDenial < days
  }

  // Get notification statistics for settings UI
  getStats(): {
    permission: NotificationPermissionState
    canRequest: boolean
    fallbacksAvailable: boolean
    daysSinceLastDenial?: number
    daysSinceLastRequest?: number
  } {
    const permission = this.getPermissionStatus()
    const canRequest = this.shouldRequestPermission()
    
    let daysSinceLastDenial: number | undefined
    if (this.preferences.lastDenialTime) {
      daysSinceLastDenial = Math.floor((Date.now() - new Date(this.preferences.lastDenialTime).getTime()) / (1000 * 60 * 60 * 24))
    }

    let daysSinceLastRequest: number | undefined
    if (this.preferences.lastPermissionRequest) {
      daysSinceLastRequest = Math.floor((Date.now() - new Date(this.preferences.lastPermissionRequest).getTime()) / (1000 * 60 * 60 * 24))
    }

    return {
      permission,
      canRequest,
      fallbacksAvailable: this.options.fallbackEnabled,
      daysSinceLastDenial,
      daysSinceLastRequest,
    }
  }
}

// Global instance
export const notificationManager = new NotificationManager()

// React hook for using the notification manager
export function useNotificationManager() {
  const [preferences, setPreferences] = React.useState(notificationManager.getPreferences())
  const [stats, setStats] = React.useState(notificationManager.getStats())

  const updatePreferences = React.useCallback((updates: Partial<NotificationPreferences>) => {
    notificationManager.updatePreferences(updates)
    setPreferences(notificationManager.getPreferences())
    setStats(notificationManager.getStats())
  }, [])

  const requestPermission = React.useCallback(async (context?: string) => {
    const result = await notificationManager.requestPermission(context)
    setStats(notificationManager.getStats())
    return result
  }, [])

  const showNotification = React.useCallback(async (title: string, options?: NotificationOptions) => {
    await notificationManager.showNotification(title, options)
  }, [])

  React.useEffect(() => {
    // Refresh stats periodically
    const interval = setInterval(() => {
      setStats(notificationManager.getStats())
    }, 60000) // Every minute

    return () => clearInterval(interval)
  }, [])

  return {
    preferences,
    stats,
    updatePreferences,
    requestPermission,
    showNotification,
    notifyTimerComplete: notificationManager.notifyTimerComplete.bind(notificationManager),
    notifyBreakReminder: notificationManager.notifyBreakReminder.bind(notificationManager),
    notifyTaskReminder: notificationManager.notifyTaskReminder.bind(notificationManager),
  }
}

// Fix missing React import
import React from 'react'