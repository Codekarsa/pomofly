import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTasks, Task } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Plus, Pencil, Trash2, Star, Calendar, ChevronDown, ChevronRight } from 'lucide-react';
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
                <Checkbox
                  checked={task.completed}
                  onCheckedChange={() => onToggleTaskCompletion(task.id, task.completed)}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleTaskFocus(task.id, task.focus || false)}
                  className={`p-1 ${task.focus ? 'text-yellow-500' : 'text-gray-400'}`}
                >
                  <Star className="w-4 h-4" fill={task.focus ? 'currentColor' : 'none'} />
                </Button>
                <span className="text-sm line-through text-muted-foreground">{task.title}</span>
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

const TaskList: React.FC<TaskListProps> = React.memo(({ settings }) => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [estimatedPomodoros, setEstimatedPomodoros] = useState<number | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [editingTask, setEditingTask] = useState<{ id: string, title: string, estimatedPomodoros?: number, projectId?: string } | null>(null);
  const [editingDeadline, setEditingDeadline] = useState<{ id: string, deadline: string } | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;
  const [showAddTaskForm, setShowAddTaskForm] = useState(false);
  const [showSearchForm, setShowSearchForm] = useState(false);
  const [showAIBreakdownModal, setShowAIBreakdownModal] = useState(false);

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
    setTaskDeadline
  } = useTasks(selectedProjectId);
  const { event } = useGoogleAnalytics();

  const memoizedProjects = useMemo(() => projects, [projects]);
  const memoizedTasks = useMemo(() => tasks, [tasks]);

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

  // Only paginate active (incomplete) tasks
  const activeTasks = useMemo(() => memoizedTasks.filter(task => !task.completed), [memoizedTasks]);
  const completedTasks = useMemo(() => memoizedTasks.filter(task => task.completed), [memoizedTasks]);

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

  const handleSearchTermChange = useCallback((term: string) => {
    setSearchTerm(term);
    event('task_search', { search_term: term });
  }, [event]);

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
          {!showSearchForm && (
            <Button onClick={() => setShowSearchForm(true)} className="mr-2">
              Search Tasks
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

        {showSearchForm && (
          <div className="flex items-center space-x-2 mb-4">
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => handleSearchTermChange(e.target.value)}
              placeholder="Search tasks"
              className="flex-grow"
            />
            <Button type="button" onClick={() => setShowSearchForm(false)} variant="outline">
              Cancel
            </Button>
          </div>
        )}

        <hr />
        <ul className="space-y-2">
          {paginatedActiveTasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between p-2 hover:bg-accent rounded-md transition-colors">
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
                      checked={task.completed}
                      onCheckedChange={() => handleToggleTaskCompletion(task.id, task.completed)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleTaskFocus(task.id, task.focus || false)}
                      className={`p-1 ${task.focus ? 'text-yellow-500' : 'text-gray-400'}`}
                    >
                      <Star className="w-4 h-4" fill={task.focus ? 'currentColor' : 'none'} />
                    </Button>
                    <span className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </span>
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