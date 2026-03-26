/**
 * Improved PomodoroTimer component with race condition fixes
 */

import React, { useCallback, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { usePomodoroV2, PomodoroSettings } from '@/hooks/usePomodoroV2';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, RotateCcw, CheckCircle, AlertTriangle } from 'lucide-react';
import SelectedTasksList from './SelectedTasksList';
import { TimerRecoveryModal } from './TimerRecoveryModal';
import { TimerPhase } from '@/lib/timerStateMachine';

interface PomodoroTimerV2Props {
  settings: PomodoroSettings;
}

const PomodoroTimerV2: React.FC<PomodoroTimerV2Props> = React.memo(({ settings }) => {
  const { user } = useAuth();
  const { event } = useGoogleAnalytics();
  const {
    tasks,
    loading,
    incrementPomodoroSession,
    startAllTimeTracking,
    stopAllTimeTracking
  } = useTasks();
  const { projects } = useProjects();
  const { getElapsedTime, formatTime } = useTimeTracking(tasks);

  // Define completion handler
  const handlePomodoroComplete = useCallback(async (phase: TimerPhase, taskIds: string[]) => {
    if (!user) {
      event('pomodoro_session_completed', {
        duration: settings[phase],
        phase: phase
      });
      return;
    }

    if (phase === 'pomodoro' && taskIds.length > 0) {
      try {
        // The task operations are already handled by the state machine
        // Just emit analytics events here
        event('pomodoro_session_completed', {
          duration: settings.pomodoro,
          task_ids: taskIds,
          task_count: taskIds.length,
          phase: 'pomodoro'
        });
      } catch (error) {
        console.error('Error completing pomodoro session:', error);
        event('pomodoro_session_error', {
          error: 'completion_failed',
          phase: phase,
          task_count: taskIds.length
        });
      }
    } else {
      event('pomodoro_session_completed', {
        duration: settings[phase],
        phase: phase
      });
    }
  }, [user, settings, event]);

  // Initialize pomodoro hook with completion handler
  const {
    phase,
    minutes,
    seconds,
    isActive,
    toggleTimer,
    resetTimer,
    switchPhase,
    selectedTaskIds,
    addTask,
    removeTask,
    showRecoveryModal,
    persistedSession,
    restoreSession,
    startFresh,
    isOperationInProgress,
    sessionsCompleted
  } = usePomodoroV2(settings, handlePomodoroComplete);

  // Analytics - component view
  useEffect(() => {
    event('pomodoro_timer_view', { user_authenticated: !!user });
  }, [event, user]);

  // Helper functions
  const countTodaysSessions = useCallback(() => {
    // This could be enhanced to track daily sessions in localStorage
    // For now, return the current session count
    return sessionsCompleted;
  }, [sessionsCompleted]);

  const handleToggleTimer = useCallback(async () => {
    try {
      await toggleTimer();
      event('pomodoro_timer_toggled', {
        action: isActive ? 'pause' : 'start',
        phase: phase,
        selected_tasks: selectedTaskIds.length
      });
    } catch (error) {
      console.error('Timer toggle error:', error);
      event('pomodoro_timer_error', { action: 'toggle' });
    }
  }, [toggleTimer, isActive, phase, selectedTaskIds.length, event]);

  const handleResetTimer = useCallback(async () => {
    try {
      await resetTimer();
      event('pomodoro_timer_reset', { phase: phase });
    } catch (error) {
      console.error('Timer reset error:', error);
      event('pomodoro_timer_error', { action: 'reset' });
    }
  }, [resetTimer, phase, event]);

  const handleSwitchPhase = useCallback(async (newPhase: TimerPhase) => {
    try {
      await switchPhase(newPhase);
      event('pomodoro_phase_switched', { new_phase: newPhase });
    } catch (error) {
      console.error('Phase switch error:', error);
      event('pomodoro_timer_error', { action: 'switch_phase' });
    }
  }, [switchPhase, event]);

  const handleAddTask = useCallback(async (taskId: string) => {
    if (selectedTaskIds.includes(taskId)) {
      return; // Already selected
    }

    try {
      await addTask(taskId);
      event('task_added_to_pomodoro', { task_id: taskId });
    } catch (error) {
      console.error('Add task error:', error);
      event('pomodoro_timer_error', { action: 'add_task' });
    }
  }, [addTask, selectedTaskIds, event]);

  const handleRemoveTask = useCallback(async (taskId: string) => {
    try {
      await removeTask(taskId);
      event('task_removed_from_pomodoro', { task_id: taskId });
    } catch (error) {
      console.error('Remove task error:', error);
      event('pomodoro_timer_error', { action: 'remove_task' });
    }
  }, [removeTask, event]);

  const handleDoneNext = useCallback(async () => {
    try {
      // Force complete current session
      await handlePomodoroComplete(phase, selectedTaskIds);
      await resetTimer();
      
      const nextPhase = phase === 'pomodoro' ? 'shortBreak' : 'pomodoro';
      await switchPhase(nextPhase);
      
      event('pomodoro_phase_switched', { new_phase: nextPhase });
    } catch (error) {
      console.error('Done/Next error:', error);
      event('pomodoro_timer_error', { action: 'done_next' });
    }
  }, [handlePomodoroComplete, phase, selectedTaskIds, resetTimer, switchPhase, event]);

  const handleRestoreSession = useCallback(async (session: any) => {
    try {
      await restoreSession(session);
      event('timer_session_restored', {
        phase: session.phase,
        was_active: session.isActive,
        tasks_count: session.selectedTaskIds?.length || 0
      });
    } catch (error) {
      console.error('Session restore error:', error);
      event('pomodoro_timer_error', { action: 'restore_session' });
    }
  }, [restoreSession, event]);

  const handleStartFresh = useCallback(async () => {
    try {
      await startFresh();
      event('timer_session_start_fresh');
    } catch (error) {
      console.error('Start fresh error:', error);
      event('pomodoro_timer_error', { action: 'start_fresh' });
    }
  }, [startFresh, event]);

  // Filter tasks that are valid for selection (exist and not completed)
  const filteredTasks = tasks.filter(task => !task.completed);
  const selectedTasks = filteredTasks.filter(task => selectedTaskIds.includes(task.id));

  if (loading) {
    return (
      <Card className="w-full mx-auto">
        <CardHeader>
          <CardTitle>Pomodoro Timer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="relative w-48 h-48 mb-6">
              <div className="absolute inset-0 rounded-full border-8 border-gray-200"></div>
              <div className="absolute inset-0 rounded-full border-8 border-t-red-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-4xl font-mono text-gray-300 animate-pulse">--:--</div>
              </div>
            </div>
            <p className="text-muted-foreground animate-pulse">Loading timer...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Timer Recovery Modal */}
      {showRecoveryModal && persistedSession && (
        <TimerRecoveryModal
          isOpen={showRecoveryModal}
          session={persistedSession}
          onRestore={handleRestoreSession}
          onStartFresh={handleStartFresh}
        />
      )}

      <Card className="w-full mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pomodoro Timer
            {isOperationInProgress && (
              <AlertTriangle className="h-4 w-4 text-yellow-500 animate-pulse" />
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 text-lg">
            <span className="font-semibold">Today&apos;s Sessions: </span>
            <span>{countTodaysSessions()}</span>
          </div>

          <div className="mb-4 flex justify-center space-x-2">
            {(['pomodoro', 'shortBreak', 'longBreak'] as const).map((timerPhase) => (
              <Button
                key={timerPhase}
                onClick={() => handleSwitchPhase(timerPhase)}
                variant={phase === timerPhase ? 'default' : 'outline'}
                disabled={isOperationInProgress}
              >
                {timerPhase === 'pomodoro' ? 'Pomodoro' : 
                 timerPhase === 'shortBreak' ? 'Short Break' : 'Long Break'}
              </Button>
            ))}
          </div>

          <div className="text-8xl font-bold mb-4 text-center py-6">
            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </div>

          <div className="flex justify-center space-x-2 mb-6">
            <Button
              onClick={handleToggleTimer}
              variant={isActive ? 'secondary' : 'default'}
              disabled={isOperationInProgress}
            >
              {isActive ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {isActive ? 'Pause' : 'Start'}
            </Button>
            <Button
              onClick={handleResetTimer}
              variant="outline"
              disabled={isOperationInProgress}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            {isActive && (
              <Button
                onClick={handleDoneNext}
                variant="default"
                disabled={isOperationInProgress}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Done/Next
              </Button>
            )}
          </div>

          {/* Operation status indicator */}
          {isOperationInProgress && (
            <div className="mb-4 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                Processing...
              </div>
            </div>
          )}

          {/* Task Selection - available for authenticated users */}
          {user && (
            <SelectedTasksList
              tasks={filteredTasks}
              projects={projects}
              selectedTaskIds={selectedTaskIds}
              onAddTask={handleAddTask}
              onRemoveTask={handleRemoveTask}
              getElapsedTime={getElapsedTime}
              formatTime={formatTime}
            />
          )}
        </CardContent>
      </Card>
    </>
  );
});

PomodoroTimerV2.displayName = 'PomodoroTimerV2';

export default PomodoroTimerV2;