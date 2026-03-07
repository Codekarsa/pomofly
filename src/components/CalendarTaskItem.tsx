import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { MobileButton } from '@/components/ui/mobile-button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { LabelBadge } from './LabelPicker';
import { 
  MoreHorizontal, 
  Star, 
  Eye, 
  Pencil, 
  Trash2, 
  Calendar, 
  FolderOpen,
  Clock,
  CheckCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Task {
  id: string;
  title: string;
  projectId: string;
  completed: boolean;
  estimatedPomodoros?: number;
  totalPomodoroSessions: number;
  focus: boolean;
  deadline?: string | null;
  labelIds?: string[];
  scheduledDate?: string;
  scheduledTime?: string;
}

interface Label {
  id: string;
  name: string;
  color: string;
}

interface CalendarTaskItemProps {
  task: Task;
  onToggleComplete: (completed: boolean) => void;
  onToggleFocus: (focus: boolean) => void;
  onUpdate: (updates: Partial<Task>) => void;
  onDelete: () => void;
  getProjectName: (projectId: string) => string;
  getLabelById: (labelId: string) => Label | undefined;
}

export default function CalendarTaskItem({
  task,
  onToggleComplete,
  onToggleFocus,
  onUpdate,
  onDelete,
  getProjectName,
  getLabelById
}: CalendarTaskItemProps) {
  const [isEditing, setIsEditing] = useState(false);

  const projectName = getProjectName(task.projectId);
  const taskLabels = task.labelIds?.map(getLabelById).filter(Boolean) as Label[] || [];

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleDeleteClick = () => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      onDelete();
    }
  };

  return (
    <div className={cn(
      "flex items-center justify-between p-3 bg-white border rounded-lg transition-all duration-200",
      task.completed && "bg-gray-50 opacity-75",
      task.focus && "border-yellow-200 bg-yellow-50",
      "hover:shadow-sm"
    )}>
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        {/* Completion Checkbox */}
        <Checkbox
          checked={task.completed}
          onCheckedChange={onToggleComplete}
          aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
        />

        {/* Focus Star */}
        <MobileButton
          variant="ghost"
          size="icon"
          onClick={() => onToggleFocus(task.focus)}
          className={cn(
            "flex-shrink-0",
            task.focus ? "text-yellow-500" : "text-gray-400"
          )}
          aria-label={task.focus ? "Remove from focus" : "Add to focus"}
        >
          <Star className="w-4 h-4" fill={task.focus ? "currentColor" : "none"} />
        </MobileButton>

        {/* Task Details */}
        <div className="flex-1 min-w-0 space-y-1">
          {/* Title */}
          <div className={cn(
            "font-medium text-sm",
            task.completed && "line-through text-gray-500"
          )}>
            {task.title}
          </div>

          {/* Metadata */}
          <div className="flex items-center space-x-3 text-xs text-muted-foreground">
            {/* Project */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center space-x-1">
                    <FolderOpen className="w-3 h-3" />
                    <span className="truncate max-w-[100px]">{projectName}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{projectName}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Pomodoro Progress */}
            {task.estimatedPomodoros && (
              <div className="flex items-center space-x-1">
                <span>🍅</span>
                <span>{task.totalPomodoroSessions}/{task.estimatedPomodoros}</span>
              </div>
            )}

            {/* Scheduled Time */}
            {task.scheduledTime && (
              <div className="flex items-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>{task.scheduledTime}</span>
              </div>
            )}
          </div>

          {/* Labels */}
          {taskLabels.length > 0 && (
            <div className="flex items-center space-x-1 mt-1">
              {taskLabels.map(label => (
                <LabelBadge key={label.id} label={label} size="sm" />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center space-x-1 flex-shrink-0">
        {/* Quick Complete Button (for incomplete tasks) */}
        {!task.completed && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <MobileButton
                  variant="ghost"
                  size="icon"
                  onClick={() => onToggleComplete(true)}
                  className="text-green-600 hover:text-green-700"
                >
                  <CheckCircle className="w-4 h-4" />
                </MobileButton>
              </TooltipTrigger>
              <TooltipContent>
                <p>Mark as complete</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* More Actions Menu */}
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
                View Details
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleEditClick}>
              <Pencil className="w-4 h-4 mr-2" />
              Edit Task
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => {
              // This could open a date picker to reschedule
              const newDate = prompt('Enter new date (YYYY-MM-DD):');
              if (newDate) {
                onUpdate({ deadline: newDate });
              }
            }}>
              <Calendar className="w-4 h-4 mr-2" />
              Reschedule
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleDeleteClick} className="text-red-600">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}