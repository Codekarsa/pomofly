import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Clock, Globe, MapPin, RefreshCw } from 'lucide-react';
import {
  UserTimezoneManager,
  getBrowserTimezone,
  getTimezoneInfo,
  formatInUserTimezone,
  COMMON_TIMEZONES,
  getAllTimezones,
  isValidTimezone,
  type UserTimezoneSettings,
} from '@/lib/timezone';

interface TimezoneSettingsProps {
  onTimezoneChange?: (timezone: string) => void;
  className?: string;
}

export const TimezoneSettings: React.FC<TimezoneSettingsProps> = ({ 
  onTimezoneChange,
  className = '' 
}) => {
  const [settings, setSettings] = useState<UserTimezoneSettings>(
    UserTimezoneManager.getSettings()
  );
  const [currentTime, setCurrentTime] = useState<string>('');
  const [timezoneInfo, setTimezoneInfo] = useState(getTimezoneInfo(settings.timezone));
  const [showAllTimezones, setShowAllTimezones] = useState(false);
  
  // Update current time every second
  useEffect(() => {
    const updateTime = () => {
      const formattedTime = formatInUserTimezone(
        Date.now(),
        'yyyy-MM-dd HH:mm:ss',
        settings.timezone
      );
      setCurrentTime(formattedTime);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [settings.timezone]);

  // Update timezone info when timezone changes
  useEffect(() => {
    setTimezoneInfo(getTimezoneInfo(settings.timezone));
  }, [settings.timezone]);

  const handleTimezoneChange = (newTimezone: string) => {
    if (!isValidTimezone(newTimezone)) {
      console.warn('Invalid timezone selected:', newTimezone);
      return;
    }

    UserTimezoneManager.setTimezone(newTimezone);
    const newSettings = UserTimezoneManager.getSettings();
    setSettings(newSettings);
    onTimezoneChange?.(newTimezone);
  };

  const handleAutoDetectToggle = (enabled: boolean) => {
    if (enabled) {
      UserTimezoneManager.enableAutoDetection();
    } else {
      // Keep current timezone but disable auto-detection
      UserTimezoneManager.setTimezone(settings.timezone);
    }
    const newSettings = UserTimezoneManager.getSettings();
    setSettings(newSettings);
    onTimezoneChange?.(newSettings.timezone);
  };

  const handleRefreshTimezone = () => {
    const browserTimezone = getBrowserTimezone();
    if (browserTimezone !== settings.timezone) {
      handleTimezoneChange(browserTimezone);
    }
  };

  const timezoneOptions = showAllTimezones ? getAllTimezones() : COMMON_TIMEZONES;

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="w-5 h-5" />
          Timezone Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Time Display */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span className="font-medium">Current Time</span>
          </div>
          <div className="text-right">
            <div className="font-mono text-lg">{currentTime}</div>
            <div className="text-sm text-muted-foreground">
              {timezoneInfo.abbreviation} (UTC{timezoneInfo.offset >= 0 ? '+' : ''}{(timezoneInfo.offset / 60).toFixed(1)})
              {timezoneInfo.isDST && <Badge variant="outline" className="ml-2 text-xs">DST</Badge>}
            </div>
          </div>
        </div>

        {/* Auto-detect Setting */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-detect">Auto-detect timezone</Label>
            <div className="text-sm text-muted-foreground">
              Automatically use your browser&apos;s timezone
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="auto-detect"
              checked={settings.autoDetect}
              onCheckedChange={handleAutoDetectToggle}
            />
            {settings.autoDetect && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshTimezone}
                className="p-1"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>

        {/* Manual Timezone Selection */}
        {!settings.autoDetect && (
          <div className="space-y-2">
            <Label htmlFor="timezone-select">Select Timezone</Label>
            <Select value={settings.timezone} onValueChange={handleTimezoneChange}>
              <SelectTrigger id="timezone-select">
                <SelectValue placeholder="Choose your timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezoneOptions.map(({ value, label }) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {/* Toggle for showing all timezones */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAllTimezones(!showAllTimezones)}
              className="text-xs"
            >
              {showAllTimezones ? 'Show common timezones' : 'Show all timezones'}
            </Button>
          </div>
        )}

        {/* Current Timezone Info */}
        <div className="p-3 border rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            <span className="font-medium">Current Timezone</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Zone:</span>
              <div className="font-mono">{settings.timezone}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Offset:</span>
              <div className="font-mono">
                UTC{timezoneInfo.offset >= 0 ? '+' : ''}{(timezoneInfo.offset / 60).toFixed(1)}
              </div>
            </div>
          </div>
          
          {settings.autoDetect && (
            <div className="text-xs text-muted-foreground">
              Detected from browser: {getBrowserTimezone()}
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="text-xs text-muted-foreground">
          <p className="mb-1">
            <strong>Why this matters:</strong> Proper timezone handling ensures your daily streaks, 
            session times, and productivity analytics are calculated correctly for your location.
          </p>
          <p>
            When working with teams, session times will be displayed in your local timezone 
            while maintaining accuracy for collaboration.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimezoneSettings;