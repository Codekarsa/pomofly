'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import AppLayout from '@/components/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import PomodoroProgressBar from '@/components/PomodoroProgressBar';
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
import {
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  FolderOpen,
  Pencil,
  Star,
  Timer,
  Trash2,
  X,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TaskDetailClient() {
  const router = useRouter();
  const { event } = useGoogleAnalytics();

  // Extract task ID from the actual browser URL instead of params
  // This works around the redirect issue where params.id becomes '_'
  const [taskId, setTaskId] = useState<string>('');

  useEffect(() => {
    // Get the actual URL path from the browser
    const path = window.location.pathname;
    const taskIdFromUrl = path.split('/tasks/')[1];
    if (taskIdFromUrl && taskIdFromUrl !== '_') {
      setTaskId(taskIdFromUrl);
    }
  }, []);

  const {
    tasks,
    loading,
    error,
    toggleTaskCompletion,
    toggleTaskFocus,
    deleteTask,
    updateTask,
    setTaskDeadline,
  } = useTasks();
  const { projects } = useProjects();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editEstimatedPomodoros, setEditEstimatedPomodoros] = useState<
    number | undefined
  >(undefined);
  const [editDeadline, setEditDeadline] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const task = useMemo(() => {
    if (!taskId) return undefined;
    return tasks.find((t) => t.id === taskId);
  }, [tasks, taskId]);
  const taskArray = useMemo(() => (task ? [task] : []), [task]);
  const { getElapsedTime } = useTimeTracking(taskArray);

  const project = useMemo(() => {
    if (!task?.projectId) return null;
    return projects.find((p) => p.id === task.projectId);
  }, [task, projects]);

  const handleStartEdit = useCallback(() => {
    if (task) {
      setEditTitle(task.title);
      setEditEstimatedPomodoros(task.estimatedPomodoros);
      setEditDeadline(task.deadline || '');
      setIsEditing(true);
    }
  }, [task]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!task) return;

    try {
      const updates: Record<string, unknown> = {};
      if (editTitle !== task.title) updates.title = editTitle;
      if (editEstimatedPomodoros !== task.estimatedPomodoros)
        updates.estimatedPomodoros = editEstimatedPomodoros;

      if (Object.keys(updates).length > 0) {
        await updateTask(task.id, updates);
      }

      if (editDeadline !== (task.deadline || '')) {
        await setTaskDeadline(task.id, editDeadline || null);
      }

      setIsEditing(false);
      event('task_detail_edited', { task_id: task.id });
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  }, [
    task,
    editTitle,
    editEstimatedPomodoros,
    editDeadline,
    updateTask,
    setTaskDeadline,
    event,
  ]);

  const handleDelete = useCallback(async () => {
    if (!task) return;

    try {
      await deleteTask(task.id);
      event('task_deleted_from_detail', { task_id: task.id });
      router.push('/tasks');
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }, [task, deleteTask, router, event]);

  const handleToggleCompletion = useCallback(async () => {
    if (!task) return;
    await toggleTaskCompletion(task.id, task.completed);
    event('task_completion_toggled_from_detail', {
      task_id: task.id,
      completed: !task.completed,
    });
  }, [task, toggleTaskCompletion, event]);

  const handleToggleFocus = useCallback(async () => {
    if (!task) return;
    await toggleTaskFocus(task.id, task.focus || false);
    event('task_focus_toggled_from_detail', {
      task_id: task.id,
      focus: !task.focus,
    });
  }, [task, toggleTaskFocus, event]);

  // Format time spent
  const formatTimeSpent = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading || !taskId) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Card className="mx-auto max-w-2xl">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="mt-3 text-sm text-muted-foreground">
                  Loading task...
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Card className="mx-auto max-w-2xl border-red-200 bg-red-50">
            <CardContent className="py-6">
              <p className="text-center text-sm text-red-600">
                Error loading task: {error.message}
              </p>
              <div className="mt-4 text-center">
                <Link href="/tasks">
                  <Button variant="outline">Back to Tasks</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (!task) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Card className="mx-auto max-w-2xl">
            <CardContent className="py-12">
              <div className="text-center">
                <p className="mb-4 text-muted-foreground">Task not found</p>
                <Link href="/tasks">
                  <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Tasks
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const totalTimeSpent = getElapsedTime(task);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          {/* Back Button */}
          <Link
            href="/tasks"
            className="mb-6 inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tasks
          </Link>

          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {isEditing ? (
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="text-xl font-semibold"
                      autoFocus
                    />
                  ) : (
                    <CardTitle
                      className={cn(
                        'text-xl',
                        task.completed && 'text-muted-foreground line-through'
                      )}
                    >
                      {task.title}
                    </CardTitle>
                  )}
                  {project && (
                    <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                      <FolderOpen className="h-4 w-4" />
                      {project.name}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleCancelEdit}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleSaveEdit}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleStartEdit}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Status Buttons */}
              <div className="flex items-center gap-3">
                <Button
                  variant={task.completed ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleToggleCompletion}
                  className={cn(
                    task.completed && 'bg-green-500 hover:bg-green-600'
                  )}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {task.completed ? 'Completed' : 'Mark Complete'}
                </Button>
                <Button
                  variant={task.focus ? 'default' : 'outline'}
                  size="sm"
                  onClick={handleToggleFocus}
                  className={cn(
                    task.focus && 'bg-amber-500 hover:bg-amber-600'
                  )}
                >
                  <Star
                    className="mr-2 h-4 w-4"
                    fill={task.focus ? 'currentColor' : 'none'}
                  />
                  {task.focus ? 'Focused' : 'Add to Focus'}
                </Button>
              </div>

              {/* Task Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Deadline */}
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Deadline
                  </div>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editDeadline}
                      onChange={(e) => setEditDeadline(e.target.value)}
                      className="mt-1"
                    />
                  ) : (
                    <p className="font-medium">
                      {task.deadline
                        ? new Date(task.deadline).toLocaleDateString()
                        : 'No deadline'}
                    </p>
                  )}
                </div>

                {/* Time Spent */}
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    Time Spent
                  </div>
                  <p className="font-medium">
                    {formatTimeSpent(totalTimeSpent)}
                  </p>
                </div>

                {/* Pomodoro Sessions */}
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Timer className="h-4 w-4" />
                    Pomodoro Sessions
                  </div>
                  <p className="font-medium">
                    {task.totalPomodoroSessions || 0} completed
                  </p>
                </div>

                {/* Estimated Pomodoros */}
                <div className="rounded-lg bg-muted/50 p-4">
                  <div className="mb-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <Timer className="h-4 w-4" />
                    Estimated
                  </div>
                  {isEditing ? (
                    <Input
                      type="number"
                      min="0"
                      value={editEstimatedPomodoros || ''}
                      onChange={(e) =>
                        setEditEstimatedPomodoros(
                          e.target.value ? parseInt(e.target.value) : undefined
                        )
                      }
                      className="mt-1"
                      placeholder="0"
                    />
                  ) : (
                    <p className="font-medium">
                      {task.estimatedPomodoros || 0} pomodoros
                    </p>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="border-t pt-4">
                <p className="mb-2 text-sm text-muted-foreground">Progress</p>
                <PomodoroProgressBar
                  completed={task.totalPomodoroSessions || 0}
                  estimated={task.estimatedPomodoros || 0}
                  size="md"
                  showLabel={true}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{task.title}&quot;? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
