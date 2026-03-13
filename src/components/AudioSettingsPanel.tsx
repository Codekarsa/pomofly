import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Volume2, VolumeX, Play, RotateCcw } from 'lucide-react';
import { useAudioNotifications, type AudioSettings, type NotificationType } from '@/hooks/useAudioNotifications';

interface AudioSettingsPanelProps {
  className?: string;
}

const AudioSettingsPanel: React.FC<AudioSettingsPanelProps> = ({ className }) => {
  const {
    settings,
    previewSound,
    updateSetting,
    resetToDefaults,
    soundOptions,
  } = useAudioNotifications();

  const [isPlaying, setIsPlaying] = useState<string | null>(null);

  const handlePreviewSound = (soundType: string) => {
    setIsPlaying(soundType);
    previewSound(soundType);
    // Clear the playing state after a short delay
    setTimeout(() => setIsPlaying(null), 1000);
  };

  const handleVolumeChange = (value: number[]) => {
    updateSetting('volume', value[0]);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Volume2 className="h-5 w-5" />
          Audio Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Audio */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="audio-enabled" className="text-sm font-medium">
              Enable sound notifications
            </Label>
            <p className="text-xs text-muted-foreground">
              Play sounds when timer sessions complete
            </p>
          </div>
          <Switch
            id="audio-enabled"
            checked={settings.enabled}
            onCheckedChange={(checked) => updateSetting('enabled', checked)}
          />
        </div>

        {settings.enabled && (
          <>
            {/* Volume Control */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Volume</Label>
                <div className="flex items-center gap-2">
                  <VolumeX className="h-4 w-4" />
                  <span className="text-sm text-muted-foreground min-w-[3ch]">
                    {Math.round(settings.volume * 100)}%
                  </span>
                  <Volume2 className="h-4 w-4" />
                </div>
              </div>
              <Slider
                value={[settings.volume]}
                min={0}
                max={1}
                step={0.1}
                onValueChange={handleVolumeChange}
                className="w-full"
              />
            </div>

            {/* Work Complete Sound */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Work session complete</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreviewSound(settings.workCompleteSound)}
                  disabled={isPlaying === settings.workCompleteSound}
                  className="h-8 px-2"
                >
                  <Play className="h-3 w-3" />
                </Button>
              </div>
              <Select
                value={settings.workCompleteSound}
                onValueChange={(value) => updateSetting('workCompleteSound', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {soundOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Break Complete Sound */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Break complete</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePreviewSound(settings.breakCompleteSound)}
                  disabled={isPlaying === settings.breakCompleteSound}
                  className="h-8 px-2"
                >
                  <Play className="h-3 w-3" />
                </Button>
              </div>
              <Select
                value={settings.breakCompleteSound}
                onValueChange={(value) => updateSetting('breakCompleteSound', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {soundOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Reset to Defaults */}
            <div className="pt-2 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={resetToDefaults}
                className="w-full"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset to Defaults
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default AudioSettingsPanel;