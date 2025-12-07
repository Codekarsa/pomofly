import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTasks, Task } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Plus, Pencil, Trash2, Star, Calendar, ChevronDown, ChevronRight, Search, ArrowUpAZ, ArrowDownAZ, Filter, CheckCircle } from 'lucide-react';
import TaskTimeTracker from './TaskTimeTracker';
import TimeTrackingControls from './TimeTrackingControls';
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
import { Combobox } from './ui/combobox';
import { AIBreakdownModal } from './AIBreakdownModal';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface PomodoroSettings {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
}

interface TaskListProps {
  settings: PomodoroSettings;
}

type AnalyticsEvent = (action: string, params: object) => void;

// Collapsible Completed Tasks Section
interface CompletedTasksSectionProps {
  tasks: Task[];
  onToggleTaskCompletion: (id: string, completed: boolean) => void;
  onToggleTaskFocus: (id: string, focus: boolean) => void;
  onEditTask: (task: Task) => void;
  onEditDeadline: (task: { id: string; deadline: string }) => void;
  onDeleteTask: (id: string) => void;
  event: AnalyticsEvent;
  ProjectBadge: React.FC<{ projectId: string }>;
}

const CompletedTasksSection: React.FC<CompletedTasksSectionProps> = ({
  tasks,
  onToggleTaskCompletion,
  onToggleTaskFocus,
  onEditTask,
  onEditDeadline,
  onDeleteTask,
  event,
  ProjectBadge,
}) => {
  const [open, setOpen] = useState(false);
  if (!tasks.length) return null;
  return (
    <div className="mt-4">
      <button
        className="flex items-center text-sm text-gray-600 hover:text-gray-900 focus:outline-none mb-2"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
        {tasks.length} completed task{tasks.length > 1 ? 's' : ''}
      </button>
      {open && (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between p-2 bg-muted rounded-md transition-colors">
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleTaskCompletion(task.id, task.completed)}
                  className="p-1 text-green-500 hover:text-gray-400"
                  aria-label="Mark as incomplete"
                >
                  <CheckCircle className="w-4 h-4" fill="currentColor" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleTaskFocus(task.id, task.focus || false)}
                  className={`p-1 ${task.focus ? 'text-yellow-500' : 'text-gray-400'}`}
                >
                  <Star className="w-4 h-4" fill={task.focus ? 'currentColor' : 'none'} />
                </Button>
                <span className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
                {task.projectId && <ProjectBadge projectId={task.projectId} />}
                <span className="text-xs text-muted-foreground">
                  ({task.totalPomodoroSessions || 0}/{task.estimatedPomodoros || 0})
                </span>
                {task.deadline && (
                  <span className={`text-xs px-2 py-1 rounded ${
                    new Date(task.deadline) < new Date() 
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-blue-100 text-blue-800'
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
                    onEditTask(task);
                    event('task_edit_started', { task_id: task.id });
                  }}>
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    onEditDeadline({
                      id: task.id,
                      deadline: task.deadline || ''
                    });
                  }}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Set Deadline
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDeleteTask(task.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'focused', label: "Today's Focus" },
];

const sortOptions = [
  { value: 'createdAt', label: 'Created date' },
  { value: 'deadline', label: 'Due date' },
  { value: 'title', label: 'Title (A-Z)' },
  { value: 'project', label: 'Project' },
  { value: 'focus', label: 'Focus' },
];

const TaskList: React.FC<TaskListProps> = React.memo(({ settings }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [estimatedPomodoros, setEstimatedPomodoros] = useState<number | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [editingTask, setEditingTask] = useState<{ id: string, title: string, estimatedPomodoros?: number, projectId?: string } | null>(null);
  const [editingDeadline, setEditingDeadline] = useState<{ id: string, deadline: string } | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [showAIBreakdownModal, setShowAIBreakdownModal] = useState(false);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  const { projects } = useProjects();
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
  } = useTasks(selectedProjectId);
  const { event } = useGoogleAnalytics();

  const memoizedProjects = useMemo(() => projects, [projects]);
  const memoizedTasks = useMemo(() => tasks, [tasks]);

  // Time tracking hook
  const { activelyTrackedTasks, hasActiveTracking, getElapsedTime, formatTime } = useTimeTracking(memoizedTasks);

  // Helper function to get project name by ID
  const getProjectName = useCallback((projectId: string) => {
    const project = memoizedProjects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  }, [memoizedProjects]);

  // Project Badge Component
  const ProjectBadge = ({ projectId }: { projectId: string }) => {
    const projectName = getProjectName(projectId);
    const displayName = projectName.length > 8 ? projectName.substring(0, 8) + '...' : projectName;
    
    // Debug logging
    console.log('ProjectBadge Debug:', {
      projectId,
      projectName,
      availableProjects: memoizedProjects.map(p => ({ id: p.id, name: p.name })),
      foundProject: memoizedProjects.find(p => p.id === projectId)
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

  useEffect(() => {
    event('task_list_view', { total_tasks: tasks.length });
  }, [event, tasks.length]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (newTaskTitle.trim() && selectedProjectId) {
      try {
        await addTask(newTaskTitle, selectedProjectId, estimatedPomodoros);
        event('task_added', {
          project_id: selectedProjectId,
          estimated_pomodoros: estimatedPomodoros
        });
        setNewTaskTitle('');
        setEstimatedPomodoros(0);
      } catch (error) {
        console.error("Failed to add task:", error);
        event('task_add_error', { error_message: (error as Error).message });
      }
    }
  }, [addTask, event, estimatedPomodoros, newTaskTitle, selectedProjectId]);

  const handleUpdateTask = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask && editingTask.title.trim()) {
      try {
        await updateTask(editingTask.id, {
          title: editingTask.title,
          estimatedPomodoros: editingTask.estimatedPomodoros,
          projectId: editingTask.projectId
        });
        event('task_updated', {
          task_id: editingTask.id,
          new_estimated_pomodoros: editingTask.estimatedPomodoros,
          new_project_id: editingTask.projectId
        });
        setEditingTask(null);
      } catch (error) {
        console.error("Failed to update task:", error);
        event('task_update_error', {
          task_id: editingTask.id,
          error_message: (error as Error).message
        });
      }
    }
  }, [editingTask, event, updateTask]);

  // Filtering logic
  const filteredTasks = useMemo(() => {
    let tasks = memoizedTasks;
    if (projectFilter !== 'all') {
      tasks = tasks.filter(task => task.projectId === projectFilter);
    }
    if (statusFilter === 'active') {
      tasks = tasks.filter(task => !task.completed);
    } else if (statusFilter === 'completed') {
      tasks = tasks.filter(task => task.completed);
    } else if (statusFilter === 'focused') {
      tasks = tasks.filter(task => task.focus);
    }
    if (search.trim()) {
      tasks = tasks.filter(task => task.title.toLowerCase().includes(search.toLowerCase()));
    }
    return tasks;
  }, [memoizedTasks, projectFilter, statusFilter, search]);

  // Sorting logic
  const sortedTasks = useMemo(() => {
    const tasks = [...filteredTasks];
    tasks.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'createdAt') {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortBy === 'deadline') {
        cmp = (a.deadline ? new Date(a.deadline).getTime() : 0) - (b.deadline ? new Date(b.deadline).getTime() : 0);
      } else if (sortBy === 'title') {
        cmp = a.title.localeCompare(b.title);
      } else if (sortBy === 'project') {
        cmp = (getProjectName(a.projectId) || '').localeCompare(getProjectName(b.projectId) || '');
      } else if (sortBy === 'focus') {
        cmp = (b.focus ? 1 : 0) - (a.focus ? 1 : 0);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return tasks;
  }, [filteredTasks, sortBy, sortOrder, getProjectName]);

  // Only paginate active (incomplete) tasks after filtering/sorting
  const activeTasks = useMemo(() => sortedTasks.filter(task => !task.completed), [sortedTasks]);
  const completedTasks = useMemo(() => sortedTasks.filter(task => task.completed), [sortedTasks]);
  const paginatedActiveTasks = useMemo(() =>
    activeTasks.slice(0, (currentPage + 1) * itemsPerPage),
    [activeTasks, currentPage, itemsPerPage]
  );

  const handleToggleTaskCompletion = useCallback((taskId: string, currentCompletionState: boolean) => {
    toggleTaskCompletion(taskId, currentCompletionState);
    event('task_completion_toggled', {
      task_id: taskId,
      new_state: !currentCompletionState
    });
  }, [event, toggleTaskCompletion]);

  const handleDeleteTask = useCallback((taskId: string) => {
    deleteTask(taskId);
    event('task_deleted', { task_id: taskId });
  }, [deleteTask, event]);

  const handleToggleTaskFocus = useCallback((taskId: string, currentFocusState: boolean) => {
    toggleTaskFocus(taskId, currentFocusState);
    event('task_focus_toggled', {
      task_id: taskId,
      new_state: !currentFocusState
    });
  }, [toggleTaskFocus, event]);

  const handleSetTaskDeadline = useCallback((taskId: string, deadline: string | null) => {
    setTaskDeadline(taskId, deadline);
    event('task_deadline_set', {
      task_id: taskId,
      deadline
    });
    setEditingDeadline(null);
  }, [setTaskDeadline, event]);

  const handleShowCompletedToggle = useCallback(() => {
    setShowCompleted(!showCompleted);
    event('show_completed_tasks_toggled', { new_state: !showCompleted });
  }, [event, showCompleted]);

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
    if (selectedTasks.size === activeTasks.length && activeTasks.length > 0) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(activeTasks.map(t => t.id)));
    }
  }, [activeTasks, selectedTasks.size]);

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
    event('bulk_mark_done', { count: tasksToComplete.length });
  }, [selectedTasks, tasks, toggleTaskCompletion, event]);

  const handleBulkDelete = useCallback(async () => {
    const tasksToDelete = Array.from(selectedTasks);
    for (const taskId of tasksToDelete) {
      await deleteTask(taskId);
    }
    setSelectedTasks(new Set());
    event('bulk_delete', { count: tasksToDelete.length });
  }, [selectedTasks, deleteTask, event]);

  const handleBulkChangeProject = useCallback(async (projectId: string) => {
    const tasksToUpdate = Array.from(selectedTasks);
    for (const taskId of tasksToUpdate) {
      await updateTask(taskId, { projectId });
    }
    setSelectedTasks(new Set());
    event('bulk_change_project', { count: tasksToUpdate.length, project_id: projectId });
  }, [selectedTasks, updateTask, event]);

  const handleBulkSetFocus = useCallback(async (focus: boolean) => {
    const tasksToUpdate = Array.from(selectedTasks);
    for (const taskId of tasksToUpdate) {
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        await toggleTaskFocus(taskId, !focus);
      }
    }
    setSelectedTasks(new Set());
    event('bulk_set_focus', { count: tasksToUpdate.length, focus });
  }, [selectedTasks, tasks, toggleTaskFocus, event]);

  const loadMoreTasks = useCallback(() => {
    if ((currentPage + 1) * itemsPerPage < activeTasks.length) {
      setCurrentPage(prevPage => prevPage + 1);
      event('load_more_tasks', { new_page: currentPage + 1 });
    }
  }, [currentPage, event, activeTasks.length, itemsPerPage]);

  const handleAIBreakdownSave = (tasks: { title: string; estimatedPomodoros: number }[]) => {
    tasks.forEach(task => {
      addTask(task.title, selectedProjectId, task.estimatedPomodoros);
    });
    setShowAIBreakdownModal(false);
  };

  // Time tracking handlers
  const handleStartTracking = useCallback(async (taskId: string) => {
    try {
      await startTimeTracking(taskId);
      event('time_tracking_started', { task_id: taskId });
    } catch (error) {
      console.error('Failed to start time tracking:', error);
    }
  }, [startTimeTracking, event]);

  const handleStopTracking = useCallback(async (task: Task) => {
    try {
      const elapsed = getElapsedTime(task) - (task.manualTimeSpent ?? 0);
      await stopTimeTracking(task.id, elapsed);
      event('time_tracking_stopped', { task_id: task.id, elapsed_seconds: elapsed });
    } catch (error) {
      console.error('Failed to stop time tracking:', error);
    }
  }, [stopTimeTracking, getElapsedTime, event]);

  const handleStartAllTracking = useCallback(async () => {
    const taskIds = activeTasks.filter(t => t.trackingStartedAt == null).map(t => t.id);
    if (taskIds.length === 0) return;
    try {
      await startAllTimeTracking(taskIds);
      event('time_tracking_start_all', { count: taskIds.length });
    } catch (error) {
      console.error('Failed to start all time tracking:', error);
    }
  }, [activeTasks, startAllTimeTracking, event]);

  const handleStopAllTracking = useCallback(async () => {
    const tasksToStop = activelyTrackedTasks.map(task => ({
      taskId: task.id,
      elapsedSeconds: getElapsedTime(task) - (task.manualTimeSpent ?? 0)
    }));
    if (tasksToStop.length === 0) return;
    try {
      await stopAllTimeTracking(tasksToStop);
      event('time_tracking_stop_all', { count: tasksToStop.length });
    } catch (error) {
      console.error('Failed to stop all time tracking:', error);
    }
  }, [activelyTrackedTasks, getElapsedTime, stopAllTimeTracking, event]);

  if (tasksLoading) return <div>Loading tasks...</div>;
  if (tasksError) return <div>Error loading tasks: {tasksError.message}</div>;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Your Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
          {!showAddTaskForm && (
            <Button onClick={() => setShowAddTaskForm(true)} className="mr-2">
              Add Task
            </Button>
          )}
          <Button onClick={() => setShowAIBreakdownModal(true)} className="ml-2 bg-indigo-600 text-white hover:bg-indigo-800">
            Task Breakdown with AI
          </Button>
        </div>

        {showAddTaskForm && (
          <form onSubmit={handleSubmit} className="space-y-4 mb-6">
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="New task title"
                className="w-full"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                value={estimatedPomodoros}
                onChange={(e) => setEstimatedPomodoros(e.target.value ? parseInt(e.target.value) : undefined)}
                placeholder="Estimated Pomodoros"
                className="w-1/2"
              />
              <div className="w-1/2">
                <Combobox
                  options={memoizedProjects.map(project => ({ value: project.id, label: project.name }))}
                  value={selectedProjectId}
                  onChange={(value) => setSelectedProjectId(value)}
                  placeholder="Select a project"
                />
              </div>

            </div>
            <div className="flex items-center space-x-2">
              <Button type="submit" className="w-1/2">
                <Plus className="w-4 h-4 mr-2" />
                Add Task
              </Button>
              <Button type="button" onClick={() => setShowAddTaskForm(false)} variant="outline" className="w-1/2">
                Cancel
              </Button>
            </div>
          </form>
        )}

        <hr />
        <div className="flex items-center gap-2 mb-4">
          <div className="relative w-full max-w-xs">
            <Input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="pl-9 w-full"
              aria-label="Search tasks"
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="min-w-[110px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="ml-1"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            aria-label="Toggle sort order"
          >
            {sortOrder === 'asc' ? <ArrowUpAZ className="w-4 h-4" /> : <ArrowDownAZ className="w-4 h-4" />}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Filter tasks" className="relative w-24 flex justify-center items-center">
                <Filter className="w-4 h-4" />
                {(projectFilter !== 'all' || statusFilter !== 'all') && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 flex flex-col gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Project</label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {memoizedProjects.map(project => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </PopoverContent>
          </Popover>
          <TimeTrackingControls
            hasActiveTracking={hasActiveTracking}
            activeCount={activelyTrackedTasks.length}
            onStartAll={handleStartAllTracking}
            onStopAll={handleStopAllTracking}
            disabled={activeTasks.length === 0}
          />
        </div>
        {activeTasks.length > 0 && (
          <div className="flex items-center space-x-2 mb-3 pb-2 border-b">
            <Checkbox
              checked={selectedTasks.size === activeTasks.length && activeTasks.length > 0}
              onCheckedChange={handleSelectAll}
              aria-label="Select all tasks"
            />
            <span className="text-sm text-muted-foreground">
              {selectedTasks.size > 0
                ? `${selectedTasks.size} task${selectedTasks.size !== 1 ? 's' : ''} selected`
                : 'Select all'}
            </span>
          </div>
        )}
        <ul className="space-y-2">
          {paginatedActiveTasks.map((task) => (
            <li key={task.id} className={`flex items-center justify-between p-2 rounded-md transition-colors ${selectedTasks.has(task.id) ? 'bg-blue-50' : 'hover:bg-accent'}`}>
              {editingTask && editingTask.id === task.id ? (
                <form onSubmit={handleUpdateTask} className="flex flex-col space-y-2 w-full">
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      value={editingTask.title}
                      onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                      className="flex-grow"
                      placeholder="Task title"
                    />
                    <Input
                      type="number"
                      value={editingTask.estimatedPomodoros}
                      onChange={(e) => setEditingTask({ ...editingTask, estimatedPomodoros: e.target.value ? parseInt(e.target.value) : undefined })}
                      placeholder="Pomodoros"
                      className="w-24"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Combobox
                      options={memoizedProjects.map(project => ({ value: project.id, label: project.name }))}
                      value={editingTask.projectId || ''}
                      onChange={(value) => setEditingTask({ ...editingTask, projectId: value })}
                      placeholder="Select a project"
                    />
                    <Button type="submit" size="sm" variant="outline">Save</Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setEditingTask(null)}>Cancel</Button>
                  </div>
                </form>
              ) : editingDeadline && editingDeadline.id === task.id ? (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleSetTaskDeadline(task.id, editingDeadline.deadline || null);
                }} className="flex items-center space-x-2 w-full">
                  <Input
                    type="date"
                    value={editingDeadline.deadline}
                    onChange={(e) => setEditingDeadline({ ...editingDeadline, deadline: e.target.value })}
                    className="flex-grow"
                  />
                  <Button type="submit" size="sm" variant="outline">Save</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditingDeadline(null)}>Cancel</Button>
                </form>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedTasks.has(task.id)}
                      onCheckedChange={() => handleToggleSelection(task.id)}
                      aria-label={`Select task: ${task.title}`}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleTaskCompletion(task.id, task.completed)}
                      className={`p-1 ${task.completed ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}`}
                      aria-label={task.completed ? "Mark as incomplete" : "Mark as complete"}
                    >
                      <CheckCircle className="w-4 h-4" fill={task.completed ? 'currentColor' : 'none'} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleTaskFocus(task.id, task.focus || false)}
                      className={`p-1 ${task.focus ? 'text-yellow-500' : 'text-gray-400'}`}
                    >
                      <Star className="w-4 h-4" fill={task.focus ? 'currentColor' : 'none'} />
                    </Button>
                    <span className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
                    {task.projectId && <ProjectBadge projectId={task.projectId} />}
                    <span className="text-xs text-muted-foreground">
                      ({task.totalPomodoroSessions || 0}/{task.estimatedPomodoros || 0})
                    </span>
                    {task.deadline && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        new Date(task.deadline) < new Date()
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {new Date(task.deadline).toLocaleDateString()}
                        {new Date(task.deadline) < new Date() && ' (Overdue)'}
                      </span>
                    )}
                    <TaskTimeTracker
                      formattedTime={formatTime(getElapsedTime(task))}
                      elapsedTime={getElapsedTime(task)}
                      isTracking={task.trackingStartedAt != null}
                      onStart={() => handleStartTracking(task.id)}
                      onStop={() => handleStopTracking(task)}
                      disabled={task.completed}
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditingTask({
                          id: task.id,
                          title: task.title,
                          estimatedPomodoros: task.estimatedPomodoros,
                          projectId: task.projectId
                        });
                        event('task_edit_started', { task_id: task.id });
                      }}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setEditingDeadline({
                          id: task.id,
                          deadline: task.deadline || ''
                        });
                      }}>
                        <Calendar className="w-4 h-4 mr-2" />
                        Set Deadline
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteTask(task.id)}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </>
              )}
            </li>
          ))}
        </ul>
        {paginatedActiveTasks.length < activeTasks.length && (
          <div className="flex justify-center mt-4">
            <Button onClick={loadMoreTasks} variant="outline">
              Load More
            </Button>
          </div>
        )}
        <div className="flex items-center justify-end space-x-2 mt-4 mb-2">
          <span id="show-completed-label" className="text-sm text-muted-foreground">Show completed tasks</span>
          <Switch
            checked={showCompleted}
            onCheckedChange={handleShowCompletedToggle}
            aria-labelledby="show-completed-label"
          />
        </div>
        {showCompleted && (
          <CompletedTasksSection
            tasks={completedTasks}
            onToggleTaskCompletion={handleToggleTaskCompletion}
            onToggleTaskFocus={handleToggleTaskFocus}
            onEditTask={setEditingTask}
            onEditDeadline={setEditingDeadline}
            onDeleteTask={handleDeleteTask}
            event={event}
            ProjectBadge={ProjectBadge}
          />
        )}
        {selectedTasks.size > 0 && (
          <BulkActionToolbar
            selectedCount={selectedTasks.size}
            onMarkDone={handleBulkMarkDone}
            onDelete={handleBulkDelete}
            onChangeProject={handleBulkChangeProject}
            onSetFocus={handleBulkSetFocus}
            onClearSelection={handleClearSelection}
            projects={memoizedProjects}
          />
        )}
      </CardContent>
      <AIBreakdownModal
        isOpen={showAIBreakdownModal}
        onClose={() => setShowAIBreakdownModal(false)}
        onSave={handleAIBreakdownSave}
        settings={settings}
        projects={projects}
      />
    </Card>
  );
});

TaskList.displayName = 'TaskList';

export default TaskList;
