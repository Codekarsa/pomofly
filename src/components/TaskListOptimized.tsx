import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTasks, Task } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useLabels } from '../hooks/useLabels';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import VirtualTaskList from './VirtualTaskList';
import OptimizedTaskItem from './OptimizedTaskItem';
import TaskFiltersPanel from './TaskFiltersPanel';
import BulkActionToolbar from './BulkActionToolbar';
import CompletedTasksSection from './CompletedTasksSection';
import TaskAddForm from './TaskAddForm';
import {
  processTaskList,
  createDebouncedSearch,
  executeBatchOperation,
  calculateOptimalContainerHeight,
  calculateOptimalItemHeight,
  type TaskFilters,
  type TaskSorting,
  type ProcessedTasks
} from '../lib/taskListOptimizations';

interface PomodoroSettings {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
}

interface TaskListOptimizedProps {
  settings: PomodoroSettings;
}

const ITEM_HEIGHT = 80;
const PERFORMANCE_THRESHOLD = 100; // Switch to virtual scrolling after 100 tasks

const TaskListOptimized: React.FC<TaskListOptimizedProps> = React.memo(({ settings }) => {
  // Core data hooks
  const { projects } = useProjects();
  const { labels } = useLabels();
  const { 
    tasks, 
    loading: tasksLoading, 
    error: tasksError,
    addTask,
    updateTask,
    toggleTaskCompletion,
    deleteTask,
    toggleTaskFocus,
    setTaskDeadline,
    startTimeTracking,
    stopTimeTracking,
    startAllTimeTracking,
    stopAllTimeTracking
  } = useTasks();
  
  const { event } = useGoogleAnalytics();
  
  // Time tracking
  const { activelyTrackedTasks, hasActiveTracking, getElapsedTime, formatTime } = useTimeTracking(tasks);
  
  // UI state
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [showCompleted, setShowCompleted] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editingDeadline, setEditingDeadline] = useState<{ id: string; deadline: string } | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  
  // Filter and sort state
  const [filters, setFilters] = useState<TaskFilters>({
    projectFilter: 'all',
    labelFilter: 'all',
    statusFilter: 'all',
    search: ''
  });
  
  const [sorting, setSorting] = useState<TaskSorting>({
    sortBy: 'createdAt',
    sortOrder: 'asc'
  });
  
  // Performance state
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(400);
  
  // Create memoized lookup maps for performance
  const projectMap = useMemo(() => {
    const map = new Map<string, string>();
    projects.forEach(project => {
      map.set(project.id, project.name);
    });
    return map;
  }, [projects]);
  
  const labelsMap = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string }>();
    labels.forEach(label => {
      map.set(label.id, label);
    });
    return map;
  }, [labels]);
  
  // Debounced search handler
  const debouncedSearch = useMemo(() => 
    createDebouncedSearch((search: string) => {
      setFilters(prev => ({ ...prev, search }));
      event('task_search', { query: search });
    }, 250),
    [event]
  );
  
  // Process tasks with memoization
  const processedTasks: ProcessedTasks = useMemo(() => {
    return processTaskList({
      tasks,
      filters,
      sorting,
      projects,
      separateCompleted: true
    });
  }, [tasks, filters, sorting, projects]);
  
  // Calculate optimal heights for virtualization
  const itemHeight = useMemo(() => 
    calculateOptimalItemHeight(containerHeight, processedTasks.activeTasks.length),
    [containerHeight, processedTasks.activeTasks.length]
  );
  
  const virtualListHeight = useMemo(() => 
    calculateOptimalContainerHeight(
      containerHeight,
      processedTasks.activeTasks.length,
      itemHeight,
      20
    ),
    [containerHeight, processedTasks.activeTasks.length, itemHeight]
  );
  
  // Check if we should use virtual scrolling
  const shouldUseVirtualScrolling = processedTasks.activeTasks.length > PERFORMANCE_THRESHOLD;
  
  // Update container height on resize
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerHeight(window.innerHeight - rect.top - 100);
      }
    };
    
    updateHeight();
    window.addEventListener('resize', updateHeight);
    return () => window.removeEventListener('resize', updateHeight);
  }, []);
  
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
    if (selectedTasks.size === processedTasks.activeTasks.length && processedTasks.activeTasks.length > 0) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(processedTasks.activeTasks.map(t => t.id)));
    }
  }, [processedTasks.activeTasks, selectedTasks.size]);
  
  const handleClearSelection = useCallback(() => {
    setSelectedTasks(new Set());
  }, []);
  
  // Task action handlers
  const handleToggleCompletion = useCallback(async (taskId: string, completed: boolean) => {
    try {
      await toggleTaskCompletion(taskId, completed);
      event('task_completion_toggled', { task_id: taskId, new_state: !completed });
    } catch (error) {
      console.error('Failed to toggle task completion:', error);
    }
  }, [toggleTaskCompletion, event]);
  
  const handleToggleFocus = useCallback(async (taskId: string, focus: boolean) => {
    try {
      await toggleTaskFocus(taskId, focus);
      event('task_focus_toggled', { task_id: taskId, new_state: !focus });
    } catch (error) {
      console.error('Failed to toggle task focus:', error);
    }
  }, [toggleTaskFocus, event]);
  
  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task);
    event('task_edit_started', { task_id: task.id });
  }, [event]);
  
  const handleEditDeadline = useCallback((taskId: string, deadline?: string) => {
    setEditingDeadline({ id: taskId, deadline: deadline || '' });
  }, []);
  
  const handleDeleteTask = useCallback(async (taskId: string) => {
    try {
      await deleteTask(taskId);
      event('task_deleted', { task_id: taskId });
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  }, [deleteTask, event]);
  
  // Time tracking handlers
  const handleStartTimeTracking = useCallback(async (taskId: string) => {
    try {
      await startTimeTracking(taskId);
      event('time_tracking_started', { task_id: taskId });
    } catch (error) {
      console.error('Failed to start time tracking:', error);
    }
  }, [startTimeTracking, event]);
  
  const handleStopTimeTracking = useCallback(async (taskId: string) => {
    try {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        const elapsed = getElapsedTime(task) - (task.manualTimeSpent ?? 0);
        await stopTimeTracking(taskId, elapsed);
        event('time_tracking_stopped', { task_id: taskId, elapsed_seconds: elapsed });
      }
    } catch (error) {
      console.error('Failed to stop time tracking:', error);
    }
  }, [stopTimeTracking, tasks, getElapsedTime, event]);
  
  // Bulk operations
  const handleBulkMarkDone = useCallback(async () => {
    const taskIds = Array.from(selectedTasks);
    await executeBatchOperation({
      operation: async (taskId: string) => {
        const task = tasks.find(t => t.id === taskId);
        if (task && !task.completed) {
          await toggleTaskCompletion(taskId, false);
        }
      },
      items: taskIds,
      batchSize: 10
    });
    
    setSelectedTasks(new Set());
    event('bulk_mark_done', { count: taskIds.length });
  }, [selectedTasks, tasks, toggleTaskCompletion, event]);
  
  const handleBulkDelete = useCallback(async () => {
    const taskIds = Array.from(selectedTasks);
    await executeBatchOperation({
      operation: deleteTask,
      items: taskIds,
      batchSize: 5
    });
    
    setSelectedTasks(new Set());
    event('bulk_delete', { count: taskIds.length });
  }, [selectedTasks, deleteTask, event]);
  
  const handleBulkChangeProject = useCallback(async (projectId: string) => {
    const taskIds = Array.from(selectedTasks);
    await executeBatchOperation({
      operation: async (taskId: string) => {
        await updateTask(taskId, { projectId });
      },
      items: taskIds,
      batchSize: 10
    });
    
    setSelectedTasks(new Set());
    event('bulk_change_project', { count: taskIds.length, project_id: projectId });
  }, [selectedTasks, updateTask, event]);
  
  // Optimized task item renderer for virtual list
  const renderTaskItem = useCallback((props: any) => {
    const { task } = props;
    const projectName = task.projectId ? projectMap.get(task.projectId) : undefined;
    const taskLabels = task.labelIds ? 
      task.labelIds.map((id: string) => labelsMap.get(id)).filter(Boolean) : [];
    
    return (
      <OptimizedTaskItem
        task={task}
        isSelected={selectedTasks.has(task.id)}
        projectName={projectName}
        labels={taskLabels}
        formattedElapsedTime={formatTime(getElapsedTime(task))}
        elapsedTime={getElapsedTime(task)}
        onToggleCompletion={() => handleToggleCompletion(task.id, task.completed)}
        onToggleFocus={() => handleToggleFocus(task.id, task.focus || false)}
        onToggleSelection={() => handleToggleSelection(task.id)}
        onEditTask={() => handleEditTask(task)}
        onEditDeadline={() => handleEditDeadline(task.id, task.deadline)}
        onDeleteTask={() => handleDeleteTask(task.id)}
        onStartTimeTracking={() => handleStartTimeTracking(task.id)}
        onStopTimeTracking={() => handleStopTimeTracking(task.id)}
        onViewDetail={() => {}} // Will implement later
      />
    );
  }, [
    projectMap,
    labelsMap,
    selectedTasks,
    formatTime,
    getElapsedTime,
    handleToggleCompletion,
    handleToggleFocus,
    handleToggleSelection,
    handleEditTask,
    handleEditDeadline,
    handleDeleteTask,
    handleStartTimeTracking,
    handleStopTimeTracking
  ]);
  
  // Loading and error states
  if (tasksLoading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-muted-foreground">Loading tasks...</div>
        </CardContent>
      </Card>
    );
  }
  
  if (tasksError) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-destructive">Error loading tasks: {tasksError.message}</div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full" ref={containerRef}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Your Tasks</span>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>{processedTasks.filteredCount} of {processedTasks.totalCount} tasks</span>
            {shouldUseVirtualScrolling && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                Virtual Mode
              </span>
            )}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Task Add Form */}
        {showAddTaskForm && (
          <TaskAddForm
            onSubmit={async (taskData) => {
              try {
                await addTask(
                  taskData.title,
                  taskData.projectId,
                  taskData.estimatedPomodoros,
                  taskData.focus,
                  taskData.labelIds
                );
                event('task_added', taskData);
                setShowAddTaskForm(false);
              } catch (error) {
                console.error('Failed to add task:', error);
              }
            }}
            onCancel={() => setShowAddTaskForm(false)}
            projects={projects}
            labels={labels}
          />
        )}
        
        {!showAddTaskForm && (
          <div className="flex justify-end">
            <Button onClick={() => setShowAddTaskForm(true)}>
              Add Task
            </Button>
          </div>
        )}
        
        {/* Filters Panel */}
        <TaskFiltersPanel
          filters={filters}
          sorting={sorting}
          projects={projects}
          labels={labels}
          onFiltersChange={setFilters}
          onSortingChange={setSorting}
          onSearchChange={debouncedSearch}
          activeTasksCount={processedTasks.activeTasks.length}
          hasActiveTracking={hasActiveTracking}
          onStartAllTracking={async () => {
            const taskIds = processedTasks.activeTasks
              .filter(t => !t.trackingStartedAt)
              .map(t => t.id);
            await startAllTimeTracking(taskIds);
          }}
          onStopAllTracking={async () => {
            const tasksToStop = activelyTrackedTasks.map(task => ({
              taskId: task.id,
              elapsedSeconds: getElapsedTime(task) - (task.manualTimeSpent ?? 0)
            }));
            await stopAllTimeTracking(tasksToStop);
          }}
        />
        
        {/* Selection Controls */}
        {processedTasks.activeTasks.length > 0 && (
          <div className="flex items-center justify-between py-2 border-b">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={selectedTasks.size === processedTasks.activeTasks.length && processedTasks.activeTasks.length > 0}
                onChange={handleSelectAll}
                className="rounded border-gray-300"
                aria-label="Select all tasks"
              />
              <span className="text-sm text-muted-foreground">
                {selectedTasks.size > 0
                  ? `${selectedTasks.size} task${selectedTasks.size !== 1 ? 's' : ''} selected`
                  : 'Select all'}
              </span>
            </div>
            
            {selectedTasks.size > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleClearSelection}
              >
                Clear Selection
              </Button>
            )}
          </div>
        )}
        
        {/* Task List */}
        {processedTasks.activeTasks.length > 0 ? (
          shouldUseVirtualScrolling ? (
            <VirtualTaskList
              tasks={processedTasks.activeTasks}
              height={virtualListHeight}
              itemHeight={itemHeight}
              onToggleCompletion={handleToggleCompletion}
              onToggleFocus={handleToggleFocus}
              onEditTask={handleEditTask}
              onDeleteTask={handleDeleteTask}
              selectedTasks={selectedTasks}
              onToggleSelection={handleToggleSelection}
              renderTaskItem={renderTaskItem}
            />
          ) : (
            <div className="space-y-2">
              {processedTasks.activeTasks.map(task => 
                renderTaskItem({ task, key: task.id })
              )}
            </div>
          )
        ) : (
          <div className="text-center text-muted-foreground py-8">
            {filters.search || filters.projectFilter !== 'all' || filters.labelFilter !== 'all' || filters.statusFilter !== 'all'
              ? 'No tasks match your filters'
              : 'No tasks yet. Add your first task above!'}
          </div>
        )}
        
        {/* Completed Tasks Section */}
        <div className="flex items-center justify-end space-x-2 pt-4 border-t">
          <span className="text-sm text-muted-foreground">Show completed tasks</span>
          <Switch
            checked={showCompleted}
            onCheckedChange={(checked) => {
              setShowCompleted(checked);
              event('show_completed_tasks_toggled', { new_state: checked });
            }}
          />
        </div>
        
        {showCompleted && (
          <CompletedTasksSection
            tasks={processedTasks.completedTasks}
            projectMap={projectMap}
            labelsMap={labelsMap}
            onToggleCompletion={handleToggleCompletion}
            onToggleFocus={handleToggleFocus}
            onEditTask={handleEditTask}
            onEditDeadline={handleEditDeadline}
            onDeleteTask={handleDeleteTask}
          />
        )}
        
        {/* Bulk Actions Toolbar */}
        {selectedTasks.size > 0 && (
          <BulkActionToolbar
            selectedCount={selectedTasks.size}
            onMarkDone={handleBulkMarkDone}
            onDelete={handleBulkDelete}
            onChangeProject={handleBulkChangeProject}
            onSetFocus={(focus: boolean) => {
              // Implementation for bulk focus setting
            }}
            onClearSelection={handleClearSelection}
            projects={projects}
          />
        )}
      </CardContent>
    </Card>
  );
});

TaskListOptimized.displayName = 'TaskListOptimized';

export default TaskListOptimized;