import React, { useState, useEffect } from 'react';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    pomodoro: number;
    shortBreak: number;
    longBreak: number;
    longBreakInterval: number;
  };
  onSave: (settings: {
    pomodoro: number;
    shortBreak: number;
    longBreak: number;
    longBreakInterval: number;
  }) => void;
}

export default function SettingsModal({ isOpen, onClose, settings, onSave }: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState(settings);
  const { event } = useGoogleAnalytics();

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

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const newValue = parseInt(value);
    setLocalSettings(prev => ({ ...prev, [name]: newValue }));
    event('setting_changed', { setting_name: name, new_value: newValue });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const changesMade = JSON.stringify(localSettings) !== JSON.stringify(settings);
    onSave(localSettings);
    event('settings_saved', { 
      pomodoro: localSettings.pomodoro,
      shortBreak: localSettings.shortBreak,
      longBreak: localSettings.longBreak,
      longBreakInterval: localSettings.longBreakInterval,
      changes_made: changesMade
    });
  };

  const handleClose = () => {
    const changesMade = JSON.stringify(localSettings) !== JSON.stringify(settings);
    onClose();
    event('settings_modal_closed', { changes_saved: false, changes_made: changesMade });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center">
      <div className="bg-[#f2f2f2] p-6 rounded-lg">
        <h2 className="text-2xl font-bold mb-4 text-[#1A1A1A]">Settings</h2>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="pomodoro" className="block text-sm font-medium text-gray-700">Pomodoro (minutes)</label>
              <input
                type="number"
                id="pomodoro"
                name="pomodoro"
                value={localSettings.pomodoro}
                onChange={handleChange}
                className="mt-1 text-[#1A1A1A] block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2"
              />
            </div>
            <div>
              <label htmlFor="shortBreak" className="block text-sm font-medium text-gray-700">Short Break (minutes)</label>
              <input
                type="number"
                id="shortBreak"
                name="shortBreak"
                value={localSettings.shortBreak}
                onChange={handleChange}
                className="mt-1 text-[#1A1A1A] block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2"
              />
            </div>
            <div>
              <label htmlFor="longBreak" className="block text-sm font-medium text-gray-700">Long Break (minutes)</label>
              <input
                type="number"
                id="longBreak"
                name="longBreak"
                value={localSettings.longBreak}
                onChange={handleChange}
                className="mt-1 text-[#1A1A1A] block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2"
              />
            </div>
            <div>
              <label htmlFor="longBreakInterval" className="block text-sm font-medium text-gray-700">Long Break Interval</label>
              <input
                type="number"
                id="longBreakInterval"
                name="longBreakInterval"
                value={localSettings.longBreakInterval}
                onChange={handleChange}
                className="mt-1 text-[#1A1A1A] block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 p-2"
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button 
              type="button" 
              onClick={handleClose} 
              className="mr-2 px-4 py-2 bg-gray-200 text-gray-800 rounded"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-[#333333] text-white rounded"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}