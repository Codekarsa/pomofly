import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { useClaudeAI } from '@/hooks/useClaudeAI';
import { Checkbox } from './ui/checkbox';
import { Pencil, Trash2, X } from 'lucide-react';
import { Combobox } from './ui/combobox';
import { sanitizeTaskTitle } from '@/lib/security';

interface PomodoroSettings {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
}

interface Project {
  id: string;
  name: string;
}

interface AIBreakdownModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (tasks: { title: string; estimatedPomodoros: number }[], projectId: string) => void;
  settings: PomodoroSettings;
  projects: Project[]; 
}

export const AIBreakdownModal: React.FC<AIBreakdownModalProps> = ({ isOpen, onClose, onSave, settings, projects }) => {
  const [step, setStep] = useState<'input' | 'review'>('input');
  const [description, setDescription] = useState('');
  const [useCustomDates, setUseCustomDates] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [breakdownResult, setBreakdownResult] = useState<{ title: string; estimatedPomodoros: number }[] | null>(null);
  const { getTaskBreakdown, loading, error } = useClaudeAI();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  
  const [pomodoroDuration, setPomodoroDuration] = useState(settings.pomodoro);
  const [shortBreakDuration, setShortBreakDuration] = useState(settings.shortBreak);
  const [longBreakDuration, setLongBreakDuration] = useState(settings.longBreak);
  
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      const result = await getTaskBreakdown(
        description,
        useCustomDates ? new Date(startDate) : undefined,
        useCustomDates ? new Date(endDate) : undefined,
        pomodoroDuration,
        shortBreakDuration,
        longBreakDuration
      );
      setBreakdownResult(result.tasks);
      setStep('review');
    } catch (err) {
      console.error('Failed to get task breakdown:', err);
    }
  };

  const handleRefine = async () => {
    const refinedDescription = `${description}\n\nPrevious breakdown:\n${breakdownResult?.map(t => `- ${t.title} (${t.estimatedPomodoros} pomodoros)`).join('\n')}\n\nPlease refine this breakdown - make it more granular or adjust estimates.`;
    setDescription(refinedDescription);
    await handleSubmit();
  };

  const handleSave = () => {
    if (breakdownResult && selectedProject) {
      onSave(breakdownResult, selectedProject);
      handleClose();
    }
  };

  const handleClose = () => {
    setStep('input');
    setBreakdownResult(null);
    setDescription('');
    setUseCustomDates(false);
    setStartDate('');
    setEndDate('');
    setEditingIndex(null);
    setSelectedProject(null);
    onClose();
  };

  const handleEditTask = (index: number) => {
    setEditingIndex(index);
  };

  const handleTaskChange = (index: number, field: 'title' | 'estimatedPomodoros', value: string) => {
    if (!Array.isArray(breakdownResult)) return;
    const newTasks = [...breakdownResult];
    if (field === 'title') {
      // Sanitize task title input to prevent XSS
      const sanitizedTitle = sanitizeTaskTitle(value);
      newTasks[index].title = sanitizedTitle;
    } else {
      const numValue = parseInt(value, 10);
      // Validate estimated pomodoros range
      newTasks[index].estimatedPomodoros = Math.max(1, Math.min(100, isNaN(numValue) ? 1 : numValue));
    }
    setBreakdownResult(newTasks);
  };

  const handleDeleteTask = (index: number) => {
    if (!Array.isArray(breakdownResult)) return;
    const newTasks = breakdownResult.filter((_, i) => i !== index);
    setBreakdownResult(newTasks);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Break Down Your Work with AI</DialogTitle>
        </DialogHeader>
        
        {step === 'input' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">What do you need to accomplish?</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => {
                  const value = e.target.value;
                  // Limit input length and prevent basic XSS patterns
                  if (value.length <= 2000 && !/<script|javascript:|vbscript:|on\w+=/i.test(value)) {
                    setDescription(value);
                  }
                }}
                placeholder="Describe your complex task (max 2000 characters)..."
                required
                maxLength={2000}
                className="min-h-[100px] resize-none"
                rows={3}
                autoFocus
              />
              <div className="text-sm text-muted-foreground mt-1">
                {description.length}/2000 characters
              </div>
            </div>
            
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Advanced options
              </summary>
              <div className="mt-3 space-y-3 pl-2 border-l-2">
                <div>
                  <Label htmlFor="projectSelect">Select Project</Label>
                  <Combobox
                    options={projects.map(project => ({ value: project.id, label: project.name }))}
                    value={selectedProject || ''}
                    onChange={(value) => setSelectedProject(value)}
                    placeholder="Select a project"
                  />
                </div>
                
                <div className="flex space-x-4">
                  <div className="flex-1">
                    <Label htmlFor="pomodoroDuration">Pomodoro Duration (minutes)</Label>
                    <Input
                      id="pomodoroDuration"
                      type="number"
                      value={pomodoroDuration}
                      onChange={(e) => setPomodoroDuration(parseInt(e.target.value, 10) || 1)}
                      min="1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="shortBreakDuration">Short Break Duration (minutes)</Label>
                    <Input
                      id="shortBreakDuration"
                      type="number"
                      value={shortBreakDuration}
                      onChange={(e) => setShortBreakDuration(parseInt(e.target.value, 10) || 1)}
                      min="1"
                    />
                  </div>
                  <div className="flex-1">
                    <Label htmlFor="longBreakDuration">Long Break Duration (minutes)</Label>
                    <Input
                      id="longBreakDuration"
                      type="number"
                      value={longBreakDuration}
                      onChange={(e) => setLongBreakDuration(parseInt(e.target.value, 10) || 1)}
                      min="1"
                    />
                  </div>
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
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <Label htmlFor="startDate">Start Date</Label>
                      <Input
                        id="startDate"
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                      />
                    </div>
                    <div className="flex-1">
                      <Label htmlFor="endDate">End Date</Label>
                      <Input
                        id="endDate"
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        required={!!startDate}
                      />
                    </div>
                  </div>
                )}
              </div>
            </details>
            
            <Button onClick={handleSubmit} disabled={loading || !description.trim()}>
              {loading ? 'Analyzing...' : 'Get Breakdown →'}
            </Button>
            
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </div>
        )}

        {step === 'review' && breakdownResult && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Here's my suggestion:</h3>
              <span className="text-sm text-muted-foreground">
                Total: {breakdownResult.reduce((sum, t) => sum + t.estimatedPomodoros, 0)} 🍅
              </span>
            </div>
            
            <ul className="space-y-2">
              {breakdownResult.map((task, index) => (
                <li key={index} className="flex items-center justify-between p-4 border-b border-border rounded-md hover:bg-muted transition">
                  <div className="flex items-center w-full">
                    <div className="flex-1">
                      {editingIndex === index ? (
                        <Input
                          type="text"
                          value={task.title}
                          onChange={(e) => handleTaskChange(index, 'title', e.target.value)}
                          className="w-full border border-input rounded-md shadow-sm focus:ring focus:ring-ring"
                          onBlur={() => setEditingIndex(null)} 
                        />
                      ) : (
                        <span className="text-foreground font-medium">{task.title}</span>
                      )}
                    </div>
                    <div className="flex-none w-32">
                      {editingIndex === index ? (
                        <Input
                          type="number"
                          value={task.estimatedPomodoros}
                          onChange={(e) => handleTaskChange(index, 'estimatedPomodoros', e.target.value)}
                          className="border border-input rounded-md shadow-sm focus:ring focus:ring-ring"
                          onBlur={() => setEditingIndex(null)}
                        />
                      ) : (
                        <span className="text-muted-foreground">{task.estimatedPomodoros} pomodoros</span>
                      )}
                    </div>
                  </div>
                  {editingIndex === index ? (
                    <div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setEditingIndex(null)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditTask(index)}
                        className="text-primary hover:bg-accent"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteTask(index)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('input')}>
                ← Back
              </Button>
              <Button variant="outline" onClick={handleRefine}>
                Refine with AI
              </Button>
              <Button onClick={handleSave} disabled={!selectedProject}>
                Save Tasks
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
