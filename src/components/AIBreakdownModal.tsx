import React, { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { useClaudeAI } from '@/hooks/useClaudeAI';
import { Checkbox } from './ui/checkbox';
import { Pencil, Trash2, X, Loader2, AlertTriangle, RefreshCw, Clock } from 'lucide-react';
import { Combobox } from './ui/combobox';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';

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
  
  // Enhanced loading states
  const [requestProgress, setRequestProgress] = useState(0);
  const [requestTime, setRequestTime] = useState(0);
  const [showSuccessConfirm, setShowSuccessConfirm] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const newHeight = Math.min(textarea.scrollHeight, 8 * 24);
      textarea.style.height = `${newHeight}px`;
    }
  };

  useEffect(() => {
    adjustTextareaHeight();
  }, [description]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset states
    setRequestProgress(0);
    setRequestTime(0);
    setShowSuccessConfirm(false);
    setBreakdownResult(null);
    
    // Progress simulation
    const progressInterval = setInterval(() => {
      setRequestProgress(prev => {
        if (prev >= 90) return prev; // Cap at 90% until real completion
        return prev + Math.random() * 15;
      });
    }, 500);
    
    // Timer for elapsed time
    const timeInterval = setInterval(() => {
      setRequestTime(prev => prev + 1);
    }, 1000);
    
    try {
      const result = await getTaskBreakdown(
        description,
        useCustomDates ? new Date(startDate) : undefined,
        useCustomDates ? new Date(endDate) : undefined,
        pomodoroDuration,
        shortBreakDuration,
        longBreakDuration
      );
      
      // Complete progress and show success
      setRequestProgress(100);
      setBreakdownResult(result.tasks);
      setShowSuccessConfirm(true);
      setRetryCount(0);
      
    } catch (err) {
      console.error('Failed to get task breakdown:', err);
      setRequestProgress(0);
    } finally {
      clearInterval(progressInterval);
      clearInterval(timeInterval);
    }
  };

  const handleSave = () => {
    if (breakdownResult && selectedProject) {
      onSave(breakdownResult, selectedProject);
      // Reset state
      setDescription('');
      setBreakdownResult(null);
      setShowSuccessConfirm(false);
      setRequestProgress(0);
      setRequestTime(0);
      onClose();
    }
  };
  
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    handleSubmit(new Event('submit') as any);
  };
  
  const confirmAndContinue = () => {
    setShowSuccessConfirm(false);
  };

  const handleEditTask = (index: number) => {
    setEditingIndex(index);
  };

  const handleTaskChange = (index: number, field: 'title' | 'estimatedPomodoros', value: string) => {
    if (!Array.isArray(breakdownResult)) return;
    const newTasks = [...breakdownResult];
    if (field === 'title') {
      newTasks[index].title = value;
    } else {
      newTasks[index].estimatedPomodoros = parseInt(value, 10);
    }
    setBreakdownResult(newTasks);
  };

  const handleDeleteTask = (index: number) => {
    if (!Array.isArray(breakdownResult)) return;
    const newTasks = breakdownResult.filter((_, i) => i !== index);
    setBreakdownResult(newTasks);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Break Down Your Work with AI</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="description">Work Description</Label>
              <Textarea
                id="description"
                ref={textareaRef}
                value={description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  adjustTextareaHeight();
                }}
                placeholder="Describe your complex task..."
                required
                className="resize-none overflow-hidden"
                rows={3}
              />
            </div>
            <div className="flex space-x-4">
              <div className="flex-1">
                <Label htmlFor="pomodoroDuration">Pomodoro Duration (minutes)</Label>
                <Input
                  id="pomodoroDuration"
                  type="number"
                  value={pomodoroDuration}
                  onChange={(e) => setPomodoroDuration(parseInt(e.target.value, 10))}
                  min="1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="shortBreakDuration">Short Break Duration (minutes)</Label>
                <Input
                  id="shortBreakDuration"
                  type="number"
                  value={shortBreakDuration}
                  onChange={(e) => setShortBreakDuration(parseInt(e.target.value, 10))}
                  min="1"
                />
              </div>
              <div className="flex-1">
                <Label htmlFor="longBreakDuration">Long Break Duration (minutes)</Label>
                <Input
                  id="longBreakDuration"
                  type="number"
                  value={longBreakDuration}
                  onChange={(e) => setLongBreakDuration(parseInt(e.target.value, 10))}
                  min="1"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="projectSelect">Select Project</Label>
              <Combobox
                options={projects.map(project => ({ value: project.id, label: project.name }))}
                value={selectedProject || ''}
                onChange={(value) => setSelectedProject(value)}
                placeholder="Select a project"
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
              </>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {loading ? (
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </div>
              ) : 'Get Breakdown'}
            </Button>
          </DialogFooter>
        </form>
        
        {/* Loading Progress */}
        {loading && (
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>AI is analyzing your task...</span>
              </span>
              <span className="text-muted-foreground">{requestTime}s</span>
            </div>
            <Progress value={requestProgress} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {requestProgress < 30 && "Breaking down your task into subtasks..."}
              {requestProgress >= 30 && requestProgress < 60 && "Estimating time requirements..."}
              {requestProgress >= 60 && requestProgress < 90 && "Optimizing pomodoro sessions..."}
              {requestProgress >= 90 && "Finalizing breakdown..."}
            </div>
          </div>
        )}
        
        {/* Error State with Retry */}
        {error && (
          <Alert className="mt-4" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error} {retryCount > 0 && `(Attempt ${retryCount + 1})`}</span>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRetry}
                className="ml-2"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Success Confirmation */}
        {showSuccessConfirm && breakdownResult && (
          <Alert className="mt-4">
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span>✅ Successfully generated {breakdownResult.length} tasks! Review and edit below, then save.</span>
                <Button variant="outline" size="sm" onClick={confirmAndContinue}>
                  Got it
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}
        {breakdownResult && (
          <div className="mt-4">
            <h3 className="font-semibold mb-4 text-lg">Task Breakdown:</h3>
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
            <Button 
              onClick={handleSave} 
              className="mt-4 w-full bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={!selectedProject}
            >
              Save Breakdown
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
