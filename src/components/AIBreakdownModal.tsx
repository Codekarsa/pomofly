import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { useClaudeAI } from '@/hooks/useClaudeAI';
import { Checkbox } from './ui/checkbox';

interface PomodoroSettings {
    pomodoro: number;
    shortBreak: number;
    longBreak: number;
    longBreakInterval: number;
  }

interface AIBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tasks: { title: string; estimatedPomodoros: number }[]) => void;
  settings: PomodoroSettings;
}

export const AIBreakdownModal: React.FC<AIBreakdownModalProps> = ({ isOpen, onClose, onSave, settings }) => {
  const [description, setDescription] = useState('');
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [breakdownResult, setBreakdownResult] = useState<{ title: string; estimatedPomodoros: number }[] | null>(null);
  const { getTaskBreakdown, loading, error } = useClaudeAI();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await getTaskBreakdown(
        description,
        useCustomDates ? new Date(startDate) : undefined,
        useCustomDates ? new Date(endDate) : undefined,
        settings.pomodoro,
        settings.shortBreak,
        settings.longBreak
      );
      setBreakdownResult(result.tasks);
    } catch (err) {
      console.error('Failed to get task breakdown:', err);
    }
  };

  const handleSave = () => {
    if (breakdownResult) {
      onSave(breakdownResult);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Break Down Your Work with AI</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Work Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your complex task..."
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useCustomDates"
                checked={useCustomDates}
                onCheckedChange={(checked) => setUseCustomDates(checked as boolean)}
              />
              <Label htmlFor="useCustomDates">Use custom date range</Label>
            </div>
            {useCustomDates && (
              <>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={loading}>
              {loading ? 'Processing...' : 'Get Breakdown'}
            </Button>
          </DialogFooter>
        </form>
        {error && <p className="text-red-500 mt-2">{error}</p>}
        {breakdownResult && (
          <div className="mt-4">
            <h3 className="font-semibold mb-2">Task Breakdown:</h3>
            <ul className="list-disc pl-5">
              {breakdownResult.map((task, index) => (
                <li key={index}>
                  {task.title} ({task.estimatedPomodoros} pomodoros)
                </li>
              ))}
            </ul>
            <Button onClick={handleSave} className="mt-4">
              Save Breakdown
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};