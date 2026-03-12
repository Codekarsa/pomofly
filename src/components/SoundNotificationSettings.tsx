'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Volume2, VolumeX, Play, TestTube, Bell } from 'lucide-react';
import { 
  getSoundSettings, 
  updateSoundSettings, 
  previewNotificationSound,
  requestNotificationPermission,
  NOTIFICATION_SOUNDS,
  type SoundSettings 
} from '@/utils/sound-notifications';

interface SoundNotificationSettingsProps {
  onSettingsChange?: (settings: SoundSettings) => void;
}

export default function SoundNotificationSettings({ onSettingsChange }: SoundNotificationSettingsProps) {
  const [settings, setSettings] = useState<SoundSettings>(() => getSoundSettings());
  const [isTestingAudio, setIsTestingAudio] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>('default');

  // Check notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setNotificationPermission(Notification.permission);
    }
  }, []);

  // Load settings on mount
  useEffect(() => {
    const currentSettings = getSoundSettings();
    setSettings(currentSettings);
  }, []);

  const handleSettingChange = useCallback((key: keyof SoundSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateSoundSettings({ [key]: value });
    onSettingsChange?.(newSettings);
  }, [settings, onSettingsChange]);

  const handleVolumeChange = useCallback((value: number[]) => {
    const volume = value[0];
    handleSettingChange('volume', volume);
  }, [handleSettingChange]);

  const previewSound = useCallback(async (soundName: string) => {
    if (isTestingAudio) return;
    
    setIsTestingAudio(true);
    try {
      await previewNotificationSound(soundName);
    } catch (error) {
      console.warn('Failed to preview sound:', error);
    } finally {
      // Reset after a delay to prevent rapid clicking
      setTimeout(() => setIsTestingAudio(false), 1000);
    }
  }, [isTestingAudio]);

  const testNotificationSystem = useCallback(async () => {
    if (isTestingAudio) return;

    setIsTestingAudio(true);
    try {
      // Test work session sound
      await previewNotificationSound(settings.workSessionSound);
      
      // Wait and test break session sound
      setTimeout(async () => {
        try {
          await previewNotificationSound(settings.breakSessionSound);
        } catch (error) {
          console.warn('Failed to test break sound:', error);
        } finally {
          setIsTestingAudio(false);
        }
      }, 1500);
    } catch (error) {
      console.warn('Failed to test notification system:', error);
      setIsTestingAudio(false);
    }
  }, [settings, isTestingAudio]);

  const requestPermission = useCallback(async () => {
    try {
      const granted = await requestNotificationPermission();
      if (granted) {
        setNotificationPermission('granted');
      } else {
        setNotificationPermission('denied');
      }
    } catch (error) {
      console.warn('Failed to request notification permission:', error);
    }
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Sound Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Sounds */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label className="text-base font-medium">Enable Sound Notifications</Label>
            <p className="text-sm text-muted-foreground">
              Play audio alerts when timer sessions complete
            </p>
          </div>
          <Switch
            checked={settings.enabled}
            onCheckedChange={(enabled) => handleSettingChange('enabled', enabled)}
          />
        </div>

        {settings.enabled && (
          <>
            {/* Volume Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium flex items-center gap-2">
                  {settings.volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  Volume
                </Label>
                <span className="text-sm text-muted-foreground">
                  {Math.round(settings.volume * 100)}%
                </span>
              </div>
              <Slider
                value={[settings.volume]}
                onValueChange={handleVolumeChange}
                min={0}
                max={1}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Work Session Sound */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Work Session Completion Sound</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={settings.workSessionSound}
                  onValueChange={(value) => handleSettingChange('workSessionSound', value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a sound" />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_SOUNDS.map((sound) => (
                      <SelectItem key={sound.name} value={sound.name}>
                        {sound.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => previewSound(settings.workSessionSound)}
                  disabled={isTestingAudio}
                  title="Preview sound"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Break Session Sound */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Break Session Completion Sound</Label>
              <div className="flex items-center gap-2">
                <Select
                  value={settings.breakSessionSound}
                  onValueChange={(value) => handleSettingChange('breakSessionSound', value)}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a sound" />
                  </SelectTrigger>
                  <SelectContent>
                    {NOTIFICATION_SOUNDS.map((sound) => (
                      <SelectItem key={sound.name} value={sound.name}>
                        {sound.description}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => previewSound(settings.breakSessionSound)}
                  disabled={isTestingAudio}
                  title="Preview sound"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Test System */}
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="space-y-0.5">
                <Label className="text-base font-medium">Test Notification System</Label>
                <p className="text-sm text-muted-foreground">
                  Preview both work and break completion sounds
                </p>
              </div>
              <Button
                variant="outline"
                onClick={testNotificationSystem}
                disabled={isTestingAudio}
                className="flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                {isTestingAudio ? 'Testing...' : 'Test Sounds'}
              </Button>
            </div>
          </>
        )}

        {/* Browser Notification Permission */}
        {typeof window !== 'undefined' && 'Notification' in window && (
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-base font-medium">Browser Notifications</Label>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <p className="text-sm text-muted-foreground">
                  Fallback notifications when audio is unavailable
                </p>
                <p className="text-xs text-muted-foreground">
                  Status: {
                    notificationPermission === 'granted' ? 'Allowed' :
                    notificationPermission === 'denied' ? 'Blocked' : 'Not requested'
                  }
                </p>
              </div>
              {notificationPermission !== 'granted' && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={requestPermission}
                >
                  {notificationPermission === 'denied' ? 'Blocked' : 'Enable'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Info Section */}
        <div className="bg-muted p-4 rounded-lg space-y-2">
          <h4 className="font-medium text-sm">How it works:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Different sounds for work sessions and breaks</li>
            <li>• Audio plays automatically when timer completes</li>
            <li>• Falls back to browser notifications if audio fails</li>
            <li>• Respects browser autoplay policies</li>
            <li>• Works offline once sounds are cached</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}