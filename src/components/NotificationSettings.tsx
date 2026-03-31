import React, { useState } from 'react'
import { useNotificationManager } from '@/lib/notification-manager'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Bell, BellOff, Volume2, VolumeX, Shield, Clock, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export interface NotificationSettingsProps {
  className?: string
}

export default function NotificationSettings({ className }: NotificationSettingsProps) {
  const {
    preferences,
    stats,
    updatePreferences,
    requestPermission,
    showNotification,
  } = useNotificationManager()

  const [isRequesting, setIsRequesting] = useState(false)
  const [testingNotification, setTestingNotification] = useState(false)

  // Handle permission request
  const handleRequestPermission = async () => {
    setIsRequesting(true)
    try {
      const result = await requestPermission('settings')
      if (result === 'granted') {
        // Show a welcome notification
        await showNotification('🎉 Notifications Enabled!', {
          body: 'You\'ll now receive helpful timer and task notifications.',
          priority: 'normal',
        })
      }
    } catch (error) {
      console.error('Failed to request permission:', error)
    } finally {
      setIsRequesting(false)
    }
  }

  // Test notification
  const handleTestNotification = async () => {
    setTestingNotification(true)
    try {
      await showNotification('🧪 Test Notification', {
        body: 'This is how your Pomofly notifications will look!',
        priority: 'normal',
      })
    } catch (error) {
      console.error('Failed to show test notification:', error)
    } finally {
      setTimeout(() => setTestingNotification(false), 2000)
    }
  }

  // Permission status info
  const getPermissionInfo = () => {
    switch (stats.permission) {
      case 'granted':
        return {
          icon: <CheckCircle className="h-4 w-4 text-green-600" />,
          text: 'Notifications enabled',
          variant: 'default' as const,
          description: 'You\'ll receive browser notifications for timer events.',
        }
      case 'denied':
        return {
          icon: <BellOff className="h-4 w-4 text-red-600" />,
          text: 'Notifications blocked',
          variant: 'destructive' as const,
          description: stats.daysSinceLastDenial !== undefined
            ? `Permission was denied ${stats.daysSinceLastDenial} day${stats.daysSinceLastDenial === 1 ? '' : 's'} ago. ${stats.canRequest ? 'You can try again now.' : `Try again in ${Math.max(0, preferences.retryAfterDenial - stats.daysSinceLastDenial)} days.`}`
            : 'Browser notifications are blocked. You can enable them in your browser settings or try again.',
        }
      default:
        return {
          icon: <Bell className="h-4 w-4 text-yellow-600" />,
          text: 'Permission not requested',
          variant: 'secondary' as const,
          description: 'Click "Enable Notifications" to receive timer alerts.',
        }
    }
  }

  const permissionInfo = getPermissionInfo()

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Permission Status */}
          <Alert variant={permissionInfo.variant}>
            <div className="flex items-start gap-2">
              {permissionInfo.icon}
              <div className="flex-1">
                <div className="font-medium">{permissionInfo.text}</div>
                <AlertDescription className="mt-1">
                  {permissionInfo.description}
                </AlertDescription>
              </div>
            </div>
          </Alert>

          {/* Permission Request Button */}
          {(stats.permission === 'default' || (stats.permission === 'denied' && stats.canRequest)) && (
            <div className="flex gap-2">
              <Button 
                onClick={handleRequestPermission} 
                disabled={isRequesting}
                variant="default"
              >
                {isRequesting ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  <>
                    <Bell className="h-4 w-4 mr-2" />
                    Enable Notifications
                  </>
                )}
              </Button>
              
              {stats.permission === 'granted' && (
                <Button 
                  onClick={handleTestNotification} 
                  disabled={testingNotification}
                  variant="outline"
                >
                  {testingNotification ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    'Test Notification'
                  )}
                </Button>
              )}
            </div>
          )}

          {/* Fallback Info */}
          {stats.permission !== 'granted' && stats.fallbacksAvailable && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Don't worry! Even without browser notifications, you'll still get visual and audio alerts when timers complete.
              </AlertDescription>
            </Alert>
          )}

          {/* Master Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium">Enable Notifications</label>
              <p className="text-xs text-muted-foreground">
                Master switch for all notification types
              </p>
            </div>
            <Switch
              checked={preferences.enabled}
              onCheckedChange={(enabled) => updatePreferences({ enabled })}
            />
          </div>

          {/* Notification Types */}
          {preferences.enabled && (
            <>
              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-medium">Notification Types</h4>
                
                <div className="space-y-3">
                  {/* Timer Completions */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm">Timer Completions</label>
                      <p className="text-xs text-muted-foreground">
                        Notify when work sessions and breaks end
                      </p>
                    </div>
                    <Switch
                      checked={preferences.timerCompletions}
                      onCheckedChange={(timerCompletions) => updatePreferences({ timerCompletions })}
                    />
                  </div>

                  {/* Break Reminders */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm">Break Reminders</label>
                      <p className="text-xs text-muted-foreground">
                        Remind you when breaks are ending
                      </p>
                    </div>
                    <Switch
                      checked={preferences.breakReminders}
                      onCheckedChange={(breakReminders) => updatePreferences({ breakReminders })}
                    />
                  </div>

                  {/* Task Reminders */}
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-sm">Task Reminders</label>
                      <p className="text-xs text-muted-foreground">
                        Occasional reminders about incomplete tasks
                      </p>
                    </div>
                    <Switch
                      checked={preferences.taskReminders}
                      onCheckedChange={(taskReminders) => updatePreferences({ taskReminders })}
                    />
                  </div>
                </div>
              </div>

              {/* Sound Settings */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-sm font-medium">Sound Notifications</label>
                    <p className="text-xs text-muted-foreground">
                      Audio alerts for better notification awareness
                    </p>
                  </div>
                  <Switch
                    checked={preferences.soundEnabled}
                    onCheckedChange={(soundEnabled) => updatePreferences({ soundEnabled })}
                  />
                </div>

                {/* Volume Slider */}
                {preferences.soundEnabled && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm">Volume</label>
                      <span className="text-xs text-muted-foreground">
                        {Math.round(preferences.volume * 100)}%
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <VolumeX className="h-4 w-4 text-muted-foreground" />
                      <input
                        type="range"
                        value={preferences.volume}
                        onChange={(e) => updatePreferences({ volume: parseFloat(e.target.value) })}
                        max={1}
                        min={0}
                        step={0.1}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                      />
                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Advanced Settings */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="text-sm font-medium">Advanced</h4>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Retry after denial</span>
                <Badge variant="secondary">{preferences.retryAfterDenial} days</Badge>
              </div>
              
              {stats.daysSinceLastRequest !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Last request</span>
                  <Badge variant="outline">{stats.daysSinceLastRequest} days ago</Badge>
                </div>
              )}
            </div>
          </div>

          {/* Browser Settings Help */}
          {stats.permission === 'denied' && (
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription>
                <strong>Need to enable notifications manually?</strong><br />
                Look for a bell or lock icon in your browser's address bar, or check your browser's notification settings.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  )
}