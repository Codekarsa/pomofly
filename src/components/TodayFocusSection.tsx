import React, { useMemo, useState, useCallback } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Trash2, Star, Calendar, CheckCircle } from 'lucide-react';
import BulkActionToolbar from './BulkActionToolbar';
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
  const { tasks, loading, error, toggleTaskCompletion, toggleTaskFocus, setTaskDeadline, deleteTask, updateTask } = useTasks();
  const { projects } = useProjects();
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const focusedTasks = useMemo(() => {
    return tasks.filter(task => task.focus && !task.completed);
  }, [tasks]);

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

  // Helper function to get project name by ID
  const getProjectName = (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  };

  // Project Badge Component
  const ProjectBadge = ({ projectId }: { projectId: string }) => {
    const projectName = getProjectName(projectId);
    const displayName = projectName.length > 8 ? projectName.substring(0, 8) + '...' : projectName;
    
    // Debug logging
    console.log('TodayFocusSection ProjectBadge Debug:', {
      projectId,
      projectName,
      availableProjects: projects.map(p => ({ id: p.id, name: p.name })),
      foundProject: projects.find(p => p.id === projectId)
    });
    
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 max-w-24 overflow-hidden">
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

  // Debug logging
  console.log('TodayFocusSection Debug:', {
    totalTasks: tasks.length,
    focusedTasks: focusedTasks.length,
    loading,
    error,
    tasksWithFocus: tasks.filter(task => task.focus).length,
    allTasks: tasks.map(task => ({ id: task.id, title: task.title, focus: task.focus, completed: task.completed }))
  });

  if (loading) return <div>Loading focus section...</div>;
  if (error) return <div>Error loading focus section: {error.message}</div>;
  
  // Temporarily show even when no focused tasks for debugging
  return (
    <Card className="w-full mb-6 border-2 border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center text-lg">
          <Star className="w-5 h-5 mr-2 text-yellow-500" fill="currentColor" />
          Today&apos;s Focus
          <span className="ml-2 text-sm text-muted-foreground">
            ({focusedTasks.length} task{focusedTasks.length !== 1 ? 's' : ''})
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {focusedTasks.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            <p>No tasks marked as &quot;Today&apos;s focus&quot; yet.</p>
            <p className="text-sm mt-1">Click the star button next to any task to mark it as focus.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-2 mb-3 pb-2 border-b border-yellow-200">
              <Checkbox
                checked={selectedTasks.size === focusedTasks.length && focusedTasks.length > 0}
                onCheckedChange={handleSelectAll}
                aria-label="Select all tasks"
              />
              <span className="text-sm text-muted-foreground">
                {selectedTasks.size > 0
                  ? `${selectedTasks.size} task${selectedTasks.size !== 1 ? 's' : ''} selected`
                  : 'Select all'}
              </span>
            </div>
            <ul className="space-y-2">
              {focusedTasks.map((task) => (
                <li key={task.id} className={`flex items-center justify-between p-3 rounded-md border border-yellow-200 transition-colors ${selectedTasks.has(task.id) ? 'bg-blue-50' : 'bg-white hover:bg-yellow-100'}`}>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedTasks.has(task.id)}
                      onCheckedChange={() => handleToggleSelection(task.id)}
                      aria-label={`Select task: ${task.title}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleTaskCompletion(task.id, task.completed)}
                      className={`p-1 ${task.completed ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}`}
                      aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
                    >
                      <CheckCircle className="w-4 h-4" fill={task.completed ? 'currentColor' : 'none'} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleTaskFocus(task.id, task.focus || false)}
                      className="p-1 text-yellow-500"
                    >
                      <Star className="w-4 h-4" fill="currentColor" />
                    </Button>
                    <span className={`text-sm font-medium ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </span>
                    {task.projectId && <ProjectBadge projectId={task.projectId} />}
                    <span className="text-xs text-muted-foreground">
                      ({task.totalPomodoroSessions || 0}/{task.estimatedPomodoros || 0})
                    </span>
                    {task.deadline && (
                      <span className={`text-xs px-2 py-1 rounded font-medium ${
                        new Date(task.deadline) < new Date()
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {new Date(task.deadline).toLocaleDateString()}
                        {new Date(task.deadline) < new Date() && ' (Overdue)'}
                      </span>
                    )}
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
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
                      <DropdownMenuItem onClick={() => deleteTask(task.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
            {selectedTasks.size > 0 && (
              <BulkActionToolbar
                selectedCount={selectedTasks.size}
                onMarkDone={handleBulkMarkDone}
                onDelete={handleBulkDelete}
                onChangeProject={handleBulkChangeProject}
                onSetFocus={handleBulkSetFocus}
                onClearSelection={handleClearSelection}
                projects={projects}
              />
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TodayFocusSection; 