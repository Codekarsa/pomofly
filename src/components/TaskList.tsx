import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  Suspense,
  lazy,
} from 'react';
import Link from 'next/link';
import { useTasks, Task } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useEstimation, type EstimationResult } from '@/hooks/useEstimation';
import { sanitizeTaskTitle } from '@/lib/security';
import { Button } from '@/components/ui/button';
import { MobileButton } from '@/components/ui/mobile-button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  MoreHorizontal,
  Plus,
  Pencil,
  Trash2,
  Star,
  Calendar,
  ChevronDown,
  ChevronRight,
  Search,
  ArrowUpAZ,
  ArrowDownAZ,
  Filter,
  CheckCircle,
  Eye,
  FolderOpen,
} from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
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

// Lazy load the heavy AI Breakdown Modal
const AIBreakdownModal = lazy(() =>
  import('./AIBreakdownModal').then((module) => ({
    default: module.AIBreakdownModal,
  }))
);

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
        className="mb-2 flex items-center text-sm text-gray-600 hover:text-gray-900 focus:outline-none"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="mr-1 h-4 w-4" />
        ) : (
          <ChevronRight className="mr-1 h-4 w-4" />
        )}
        {tasks.length} completed task{tasks.length > 1 ? 's' : ''}
      </button>
      {open && (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <li
              key={task.id}
              className="flex items-center justify-between rounded-md bg-muted p-2 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <MobileButton
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    onToggleTaskCompletion(task.id, task.completed)
                  }
                  className="text-green-500 hover:text-gray-400"
                  aria-label="Mark as incomplete"
                >
                  <CheckCircle className="h-4 w-4" fill="currentColor" />
                </MobileButton>
                <MobileButton
                  variant="ghost"
                  size="icon"
                  onClick={() =>
                    onToggleTaskFocus(task.id, task.focus || false)
                  }
                  className={`${task.focus ? 'text-yellow-500' : 'text-gray-400'}`}
                >
                  <Star
                    className="h-4 w-4"
                    fill={task.focus ? 'currentColor' : 'none'}
                  />
                </MobileButton>
<<<<<<< HEAD
                <span className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`} dangerouslySetInnerHTML={{ __html: sanitizeTaskTitle(task.title) }} />
=======
                <span
                  className={`text-sm ${task.completed ? 'text-muted-foreground line-through' : ''}`}
                >
                  {task.title}
                </span>
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)
                {task.projectId && <ProjectBadge projectId={task.projectId} />}
                <TaskLabels labelIds={task.labelIds} />
                <span className="text-xs text-muted-foreground">
                  ({task.totalPomodoroSessions || 0}/
                  {task.estimatedPomodoros || 0})
                </span>
                {task.deadline && (
                  <span
                    className={`rounded px-2 py-1 text-xs ${
                      new Date(task.deadline) < new Date()
                        ? 'bg-red-100 text-red-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {new Date(task.deadline).toLocaleDateString()}
                    {new Date(task.deadline) < new Date() && ' (Overdue)'}
                  </span>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <MobileButton variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </MobileButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link
                      href={`/tasks/${task.id}`}
                      className="flex items-center"
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      View Detail
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      onEditTask(task);
                      event('task_edit_started', { task_id: task.id });
                    }}
                  >
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      onEditDeadline({
                        id: task.id,
                        deadline: task.deadline || '',
                      });
                    }}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    Set Deadline
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDeleteTask(task.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
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
  const [estimatedPomodoros, setEstimatedPomodoros] = useState<
    number | undefined
  >(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [newTaskFocus, setNewTaskFocus] = useState(false);
  const [newTaskLabelIds, setNewTaskLabelIds] = useState<string[]>([]);
  const [editingTask, setEditingTask] = useState<{
    id: string;
    title: string;
    estimatedPomodoros?: number;
    projectId?: string;
    labelIds?: string[];
  } | null>(null);
  const [editingDeadline, setEditingDeadline] = useState<{
    id: string;
    deadline: string;
  } | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [showAIBreakdownModal, setShowAIBreakdownModal] = useState(false);
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
  const [estimationDebounceTimer, setEstimationDebounceTimer] =
    useState<NodeJS.Timeout | null>(null);

  const { projects, addProject } = useProjects();
  const { getEstimate } = useEstimation();
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
    stopAllTimeTracking,
  } = useTasks(selectedProjectId);
  const { event } = useGoogleAnalytics();

  const memoizedProjects = useMemo(() => projects, [projects]);
  const memoizedTasks = useMemo(() => tasks, [tasks]);

  // Time tracking hook
  const {
    activelyTrackedTasks,
    hasActiveTracking,
    getElapsedTime,
    formatTime,
  } = useTimeTracking(memoizedTasks);

  const handleCreateProject = useCallback(
    async (name: string) => {
      try {
        const newProjectId = await addProject(name);
        if (newProjectId) {
          setSelectedProjectId(newProjectId);
          event('project_created_from_task_form', { project_name: name });
        }
      } catch (error) {
        console.error('Failed to create project:', error);
      }
    },
    [addProject, event]
  );

  const handleCreateProjectForEdit = useCallback(
    async (name: string) => {
      try {
        const newProjectId = await addProject(name);
        if (newProjectId) {
          setEditingTask((prev) =>
            prev ? { ...prev, projectId: newProjectId } : prev
          );
          event('project_created_from_task_form', { project_name: name });
        }
      } catch (error) {
        console.error('Failed to create project:', error);
      }
    },
    [addProject, event]
  );

  // Handle applying estimation suggestion
  const handleApplyEstimation = useCallback(() => {
    if (estimation) {
      setEstimatedPomodoros(estimation.suggestedPomodoros);
      // Track the source of the estimate
      event('estimation_applied', {
        suggested_pomodoros: estimation.suggestedPomodoros,
        confidence: estimation.confidence,
        similar_tasks_count: estimation.similarTasksCount,
        task_title: newTaskTitle,
      });
      // Clear the estimation after applying
      setEstimation(null);
    }
  }, [estimation, event, newTaskTitle]);

  // Helper function to get project name by ID
  const getProjectName = useCallback(
    (projectId: string) => {
      const project = memoizedProjects.find((p) => p.id === projectId);
      return project?.name || 'Unknown Project';
    },
    [memoizedProjects]
  );

  // Project Badge Component
  const ProjectBadge = ({ projectId }: { projectId: string }) => {
    const projectName = getProjectName(projectId);
    const displayName =
      projectName.length > 12
        ? projectName.substring(0, 12) + '...'
        : projectName;

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground transition-colors duration-150 hover:bg-secondary/80">
              <FolderOpen className="h-3 w-3" />
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

  // Task Labels Component
  const TaskLabels = ({ labelIds }: { labelIds?: string[] }) => {
    if (!labelIds || labelIds.length === 0) return null;
    const taskLabels = labels.filter((l) => labelIds.includes(l.id));
    if (taskLabels.length === 0) return null;
    return (
      <span className="inline-flex items-center gap-1">
        {taskLabels.map((label) => (
          <LabelBadge key={label.id} label={label} size="sm" />
        ))}
      </span>
    );
  };

  useEffect(() => {
    event('task_list_view', { total_tasks: tasks.length });
  }, [event, tasks.length]);

<<<<<<< HEAD
  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedTitle = sanitizeTaskTitle(newTaskTitle.trim());
    if (sanitizedTitle && selectedProjectId) {
      try {
        await addTask(sanitizedTitle, selectedProjectId, estimatedPomodoros, newTaskFocus, newTaskLabelIds);
        
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
        
        // Reset form
        setNewTaskTitle('');
        setEstimatedPomodoros(0);
        setNewTaskFocus(false);
        setNewTaskLabelIds([]);
        setEstimation(null); // Clear estimation
      } catch (error) {
        console.error("Failed to add task:", error);
        event('task_add_error', { error_message: (error as Error).message });
      }
    }
  }, [addTask, event, estimatedPomodoros, newTaskTitle, selectedProjectId, newTaskFocus, newTaskLabelIds, estimation]);

  const handleUpdateTask = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    const sanitizedTitle = sanitizeTaskTitle(editingTask?.title?.trim() || '');
    if (editingTask && sanitizedTitle) {
      try {
        await updateTask(editingTask.id, {
          title: sanitizedTitle,
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
=======
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (newTaskTitle.trim() && selectedProjectId) {
        try {
          await addTask(
            newTaskTitle,
            selectedProjectId,
            estimatedPomodoros,
            newTaskFocus,
            newTaskLabelIds
          );

          // Track estimation source analytics
          const estimationSource = estimation ? 'ai-suggested' : 'manual';
          event('task_added', {
            project_id: selectedProjectId,
            estimated_pomodoros: estimatedPomodoros,
            focus: newTaskFocus,
            label_count: newTaskLabelIds.length,
            estimation_source: estimationSource,
            ai_suggested_estimate: estimation?.suggestedPomodoros,
            ai_confidence: estimation?.confidence,
          });

          // Reset form
          setNewTaskTitle('');
          setEstimatedPomodoros(0);
          setNewTaskFocus(false);
          setNewTaskLabelIds([]);
          setEstimation(null); // Clear estimation
        } catch (error) {
          console.error('Failed to add task:', error);
          event('task_add_error', { error_message: (error as Error).message });
        }
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)
      }
    },
    [
      addTask,
      event,
      estimatedPomodoros,
      newTaskTitle,
      selectedProjectId,
      newTaskFocus,
      newTaskLabelIds,
      estimation,
    ]
  );

  const handleUpdateTask = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (editingTask && editingTask.title.trim()) {
        try {
          await updateTask(editingTask.id, {
            title: editingTask.title,
            estimatedPomodoros: editingTask.estimatedPomodoros,
            projectId: editingTask.projectId,
            labelIds: editingTask.labelIds,
          });
          event('task_updated', {
            task_id: editingTask.id,
            new_estimated_pomodoros: editingTask.estimatedPomodoros,
            new_project_id: editingTask.projectId,
          });
          setEditingTask(null);
        } catch (error) {
          console.error('Failed to update task:', error);
          event('task_update_error', {
            task_id: editingTask.id,
            error_message: (error as Error).message,
          });
        }
      }
    },
    [editingTask, event, updateTask]
  );

  // Debounced estimation effect
  useEffect(() => {
    // Clear existing timer
    if (estimationDebounceTimer) {
      clearTimeout(estimationDebounceTimer);
    }

    // Only estimate if title is long enough and user hasn't entered an estimate yet
    if (newTaskTitle.length >= 5) {
      const timer = setTimeout(async () => {
        try {
<<<<<<< HEAD
          const result = await getEstimate(
            newTaskTitle,
            selectedProjectId,
            estimatedPomodoros
          );
          
=======
          const result = await getEstimate({
            title: newTaskTitle,
            projectId: selectedProjectId,
            userEstimate: estimatedPomodoros,
          });

>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)
          // Only show suggestion if user estimate doesn't match
          if (
            result &&
            result.confidence !== 'none' &&
            (!estimatedPomodoros ||
              estimatedPomodoros !== result.suggestedPomodoros)
          ) {
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
  }, [newTaskTitle, selectedProjectId, getEstimate, estimatedPomodoros, estimationDebounceTimer]);

  // Filtering logic
  const filteredTasks = useMemo(() => {
    let tasks = memoizedTasks;
    if (projectFilter !== 'all') {
      tasks = tasks.filter((task) => task.projectId === projectFilter);
    }
    if (labelFilter !== 'all') {
      tasks = tasks.filter((task) => task.labelIds?.includes(labelFilter));
    }
    if (statusFilter === 'active') {
      tasks = tasks.filter((task) => !task.completed);
    } else if (statusFilter === 'completed') {
      tasks = tasks.filter((task) => task.completed);
    } else if (statusFilter === 'focused') {
      tasks = tasks.filter((task) => task.focus);
    }
    if (search.trim()) {
      tasks = tasks.filter((task) =>
        task.title.toLowerCase().includes(search.toLowerCase())
      );
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
        cmp =
          (a.deadline ? new Date(a.deadline).getTime() : 0) -
          (b.deadline ? new Date(b.deadline).getTime() : 0);
      } else if (sortBy === 'title') {
        cmp = a.title.localeCompare(b.title);
      } else if (sortBy === 'project') {
        cmp = (getProjectName(a.projectId) || '').localeCompare(
          getProjectName(b.projectId) || ''
        );
      } else if (sortBy === 'focus') {
        cmp = (b.focus ? 1 : 0) - (a.focus ? 1 : 0);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
    return tasks;
  }, [filteredTasks, sortBy, sortOrder, getProjectName]);

  // Only paginate active (incomplete) tasks after filtering/sorting
  const activeTasks = useMemo(
    () => sortedTasks.filter((task) => !task.completed),
    [sortedTasks]
  );
  const completedTasks = useMemo(
    () => sortedTasks.filter((task) => task.completed),
    [sortedTasks]
  );
  const paginatedActiveTasks = useMemo(
    () => activeTasks.slice(0, (currentPage + 1) * itemsPerPage),
    [activeTasks, currentPage, itemsPerPage]
  );

  const handleToggleTaskCompletion = useCallback(
    (taskId: string, currentCompletionState: boolean) => {
      toggleTaskCompletion(taskId, currentCompletionState);
      event('task_completion_toggled', {
        task_id: taskId,
        new_state: !currentCompletionState,
      });
    },
    [event, toggleTaskCompletion]
  );

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

  const handleToggleTaskFocus = useCallback(
    (taskId: string, currentFocusState: boolean) => {
      toggleTaskFocus(taskId, currentFocusState);
      event('task_focus_toggled', {
        task_id: taskId,
        new_state: !currentFocusState,
      });
    },
    [toggleTaskFocus, event]
  );

  const handleSetTaskDeadline = useCallback(
    (taskId: string, deadline: string | null) => {
      setTaskDeadline(taskId, deadline);
      event('task_deadline_set', {
        task_id: taskId,
        deadline,
      });
      setEditingDeadline(null);
    },
    [setTaskDeadline, event]
  );

  const handleShowCompletedToggle = useCallback(() => {
    setShowCompleted(!showCompleted);
    event('show_completed_tasks_toggled', { new_state: !showCompleted });
  }, [event, showCompleted]);

  // Selection handlers
  const handleToggleSelection = useCallback((taskId: string) => {
    setSelectedTasks((prev) => {
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
      setSelectedTasks(new Set(activeTasks.map((t) => t.id)));
    }
  }, [activeTasks, selectedTasks.size]);

  const handleClearSelection = useCallback(() => {
    setSelectedTasks(new Set());
  }, []);

  const handleBulkMarkDone = useCallback(async () => {
    const tasksToComplete = Array.from(selectedTasks);
    for (const taskId of tasksToComplete) {
      const task = tasks.find((t) => t.id === taskId);
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

  const handleBulkChangeProject = useCallback(
    async (projectId: string) => {
      const tasksToUpdate = Array.from(selectedTasks);
      for (const taskId of tasksToUpdate) {
        await updateTask(taskId, { projectId });
      }
      setSelectedTasks(new Set());
      event('bulk_change_project', {
        count: tasksToUpdate.length,
        project_id: projectId,
      });
    },
    [selectedTasks, updateTask, event]
  );

  const handleBulkSetFocus = useCallback(
    async (focus: boolean) => {
      const tasksToUpdate = Array.from(selectedTasks);
      for (const taskId of tasksToUpdate) {
        const task = tasks.find((t) => t.id === taskId);
        if (task) {
          await toggleTaskFocus(taskId, !focus);
        }
      }
      setSelectedTasks(new Set());
      event('bulk_set_focus', { count: tasksToUpdate.length, focus });
    },
    [selectedTasks, tasks, toggleTaskFocus, event]
  );

  const loadMoreTasks = useCallback(() => {
    if ((currentPage + 1) * itemsPerPage < activeTasks.length) {
      setCurrentPage((prevPage) => prevPage + 1);
      event('load_more_tasks', { new_page: currentPage + 1 });
    }
  }, [currentPage, event, activeTasks.length, itemsPerPage]);

<<<<<<< HEAD
  const handleAIBreakdownSave = useCallback((tasks: { title: string; estimatedPomodoros: number }[]) => {
    tasks.forEach(task => {
=======
  const handleAIBreakdownSave = (
    tasks: { title: string; estimatedPomodoros: number }[]
  ) => {
    tasks.forEach((task) => {
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)
      addTask(task.title, selectedProjectId, task.estimatedPomodoros);
    });
    setShowAIBreakdownModal(false);
  }, [addTask, selectedProjectId]);

  // Time tracking handlers
  const handleStartTracking = useCallback(
    async (taskId: string) => {
      try {
        await startTimeTracking(taskId);
        event('time_tracking_started', { task_id: taskId });
      } catch (error) {
        console.error('Failed to start time tracking:', error);
      }
    },
    [startTimeTracking, event]
  );

  const handleStopTracking = useCallback(
    async (task: Task) => {
      try {
        const elapsed = getElapsedTime(task) - (task.manualTimeSpent ?? 0);
        await stopTimeTracking(task.id, elapsed);
        event('time_tracking_stopped', {
          task_id: task.id,
          elapsed_seconds: elapsed,
        });
      } catch (error) {
        console.error('Failed to stop time tracking:', error);
      }
    },
    [stopTimeTracking, getElapsedTime, event]
  );

  const handleStartAllTracking = useCallback(async () => {
    const taskIds = activeTasks
      .filter((t) => t.trackingStartedAt == null)
      .map((t) => t.id);
    if (taskIds.length === 0) return;
    try {
      await startAllTimeTracking(taskIds);
      event('time_tracking_start_all', { count: taskIds.length });
    } catch (error) {
      console.error('Failed to start all time tracking:', error);
    }
  }, [activeTasks, startAllTimeTracking, event]);

  const handleStopAllTracking = useCallback(async () => {
    const tasksToStop = activelyTrackedTasks.map((task) => ({
      taskId: task.id,
      elapsedSeconds: getElapsedTime(task) - (task.manualTimeSpent ?? 0),
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
        <div className="mb-4 flex justify-end">
          {!showAddTaskForm && (
            <Button onClick={() => setShowAddTaskForm(true)} className="mr-2">
              Add Task
            </Button>
          )}
          <Button
            disabled
            className="ml-2 cursor-not-allowed bg-indigo-600 text-white opacity-50"
            title="Coming soon"
          >
            Task Breakdown with AI
          </Button>
        </div>

        {showAddTaskForm && (
          <form onSubmit={handleSubmit} className="mb-6 space-y-4">
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
              <div className="w-1/2">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={estimatedPomodoros}
                    onChange={(e) =>
                      setEstimatedPomodoros(
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    placeholder="Estimated Pomodoros"
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">🍅</span>
                </div>
                {estimation && estimation.confidence !== 'none' && (
                  <div className="mt-2">
                    <EstimationHint
                      suggestion={estimation.suggestedPomodoros}
                      confidence={
                        estimation.confidence as 'high' | 'medium' | 'low'
                      }
                      onApply={handleApplyEstimation}
                      similarTasksCount={estimation.similarTasksCount}
                    />
                  </div>
                )}
              </div>
              <div className="w-1/2">
                <Combobox
                  options={memoizedProjects.map((project) => ({
                    value: project.id,
                    label: project.name,
                  }))}
                  value={selectedProjectId}
                  onChange={(value) => setSelectedProjectId(value)}
                  placeholder="Select a project"
                  onCreateNew={handleCreateProject}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setNewTaskFocus(!newTaskFocus)}
                className={cn(
                  'p-1',
                  newTaskFocus ? 'text-yellow-500' : 'text-gray-400'
                )}
                aria-label={
                  newTaskFocus
                    ? "Remove from Today's Focus"
                    : "Add to Today's Focus"
                }
              >
                <Star
                  className="h-4 w-4"
                  fill={newTaskFocus ? 'currentColor' : 'none'}
                />
              </Button>
              <span className="text-sm text-muted-foreground">
                {newTaskFocus
                  ? "Added to Today's Focus"
                  : "Add to Today's Focus"}
              </span>
              <div className="ml-1 border-l pl-2">
                <LabelPicker
                  selectedLabelIds={newTaskLabelIds}
                  onChange={setNewTaskLabelIds}
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button type="submit" className="w-1/2">
                <Plus className="mr-2 h-4 w-4" />
                Add Task
              </Button>
              <Button
                type="button"
                onClick={() => setShowAddTaskForm(false)}
                variant="outline"
                className="w-1/2"
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        <hr />
        <div className="mb-4 flex items-center gap-2">
          <div className="relative w-full max-w-xs">
            <Input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-9"
              aria-label="Search tasks"
            />
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="min-w-[110px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
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
            {sortOrder === 'asc' ? (
              <ArrowUpAZ className="h-4 w-4" />
            ) : (
              <ArrowDownAZ className="h-4 w-4" />
            )}
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                aria-label="Filter tasks"
                className="relative flex w-24 items-center justify-center"
              >
                <Filter className="h-4 w-4" />
                {(projectFilter !== 'all' ||
                  labelFilter !== 'all' ||
                  statusFilter !== 'all') && (
                  <span className="absolute -right-1 -top-1 flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="flex w-80 flex-col gap-3 p-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Project
                </label>
                <Select value={projectFilter} onValueChange={setProjectFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {memoizedProjects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Label
                </label>
                <Select value={labelFilter} onValueChange={setLabelFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Label" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Labels</SelectItem>
                    {labels.map((label) => (
                      <SelectItem key={label.id} value={label.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: label.color }}
                          />
                          {label.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">
                  Status
                </label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
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
          <div className="mb-3 flex items-center space-x-2 border-b pb-2">
            <Checkbox
              checked={
                selectedTasks.size === activeTasks.length &&
                activeTasks.length > 0
              }
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
            <li
              key={task.id}
              className={`flex items-center justify-between rounded-md p-2 transition-colors ${selectedTasks.has(task.id) ? 'bg-blue-50' : 'hover:bg-accent'}`}
            >
              {editingTask && editingTask.id === task.id ? (
                <form
                  onSubmit={handleUpdateTask}
                  className="flex w-full flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <Input
                      type="text"
                      value={editingTask.title}
                      onChange={(e) =>
                        setEditingTask({
                          ...editingTask,
                          title: e.target.value,
                        })
                      }
                      className="flex-grow"
                      placeholder="Task title"
                    />
                    <Input
                      type="number"
                      value={editingTask.estimatedPomodoros}
                      onChange={(e) =>
                        setEditingTask({
                          ...editingTask,
                          estimatedPomodoros: e.target.value
                            ? parseInt(e.target.value)
                            : undefined,
                        })
                      }
                      placeholder="Pomodoros"
                      className="w-24"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Combobox
                      options={memoizedProjects.map((project) => ({
                        value: project.id,
                        label: project.name,
                      }))}
                      value={editingTask.projectId || ''}
                      onChange={(value) =>
                        setEditingTask({ ...editingTask, projectId: value })
                      }
                      placeholder="Select a project"
                      onCreateNew={handleCreateProjectForEdit}
                    />
                    <LabelPicker
                      selectedLabelIds={editingTask.labelIds || []}
                      onChange={(labelIds) =>
                        setEditingTask({ ...editingTask, labelIds })
                      }
                    />
                    <MobileButton type="submit" size="sm" variant="outline">
                      Save
                    </MobileButton>
                    <MobileButton
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingTask(null)}
                    >
                      Cancel
                    </MobileButton>
                  </div>
                </form>
              ) : editingDeadline && editingDeadline.id === task.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSetTaskDeadline(
                      task.id,
                      editingDeadline.deadline || null
                    );
                  }}
                  className="flex w-full items-center space-x-2"
                >
                  <Input
                    type="date"
                    value={editingDeadline.deadline}
                    onChange={(e) =>
                      setEditingDeadline({
                        ...editingDeadline,
                        deadline: e.target.value,
                      })
                    }
                    className="flex-grow"
                  />
                  <MobileButton type="submit" size="sm" variant="outline">
                    Save
                  </MobileButton>
                  <MobileButton
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setEditingDeadline(null)}
                  >
                    Cancel
                  </MobileButton>
                </form>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedTasks.has(task.id)}
                      onCheckedChange={() => handleToggleSelection(task.id)}
                      aria-label={`Select task: ${task.title}`}
                    />
                    <MobileButton
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleToggleTaskCompletion(task.id, task.completed)
                      }
                      className={`${task.completed ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}`}
                      aria-label={
                        task.completed
                          ? 'Mark as incomplete'
                          : 'Mark as complete'
                      }
                    >
                      <CheckCircle
                        className="h-4 w-4"
                        fill={task.completed ? 'currentColor' : 'none'}
                      />
                    </MobileButton>
                    <MobileButton
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        handleToggleTaskFocus(task.id, task.focus || false)
                      }
                      className={`${task.focus ? 'text-yellow-500' : 'text-gray-400'}`}
                    >
                      <Star
                        className="h-4 w-4"
                        fill={task.focus ? 'currentColor' : 'none'}
                      />
                    </MobileButton>
<<<<<<< HEAD
                    <span className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`} dangerouslySetInnerHTML={{ __html: sanitizeTaskTitle(task.title) }} />
                    {task.projectId && <ProjectBadge projectId={task.projectId} />}
=======
                    <span
                      className={`text-sm ${task.completed ? 'text-muted-foreground line-through' : ''}`}
                    >
                      {task.title}
                    </span>
                    {task.projectId && (
                      <ProjectBadge projectId={task.projectId} />
                    )}
>>>>>>> dc46537 (feat: implement comprehensive Prettier code formatting integration)
                    <TaskLabels labelIds={task.labelIds} />
                    <span className="text-xs text-muted-foreground">
                      ({task.totalPomodoroSessions || 0}/
                      {task.estimatedPomodoros || 0})
                    </span>
                    {task.deadline && (
                      <span
                        className={`rounded px-2 py-1 text-xs ${
                          new Date(task.deadline) < new Date()
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
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
                      <MobileButton variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </MobileButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link
                          href={`/tasks/${task.id}`}
                          className="flex items-center"
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Detail
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingTask({
                            id: task.id,
                            title: task.title,
                            estimatedPomodoros: task.estimatedPomodoros,
                            projectId: task.projectId,
                            labelIds: task.labelIds,
                          });
                          event('task_edit_started', { task_id: task.id });
                        }}
                      >
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => {
                          setEditingDeadline({
                            id: task.id,
                            deadline: task.deadline || '',
                          });
                        }}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        Set Deadline
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDeleteTask(task.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
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
          <div className="mt-4 flex justify-center">
            <Button onClick={loadMoreTasks} variant="outline">
              Load More
            </Button>
          </div>
        )}
        <div className="mb-2 mt-4 flex items-center justify-end space-x-2">
          <span
            id="show-completed-label"
            className="text-sm text-muted-foreground"
          >
            Show completed tasks
          </span>
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
            TaskLabels={TaskLabels}
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete task?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This task will be permanently
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTaskToDelete(null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteTask}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Suspense fallback={null}>
        <AIBreakdownModal
          isOpen={showAIBreakdownModal}
          onClose={() => setShowAIBreakdownModal(false)}
          onSave={handleAIBreakdownSave}
          settings={settings}
          projects={projects}
        />
      </Suspense>
    </Card>
  );
});

TaskList.displayName = 'TaskList';

export default TaskList;
