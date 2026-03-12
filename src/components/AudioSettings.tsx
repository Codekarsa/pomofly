'use client'
import React from 'react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Volume2, VolumeX, Play } from 'lucide-react';
import { AudioSettings as AudioSettingsType, NotificationSound, useAudioNotifications } from '@/hooks/useAudioNotifications';

interface AudioSettingsProps {
  settings: AudioSettingsType;
  onSettingsChange: (settings: Partial<AudioSettingsType>) => void;
  onPreviewSound: (sound: NotificationSound) => void;
}

const AudioSettings: React.FC<AudioSettingsProps> = ({ 
  settings, 
  onSettingsChange, 
  onPreviewSound 
}) => {
  const soundOptions: { value: NotificationSound; label: string; description: string }[] = [
    { value: 'bell', label: 'Bell', description: 'Classic bell tone' },
    { value: 'chime', label: 'Chime', description: 'Soft melodic chime' },
    { value: 'ding', label: 'Ding', description: 'Short, crisp ding' },
    { value: 'pop', label: 'Pop', description: 'Quick burst sound' },
    { value: 'soft', label: 'Soft', description: 'Gentle, quiet tone' },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-foreground">Audio Notifications</h3>
        
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {settings.enabled ? (
              <Volume2 className="h-5 w-5 text-muted-foreground" />
            ) : (
              <VolumeX className="h-5 w-5 text-muted-foreground" />
            )}
            <Label htmlFor="audio-enabled" className="text-sm font-medium">
              Enable sound notifications
            </Label>
          </div>
          <Switch
            id="audio-enabled"
            checked={settings.enabled}
            onCheckedChange={(enabled) => onSettingsChange({ enabled })}
          />
        </div>

        {settings.enabled && (
          <>
            {/* Volume Control */}
            <div className="space-y-2">
              <Label htmlFor="volume" className="text-sm font-medium">
                Volume: {Math.round(settings.volume * 100)}%
              </Label>
              <input
                id="volume"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.volume}
                onChange={(e) => onSettingsChange({ volume: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>

            {/* Work Session Sound */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Work session completed</Label>
              <div className="flex items-center space-x-2">
                <Select
                  value={settings.workSound}
                  onValueChange={(value: NotificationSound) => 
                    onSettingsChange({ workSound: value })
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {soundOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onPreviewSound(settings.workSound)}
                  className="px-3"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Break Session Sound */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Break completed</Label>
              <div className="flex items-center space-x-2">
                <Select
                  value={settings.breakSound}
                  onValueChange={(value: NotificationSound) => 
                    onSettingsChange({ breakSound: value })
                  }
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {soundOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {option.description}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onPreviewSound(settings.breakSound)}
                  className="px-3"
                >
                  <Play className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AudioSettings;