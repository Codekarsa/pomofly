import React, { memo, useCallback } from 'react';
import Link from 'next/link';
import { Task } from '../hooks/useTasks';
import { Project } from '../hooks/useProjects';
import { Label } from '../hooks/useLabels';
import { MobileButton } from '@/components/ui/mobile-button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CheckCircle, 
  Star, 
  MoreHorizontal, 
  Eye, 
  Pencil, 
  Calendar, 
  Trash2,
  FolderOpen 
} from 'lucide-react';
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
import TaskTimeTracker from './TaskTimeTracker';

// Memoized sub-components
const ProjectBadge = memo(({ 
  projectId, 
  projectName 
}: { 
  projectId: string; 
  projectName: string; 
}) => {
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

const LabelBadge = memo(({ 
  name, 
  color 
}: { 
  name: string; 
  color: string; 
}) => (
  <span 
    className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium text-white"
    style={{ backgroundColor: color }}
  >
    {name}
  </span>
));

LabelBadge.displayName = 'LabelBadge';

const TaskLabels = memo(({ 
  labels 
}: { 
  labels: Pick<Label, 'id' | 'name' | 'color'>[];
}) => {
  if (labels.length === 0) return null;
  
  return (
    <span className="inline-flex items-center gap-1">
      {labels.slice(0, 3).map(label => (
        <LabelBadge key={label.id} name={label.name} color={label.color} />
      ))}
      {labels.length > 3 && (
        <span className="text-xs text-muted-foreground">+{labels.length - 3} more</span>
      )}
    </span>
  );
});

TaskLabels.displayName = 'TaskLabels';

const DeadlineBadge = memo(({ 
  deadline 
}: { 
  deadline: string; 
}) => {
  const deadlineDate = new Date(deadline);
  const isOverdue = deadlineDate < new Date();
  
  return (
    <span className={`text-xs px-2 py-1 rounded ${
      isOverdue
        ? 'bg-red-100 text-red-800'
        : 'bg-blue-100 text-blue-800'
    }`}>
      {deadlineDate.toLocaleDateString()}
      {isOverdue && ' (Overdue)'}
    </span>
  );
});

DeadlineBadge.displayName = 'DeadlineBadge';

const PomodoroCounter = memo(({ 
  completed, 
  estimated 
}: { 
  completed: number; 
  estimated: number; 
}) => (
  <span className="text-xs text-muted-foreground">
    ({completed}/{estimated})
  </span>
));

PomodoroCounter.displayName = 'PomodoroCounter';

interface OptimizedTaskItemProps {
  task: Task;
  isSelected: boolean;
  projectName?: string;
  labels: Pick<Label, 'id' | 'name' | 'color'>[];
  formattedElapsedTime: string;
  elapsedTime: number;
  onToggleCompletion: () => void;
  onToggleFocus: () => void;
  onToggleSelection: () => void;
  onEditTask: () => void;
  onEditDeadline: () => void;
  onDeleteTask: () => void;
  onStartTimeTracking: () => void;
  onStopTimeTracking: () => void;
  onViewDetail: () => void;
}

const OptimizedTaskItem: React.FC<OptimizedTaskItemProps> = memo(({
  task,
  isSelected,
  projectName,
  labels,
  formattedElapsedTime,
  elapsedTime,
  onToggleCompletion,
  onToggleFocus,
  onToggleSelection,
  onEditTask,
  onEditDeadline,
  onDeleteTask,
  onStartTimeTracking,
  onStopTimeTracking,
  onViewDetail
}) => {
  const handleEditClick = useCallback(() => {
    onEditTask();
  }, [onEditTask]);

  const handleDeleteClick = useCallback(() => {
    onDeleteTask();
  }, [onDeleteTask]);

  const handleDeadlineClick = useCallback(() => {
    onEditDeadline();
  }, [onEditDeadline]);

  return (
    <div className={`flex items-center justify-between p-3 rounded-md transition-colors border ${
      isSelected 
        ? 'bg-blue-50 border-blue-200' 
        : 'hover:bg-accent border-transparent'
    }`}>
      <div className="flex items-center space-x-3 flex-1 min-w-0">
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelection}
          aria-label={`Select task: ${task.title}`}
          className="flex-shrink-0"
        />
        
        <MobileButton
          variant="ghost"
          size="icon"
          onClick={onToggleCompletion}
          className={`flex-shrink-0 ${
            task.completed 
              ? 'text-green-500' 
              : 'text-gray-400 hover:text-green-500'
          }`}
          aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
        >
          <CheckCircle className="w-4 h-4" fill={task.completed ? 'currentColor' : 'none'} />
        </MobileButton>
        
        <MobileButton
          variant="ghost"
          size="icon"
          onClick={onToggleFocus}
          className={`flex-shrink-0 ${
            task.focus ? 'text-yellow-500' : 'text-gray-400'
          }`}
          aria-label={task.focus ? "Remove from focus" : "Add to focus"}
        >
          <Star className="w-4 h-4" fill={task.focus ? 'currentColor' : 'none'} />
        </MobileButton>
        
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center space-x-2">
            <span className={`text-sm font-medium truncate ${
              task.completed ? 'line-through text-muted-foreground' : ''
            }`}>
              {task.title}
            </span>
            
            {projectName && task.projectId && (
              <ProjectBadge projectId={task.projectId} projectName={projectName} />
            )}
          </div>
          
          <div className="flex items-center space-x-2 flex-wrap">
            <TaskLabels labels={labels} />
            
            <PomodoroCounter 
              completed={task.totalPomodoroSessions || 0}
              estimated={task.estimatedPomodoros || 0}
            />
            
            {task.deadline && (
              <DeadlineBadge deadline={task.deadline} />
            )}
          </div>
        </div>
        
        <div className="flex-shrink-0">
          <TaskTimeTracker
            formattedTime={formattedElapsedTime}
            elapsedTime={elapsedTime}
            isTracking={task.trackingStartedAt != null}
            onStart={onStartTimeTracking}
            onStop={onStopTimeTracking}
            disabled={task.completed}
            compact
          />
        </div>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <MobileButton 
            variant="ghost" 
            size="icon" 
            className="flex-shrink-0 ml-2"
            aria-label="Task options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </MobileButton>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onViewDetail}>
            <Eye className="w-4 h-4 mr-2" />
            View Detail
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleEditClick}>
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDeadlineClick}>
            <Calendar className="w-4 h-4 mr-2" />
            Set Deadline
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDeleteClick} className="text-destructive">
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

OptimizedTaskItem.displayName = 'OptimizedTaskItem';

export default OptimizedTaskItem;