import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useTasks, Task } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useEstimation, type EstimationResult } from '@/hooks/useEstimation';
import { Button } from '@/components/ui/button';
import { MobileButton } from '@/components/ui/mobile-button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { taskDateKey, shiftTaskDate, shiftTaskMonth, startOfTaskWeek, formatTaskDate } from '@/lib/taskDates';
import TaskPlan, { TASK_DRAG_TYPE } from './TaskPlan';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Plus, Pencil, Trash2, Star, Calendar, ChevronDown, ChevronRight, ChevronLeft, Search, ArrowUpAZ, ArrowDownAZ, Filter, CheckCircle, Eye, FolderOpen } from 'lucide-react';
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
import { cn } from '@/lib/utils';
import LabelPicker, { LabelBadge } from './LabelPicker';
import { useLabels } from '@/hooks/useLabels';
import { EstimationHint } from './EstimationHint';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  TaskLabels: React.FC<{ labelIds?: string[] }>;
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
  TaskLabels,
}) => {
  const [open, setOpen] = useState(false);
  if (!tasks.length) return null;
  return (
    <div className="mt-4">
      <button
        className="flex min-h-11 items-center text-sm text-muted-foreground hover:text-foreground focus-visible:ring-1 focus-visible:ring-ring mb-2"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? <ChevronDown className="w-4 h-4 mr-1" /> : <ChevronRight className="w-4 h-4 mr-1" />}
        {tasks.length} completed task{tasks.length > 1 ? 's' : ''}
      </button>
      {open && (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li key={task.id} className="flex items-start justify-between gap-2 p-2 bg-muted rounded-md transition-colors">
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <MobileButton
                  variant="ghost"
                  size="icon"
                  onClick={() => onToggleTaskCompletion(task.id, task.completed)}
                  className="text-primary hover:text-muted-foreground"
                  aria-label="Mark as incomplete"
                >
                  <CheckCircle className="w-4 h-4" fill="currentColor" />
                </MobileButton>
                <MobileButton
                  variant="ghost"
                  size="icon"
                  onClick={() => onToggleTaskFocus(task.id, task.focus || false)}
                  className={`${task.focus ? 'text-amber-600' : 'text-muted-foreground'}`}
                  aria-label={task.focus ? 'Unstar task' : 'Star task'}
                  aria-pressed={!!task.focus}
                >
                  <Star className="w-4 h-4" fill={task.focus ? 'currentColor' : 'none'} />
                </MobileButton>
                <span className={`order-first min-w-0 basis-full break-words text-sm [overflow-wrap:anywhere] ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
                {task.projectId && <ProjectBadge projectId={task.projectId} />}
                <TaskLabels labelIds={task.labelIds} />
                <span className="text-xs text-muted-foreground">
                  {task.totalPomodoroSessions || 0} focus sessions completed{task.estimatedPomodoros ? ` · ${task.estimatedPomodoros} estimated` : ''}
                </span>
                {task.deadline && (
                  <span className={`text-xs px-2 py-1 rounded ${
                    task.deadline < taskDateKey(new Date())
                      ? 'bg-red-100 text-red-800' 
                      : 'bg-muted text-muted-foreground'
                  }`}>
                    Due {formatTaskDate(task.deadline)}
                    {task.deadline < taskDateKey(new Date()) && ' (Overdue)'}
                  </span>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <MobileButton variant="ghost" size="icon" aria-label={`Actions for ${task.title}`}>
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
  { value: 'focused', label: 'Starred' },
];

const sortOptions = [
  { value: 'createdAt', label: 'Created date' },
  { value: 'deadline', label: 'Due date' },
  { value: 'title', label: 'Title (A-Z)' },
  { value: 'project', label: 'Project' },
  { value: 'focus', label: 'Starred' },
];

const TaskList = React.memo(() => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [batchEntry, setBatchEntry] = useState(false);
  const [newTaskPlannedFor, setNewTaskPlannedFor] = useState('');
  const [newTaskDeadline, setNewTaskDeadline] = useState('');
  const titleInput = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const [created, setCreated] = useState<{ count: number; id: string } | null>(null);
  const [taskView, setTaskView] = useState<'all' | 'today' | 'tomorrow' | 'week' | 'calendar'>('all');
  const today = taskDateKey(new Date());
  const [weekStart, setWeekStart] = useState(() => startOfTaskWeek(today));
  const [calendarMonth, setCalendarMonth] = useState(() => shiftTaskMonth(today, 0));
  const [calendarDay, setCalendarDay] = useState(today);
  const planDays = taskView === 'week' ? Array.from({ length: 7 }, (_, index) => shiftTaskDate(weekStart, index)) : [taskView === 'calendar' ? calendarDay : taskView === 'tomorrow' ? shiftTaskDate(today, 1) : today];
  const canDragTasks = taskView === 'week' || taskView === 'calendar';
  const [dateEditor, setDateEditor] = useState<{ ids: string[]; field: 'plannedFor' | 'deadline'; value: string } | null>(null);
  const [savingDates, setSavingDates] = useState(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const [estimatedPomodoros, setEstimatedPomodoros] = useState<number | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [newTaskFocus, setNewTaskFocus] = useState(false);
  const [newTaskLabelIds, setNewTaskLabelIds] = useState<string[]>([]);
  const [editingTask, setEditingTask] = useState<{ id: string, title: string, estimatedPomodoros?: number, projectId?: string, labelIds?: string[] } | null>(null);
  const [editingDeadline, setEditingDeadline] = useState<{ id: string, deadline: string } | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [addTaskError, setAddTaskError] = useState<string | null>(null);
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [labelFilter, setLabelFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [search, setSearch] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  
  // Estimation state
  const [estimation, setEstimation] = useState<EstimationResult | null>(null);
  const [estimationDebounceTimer, setEstimationDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const { projects, addProject } = useProjects();
  const { getEstimate } = useEstimation();
  const { labels } = useLabels();
  const {
    tasks,
    loading: tasksLoading,
    error: tasksError,
    addTask,
    addTasks,
    setTaskDates,
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

  const memoizedProjects = useMemo(() => projects, [projects]);
  const memoizedTasks = useMemo(() => tasks, [tasks]);

  // Time tracking hook
  const { activelyTrackedTasks, hasActiveTracking, getElapsedTime, formatTime } = useTimeTracking(memoizedTasks);

  const handleCreateProject = useCallback(async (name: string) => {
    try {
      const newProjectId = await addProject(name);
      if (newProjectId) {
        setSelectedProjectId(newProjectId);
        event('project_created_from_task_form', { project_name: name });
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  }, [addProject, event]);

  const handleCreateProjectForEdit = useCallback(async (name: string) => {
    try {
      const newProjectId = await addProject(name);
      if (newProjectId) {
        setEditingTask(prev => prev ? { ...prev, projectId: newProjectId } : prev);
        event('project_created_from_task_form', { project_name: name });
      }
    } catch (error) {
      console.error("Failed to create project:", error);
    }
  }, [addProject, event]);

  // Handle applying estimation suggestion
  const handleApplyEstimation = useCallback(() => {
    if (estimation) {
      setEstimatedPomodoros(estimation.suggestedPomodoros);
      // Track the source of the estimate
      event('estimation_applied', {
        suggested_pomodoros: estimation.suggestedPomodoros,
        confidence: estimation.confidence,
        similar_tasks_count: estimation.similarTasksCount,
        task_title: newTaskTitle
      });
      // Clear the estimation after applying
      setEstimation(null);
    }
  }, [estimation, event, newTaskTitle]);

  // Helper function to get project name by ID
  const getProjectName = useCallback((projectId: string) => {
    if (!projectId) return 'Inbox';
    const project = memoizedProjects.find(p => p.id === projectId);
    return project?.name || 'Unknown Project';
  }, [memoizedProjects]);

  // Project Badge Component
  const ProjectBadge = ({ projectId }: { projectId: string }) => {
    const projectName = getProjectName(projectId);

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex max-w-full items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-secondary text-secondary-foreground transition-colors duration-150 hover:bg-secondary/80">
              <FolderOpen className="w-3 h-3 shrink-0" />
              <span className="min-w-0 break-words [overflow-wrap:anywhere]">{projectName}</span>
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <p>{projectName}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  // Task Labels Component
  const TaskLabels = ({ labelIds }: { labelIds?: string[] }) => {
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
  };

  useEffect(() => {
    event('task_list_view', { total_tasks: tasks.length });
  }, [event, tasks.length]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const view = params.get('view');
    if (view === 'week' || view === 'calendar') setTaskView(view);
    if (params.get('project')) setProjectFilter(params.get('project')!);
  }, []);

  const openTaskForm = useCallback((day = '') => {
    setNewTaskPlannedFor(day);
    if (projectFilter !== 'all') setSelectedProjectId(projectFilter === 'inbox' ? '' : projectFilter);
    setNewTaskLabelIds(labelFilter === 'all' ? [] : [labelFilter]);
    setNewTaskFocus(statusFilter === 'focused');
    setShowAddTaskForm(true);
    setCreated(null);
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ block: 'start' });
      titleInput.current?.focus();
    });
  }, [projectFilter, labelFilter, statusFilter]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setAddTaskError(null);
    const titles = batchEntry ? newTaskTitle.split(/\r?\n/).map(title => title.trim()).filter(Boolean) : [newTaskTitle.trim()];
    if (!titles.length || !titles[0]) {
      setAddTaskError('Enter a task title.');
      e.currentTarget.scrollIntoView({ block: 'start' });
      return;
    }
    if (titles.length > 500 || titles.some(title => title.length > 500)) {
      setAddTaskError('Use at most 500 tasks per batch and 500 characters per title. Nothing has been added.');
      return;
    }
    if (isAddingTask) return;
    const keepOpen = batchEntry || (e.nativeEvent as SubmitEvent).submitter?.getAttribute('data-keep-open') === 'true';
    setIsAddingTask(true);
    try {
      const dates = { plannedFor: newTaskPlannedFor || null, deadline: newTaskDeadline || null };
      const ids = batchEntry
        ? await addTasks(titles, selectedProjectId, estimatedPomodoros, newTaskFocus, newTaskLabelIds, dates)
        : [await addTask(titles[0], selectedProjectId, estimatedPomodoros, newTaskFocus, newTaskLabelIds, dates)];
      setCreated({ count: ids.length, id: ids[0] });

      // Track estimation source analytics
      const estimationSource = estimation ? 'ai-suggested' : 'manual';
      event('task_added', {
        project_id: selectedProjectId,
        estimated_pomodoros: estimatedPomodoros,
        focus: newTaskFocus,
        label_count: newTaskLabelIds.length,
        estimation_source: estimationSource,
        ai_suggested_estimate: estimation?.suggestedPomodoros,
        ai_confidence: estimation?.confidence
      });

      // Keep planning/filter context; the confirmation links to a task even if filters hide it.
      setNewTaskTitle('');
      if (!keepOpen) {
        setNewTaskDeadline('');
        setNewTaskPlannedFor('');
        setEstimatedPomodoros(undefined);
        setNewTaskFocus(false);
        setNewTaskLabelIds([]);
      }
      setEstimation(null);
      if (taskView === 'all' && sortBy === 'createdAt') {
        setSortOrder('desc');
        setCurrentPage(0);
      }
      setShowAddTaskForm(keepOpen);
      if (keepOpen) requestAnimationFrame(() => titleInput.current?.focus());
    } catch (error) {
      console.error("Failed to add task:", error);
      setAddTaskError('Could not save the tasks. Your input has been kept. Please try again.');
      event('task_add_error', { error_message: (error as Error).message });
    } finally {
      setIsAddingTask(false);
    }
  }, [addTask, addTasks, batchEntry, newTaskPlannedFor, newTaskDeadline, taskView, sortBy, event, estimatedPomodoros, newTaskTitle, selectedProjectId, newTaskFocus, newTaskLabelIds, estimation, isAddingTask]);

  const handleUpdateTask = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTask && editingTask.title.trim()) {
      try {
        await updateTask(editingTask.id, {
          title: editingTask.title,
          estimatedPomodoros: editingTask.estimatedPomodoros,
          projectId: editingTask.projectId,
          labelIds: editingTask.labelIds
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

  // Debounced estimation effect
  useEffect(() => {
    // Clear existing timer
    if (estimationDebounceTimer) {
      clearTimeout(estimationDebounceTimer);
    }

    // Only estimate if title is long enough and user hasn't entered an estimate yet
    if (!batchEntry && newTaskTitle.length >= 5) {
      const timer = setTimeout(async () => {
        try {
          const result = await getEstimate(
            newTaskTitle,
            selectedProjectId || undefined,
            estimatedPomodoros
          );
          
          // Only show suggestion if user estimate doesn't match
          if (result && result.confidence !== 'none' && 
              (!estimatedPomodoros || estimatedPomodoros !== result.suggestedPomodoros)) {
            setEstimation(result);
          } else {
            setEstimation(null);
          }
        } catch (error) {
          console.error('Error getting estimation:', error);
          setEstimation(null);
        }
      }, 500); // 500ms debounce

      setEstimationDebounceTimer(timer);
    } else {
      setEstimation(null);
    }

    // Cleanup function
    return () => {
      if (estimationDebounceTimer) {
        clearTimeout(estimationDebounceTimer);
      }
    };
  }, [newTaskTitle, selectedProjectId, getEstimate, estimatedPomodoros, batchEntry]);

  // Filtering logic
  const filteredTasks = useMemo(() => {
    let tasks = memoizedTasks;
    if (projectFilter !== 'all') {
      tasks = tasks.filter(task => projectFilter === 'inbox' ? !task.projectId : task.projectId === projectFilter);
    }
    if (labelFilter !== 'all') {
      tasks = tasks.filter(task => task.labelIds?.includes(labelFilter));
    }
    if (statusFilter === 'active') {
      tasks = tasks.filter(task => !task.completed);
    } else if (statusFilter === 'completed') {
      tasks = tasks.filter(task => task.completed);
    } else if (statusFilter === 'focused') {
      tasks = tasks.filter(task => task.focus);
    }
    if (search.trim()) {
      tasks = tasks.filter(task => task.title.toLowerCase().includes(search.trim().toLowerCase()));
    }
    return tasks;
  }, [memoizedTasks, projectFilter, labelFilter, statusFilter, search]);

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
  const selectableTasks = taskView === 'all' ? activeTasks
    : taskView === 'calendar' ? activeTasks.filter(task => !task.plannedFor || task.plannedFor === calendarDay)
    : activeTasks.filter(task => !task.plannedFor || task.plannedFor <= planDays[planDays.length - 1]);
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
    setTaskToDelete(taskId);
    setShowDeleteConfirm(true);
  }, []);

  const confirmDeleteTask = useCallback(async () => {
    if (taskToDelete) {
      await deleteTask(taskToDelete);
      event('task_deleted', { task_id: taskToDelete });
      setTaskToDelete(null);
      setShowDeleteConfirm(false);
    }
  }, [taskToDelete, deleteTask, event]);

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
    if (selectedTasks.size === selectableTasks.length && selectableTasks.length > 0) {
      setSelectedTasks(new Set());
    } else {
      setSelectedTasks(new Set(selectableTasks.map(t => t.id)));
    }
  }, [selectableTasks, selectedTasks.size]);

  useEffect(() => {
    setSelectedTasks(new Set());
    setCurrentPage(0);
  }, [projectFilter, labelFilter, statusFilter, search, taskView, weekStart, calendarDay]);

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

  const handleMoveTask = useCallback(async (taskId: string, day: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task || (task.plannedFor || '') === day) return;
    try {
      await setTaskDates([taskId], { plannedFor: day || null });
      event('task_moved_in_plan', { task_id: taskId, view: taskView, scheduled: !!day });
    } catch (error) {
      console.error('Failed to move task:', error);
    }
  }, [tasks, setTaskDates, event, taskView]);

  const loadMoreTasks = useCallback(() => {
    if ((currentPage + 1) * itemsPerPage < activeTasks.length) {
      setCurrentPage(prevPage => prevPage + 1);
      event('load_more_tasks', { new_page: currentPage + 1 });
    }
  }, [currentPage, event, activeTasks.length, itemsPerPage]);

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
    const taskIds = selectableTasks.filter(t => t.trackingStartedAt == null).map(t => t.id);
    if (taskIds.length === 0) return;
    try {
      await startAllTimeTracking(taskIds);
      event('time_tracking_start_all', { count: taskIds.length });
    } catch (error) {
      console.error('Failed to start all time tracking:', error);
    }
  }, [selectableTasks, startAllTimeTracking, event]);

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

  const batchTaskCount = newTaskTitle.split(/\r?\n/).filter(title => title.trim()).length;
  if (tasksLoading) return <div>Loading tasks...</div>;
  if (tasksError) return <div>Error loading tasks: {tasksError.message}</div>;

  return (
    <Card className="w-full border-0 bg-transparent" data-wide-plan={canDragTasks || undefined}>
      <CardHeader className="flex-row items-center justify-between gap-2 space-y-0 px-0 pt-0">
        <CardTitle>{tasks.length === 0 ? 'What would you like to work on?' : 'Your Tasks'}</CardTitle>
        {!showAddTaskForm && tasks.length > 0 && <Button onClick={() => openTaskForm(taskView === 'all' ? '' : planDays[0])}>Add Task</Button>}
      </CardHeader>
      <CardContent className="px-0">

        {(showAddTaskForm || tasks.length === 0) && (
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 mb-6 scroll-mt-4" aria-label="Add tasks">
            {addTaskError && <p role="alert" className="text-sm text-destructive">{addTaskError}</p>}
            <div className="flex flex-wrap gap-2" aria-label="Task entry mode">
              <Button type="button" size="sm" disabled={isAddingTask || newTaskTitle.includes('\n')} title={newTaskTitle.includes('\n') ? 'Keep multiple tasks in paste mode, or clear the extra lines first.' : undefined} variant={!batchEntry ? 'default' : 'outline'} aria-pressed={!batchEntry} onClick={() => setBatchEntry(false)}>Single task</Button>
              <Button type="button" size="sm" disabled={isAddingTask} variant={batchEntry ? 'default' : 'outline'} aria-pressed={batchEntry} onClick={() => setBatchEntry(true)}>Paste multiple tasks</Button>
            </div>
            <div className="space-y-1">
              <label htmlFor="new-task-title" className="text-sm font-medium">{batchEntry ? 'Task titles (one per line)' : 'Task title (required)'}</label>
              {batchEntry ? <Textarea
                id="new-task-title"
                ref={element => { titleInput.current = element; }}
                rows={6}
                value={newTaskTitle}
                onChange={e => setNewTaskTitle(e.target.value)}
                placeholder={'Draft the proposal\nReview the budget\nSend the update'}
                disabled={isAddingTask}
              /> : <Input
                id="new-task-title"
                ref={element => { titleInput.current = element; }}
                type="text"
                maxLength={500}
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="New task title"
                className="w-full"
                disabled={isAddingTask}
              />}
            </div>
            <p className="text-sm text-muted-foreground">{batchEntry ? `${batchTaskCount} task${batchTaskCount === 1 ? '' : 's'} · Blank lines are ignored. Project, dates and optional details apply to every line. Up to 500 tasks.` : 'Just a title is enough. You can organize it later.'}</p>
            {newTaskPlannedFor && <p className="text-sm font-medium">Planned for {formatTaskDate(newTaskPlannedFor)} · {getProjectName(selectedProjectId)}</p>}
            <details className="rounded-md border p-3" open={batchEntry || undefined}>
              <summary className="cursor-pointer text-sm font-medium">Optional details: project, dates, estimate, star &amp; labels</summary>
            <fieldset disabled={isAddingTask} className="space-y-3 mt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="min-w-0 space-y-1">
                <label htmlFor="new-task-estimate" className="text-sm font-medium">Estimated focus sessions (optional)</label>
                <div className="flex items-center gap-2">
                  <Input
                    id="new-task-estimate"
                    type="number"
                    min="1"
                    value={estimatedPomodoros ?? ''}
                    onChange={(e) => setEstimatedPomodoros(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Number of focus sessions"
                    className="flex-1 min-w-0"
                  />
                  <span className="text-sm text-muted-foreground">🍅</span>
                </div>
                {estimation && estimation.confidence !== 'none' && (
                  <div className="mt-2">
                    <EstimationHint
                      suggestion={estimation.suggestedPomodoros}
                      confidence={estimation.confidence as 'high' | 'medium' | 'low'}
                      onApply={handleApplyEstimation}
                      similarTasksCount={estimation.similarTasksCount}
                    />
                  </div>
                )}
              </div>
              <div className="min-w-0 space-y-1">
                <label htmlFor="new-task-project" className="text-sm font-medium">Project (optional)</label>
                <Combobox
                  id="new-task-project"
                  options={[{ value: '', label: 'Inbox (no project)' }, ...memoizedProjects.map(project => ({ value: project.id, label: project.name }))]}
                  value={selectedProjectId}
                  onChange={(value) => setSelectedProjectId(value)}
                  placeholder="Inbox (no project)"
                  onCreateNew={handleCreateProject}
                />
                <p className="text-xs text-muted-foreground">Leave in Inbox, or type a project name to find or create one.</p>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 min-w-0">
                <label htmlFor="new-task-planned" className="text-sm font-medium">Planned for (optional)</label>
                <Input id="new-task-planned" type="date" value={newTaskPlannedFor} onChange={e => setNewTaskPlannedFor(e.target.value)} />
                <p className="text-xs text-muted-foreground">When you intend to work. Leave blank for Unscheduled.</p>
              </div>
              <div className="space-y-1 min-w-0">
                <label htmlFor="new-task-deadline" className="text-sm font-medium">Due by (optional)</label>
                <Input id="new-task-deadline" type="date" value={newTaskDeadline} onChange={e => setNewTaskDeadline(e.target.value)} />
                <p className="text-xs text-muted-foreground">The deadline, separate from your work plan.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setNewTaskFocus(!newTaskFocus)}
                className={cn("p-1", newTaskFocus ? "text-yellow-500" : "text-gray-400")}
                aria-label={newTaskFocus ? 'Unstar task' : 'Star task'}
                aria-pressed={newTaskFocus}
              >
                <Star className="w-4 h-4" fill={newTaskFocus ? "currentColor" : "none"} />
              </Button>
              <span className="text-sm text-muted-foreground">
                Star for later — this does not start the timer.
              </span>
              <div className="border-l pl-2 ml-1">
                <LabelPicker
                  selectedLabelIds={newTaskLabelIds}
                  onChange={setNewTaskLabelIds}
                />
              </div>
            </div>
            </fieldset>
            </details>
            <div className="flex flex-wrap items-center gap-2">
              <Button type="submit" disabled={isAddingTask}>
                <Plus className="w-4 h-4 mr-2" />
                {isAddingTask ? 'Adding…' : batchEntry ? `Add ${batchTaskCount} task${batchTaskCount === 1 ? '' : 's'}` : 'Add Task'}
              </Button>
              {!batchEntry && <Button type="submit" data-keep-open="true" variant="outline" disabled={isAddingTask}>Add another</Button>}
              {tasks.length > 0 && <Button type="button" disabled={isAddingTask} onClick={() => setShowAddTaskForm(false)} variant="ghost">
                {batchEntry ? 'Done' : 'Cancel'}
              </Button>}
            </div>
          </form>
        )}
        {created && <p role="status" className="mb-4 rounded-md bg-secondary p-3 text-sm text-foreground">Added {created.count} task{created.count === 1 ? '' : 's'}. Your plan and filters have been kept. {created.count === 1 && <Link className="underline" href={`/tasks/${created.id}`}>Open task</Link>}</p>}

        {tasks.length > 0 && <>
        {taskView === 'all' && <p className="mb-4 text-xs text-muted-foreground">Choose Focus to open a task in your timer. Star the work you want to come back to.</p>}
        <div className="flex flex-wrap gap-2 mb-4" aria-label="Task views">
          <Button variant={taskView === 'all' && statusFilter === 'all' ? 'default' : 'outline'} size="sm" onClick={() => { setStatusFilter('all'); setTaskView('all'); }} aria-pressed={taskView === 'all' && statusFilter === 'all'}>All tasks</Button>
          {(['today', 'tomorrow', 'week', 'calendar'] as const).map(view => <Button key={view} variant={taskView === view ? 'default' : 'outline'} size="sm" aria-pressed={taskView === view} onClick={() => { setTaskView(view); setStatusFilter('all'); }}>{view === 'calendar' ? <><Calendar className="w-4 h-4 mr-2" />Calendar</> : { today: 'Today', tomorrow: 'Tomorrow', week: 'Week' }[view]}</Button>)}
          <Button variant={statusFilter === 'focused' && taskView === 'all' ? 'default' : 'outline'} size="sm" onClick={() => { setStatusFilter('focused'); setTaskView('all'); }} aria-pressed={statusFilter === 'focused' && taskView === 'all'}><Star className="w-4 h-4 mr-2" />Starred</Button>
        </div>
        {taskView !== 'all' && <div className="mb-4 space-y-2">
          <p className="text-sm text-muted-foreground">Plan when to work, independently of deadlines. Workload is shown in estimated focus sessions; breaks are not included.</p>
          {taskView === 'week' && <div className="flex flex-wrap items-center gap-2">
            <Button size="icon" variant="outline" aria-label="Previous week" onClick={() => setWeekStart(shiftTaskDate(weekStart, -7))}><ChevronLeft className="w-4 h-4" /></Button>
            <Button size="sm" variant="outline" aria-label="Go to this week" disabled={weekStart === startOfTaskWeek(today)} onClick={() => setWeekStart(startOfTaskWeek(today))}>Today</Button>
            <Button size="icon" variant="outline" aria-label="Next week" onClick={() => setWeekStart(shiftTaskDate(weekStart, 7))}><ChevronRight className="w-4 h-4" /></Button>
            <span className="text-sm font-medium">{formatTaskDate(weekStart)} – {formatTaskDate(shiftTaskDate(weekStart, 6))}</span>
          </div>}
        </div>}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 mb-4">
          <div className="relative w-full sm:max-w-xs">
            <Input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="!pl-9 w-full"
              aria-label="Search tasks"
            />
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-auto flex-1 min-w-[110px]" aria-label="Sort tasks by">
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
                {(projectFilter !== 'all' || labelFilter !== 'all' || statusFilter !== 'all') && (
                  <span className="absolute -top-1 -right-1 flex h-2 w-2">
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-4 flex flex-col gap-3">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Project</label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-full" aria-label="Filter by project">
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    <SelectItem value="inbox">Inbox (no project)</SelectItem>
                    {memoizedProjects.map(project => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Label</label>
                <Select value={labelFilter} onValueChange={setLabelFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Label" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Labels</SelectItem>
                    {labels.map(label => (
                      <SelectItem key={label.id} value={label.id}>
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: label.color }} />
                          {label.name}
                        </span>
                      </SelectItem>
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
        </div>
        {taskView === 'all' && <details className="mb-4 rounded-md border p-3">
          <summary className="cursor-pointer text-sm text-muted-foreground">Manual tracking (no countdown)</summary>
          <p className="text-xs text-muted-foreground my-2">Records elapsed time only, without focus-session credit or breaks. Individual controls are in each task&apos;s actions menu.</p>
          <TimeTrackingControls
            hasActiveTracking={hasActiveTracking}
            activeCount={activelyTrackedTasks.length}
            onStartAll={handleStartAllTracking}
            onStopAll={handleStopAllTracking}
            disabled={activeTasks.length === 0}
          />
        </details>}
        <p className="mb-3 text-sm text-muted-foreground">{taskView === 'all' ? `Showing ${paginatedActiveTasks.length} of ${activeTasks.length} active tasks` : taskView === 'calendar' ? `${selectableTasks.length} active tasks on the selected day or unscheduled` : `${selectableTasks.length} active tasks in this plan, including earlier and unscheduled work`} · {tasks.filter(task => !task.completed).length} active in total</p>
        {selectableTasks.length > 0 && (
          <div className="flex items-center space-x-2 mb-3 pb-2 border-b">
            <Checkbox
              checked={selectedTasks.size === selectableTasks.length && selectableTasks.length > 0}
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
        {selectedTasks.size > 0 && (
          <div className="mb-4"><BulkActionToolbar
            selectedCount={selectedTasks.size}
            onMarkDone={handleBulkMarkDone}
            onDelete={handleBulkDelete}
            onChangeProject={handleBulkChangeProject}
            onSetFocus={handleBulkSetFocus}
            onClearSelection={handleClearSelection}
            onSchedule={(field) => { setDateError(null); setDateEditor({ ids: Array.from(selectedTasks), field, value: '' }); }}
            projects={memoizedProjects}
          /></div>
        )}
        {filteredTasks.length === 0 && (
          <p role="status" className="py-6 text-center text-sm text-muted-foreground">
            No tasks match your search or filters. Try another search or adjust the filters.
          </p>
        )}
        <TaskPlan
          tasks={taskView === 'all' ? paginatedActiveTasks : activeTasks}
          days={taskView === 'all' ? undefined : planDays}
          layout={taskView === 'week' || taskView === 'calendar' ? taskView : 'list'}
          onAdd={openTaskForm}
          onShowAll={() => setTaskView('all')}
          onMove={canDragTasks ? handleMoveTask : undefined}
          calendarMonth={calendarMonth}
          onCalendarMonthChange={setCalendarMonth}
          onSelectDay={setCalendarDay}
          renderTask={(task, compact) => {
            const editing = editingTask?.id === task.id || editingDeadline?.id === task.id;
            const taskMenu = (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <MobileButton variant="ghost" size="icon" className="shrink-0" aria-label={`Actions for ${task.title}`}>
                        <MoreHorizontal className="w-4 h-4" />
                      </MobileButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {compact && <DropdownMenuItem asChild>
                        <Link href={`/?task=${encodeURIComponent(task.id)}`}>Focus</Link>
                      </DropdownMenuItem>}
                      {compact && <DropdownMenuItem onClick={() => handleToggleTaskFocus(task.id, task.focus || false)}>
                        <Star className="w-4 h-4 mr-2" />
                        {task.focus ? 'Unstar' : 'Star'}
                      </DropdownMenuItem>}
                      <DropdownMenuItem onClick={() => { setDateError(null); setDateEditor({ ids: [task.id], field: 'plannedFor', value: task.plannedFor || '' }); }}>Plan task / move to day</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => task.trackingStartedAt != null ? handleStopTracking(task) : handleStartTracking(task.id)}>
                        {task.trackingStartedAt != null ? 'Stop manual tracking' : 'Start manual tracking (no countdown)'}
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/tasks/${task.id}`} className="flex items-center">
                          <Eye className="w-4 h-4 mr-2" />
                          View Detail
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => {
                        setEditingTask({
                          id: task.id,
                          title: task.title,
                          estimatedPomodoros: task.estimatedPomodoros,
                          projectId: task.projectId,
                          labelIds: task.labelIds
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
            );
            const dragProps = canDragTasks && !editing ? {
              draggable: true,
              onDragStart: (e: React.DragEvent) => { e.dataTransfer.setData(TASK_DRAG_TYPE, task.id); e.dataTransfer.effectAllowed = 'move'; },
            } : {};
            const overdue = !!task.deadline && task.deadline < today;
            if (compact && !editing) return (
              <li key={task.id} {...dragProps} className={cn('group rounded-md border bg-background p-2 text-sm shadow-sm transition-colors hover:border-primary/50', canDragTasks && 'cursor-grab active:cursor-grabbing', selectedTasks.has(task.id) && 'bg-secondary', task.focus && 'border-l-4 border-l-primary')}>
                <div className="flex items-start gap-1.5">
                  <Checkbox
                    className="mt-0.5"
                    checked={selectedTasks.has(task.id)}
                    onCheckedChange={() => handleToggleSelection(task.id)}
                    aria-label={`Select task: ${task.title}`}
                  />
                  <span className="min-w-0 flex-1 break-words font-medium leading-snug">{task.title}</span>
                </div>
                <div className="mt-1 flex flex-col gap-1 max-md:flex-row max-md:items-end">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 pb-1.5 pl-5 text-xs text-muted-foreground">
                  {task.projectId && <span className="inline-flex min-w-0 items-center gap-1 break-words"><FolderOpen className="h-3 w-3 shrink-0" />{getProjectName(task.projectId)}</span>}
                  {task.estimatedPomodoros ? <span><span aria-hidden="true">🍅</span> {task.totalPomodoroSessions || 0}/{task.estimatedPomodoros}<span className="sr-only"> focus sessions completed of estimated</span></span> : null}
                  {task.deadline && <span className={cn('rounded px-1', overdue ? 'bg-red-100 text-red-800' : 'bg-muted')}>Due {formatTaskDate(task.deadline)}</span>}
                  {task.trackingStartedAt != null && <span className="font-mono text-primary">{formatTime(getElapsedTime(task))}</span>}
                </div>
                <div className="-mb-1 -mr-1 flex shrink-0 items-center self-end">
                  <MobileButton variant="ghost" size="icon" onClick={() => handleToggleTaskCompletion(task.id, task.completed)}
                    className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label={`Mark ${task.title} as complete`}>
                    <CheckCircle className="w-4 h-4" />
                  </MobileButton>
                  {taskMenu}
                </div>
                </div>
              </li>
            );
            return (
            <li key={task.id} {...dragProps} className={`flex items-start justify-between gap-2 border-b py-4 transition-colors ${selectedTasks.has(task.id) ? 'bg-secondary' : ''}`}>
              {editingTask && editingTask.id === task.id ? (
                <form onSubmit={handleUpdateTask} className="flex flex-col space-y-2 w-full min-w-0">
                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                    <Input
                      type="text"
                      value={editingTask.title}
                      onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                      className="flex-1 min-w-0"
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
                  <div className="flex flex-wrap items-center gap-2">
                    <Combobox
                      options={[{ value: '', label: 'Inbox (no project)' }, ...memoizedProjects.map(project => ({ value: project.id, label: project.name }))]}
                      value={editingTask.projectId || ''}
                      onChange={(value) => setEditingTask({ ...editingTask, projectId: value })}
                      placeholder="Inbox (no project)"
                      onCreateNew={handleCreateProjectForEdit}
                    />
                    <LabelPicker
                      selectedLabelIds={editingTask.labelIds || []}
                      onChange={(labelIds) => setEditingTask({ ...editingTask, labelIds })}
                    />
                    <MobileButton type="submit" size="sm" variant="outline">Save</MobileButton>
                    <MobileButton type="button" size="sm" variant="ghost" onClick={() => setEditingTask(null)}>Cancel</MobileButton>
                  </div>
                </form>
              ) : editingDeadline && editingDeadline.id === task.id ? (
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleSetTaskDeadline(task.id, editingDeadline.deadline || null);
                }} className="flex flex-wrap items-center gap-2 w-full min-w-0">
                  <Input
                    type="date"
                    value={editingDeadline.deadline}
                    onChange={(e) => setEditingDeadline({ ...editingDeadline, deadline: e.target.value })}
                    className="flex-1 min-w-0 basis-full sm:basis-auto"
                  />
                  <MobileButton type="submit" size="sm" variant="outline">Save</MobileButton>
                  <MobileButton type="button" size="sm" variant="ghost" onClick={() => setEditingDeadline(null)}>Cancel</MobileButton>
                </form>
              ) : (
                <>
                  <div className="flex flex-1 min-w-0 flex-wrap items-center gap-2">
                    <Checkbox
                      checked={selectedTasks.has(task.id)}
                      onCheckedChange={() => handleToggleSelection(task.id)}
                      aria-label={`Select task: ${task.title}`}
                    />
                    <span className={`min-w-0 flex-1 break-words text-base font-medium [overflow-wrap:anywhere] ${task.completed ? 'line-through text-muted-foreground' : ''}`}>{task.title}</span>
                    <div className="flex basis-full flex-wrap items-center gap-2 pl-6">
                    <ProjectBadge projectId={task.projectId} />
                    <TaskLabels labelIds={task.labelIds} />
                    {(task.totalPomodoroSessions || task.estimatedPomodoros) ? <span className="text-xs text-muted-foreground">
                      {task.totalPomodoroSessions || 0} focus sessions completed{task.estimatedPomodoros ? ` · ${task.estimatedPomodoros} estimated` : ''}
                    </span> : null}
                    {task.deadline && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        task.deadline < taskDateKey(new Date())
                          ? 'bg-red-100 text-red-800'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        Due {formatTaskDate(task.deadline)}
                        {task.deadline < taskDateKey(new Date()) && ' (Overdue)'}
                      </span>
                    )}
                    {task.plannedFor && <span className="text-xs rounded bg-secondary px-2 py-1 text-foreground">Planned {formatTaskDate(task.plannedFor)}</span>}
                    {task.trackingStartedAt == null && (task.manualTimeSpent ?? 0) > 0 && <span className="text-xs font-mono text-muted-foreground">Tracked {formatTime(task.manualTimeSpent)}</span>}
                    {task.trackingStartedAt != null && <TaskTimeTracker
                      formattedTime={formatTime(getElapsedTime(task))}
                      elapsedTime={getElapsedTime(task)}
                      isTracking={task.trackingStartedAt != null}
                      onStart={() => handleStartTracking(task.id)}
                      onStop={() => handleStopTracking(task)}
                      disabled={task.completed}
                    />}
                    </div>
                    <div className="flex basis-full flex-wrap items-center gap-1 pl-6">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/?task=${encodeURIComponent(task.id)}`} aria-label={`Focus on ${task.title}`}>Focus</Link>
                      </Button>
                      <MobileButton variant="ghost" size="icon" onClick={() => handleToggleTaskCompletion(task.id, task.completed)}
                        className="text-muted-foreground hover:text-primary" aria-label={task.completed ? 'Mark as incomplete' : 'Mark as complete'}>
                        <CheckCircle className="w-4 h-4" fill={task.completed ? 'currentColor' : 'none'} />
                      </MobileButton>
                      <MobileButton variant="ghost" size="icon" onClick={() => handleToggleTaskFocus(task.id, task.focus || false)}
                        className={task.focus ? 'text-primary' : 'text-muted-foreground'} aria-label={task.focus ? 'Unstar task' : 'Star task'} aria-pressed={!!task.focus}>
                        <Star className="w-4 h-4" fill={task.focus ? 'currentColor' : 'none'} />
                      </MobileButton>
                    </div>
                  </div>
                  {taskMenu}
                </>
              )}
            </li>
            );
          }}
        />
        {taskView === 'all' && paginatedActiveTasks.length < activeTasks.length && (
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
        </>}
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
            TaskLabels={TaskLabels}
          />
        )}
      </CardContent>

      <Dialog open={dateEditor !== null} onOpenChange={open => { if (!open && !savingDates) setDateEditor(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dateEditor?.field === 'plannedFor' ? 'Plan work' : 'Set deadline'} for {dateEditor?.ids.length} task{dateEditor?.ids.length === 1 ? '' : 's'}</DialogTitle>
            <DialogDescription>{dateEditor?.field === 'plannedFor' ? 'Choose when to work. Deadlines will not change. Clear the date to move tasks to Unscheduled.' : 'Choose when tasks are due. Planned work days will not change. Clear the date to remove the deadline.'}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={async e => {
            e.preventDefault();
            if (!dateEditor || savingDates) return;
            setSavingDates(true);
            setDateError(null);
            try {
              await setTaskDates(dateEditor.ids, { [dateEditor.field]: dateEditor.value || null });
              event('tasks_scheduled', { count: dateEditor.ids.length, field: dateEditor.field });
              setDateEditor(null);
              setSelectedTasks(new Set());
            } catch {
              setDateError('Could not save dates. Nothing has been changed. Please try again.');
            } finally {
              setSavingDates(false);
            }
          }}>
            <label className="block text-sm font-medium" htmlFor="task-plan-date">{dateEditor?.field === 'plannedFor' ? 'Planned for' : 'Due by'}</label>
            <Input id="task-plan-date" type="date" disabled={savingDates} value={dateEditor?.value || ''} onChange={e => setDateEditor(current => current && { ...current, value: e.target.value })} />
            {dateError && <p role="alert" className="text-sm text-destructive">{dateError}</p>}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" disabled={savingDates} onClick={() => setDateEditor(null)}>Cancel</Button>
              <Button type="submit" disabled={savingDates}>{savingDates ? 'Saving…' : dateEditor?.value ? 'Save dates' : 'Clear dates'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This task will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTaskToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteTask} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Card>
  );
});

TaskList.displayName = 'TaskList';

export default TaskList;
