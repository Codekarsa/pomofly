import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTasks } from '../hooks/useTasks';
import { useProjects } from '../hooks/useProjects';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Plus, Pencil, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const TaskList = React.memo(() => {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [estimatedPomodoros, setEstimatedPomodoros] = useState<number | undefined>(undefined);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [editingTask, setEditingTask] = useState<{ id: string, title: string, estimatedPomodoros?: number } | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const itemsPerPage = 5;

  const { projects } = useProjects();
  const { 
    tasks, 
    loading: tasksLoading, 
    error: tasksError, 
    addTask, 
    updateTask, 
    toggleTaskCompletion, 
    deleteTask 
  } = useTasks(selectedProjectId);
  const { event } = useGoogleAnalytics();

  const memoizedProjects = useMemo(() => projects, [projects]);
  const memoizedTasks = useMemo(() => tasks, [tasks]);

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
        setEstimatedPomodoros(undefined);
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
        await updateTask(editingTask.id, { title: editingTask.title, estimatedPomodoros: editingTask.estimatedPomodoros });
        event('task_updated', { 
          task_id: editingTask.id, 
          new_estimated_pomodoros: editingTask.estimatedPomodoros 
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

  const filteredTasks = useMemo(() => 
    memoizedTasks.filter(task => 
      (showCompleted || !task.completed) &&
      (searchTerm === '' || task.title.toLowerCase().includes(searchTerm.toLowerCase()))
    ),
    [memoizedTasks, showCompleted, searchTerm]
  );

  const displayedTasks = useMemo(() => 
    filteredTasks.slice(0, (currentPage + 1) * itemsPerPage),
    [filteredTasks, currentPage, itemsPerPage]
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

  const handleShowCompletedToggle = useCallback(() => {
    setShowCompleted(!showCompleted);
    event('show_completed_tasks_toggled', { new_state: !showCompleted });
  }, [event]);

  const handleSearchTermChange = useCallback((term: string) => {
    setSearchTerm(term);
    event('task_search', { search_term: term });
  }, [event]);

  const loadMoreTasks = useCallback(() => {
    if ((currentPage + 1) * itemsPerPage < filteredTasks.length) {
      setCurrentPage(prevPage => prevPage + 1);
      event('load_more_tasks', { new_page: currentPage + 1 });
    }
  }, [currentPage, event, filteredTasks.length, itemsPerPage]);

  if (tasksLoading) return <div>Loading tasks...</div>;
  if (tasksError) return <div>Error loading tasks: {tasksError.message}</div>;

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Your Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4 mb-6">
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="New task title"
              className="flex-grow"
            />
            <Input
              type="number"
              value={estimatedPomodoros}
              onChange={(e) => setEstimatedPomodoros(e.target.value ? parseInt(e.target.value) : undefined)}
              placeholder="Pomodoros"
              className="w-24"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Select onValueChange={setSelectedProjectId} value={selectedProjectId}>
              <SelectTrigger className="flex-grow">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {memoizedProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit">
              <Plus className="w-4 h-4 mr-2" />
              Add Task
            </Button>
          </div>
        </form>

        <div className="flex items-center space-x-2 mb-4">
          <Checkbox
            id="showCompleted"
            checked={showCompleted}
            onCheckedChange={handleShowCompletedToggle}
          />
          <label htmlFor="showCompleted" className="text-sm">Show completed tasks</label>
        </div>

        <Input
          type="text"
          value={searchTerm}
          onChange={(e) => handleSearchTermChange(e.target.value)}
          placeholder="Search tasks"
          className="mb-4"
        />

        <ul className="space-y-2">
          {displayedTasks.map((task) => (
            <li key={task.id} className="flex items-center justify-between p-2 hover:bg-accent rounded-md transition-colors">
              {editingTask && editingTask.id === task.id ? (
                <form onSubmit={handleUpdateTask} className="flex items-center space-x-2 w-full">
                  <Input
                    type="text"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                    className="flex-grow"
                  />
                  <Input
                    type="number"
                    value={editingTask.estimatedPomodoros}
                    onChange={(e) => setEditingTask({ ...editingTask, estimatedPomodoros: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Pomodoros"
                    className="w-24"
                  />
                  <Button type="submit" size="sm" variant="outline">Save</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => setEditingTask(null)}>Cancel</Button>
                </form>
              ) : (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={task.completed}
                      onCheckedChange={() => handleToggleTaskCompletion(task.id, task.completed)}
                    />
                    <span className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                      {task.title}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      ({task.totalPomodoroSessions || 0}/{task.estimatedPomodoros || 0})
                    </span>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                      
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => {
                        setEditingTask({ id: task.id, title: task.title, estimatedPomodoros: task.estimatedPomodoros });
                        event('task_edit_started', { task_id: task.id });
                      }}>
                        <Pencil className="w-4 h-4 mr-2" />
                        Edit
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
        {displayedTasks.length < filteredTasks.length && (
          <div className="flex justify-center mt-4">
            <Button onClick={loadMoreTasks} variant="outline">
              Load More
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

TaskList.displayName = 'TaskList';

export default TaskList;