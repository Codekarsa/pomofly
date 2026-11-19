import React, { useState, useEffect, useCallback, useRef, memo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

type Settings = {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
};

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: Settings;
  onSave: (settings: Settings) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  event: (eventName: string, eventParams: Record<string, any>) => void;
}

const SettingsModal = memo(({ isOpen, onClose, settings, onSave, event }: SettingsModalProps) => {
  const [localSettings, setLocalSettings] = useState<{ [K in keyof Settings]: number | '' }>(settings);
  const openerRef = useRef<HTMLElement | null>(null);
  const labels: Record<keyof Settings, string> = {
    pomodoro: 'Focus duration (minutes)',
    shortBreak: 'Short break (minutes)',
    longBreak: 'Long break (minutes)',
    longBreakInterval: 'Long break after (focus sessions)',
  };

  useEffect(() => {
    if (isOpen) {
      setLocalSettings(settings);
    }
  }, [isOpen, settings]);

  useEffect(() => {
    if (isOpen) {
      event('settings_modal_opened', {
        initial_pomodoro: settings.pomodoro,
        initial_shortBreak: settings.shortBreak,
        initial_longBreak: settings.longBreak,
        initial_longBreakInterval: settings.longBreakInterval
      });
    }
  }, [isOpen, event, settings]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newValue = value === '' ? '' : parseInt(value, 10);
    setLocalSettings(prev => ({ ...prev, [name]: newValue }));
    event('setting_changed', { setting_name: name, new_value: newValue });
  }, [event]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const changesMade = JSON.stringify(localSettings) !== JSON.stringify(settings);
    if (changesMade) {
      onSave({
        pomodoro: Number(localSettings.pomodoro),
        shortBreak: Number(localSettings.shortBreak),
        longBreak: Number(localSettings.longBreak),
        longBreakInterval: Number(localSettings.longBreakInterval),
      });
      event('settings_saved', { 
        ...localSettings,
        changes_made: changesMade
      });
    }
    onClose();
  }, [localSettings, onSave, settings, event, onClose]);

  const handleDialogClose = useCallback(() => {
    const changesMade = JSON.stringify(localSettings) !== JSON.stringify(settings);
    onClose();
    event('settings_modal_closed', { changes_saved: false, changes_made: changesMade });
  }, [localSettings, onClose, settings, event]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); }}>
      <DialogContent
        aria-modal="true"
        className="w-[calc(100%-2rem)] max-w-md max-h-[90dvh] overflow-y-auto rounded-lg"
        onOpenAutoFocus={() => { openerRef.current = document.activeElement as HTMLElement; }}
        onCloseAutoFocus={(e) => { e.preventDefault(); openerRef.current?.focus(); }}
      >
        <DialogHeader>
          <DialogTitle>Timer Settings</DialogTitle>
          <DialogDescription>Alternate focus sessions with short breaks. Saving changes resets the current timer.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {Object.entries(localSettings).map(([key, value]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>
                  {labels[key as keyof Settings]}
                </Label>
                <Input
                  id={key}
                  name={key}
                  type="number"
                  value={value.toString()}
                  onChange={handleChange}
                  min="1"
                  required
                />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={handleDialogClose}>
              Cancel
            </Button>
            <Button type="submit">Save changes</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
});

SettingsModal.displayName = 'SettingsModal';

export default SettingsModal;
