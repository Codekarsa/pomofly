import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { MobileButton } from '@/components/ui/mobile-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Combobox } from '@/components/ui/combobox';
import LabelPicker from './LabelPicker';
import { Star, Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface CalendarTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: {
    title: string;
    projectId: string;
    estimatedPomodoros?: number;
    focus?: boolean;
    labelIds?: string[];
    scheduledDate?: string;
    scheduledTime?: string;
  }) => void;
  projects: Project[];
  labels: Label[];
  selectedDate?: string | null;
  onCreateProject?: (name: string) => Promise<string | undefined>;
}

export default function CalendarTaskForm({
  isOpen,
  onClose,
  onSave,
  projects,
  labels,
  selectedDate,
  onCreateProject
}: CalendarTaskFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    projectId: '',
    estimatedPomodoros: undefined as number | undefined,
    focus: false,
    labelIds: [] as string[],
    scheduledDate: selectedDate || '',
    scheduledTime: '',
    hasSpecificTime: false,
  });

  // Reset form when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        title: '',
        projectId: '',
        estimatedPomodoros: undefined,
        focus: false,
        labelIds: [],
        scheduledDate: selectedDate || '',
        scheduledTime: '',
        hasSpecificTime: false,
      });
    }
  }, [isOpen, selectedDate]);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim() || !formData.projectId) {
      return;
    }

    onSave({
      title: formData.title.trim(),
      projectId: formData.projectId,
      estimatedPomodoros: formData.estimatedPomodoros,
      focus: formData.focus,
      labelIds: formData.labelIds,
      scheduledDate: formData.scheduledDate || undefined,
      scheduledTime: formData.hasSpecificTime ? formData.scheduledTime : undefined,
    });

    // Reset form
    setFormData({
      title: '',
      projectId: '',
      estimatedPomodoros: undefined,
      focus: false,
      labelIds: [],
      scheduledDate: '',
      scheduledTime: '',
      hasSpecificTime: false,
    });
  }, [formData, onSave]);

  const handleCreateProject = useCallback(async (name: string) => {
    if (onCreateProject) {
      try {
        const newProjectId = await onCreateProject(name);
        if (newProjectId) {
          setFormData(prev => ({ ...prev, projectId: newProjectId }));
        }
      } catch (error) {
        console.error('Failed to create project:', error);
      }
    }
  }, [onCreateProject]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Task</DialogTitle>
          <DialogDescription>
            Create a new task and optionally schedule it for a specific day and time.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Task Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Task Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter task title..."
              required
            />
          </div>

          {/* Project Selection */}
          <div className="space-y-2">
            <Label htmlFor="project">Project</Label>
            <Combobox
              options={projects.map(project => ({ value: project.id, label: project.name }))}
              value={formData.projectId}
              onChange={(value) => setFormData(prev => ({ ...prev, projectId: value }))}
              placeholder="Select a project"
              onCreateNew={handleCreateProject}
            />
          </div>

          {/* Estimated Pomodoros */}
          <div className="space-y-2">
            <Label htmlFor="pomodoros">Estimated Pomodoros</Label>
            <div className="flex items-center space-x-2">
              <Input
                id="pomodoros"
                type="number"
                min="1"
                value={formData.estimatedPomodoros || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  estimatedPomodoros: e.target.value ? parseInt(e.target.value) : undefined 
                }))}
                placeholder="How many pomodoros?"
                className="flex-1"
              />
              <span className="text-sm text-muted-foreground">🍅</span>
            </div>
          </div>

          {/* Focus Toggle */}
          <div className="flex items-center space-x-2">
            <Switch
              id="focus"
              checked={formData.focus}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, focus: checked }))}
            />
            <Label htmlFor="focus" className="flex items-center space-x-2">
              <Star className={cn("w-4 h-4", formData.focus ? "text-yellow-500" : "text-gray-400")} 
                    fill={formData.focus ? "currentColor" : "none"} />
              <span>Add to Today's Focus</span>
            </Label>
          </div>

          {/* Label Selection */}
          <div className="space-y-2">
            <Label>Labels</Label>
            <LabelPicker
              selectedLabelIds={formData.labelIds}
              onChange={(labelIds) => setFormData(prev => ({ ...prev, labelIds }))}
            />
          </div>

          {/* Scheduling */}
          <div className="space-y-3 pt-4 border-t">
            <Label className="text-sm font-medium flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>Scheduling</span>
            </Label>

            {/* Date Selection */}
            <div className="space-y-2">
              <Label htmlFor="date" className="text-sm">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                className="w-full"
              />
            </div>

            {/* Time Selection Toggle */}
            <div className="flex items-center space-x-2">
              <Switch
                id="hasTime"
                checked={formData.hasSpecificTime}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  hasSpecificTime: checked,
                  scheduledTime: checked ? prev.scheduledTime : ''
                }))}
              />
              <Label htmlFor="hasTime" className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>Set specific time</span>
              </Label>
            </div>

            {/* Time Input */}
            {formData.hasSpecificTime && (
              <div className="space-y-2">
                <Label htmlFor="time" className="text-sm">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                  className="w-full"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.title.trim() || !formData.projectId}>
              Create Task
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}