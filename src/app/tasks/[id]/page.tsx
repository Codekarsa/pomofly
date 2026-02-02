'use client'

import React, { useState, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
  Check
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function TaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const taskId = params.id as string;
  const { event } = useGoogleAnalytics();

  const { tasks, loading, error, toggleTaskCompletion, toggleTaskFocus, deleteTask, updateTask, setTaskDeadline } = useTasks();
  const { projects } = useProjects();

  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editEstimatedPomodoros, setEditEstimatedPomodoros] = useState<number | undefined>(undefined);
  const [editDeadline, setEditDeadline] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const task = useMemo(() => tasks.find(t => t.id === taskId), [tasks, taskId]);
  const taskArray = useMemo(() => task ? [task] : [], [task]);
  const { getElapsedTime } = useTimeTracking(taskArray);

  const project = useMemo(() => {
    if (!task?.projectId) return null;
    return projects.find(p => p.id === task.projectId);
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
    setEditTitle('');
    setEditEstimatedPomodoros(undefined);
    setEditDeadline('');
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!task || !editTitle.trim()) return;

    try {
      await updateTask(task.id, {
        title: editTitle.trim(),
        estimatedPomodoros: editEstimatedPomodoros
      });
      if (editDeadline !== (task.deadline || '')) {
        await setTaskDeadline(task.id, editDeadline || null);
      }
      event('task_updated', { task_id: task.id });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  }, [task, editTitle, editEstimatedPomodoros, editDeadline, updateTask, setTaskDeadline, event]);

  const handleDelete = useCallback(async () => {
    if (!task) return;

    try {
      await deleteTask(task.id);
      event('task_deleted', { task_id: task.id });
      router.push('/tasks');
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  }, [task, deleteTask, event, router]);

  const handleToggleComplete = useCallback(async () => {
    if (!task) return;
    await toggleTaskCompletion(task.id, task.completed);
    event('task_completion_toggled', { task_id: task.id, new_state: !task.completed });
  }, [task, toggleTaskCompletion, event]);

  const handleToggleFocus = useCallback(async () => {
    if (!task) return;
    await toggleTaskFocus(task.id, task.focus);
    event('task_focus_toggled', { task_id: task.id, new_state: !task.focus });
  }, [task, toggleTaskFocus, event]);

  const formatTimeSpent = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="border border-border/50 bg-card shadow-sm rounded-xl">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center">
                  <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-muted-foreground mt-3">Loading task...</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="border border-red-200 bg-red-50 dark:bg-red-900/10 rounded-xl">
              <CardContent className="py-8">
                <p className="text-sm text-red-600 dark:text-red-400 text-center">
                  Error loading task: {error.message}
                </p>
                <div className="flex justify-center mt-4">
                  <Button variant="outline" asChild>
                    <Link href="/tasks">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Tasks
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!task) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="border border-border/50 bg-card shadow-sm rounded-xl">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                    <X className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <h2 className="text-lg font-semibold mb-2">Task not found</h2>
                  <p className="text-sm text-muted-foreground mb-6">
                    The task you are looking for does not exist or has been deleted.
                  </p>
                  <Button asChild>
                    <Link href="/tasks">
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Back to Tasks
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </AppLayout>
    );
  }

  const totalTimeSpent = getElapsedTime(task);

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <div className="mb-6">
            <Button variant="ghost" asChild className="pl-0 hover:pl-0">
              <Link href="/tasks" className="flex items-center text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Tasks
              </Link>
            </Button>
          </div>

          <Card className="border border-border/50 bg-card shadow-sm rounded-xl">
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  {isEditing ? (
                    <div className="space-y-3">
                      <Input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Task title"
                        className="text-xl font-semibold"
                        autoFocus
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleToggleComplete}
                        className={cn(
                          "h-8 w-8 transition-colors",
                          task.completed
                            ? "text-green-500 hover:text-green-600"
                            : "text-muted-foreground hover:text-green-500"
                        )}
                      >
                        <CheckCircle className="w-6 h-6" fill={task.completed ? 'currentColor' : 'none'} />
                      </Button>
                      <CardTitle className={cn(
                        "text-xl font-semibold",
                        task.completed && "line-through text-muted-foreground"
                      )}>
                        {task.title}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleToggleFocus}
                        className={cn(
                          "h-8 w-8 transition-colors",
                          task.focus
                            ? "text-amber-500 hover:text-amber-600"
                            : "text-muted-foreground hover:text-amber-500"
                        )}
                      >
                        <Star className="w-5 h-5" fill={task.focus ? 'currentColor' : 'none'} />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 ml-4">
                  {isEditing ? (
                    <>
                      <Button variant="ghost" size="icon" onClick={handleCancelEdit}>
                        <X className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={handleSaveEdit} className="text-green-600 hover:text-green-700">
                        <Check className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button variant="ghost" size="icon" onClick={handleStartEdit}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Status Badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={cn(
                  "inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium",
                  task.completed
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                )}>
                  <CheckCircle className="w-4 h-4" fill={task.completed ? 'currentColor' : 'none'} />
                  {task.completed ? 'Completed' : 'In Progress'}
                </span>

                {task.focus && (
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                    <Star className="w-4 h-4" fill="currentColor" />
                    Focused
                  </span>
                )}
              </div>

              {/* Task Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Project */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <FolderOpen className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Project</p>
                    <p className="font-medium">{project?.name || 'No project'}</p>
                  </div>
                </div>

                {/* Deadline */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Deadline</p>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editDeadline}
                        onChange={(e) => setEditDeadline(e.target.value)}
                        className="mt-1"
                      />
                    ) : (
                      <p className={cn(
                        "font-medium",
                        task.deadline && new Date(task.deadline) < new Date() && !task.completed
                          ? "text-red-600 dark:text-red-400"
                          : ""
                      )}>
                        {task.deadline
                          ? new Date(task.deadline).toLocaleDateString('en-US', {
                              weekday: 'short',
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : 'No deadline set'}
                        {task.deadline && new Date(task.deadline) < new Date() && !task.completed && (
                          <span className="ml-2 text-red-600 dark:text-red-400">(Overdue)</span>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                {/* Time Spent */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm text-muted-foreground">Time Spent</p>
                    <p className="font-medium">{formatTimeSpent(totalTimeSpent)}</p>
                    {task.trackingStartedAt && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Currently tracking</p>
                    )}
                  </div>
                </div>

                {/* Pomodoro Sessions */}
                <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/50">
                  <Timer className="w-5 h-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Pomodoro Sessions</p>
                    {isEditing ? (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-medium">{task.totalPomodoroSessions || 0} /</span>
                        <Input
                          type="number"
                          value={editEstimatedPomodoros || ''}
                          onChange={(e) => setEditEstimatedPomodoros(e.target.value ? parseInt(e.target.value) : undefined)}
                          placeholder="Est."
                          className="w-20"
                          min={0}
                        />
                      </div>
                    ) : (
                      <p className="font-medium">
                        {task.totalPomodoroSessions || 0} / {task.estimatedPomodoros || 0} sessions
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Pomodoro Progress */}
              {!isEditing && (task.estimatedPomodoros || 0) > 0 && (
                <div className="pt-4 border-t border-border/50">
                  <p className="text-sm text-muted-foreground mb-2">Progress</p>
                  <PomodoroProgressBar
                    completed={task.totalPomodoroSessions || 0}
                    estimated={task.estimatedPomodoros || 0}
                    size="md"
                    showLabel={true}
                  />
                </div>
              )}

              {/* Created Date */}
              <div className="pt-4 border-t border-border/50">
                <p className="text-xs text-muted-foreground">
                  Created on {new Date(task.createdAt).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

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
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
