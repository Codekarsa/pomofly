import React from 'react';

interface SettingsProps {
  settings: {
    pomodoro: number;
    shortBreak: number;
    longBreak: number;
    longBreakInterval: number;
  };
  setSettings: React.Dispatch<React.SetStateAction<{
    pomodoro: number;
    shortBreak: number;
    longBreak: number;
    longBreakInterval: number;
  }>>;
}

export default function Settings({ settings, setSettings }: SettingsProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings(prev => ({ ...prev, [name]: parseInt(value) }));
  };

  return (
    <div className="mt-4">
      <h3 className="text-xl font-bold mb-2">Settings</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="pomodoro" className="block text-sm font-medium text-gray-700">Pomodoro (minutes)</label>
          <input
            type="number"
            id="pomodoro"
            name="pomodoro"
            value={settings.pomodoro}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label htmlFor="shortBreak" className="block text-sm font-medium text-gray-700">Short Break (minutes)</label>
          <input
            type="number"
            id="shortBreak"
            name="shortBreak"
            value={settings.shortBreak}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label htmlFor="longBreak" className="block text-sm font-medium text-gray-700">Long Break (minutes)</label>
          <input
            type="number"
            id="longBreak"
            name="longBreak"
            value={settings.longBreak}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <div>
          <label htmlFor="longBreakInterval" className="block text-sm font-medium text-gray-700">Long Break Interval</label>
          <input
            type="number"
            id="longBreakInterval"
            name="longBreakInterval"
            value={settings.longBreakInterval}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
      </div>
    </div>
  );
}
