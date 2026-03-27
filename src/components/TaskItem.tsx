'use client'

import React, { memo, useCallback } from 'react';
import Link from 'next/link';
import { Task } from '@/hooks/useTasks';
import { MobileButton } from '@/components/ui/mobile-button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  Star, 
  Calendar, 
  CheckCircle, 
  Eye, 
  FolderOpen 
} from 'lucide-react';
import TaskTimeTracker from './TaskTimeTracker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Combobox } from './ui/combobox';
import { cn } from '@/lib/utils';
import LabelPicker, { LabelBadge } from './LabelPicker';
import { useLabels } from '@/hooks/useLabels';

interface TaskItemProps {
  task: Task;
  isSelected: boolean;
  isEditing: boolean;
  isEditingDeadline: boolean;
  projectName: string;
  formattedTime: string;
  elapsedTime: number;
  isTracking: boolean;
  editingData?: {
    id: string;
    title: string;
    estimatedPomodoros?: number;
    projectId?: string;
    labelIds?: string[];
  };
  deadlineData?: {
    id: string;
    deadline: string;
  };
  projects: Array<{ id: string; name: string }>;
  onToggleSelection: (taskId: string) => void;
  onToggleCompletion: (taskId: string, completed: boolean) => void;
  onToggleFocus: (taskId: string, focus: boolean) => void;
  onStartEdit: (task: Task) => void;
  onUpdateTask: (data: any) => void;
  onStartEditDeadline: (task: Task) => void;
  onSetDeadline: (taskId: string, deadline: string | null) => void;
  onDelete: (taskId: string) => void;
  onStartTracking: (taskId: string) => void;
  onStopTracking: (task: Task) => void;
  onCreateProject: (name: string) => Promise<void>;
  onCancelEdit: () => void;
  onCancelEditDeadline: () => void;
  onAnalyticsEvent: (action: string, params: object) => void;
}

// Project Badge Component
const ProjectBadge = memo(({ projectName }: { projectName: string }) => {
  const displayName = projectName.length > 12 ? projectName.substring(0, 12) + '...' : projectName;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground transition-colors duration-150 hover:bg-secondary/80">
            <FolderOpen className="w-3 h-3" />
            {displayName}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <p>{projectName}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

ProjectBadge.displayName = 'ProjectBadge';

// Task Labels Component
const TaskLabels = memo(({ labelIds }: { labelIds?: string[] }) => {
  const { labels } = useLabels();
  
  if (!labelIds || labelIds.length === 0) return null;
  
  const taskLabels = labels.filter(l => labelIds.includes(l.id));
  if (taskLabels.length === 0) return null;
  
  return (
    <span className="inline-flex items-center gap-1">
      {taskLabels.map(label => (
        <LabelBadge key={label.id} label={label} size="sm" />
      ))}
    </span>
  );
});

TaskLabels.displayName = 'TaskLabels';

/**
 * Memoized Task Item Component
 * Only re-renders when props actually change
 */
const TaskItem: React.FC<TaskItemProps> = memo(({
  task,
  isSelected,
  isEditing,
  isEditingDeadline,
  projectName,
  formattedTime,
  elapsedTime,
  isTracking,
  editingData,
  deadlineData,
  projects,
  onToggleSelection,
  onToggleCompletion,
  onToggleFocus,
  onStartEdit,
  onUpdateTask,
  onStartEditDeadline,
  onSetDeadline,
  onDelete,
  onStartTracking,
  onStopTracking,
  onCreateProject,
  onCancelEdit,
  onCancelEditDeadline,
  onAnalyticsEvent,
}) => {
  const handleToggleSelection = useCallback(() => {
    onToggleSelection(task.id);
  }, [onToggleSelection, task.id]);

  const handleToggleCompletion = useCallback(() => {
    onToggleCompletion(task.id, task.completed);
  }, [onToggleCompletion, task.id, task.completed]);

  const handleToggleFocus = useCallback(() => {
    onToggleFocus(task.id, task.focus || false);
  }, [onToggleFocus, task.id, task.focus]);

  const handleStartEdit = useCallback(() => {
    onStartEdit(task);
    onAnalyticsEvent('task_edit_started', { task_id: task.id });
  }, [onStartEdit, task, onAnalyticsEvent]);

  const handleStartEditDeadline = useCallback(() => {
    onStartEditDeadline(task);
  }, [onStartEditDeadline, task]);

  const handleDelete = useCallback(() => {
    onDelete(task.id);
  }, [onDelete, task.id]);

  const handleStartTracking = useCallback(() => {
    onStartTracking(task.id);
  }, [onStartTracking, task.id]);

  const handleStopTracking = useCallback(() => {
    onStopTracking(task);
  }, [onStopTracking, task]);

  const handleEditSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (editingData && editingData.title.trim()) {
      onUpdateTask(editingData);
    }
  }, [editingData, onUpdateTask]);

  const handleDeadlineSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (deadlineData) {
      onSetDeadline(task.id, deadlineData.deadline || null);
    }
  }, [deadlineData, onSetDeadline, task.id]);

  const handleEditTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingData) {
      onUpdateTask({ ...editingData, title: e.target.value });
    }
  }, [editingData, onUpdateTask]);

  const handleEditPomodorosChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (editingData) {
      onUpdateTask({ 
        ...editingData, 
        estimatedPomodoros: e.target.value ? parseInt(e.target.value) : undefined 
      });
    }
  }, [editingData, onUpdateTask]);

  const handleEditProjectChange = useCallback((value: string) => {
    if (editingData) {
      onUpdateTask({ ...editingData, projectId: value });
    }
  }, [editingData, onUpdateTask]);

  const handleEditLabelsChange = useCallback((labelIds: string[]) => {
    if (editingData) {
      onUpdateTask({ ...editingData, labelIds });
    }
  }, [editingData, onUpdateTask]);

  const handleDeadlineChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (deadlineData) {
      onSetDeadline(task.id, e.target.value);
    }
  }, [deadlineData, onSetDeadline, task.id]);

  // Check if task is overdue
  const isOverdue = task.deadline && new Date(task.deadline) < new Date();

  return (
    <li className={cn(
      "flex items-center justify-between p-2 rounded-md transition-colors",
      isSelected ? 'bg-blue-50' : 'hover:bg-accent'
    )}>
      {isEditing ? (
        <form onSubmit={handleEditSubmit} className="flex flex-col space-y-2 w-full">
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              value={editingData?.title || ''}
              onChange={handleEditTitleChange}
              className="flex-grow"
              placeholder="Task title"
            />
            <Input
              type="number"
              value={editingData?.estimatedPomodoros || ''}
              onChange={handleEditPomodorosChange}
              placeholder="Pomodoros"
              className="w-24"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Combobox
              options={projects.map(project => ({ value: project.id, label: project.name }))}
              value={editingData?.projectId || ''}
              onChange={handleEditProjectChange}
              placeholder="Select a project"
              onCreateNew={onCreateProject}
            />
            <LabelPicker
              selectedLabelIds={editingData?.labelIds || []}
              onChange={handleEditLabelsChange}
            />
            <MobileButton type="submit" size="sm" variant="outline">
              Save
            </MobileButton>
            <MobileButton type="button" size="sm" variant="ghost" onClick={onCancelEdit}>
              Cancel
            </MobileButton>
          </div>
        </form>
      ) : isEditingDeadline ? (
        <form onSubmit={handleDeadlineSubmit} className="flex items-center space-x-2 w-full">
          <Input
            type="date"
            value={deadlineData?.deadline || ''}
            onChange={handleDeadlineChange}
            className="flex-grow"
          />
          <MobileButton type="submit" size="sm" variant="outline">
            Save
          </MobileButton>
          <MobileButton type="button" size="sm" variant="ghost" onClick={onCancelEditDeadline}>
            Cancel
          </MobileButton>
        </form>
      ) : (
        <>
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={isSelected}
              onCheckedChange={handleToggleSelection}
              aria-label={`Select task: ${task.title}`}
            />
            <MobileButton
              variant="ghost"
              size="icon"
              onClick={handleToggleCompletion}
              className={`${task.completed ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}`}
              aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
            >
              <CheckCircle className="w-4 h-4" fill={task.completed ? 'currentColor' : 'none'} />
            </MobileButton>
            <MobileButton
              variant="ghost"
              size="icon"
              onClick={handleToggleFocus}
              className={`${task.focus ? 'text-yellow-500' : 'text-gray-400'}`}
            >
              <Star className="w-4 h-4" fill={task.focus ? 'currentColor' : 'none'} />
            </MobileButton>
            <span className={cn(
              "text-sm",
              task.completed && 'line-through text-muted-foreground'
            )}>
              {task.title}
            </span>
            {task.projectId && <ProjectBadge projectName={projectName} />}
            <TaskLabels labelIds={task.labelIds} />
            <span className="text-xs text-muted-foreground">
              ({task.totalPomodoroSessions || 0}/{task.estimatedPomodoros || 0})
            </span>
            {task.deadline && (
              <span className={cn(
                "text-xs px-2 py-1 rounded",
                isOverdue 
                  ? 'bg-red-100 text-red-800' 
                  : 'bg-blue-100 text-blue-800'
              )}>
                {new Date(task.deadline).toLocaleDateString()}
                {isOverdue && ' (Overdue)'}
              </span>
            )}
            <TaskTimeTracker
              formattedTime={formattedTime}
              elapsedTime={elapsedTime}
              isTracking={isTracking}
              onStart={handleStartTracking}
              onStop={handleStopTracking}
              disabled={task.completed}
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <MobileButton variant="ghost" size="icon">
                <MoreHorizontal className="w-4 h-4" />
              </MobileButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/tasks/${task.id}`} className="flex items-center">
                  <Eye className="w-4 h-4 mr-2" />
                  View Detail
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleStartEdit}>
                <Pencil className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleStartEditDeadline}>
                <Calendar className="w-4 h-4 mr-2" />
                Set Deadline
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </li>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for better memoization
  return (
    prevProps.task.id === nextProps.task.id &&
    prevProps.task.title === nextProps.task.title &&
    prevProps.task.completed === nextProps.task.completed &&
    prevProps.task.focus === nextProps.task.focus &&
    prevProps.task.deadline === nextProps.task.deadline &&
    prevProps.task.totalPomodoroSessions === nextProps.task.totalPomodoroSessions &&
    prevProps.task.estimatedPomodoros === nextProps.task.estimatedPomodoros &&
    prevProps.task.trackingStartedAt === nextProps.task.trackingStartedAt &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isEditing === nextProps.isEditing &&
    prevProps.isEditingDeadline === nextProps.isEditingDeadline &&
    prevProps.projectName === nextProps.projectName &&
    prevProps.formattedTime === nextProps.formattedTime &&
    prevProps.elapsedTime === nextProps.elapsedTime &&
    prevProps.isTracking === nextProps.isTracking &&
    JSON.stringify(prevProps.task.labelIds) === JSON.stringify(nextProps.task.labelIds)
  );
});

TaskItem.displayName = 'TaskItem';

export default TaskItem;