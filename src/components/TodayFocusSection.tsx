import React, { useMemo, useState, useCallback } from 'react';
import { useTasks, Task } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  MoreHorizontal,
  Trash2,
  Star,
  Calendar,
  CheckCircle,
  FolderOpen
} from 'lucide-react';
import BulkActionToolbar from './BulkActionToolbar';
import TaskTimeTracker from './TaskTimeTracker';
import TimeTrackingControls from './TimeTrackingControls';
import PomodoroProgressBar from './PomodoroProgressBar';
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

interface PomodoroSettings {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
}

interface TodayFocusSectionProps {
  settings: PomodoroSettings;
}

const TodayFocusSection: React.FC<TodayFocusSectionProps> = () => {
  const {
    tasks,
    loading,
    error,
    toggleTaskCompletion,
    toggleTaskFocus,
    setTaskDeadline,
    deleteTask,
    updateTask,
    startTimeTracking,
    stopTimeTracking,
    startAllTimeTracking,
    stopAllTimeTracking
  } = useTasks();
  const { projects } = useProjects();
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const focusedTasks = useMemo(() => {
    return tasks.filter(task => task.focus && !task.completed);
  }, [tasks]);

  const { activelyTrackedTasks, hasActiveTracking, getElapsedTime, formatTime } = useTimeTracking(focusedTasks);

  // Selection handlers
  const handleToggleSelection = useCallback((taskId: string) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedTasks.size === focusedTasks.length && focusedTasks.length > 0) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(focusedTasks.map(t => t.id)));
    }
  }, [focusedTasks, selectedTasks.size]);

  const handleClearSelection = useCallback(() => {
    setSelectedTasks(new Set());
  }, []);

  const handleBulkMarkDone = useCallback(async () => {
    const tasksToComplete = Array.from(selectedTasks);
    for (const taskId of tasksToComplete) {
      const task = tasks.find(t => t.id === taskId);
      if (task && !task.completed) {
        await toggleTaskCompletion(taskId, false);
      }
    }
    setSelectedTasks(new Set());
  }, [selectedTasks, tasks, toggleTaskCompletion]);

  const handleBulkDelete = useCallback(async () => {
    const tasksToDelete = Array.from(selectedTasks);
    for (const taskId of tasksToDelete) {
      await deleteTask(taskId);
    }
    setSelectedTasks(new Set());
  }, [selectedTasks, deleteTask]);

  const handleBulkChangeProject = useCallback(async (projectId: string) => {
    const tasksToUpdate = Array.from(selectedTasks);
    for (const taskId of tasksToUpdate) {
      await updateTask(taskId, { projectId });
    }
    setSelectedTasks(new Set());
  }, [selectedTasks, updateTask]);

  const handleBulkSetFocus = useCallback(async (focus: boolean) => {
    const tasksToUpdate = Array.from(selectedTasks);
    for (const taskId of tasksToUpdate) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        await toggleTaskFocus(taskId, !focus);
      }
    }
    setSelectedTasks(new Set());
  }, [selectedTasks, tasks, toggleTaskFocus]);

  // Time tracking handlers
  const handleStartTracking = useCallback(async (taskId: string) => {
    try {
      await startTimeTracking(taskId);
    } catch (error) {
      console.error('Failed to start time tracking:', error);
    }
  }, [startTimeTracking]);

  const handleStopTracking = useCallback(async (task: Task) => {
    try {
      const elapsed = getElapsedTime(task) - (task.manualTimeSpent ?? 0);
      await stopTimeTracking(task.id, elapsed);
    } catch (error) {
      console.error('Failed to stop time tracking:', error);
    }
  }, [stopTimeTracking, getElapsedTime]);

  const handleStartAllTracking = useCallback(async () => {
    const taskIds = focusedTasks.filter(t => t.trackingStartedAt == null).map(t => t.id);
    if (taskIds.length === 0) return;
    try {
      await startAllTimeTracking(taskIds);
    } catch (error) {
      console.error('Failed to start all time tracking:', error);
    }
  }, [focusedTasks, startAllTimeTracking]);

  const handleStopAllTracking = useCallback(async () => {
    const tasksToStop = activelyTrackedTasks.map(task => ({
      taskId: task.id,
      elapsedSeconds: getElapsedTime(task) - (task.manualTimeSpent ?? 0)
    }));
    if (tasksToStop.length === 0) return;
    try {
      await stopAllTimeTracking(tasksToStop);
    } catch (error) {
      console.error('Failed to stop all time tracking:', error);
    }
  }, [activelyTrackedTasks, getElapsedTime, stopAllTimeTracking]);

  // Helper function to get project name by ID
  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  // Project Badge Component
  const ProjectBadge = ({ projectId }: { projectId: string }) => {
    const projectName = getProjectName(projectId);
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
  };

  // Deadline Badge Component
  const DeadlineBadge = ({ deadline }: { deadline: string }) => {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const deadlineDateOnly = new Date(deadlineDate);
    deadlineDateOnly.setHours(0, 0, 0, 0);

    const isOverdue = deadlineDateOnly < today;
    const isToday = deadlineDateOnly.getTime() === today.getTime();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const isTomorrow = deadlineDateOnly.getTime() === tomorrow.getTime();

    const getLabel = () => {
      if (isOverdue) return 'Overdue';
      if (isToday) return 'Today';
      if (isTomorrow) return 'Tomorrow';
      return deadlineDate.toLocaleDateString();
    };

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium transition-colors duration-150",
              isOverdue && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
              isToday && !isOverdue && "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
              isTomorrow && !isOverdue && "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
              !isOverdue && !isToday && !isTomorrow && "bg-muted text-muted-foreground"
            )}>
              <Calendar className="w-3 h-3" />
              {getLabel()}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{deadlineDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  if (loading) {
    return (
      <Card className="w-full mb-6 border border-border/50 bg-card shadow-sm rounded-xl">
        <CardContent className="py-8">
          <div className="flex flex-col items-center justify-center">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground mt-3">Loading focus tasks...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full mb-6 border border-red-200 bg-red-50 dark:bg-red-900/10 rounded-xl">
        <CardContent className="py-6">
          <p className="text-sm text-red-600 dark:text-red-400 text-center">
            Error loading focus section: {error.message}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mb-6 border border-border/50 bg-card shadow-sm rounded-xl">
      {/* Header */}
      <CardHeader className="pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <Star className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="currentColor" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold tracking-tight">
                Today&apos;s Focus
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {focusedTasks.length} task{focusedTasks.length !== 1 ? 's' : ''} to complete
              </p>
            </div>
          </div>
          {focusedTasks.length > 0 && (
            <TimeTrackingControls
              hasActiveTracking={hasActiveTracking}
              activeCount={activelyTrackedTasks.length}
              onStartAll={handleStartAllTracking}
              onStopAll={handleStopAllTracking}
            />
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-5">
        {focusedTasks.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <Star className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No focused tasks</p>
            <p className="text-xs text-muted-foreground/70 mt-1">
              Star a task to add it here
            </p>
          </div>
        ) : (
          <>
            {/* Select All Bar */}
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-border/50">
              <Checkbox
                checked={selectedTasks.size === focusedTasks.length && focusedTasks.length > 0}
                onCheckedChange={handleSelectAll}
                aria-label="Select all tasks"
                className="transition-transform duration-150 hover:scale-110"
              />
              <span className="text-sm text-muted-foreground">
                {selectedTasks.size > 0
                  ? `${selectedTasks.size} task${selectedTasks.size !== 1 ? 's' : ''} selected`
                  : 'Select all'}
              </span>
            </div>

            {/* Task List */}
            <ul className="space-y-1.5">
              {focusedTasks.map((task) => (
                <li
                  key={task.id}
                  data-selected={selectedTasks.has(task.id)}
                  className={cn(
                    "group p-2.5 rounded-xl border bg-card transition-all duration-200 ease-out",
                    "hover:shadow-md hover:-translate-y-0.5",
                    selectedTasks.has(task.id)
                      ? "border-primary/40 ring-2 ring-primary/20"
                      : "border-border/40 hover:border-border"
                  )}
                >
                  {/* Row 1: Checkbox, Actions, Title */}
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={selectedTasks.has(task.id)}
                      onCheckedChange={() => handleToggleSelection(task.id)}
                      aria-label={`Select task: ${task.title}`}
                      className="mt-0.5 transition-transform duration-150 hover:scale-110"
                    />

                    <div className="flex-1 min-w-0">
                      {/* Task Title Row */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleTaskCompletion(task.id, task.completed)}
                          className={cn(
                            "h-5 w-5 p-0 transition-colors duration-150",
                            task.completed
                              ? "text-green-500"
                              : "text-muted-foreground hover:text-green-500"
                          )}
                          aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
                        >
                          <CheckCircle className="w-4 h-4" fill={task.completed ? 'currentColor' : 'none'} />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleTaskFocus(task.id, task.focus || false)}
                          className="h-5 w-5 p-0 text-amber-500 hover:text-amber-600 transition-colors duration-150"
                          aria-label="Remove from focus"
                        >
                          <Star className="w-4 h-4" fill="currentColor" />
                        </Button>

                        <span className={cn(
                          "text-sm font-medium transition-all duration-200",
                          task.completed && "line-through text-muted-foreground"
                        )}>
                          {task.title}
                        </span>

                        {task.projectId && <ProjectBadge projectId={task.projectId} />}
                      </div>

                      {/* Row 2: Deadline badge */}
                      {task.deadline && (
                        <div className="mt-1">
                          <DeadlineBadge deadline={task.deadline} />
                        </div>
                      )}

                      {/* Row 3: Timer + Progress Bar in one line */}
                      <div className="flex items-center gap-3 mt-1.5">
                        <TaskTimeTracker
                          formattedTime={formatTime(getElapsedTime(task))}
                          elapsedTime={getElapsedTime(task)}
                          isTracking={task.trackingStartedAt != null}
                          onStart={() => handleStartTracking(task.id)}
                          onStop={() => handleStopTracking(task)}
                          disabled={task.completed}
                        />
                        <div className="flex-1">
                          <PomodoroProgressBar
                            completed={task.totalPomodoroSessions || 0}
                            estimated={task.estimatedPomodoros || 0}
                            size="sm"
                            showLabel={true}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Action Menu - Shows on hover */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            const newDeadline = prompt('Enter deadline (YYYY-MM-DD) or leave empty to remove:', task.deadline || '');
                            if (newDeadline !== null) {
                              setTaskDeadline(task.id, newDeadline || null);
                            }
                          }}>
                            <Calendar className="w-4 h-4 mr-2" />
                            Set Deadline
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteTask(task.id)}
                            className="text-red-600 focus:text-red-600 dark:text-red-400"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Bulk Action Toolbar */}
            {selectedTasks.size > 0 && (
              <div className="mt-4">
                <BulkActionToolbar
                  selectedCount={selectedTasks.size}
                  onMarkDone={handleBulkMarkDone}
                  onDelete={handleBulkDelete}
                  onChangeProject={handleBulkChangeProject}
                  onSetFocus={handleBulkSetFocus}
                  onClearSelection={handleClearSelection}
                  projects={projects}
                />
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayFocusSection;
