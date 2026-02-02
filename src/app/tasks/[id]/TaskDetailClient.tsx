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

export default function TaskDetailClient() {
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
  }, []);

  const handleSaveEdit = useCallback(async () => {
    if (!task) return;

    try {
      const updates: Record<string, unknown> = {};
      if (editTitle !== task.title) updates.title = editTitle;
      if (editEstimatedPomodoros !== task.estimatedPomodoros) updates.estimatedPomodoros = editEstimatedPomodoros;

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
  }, [task, editTitle, editEstimatedPomodoros, editDeadline, updateTask, setTaskDeadline, event]);

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
    event('task_completion_toggled_from_detail', { task_id: task.id, completed: !task.completed });
  }, [task, toggleTaskCompletion, event]);

  const handleToggleFocus = useCallback(async () => {
    if (!task) return;
    await toggleTaskFocus(task.id, task.focus || false);
    event('task_focus_toggled_from_detail', { task_id: task.id, focus: !task.focus });
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

  if (loading) {
    return (
      <AppLayout>
        <div className="container mx-auto px-4 py-8">
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12">
              <div className="flex flex-col items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground mt-3">Loading task...</p>
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
          <Card className="max-w-2xl mx-auto border-red-200 bg-red-50">
            <CardContent className="py-6">
              <p className="text-sm text-red-600 text-center">Error loading task: {error.message}</p>
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
          <Card className="max-w-2xl mx-auto">
            <CardContent className="py-12">
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Task not found</p>
                <Link href="/tasks">
                  <Button variant="outline">
                    <ArrowLeft className="w-4 h-4 mr-2" />
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
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <Link href="/tasks" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
            <ArrowLeft className="w-4 h-4 mr-2" />
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
                    <CardTitle className={cn(
                      "text-xl",
                      task.completed && "line-through text-muted-foreground"
                    )}>
                      {task.title}
                    </CardTitle>
                  )}
                  {project && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <FolderOpen className="w-4 h-4" />
                      {project.name}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button variant="ghost" size="icon" onClick={handleCancelEdit}>
                        <X className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={handleSaveEdit}>
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
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
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
                  variant={task.completed ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleCompletion}
                  className={cn(task.completed && "bg-green-500 hover:bg-green-600")}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {task.completed ? 'Completed' : 'Mark Complete'}
                </Button>
                <Button
                  variant={task.focus ? "default" : "outline"}
                  size="sm"
                  onClick={handleToggleFocus}
                  className={cn(task.focus && "bg-amber-500 hover:bg-amber-600")}
                >
                  <Star className="w-4 h-4 mr-2" fill={task.focus ? "currentColor" : "none"} />
                  {task.focus ? 'Focused' : 'Add to Focus'}
                </Button>
              </div>

              {/* Task Details Grid */}
              <div className="grid grid-cols-2 gap-4">
                {/* Deadline */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="w-4 h-4" />
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
                      {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                    </p>
                  )}
                </div>

                {/* Time Spent */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    Time Spent
                  </div>
                  <p className="font-medium">{formatTimeSpent(totalTimeSpent)}</p>
                </div>

                {/* Pomodoro Sessions */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Timer className="w-4 h-4" />
                    Pomodoro Sessions
                  </div>
                  <p className="font-medium">{task.totalPomodoroSessions || 0} completed</p>
                </div>

                {/* Estimated Pomodoros */}
                <div className="p-4 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Timer className="w-4 h-4" />
                    Estimated
                  </div>
                  {isEditing ? (
                    <Input
                      type="number"
                      min="0"
                      value={editEstimatedPomodoros || ''}
                      onChange={(e) => setEditEstimatedPomodoros(e.target.value ? parseInt(e.target.value) : undefined)}
                      className="mt-1"
                      placeholder="0"
                    />
                  ) : (
                    <p className="font-medium">{task.estimatedPomodoros || 0} pomodoros</p>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground mb-2">Progress</p>
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
              Are you sure you want to delete &quot;{task.title}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
