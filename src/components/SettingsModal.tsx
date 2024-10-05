import React, { useState, useEffect, useCallback, memo } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
  const [localSettings, setLocalSettings] = useState<Settings>(settings);

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
    const newValue = value === '' ? 1 : Math.max(1, parseInt(value, 10));
    setLocalSettings(prev => ({ ...prev, [name]: newValue }));
    event('setting_changed', { setting_name: name, new_value: newValue });
  }, [event]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const changesMade = JSON.stringify(localSettings) !== JSON.stringify(settings);
    if (changesMade) {
      onSave(localSettings);
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Timer Settings</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {Object.entries(localSettings).map(([key, value]) => (
              <div key={key} className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor={key} className="text-right capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </Label>
                <Input
                  id={key}
                  name={key}
                  type="number"
                  value={value.toString()}
                  onChange={handleChange}
                  className="col-span-3"
                  min="1"
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
      </div>
    </div>
  );
});

SettingsModal.displayName = 'SettingsModal';

export default SettingsModal;