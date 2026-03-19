'use client';

import React, { useState, useMemo } from 'react';
import { Task } from '@/hooks/useTasks';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

interface TaskPickerProps {
  tasks: Task[];
  projects: Project[];
  selectedTaskIds: string[];
  onSelectionChange: (taskIds: string[]) => void;
  disabled?: boolean;
}

const TaskPicker: React.FC<TaskPickerProps> = ({
  tasks,
  projects,
  selectedTaskIds,
  onSelectionChange,
  disabled = false,
}) => {
  const [search, setSearch] = useState('');

  // Filter to only show incomplete tasks
  const availableTasks = useMemo(() => {
    return tasks.filter((task) => !task.completed);
  }, [tasks]);

  // Filter by search
  const filteredTasks = useMemo(() => {
    if (!search.trim()) return availableTasks;
    const searchLower = search.toLowerCase();
    return availableTasks.filter((task) =>
      task.title.toLowerCase().includes(searchLower)
    );
  }, [availableTasks, search]);

  // Sort: selected tasks first, then by title
  const sortedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      const aSelected = selectedTaskIds.includes(a.id);
      const bSelected = selectedTaskIds.includes(b.id);
      if (aSelected && !bSelected) return -1;
      if (!aSelected && bSelected) return 1;
      return a.title.localeCompare(b.title);
    });
  }, [filteredTasks, selectedTaskIds]);

  const getProjectName = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    return project?.name || '';
  };

  const handleToggle = (taskId: string) => {
    if (disabled) return;
    if (selectedTaskIds.includes(taskId)) {
      onSelectionChange(selectedTaskIds.filter((id) => id !== taskId));
    } else {
      onSelectionChange([...selectedTaskIds, taskId]);
    }
  };

  const handleClearAll = () => {
    if (disabled) return;
    onSelectionChange([]);
  };

  return (
    <div className="rounded-lg border bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-muted/50 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Select Tasks</span>
          {selectedTaskIds.length > 0 && (
            <span className="rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {selectedTaskIds.length} selected
            </span>
          )}
        </div>
        {selectedTaskIds.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={disabled}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="mr-1 h-3 w-3" />
            Clear all
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="border-b px-4 py-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Task List */}
      <div className="max-h-[280px] overflow-y-auto">
        {sortedTasks.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            {search ? 'No tasks match your search' : 'No tasks available'}
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {sortedTasks.map((task) => {
              const isSelected = selectedTaskIds.includes(task.id);
              const projectName = getProjectName(task.projectId);

              return (
                <div
                  key={task.id}
                  onClick={() => handleToggle(task.id)}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg p-3 transition-all ${
                    isSelected
                      ? 'border-2 border-primary/50 bg-primary/10'
                      : 'border-2 border-transparent bg-background hover:bg-accent'
                  } ${disabled ? 'cursor-not-allowed opacity-50' : ''} `}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggle(task.id)}
                    disabled={disabled}
                    className="pointer-events-none"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`truncate text-sm font-medium ${isSelected ? 'text-primary' : ''}`}
                      >
                        {task.title}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      {projectName && (
                        <span className="max-w-[120px] truncate rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {projectName}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        ({task.totalPomodoroSessions || 0}/
                        {task.estimatedPomodoros || 0})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default TaskPicker;
