'use client';

import React, { useState, useMemo } from 'react';
import { Task } from '@/hooks/useTasks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Plus, X, Search, Clock, Star } from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

interface SelectedTasksListProps {
  tasks: Task[];
  projects: Project[];
  selectedTaskIds: string[];
  onAddTask: (taskId: string) => void;
  onRemoveTask: (taskId: string) => void;
  getElapsedTime: (task: Task) => number;
  formatTime: (seconds: number) => string;
}

const SelectedTasksList: React.FC<SelectedTasksListProps> = ({
  tasks,
  projects,
  selectedTaskIds,
  onAddTask,
  onRemoveTask,
  getElapsedTime,
  formatTime,
}) => {
  const [search, setSearch] = useState('');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  // Get selected tasks
  const selectedTasks = useMemo(() => {
    return selectedTaskIds
      .map((id) => tasks.find((t) => t.id === id))
      .filter((t): t is Task => t !== undefined);
  }, [selectedTaskIds, tasks]);

  // Get available tasks (incomplete and not selected)
  const availableTasks = useMemo(() => {
    return tasks.filter(
      (task) => !task.completed && !selectedTaskIds.includes(task.id)
    );
  }, [tasks, selectedTaskIds]);

  // Filter by search and sort focused tasks first
  const filteredTasks = useMemo(() => {
    let filtered = availableTasks;
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = availableTasks.filter((task) =>
        task.title.toLowerCase().includes(searchLower)
      );
    }
    // Sort: focused tasks first
    return [...filtered].sort((a, b) => {
      if (a.focus && !b.focus) return -1;
      if (!a.focus && b.focus) return 1;
      return 0;
    });
  }, [availableTasks, search]);

  const getProjectName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || '';
  };

  const handleAddTask = (taskId: string) => {
    onAddTask(taskId);
    setSearch('');
    setIsPopoverOpen(false);
  };

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="border-b bg-muted/50 px-4 py-3">
        <span className="text-sm font-medium">Working on:</span>
      </div>

      {/* Selected Tasks List */}
      <div className="p-2">
        {selectedTasks.length === 0 ? (
          <div className="px-4 py-6 text-center text-sm text-muted-foreground">
            No tasks selected. Add a task to track your work.
          </div>
        ) : (
          <div className="space-y-2">
            {selectedTasks.map((task) => {
              const projectName = getProjectName(task.projectId);
              const elapsedTime = getElapsedTime(task);
              const isTracking = task.trackingStartedAt != null;

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">
                        {task.title}
                      </span>
                      {task.focus && (
                        <Star
                          className="h-3 w-3 flex-shrink-0 text-amber-500"
                          fill="currentColor"
                        />
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {projectName && (
                        <span className="max-w-[100px] truncate rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {projectName}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        ({task.totalPomodoroSessions || 0}/
                        {task.estimatedPomodoros || 0})
                      </span>
                    </div>
                  </div>

                  {/* Timer Display */}
                  <div
                    className={`flex items-center gap-1 rounded px-2 py-1 font-mono text-xs ${
                      isTracking
                        ? 'animate-pulse bg-blue-100 text-blue-700'
                        : elapsedTime > 0
                          ? 'bg-gray-100 text-gray-700'
                          : 'text-gray-400'
                    }`}
                  >
                    <Clock className="h-3 w-3" />
                    {formatTime(elapsedTime)}
                  </div>

                  {/* Remove Button */}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveTask(task.id)}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Task Button */}
        <div className="mt-3">
          <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-center text-muted-foreground hover:text-foreground"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
            </PopoverTrigger>
            <PopoverContent
              className="w-[var(--radix-popover-trigger-width)] p-0"
              align="center"
            >
              {/* Search Input */}
              <div className="border-b p-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search tasks..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-9 pl-9"
                    autoFocus
                  />
                </div>
              </div>

              {/* Task Options */}
              <div className="max-h-[240px] overflow-y-auto">
                {filteredTasks.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    {search ? 'No tasks found' : 'No more tasks available'}
                  </div>
                ) : (
                  <div className="p-1">
                    {filteredTasks.map((task) => {
                      const projectName = getProjectName(task.projectId);
                      return (
                        <button
                          key={task.id}
                          onClick={() => handleAddTask(task.id)}
                          className="flex w-full items-center gap-3 rounded-md p-3 text-left transition-colors hover:bg-accent"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 truncate text-sm font-medium">
                              {task.title}
                              {task.focus && (
                                <Star
                                  className="h-3 w-3 flex-shrink-0 text-amber-500"
                                  fill="currentColor"
                                />
                              )}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2">
                              {projectName && (
                                <span className="max-w-[120px] truncate text-xs text-muted-foreground">
                                  {projectName}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                ({task.totalPomodoroSessions || 0}/
                                {task.estimatedPomodoros || 0})
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
};

export default SelectedTasksList;
