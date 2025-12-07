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
    return tasks.filter(task => !task.completed);
  }, [tasks]);

  // Filter by search
  const filteredTasks = useMemo(() => {
    if (!search.trim()) return availableTasks;
    const searchLower = search.toLowerCase();
    return availableTasks.filter(task =>
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
    const project = projects.find(p => p.id === projectId);
    return project?.name || '';
  };

  const handleToggle = (taskId: string) => {
    if (disabled) return;
    if (selectedTaskIds.includes(taskId)) {
      onSelectionChange(selectedTaskIds.filter(id => id !== taskId));
    } else {
      onSelectionChange([...selectedTaskIds, taskId]);
    }
  };

  const handleClearAll = () => {
    if (disabled) return;
    onSelectionChange([]);
  };

  return (
    <div className="border rounded-lg bg-card">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">Select Tasks</span>
          {selectedTaskIds.length > 0 && (
            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
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
            <X className="h-3 w-3 mr-1" />
            Clear all
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="px-4 py-2 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Task List */}
      <div className="max-h-[280px] overflow-y-auto">
        {sortedTasks.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground text-sm">
            {search ? 'No tasks match your search' : 'No tasks available'}
          </div>
        ) : (
          <div className="p-2 space-y-1">
            {sortedTasks.map((task) => {
              const isSelected = selectedTaskIds.includes(task.id);
              const projectName = getProjectName(task.projectId);

              return (
                <div
                  key={task.id}
                  onClick={() => handleToggle(task.id)}
                  className={`
                    flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all
                    ${isSelected
                      ? 'bg-primary/10 border-2 border-primary/50'
                      : 'bg-background border-2 border-transparent hover:bg-accent'
                    }
                    ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => handleToggle(task.id)}
                    disabled={disabled}
                    className="pointer-events-none"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-medium truncate ${isSelected ? 'text-primary' : ''}`}>
                        {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      {projectName && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground truncate max-w-[120px]">
                          {projectName}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        ({task.totalPomodoroSessions || 0}/{task.estimatedPomodoros || 0})
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
