import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { useTimerStateMachine, TimerSettings } from '@/hooks/useTimerStateMachine';
import { useTaskSynchronizer } from '@/hooks/useTaskSynchronizer';
import { useTimerRecovery } from '@/hooks/useTimerRecovery';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, RotateCcw, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import SelectedTasksList from './SelectedTasksList';
import { ImprovedTimerRecoveryModal } from './ImprovedTimerRecoveryModal';

interface ImprovedPomodoroTimerProps {
  settings: TimerSettings;
}

export const ImprovedPomodoroTimer: React.FC<ImprovedPomodoroTimerProps> = ({ settings }) => {
  const { user } = useAuth();
  const { event } = useGoogleAnalytics();
  
  // Load initial selected task IDs from localStorage
  const [initialTaskIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('selectedTaskIds');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const {
    tasks,
    loading: tasksLoading,
  } = useTasks();

  const { projects } = useProjects();
  const { getElapsedTime, formatTime } = useTimeTracking(tasks);

  // Task synchronizer for race condition prevention
  const {
    selectedTaskIds,
    selectedTasks,
    isUpdating: isTaskUpdating,
    updateSelectedTaskIds,
    startTimeTrackingSync,
    stopTimeTrackingSync,
    completePomodoroSync,
  } = useTaskSynchronizer(initialTaskIds);

  // Handle pomodoro completion with synchronized task operations
  const handlePomodoroComplete = useCallback(async () => {
    if (!user || selectedTaskIds.length === 0) {
      // Guest mode or no tasks - just track analytics
      event('pomodoro_session_completed', {
        duration: settings.pomodoro,
        phase: 'pomodoro',
        task_count: 0,
      });
      return;
    }

    try {
      await completePomodoroSync(selectedTaskIds, settings.pomodoro);
      
      event('pomodoro_session_completed', {
        duration: settings.pomodoro,
        task_ids: selectedTaskIds,
        task_count: selectedTaskIds.length,
        phase: 'pomodoro',
      });
    } catch (error) {
      console.error('Failed to complete pomodoro session:', error);
      // Still fire analytics event even if task update fails
      event('pomodoro_session_completed', {
        duration: settings.pomodoro,
        phase: 'pomodoro',
        task_count: selectedTaskIds.length,
        error: true,
      });
    }
  }, [user, selectedTaskIds, settings.pomodoro, completePomodoroSync, event]);

  // Timer state machine
  const timer = useTimerStateMachine(settings, handlePomodoroComplete);

  // Timer recovery system
  const recovery = useTimerRecovery(
    timer._internalState,
    settings,
    selectedTaskIds,
    timer.restoreSession
  );

  // Create task title mapping for recovery modal
  const taskTitles = useMemo(() => {
    return tasks.reduce((acc, task) => {
      acc[task.id] = task.title;
      return acc;
    }, {} as Record<string, string>);
  }, [tasks]);

  // Handle timer state changes for time tracking
  useEffect(() => {
    const handleTimeTracking = async () => {
      if (isTaskUpdating || selectedTaskIds.length === 0 || timer.phase !== 'pomodoro') {
        return;
      }

      try {
        if (timer.isActive) {
          // Timer started - start time tracking
          await startTimeTrackingSync(selectedTaskIds);
          event('time_tracking_started_with_pomodoro', { task_count: selectedTaskIds.length });
        } else if (!timer.isActive && !timer.isCompleted) {
          // Timer paused - stop time tracking  
          await stopTimeTrackingSync(selectedTaskIds);
          event('time_tracking_paused_with_pomodoro', { task_count: selectedTaskIds.length });
        }
      } catch (error) {
        console.error('Failed to sync time tracking:', error);
      }
    };

    handleTimeTracking();
  }, [
    timer.isActive,
    timer.isCompleted,
    timer.phase,
    selectedTaskIds,
    startTimeTrackingSync,
    stopTimeTrackingSync,
    isTaskUpdating,
    event,
  ]);

  // Task selection handlers
  const handleTaskToggle = useCallback((taskId: string) => {
    const newTaskIds = selectedTaskIds.includes(taskId)
      ? selectedTaskIds.filter(id => id !== taskId)
      : [...selectedTaskIds, taskId];
    
    updateSelectedTaskIds(newTaskIds);
  }, [selectedTaskIds, updateSelectedTaskIds]);

  const handleMarkTaskComplete = useCallback((taskId: string) => {
    // Remove completed task from selection
    const newTaskIds = selectedTaskIds.filter(id => id !== taskId);
    updateSelectedTaskIds(newTaskIds);
  }, [selectedTaskIds, updateSelectedTaskIds]);

  // Recovery modal handlers
  const handleRecoveryComplete = useCallback(() => {
    timer.finishRecovery();
  }, [timer]);

  // Format display values
  const formatDisplayTime = (minutes: number, seconds: number) => {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getPhaseDisplayName = (phase: string) => {
    switch (phase) {
      case 'shortBreak': return 'Short Break';
      case 'longBreak': return 'Long Break';
      default: return 'Pomodoro';
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'pomodoro': return 'bg-red-100 text-red-800 border-red-200';
      case 'shortBreak': return 'bg-green-100 text-green-800 border-green-200';
      case 'longBreak': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canStartTimer = !timer.isRecovering && !isTaskUpdating;
  const showOperationInProgress = isTaskUpdating || timer.isRecovering;

  return (
    <>
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Timer
            </span>
            <Badge className={getPhaseColor(timer.phase)}>
              {getPhaseDisplayName(timer.phase)}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Timer Display */}
          <div className="text-center space-y-2">
            <div className="text-6xl font-mono font-bold tracking-wider">
              {formatDisplayTime(timer.minutes, timer.seconds)}
            </div>
            
            {/* Status indicators */}
            <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
              {timer.isActive && (
                <span className="flex items-center gap-1 text-green-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  Running
                </span>
              )}
              
              {timer.isPaused && (
                <span className="flex items-center gap-1 text-yellow-600">
                  <Pause className="h-3 w-3" />
                  Paused
                </span>
              )}
              
              {showOperationInProgress && (
                <span className="flex items-center gap-1 text-blue-600">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Syncing...
                </span>
              )}
            </div>

            {/* Session counter */}
            <div className="text-sm text-gray-600">
              Sessions completed: <span className="font-medium">{timer.sessionsCompleted}</span>
            </div>
          </div>

          {/* Timer Controls */}
          <div className="flex justify-center gap-4">
            <Button
              onClick={timer.isActive ? timer.pauseTimer : timer.startTimer}
              disabled={!canStartTimer}
              size="lg"
              className={timer.isActive ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700'}
            >
              {timer.isActive ? (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  {timer.isPaused ? 'Resume' : 'Start'}
                </>
              )}
            </Button>

            <Button
              onClick={timer.resetTimer}
              disabled={!canStartTimer}
              variant="outline"
              size="lg"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          {/* Phase Controls */}
          <div className="flex gap-2 justify-center">
            <Button
              onClick={() => timer.switchPhase('pomodoro')}
              disabled={timer.isActive || !canStartTimer}
              variant={timer.phase === 'pomodoro' ? 'default' : 'outline'}
              size="sm"
            >
              Work
            </Button>
            <Button
              onClick={() => timer.switchPhase('shortBreak')}
              disabled={timer.isActive || !canStartTimer}
              variant={timer.phase === 'shortBreak' ? 'default' : 'outline'}
              size="sm"
            >
              Short Break
            </Button>
            <Button
              onClick={() => timer.switchPhase('longBreak')}
              disabled={timer.isActive || !canStartTimer}
              variant={timer.phase === 'longBreak' ? 'default' : 'outline'}
              size="sm"
            >
              Long Break
            </Button>
          </div>

          {/* Selected Tasks */}
          {timer.phase === 'pomodoro' && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-gray-700">
                Selected Tasks ({selectedTaskIds.length})
              </h4>
              
              {selectedTasks.length > 0 ? (
                <SelectedTasksList
                  tasks={selectedTasks}
                  onTaskToggle={handleTaskToggle}
                  onMarkComplete={handleMarkTaskComplete}
                  getElapsedTime={getElapsedTime}
                  formatTime={formatTime}
                />
              ) : (
                <div className="text-center py-4 text-gray-500 text-sm">
                  {tasksLoading ? (
                    'Loading tasks...'
                  ) : selectedTaskIds.length > 0 ? (
                    <div className="flex items-center justify-center gap-2 text-yellow-600">
                      <AlertTriangle className="h-4 w-4" />
                      Some selected tasks are no longer available
                    </div>
                  ) : (
                    'No tasks selected. Click on tasks in the task list to select them for tracking.'
                  )}
                </div>
              )}
            </div>
          )}

          {/* Recovery indicator */}
          {timer.isRecovering && (
            <div className="text-center text-sm text-blue-600">
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                Restoring session...
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recovery Modal */}
      <ImprovedTimerRecoveryModal
        isOpen={recovery.showRecoveryModal}
        session={recovery.availableSession}
        remainingTimeMs={recovery.remainingTimeMs}
        onRecover={(options) => {
          recovery.handleRecovery(options);
          handleRecoveryComplete();
        }}
        taskTitles={taskTitles}
      />
    </>
  );
};