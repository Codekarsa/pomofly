import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Play, Pause, RotateCcw, CheckCircle } from 'lucide-react';
import TaskPicker from './TaskPicker';

interface PomodoroSettings {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
}

interface PomodoroTimerProps {
  settings: PomodoroSettings;
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = React.memo(({ settings }) => {
  const { user } = useAuth();
  const { event } = useGoogleAnalytics();
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const {
    tasks,
    loading,
    incrementPomodoroSession,
    startAllTimeTracking,
    stopAllTimeTracking
  } = useTasks();
  const { projects } = useProjects();
  const { getElapsedTime } = useTimeTracking(tasks);

  const [completedSessions, setCompletedSessions] = useState<{ date: string }[]>([]);
  const wasActiveRef = useRef(false);

  // Get selected tasks for time tracking calculations
  const selectedTasks = tasks.filter(t => selectedTaskIds.includes(t.id));

  const handlePomodoroComplete = useCallback(() => {
    if (user && selectedTaskIds.length > 0) {
      // Stop time tracking and increment pomodoro for all selected tasks
      const tasksToStop = selectedTasks
        .filter(task => task.trackingStartedAt != null)
        .map(task => ({
          taskId: task.id,
          elapsedSeconds: getElapsedTime(task) - (task.manualTimeSpent ?? 0)
        }));

      if (tasksToStop.length > 0) {
        stopAllTimeTracking(tasksToStop);
      }

      // Increment pomodoro session for all selected tasks
      selectedTaskIds.forEach(taskId => {
        incrementPomodoroSession(taskId, settings.pomodoro);
      });

      setCompletedSessions(prev => [...prev, { date: new Date().toISOString() }]);
      event('pomodoro_session_completed', {
        duration: settings.pomodoro,
        task_ids: selectedTaskIds,
        task_count: selectedTaskIds.length,
        phase: 'pomodoro'
      });
    } else {
      event('pomodoro_session_completed', {
        duration: settings.pomodoro,
        phase: 'pomodoro'
      });
    }
  }, [user, selectedTaskIds, selectedTasks, settings.pomodoro, incrementPomodoroSession, stopAllTimeTracking, getElapsedTime, event]);

  const {
    phase,
    minutes,
    seconds,
    isActive,
    toggleTimer,
    resetTimer,
    switchPhase,
  } = usePomodoro(settings, handlePomodoroComplete);

  // Handle timer start/pause - manage time tracking
  useEffect(() => {
    if (isActive && !wasActiveRef.current) {
      // Timer just started - start time tracking on all selected tasks
      if (selectedTaskIds.length > 0 && phase === 'pomodoro') {
        const taskIdsToStart = selectedTaskIds.filter(id => {
          const task = tasks.find(t => t.id === id);
          return task && task.trackingStartedAt == null;
        });
        if (taskIdsToStart.length > 0) {
          startAllTimeTracking(taskIdsToStart);
          event('time_tracking_started_with_pomodoro', { task_count: taskIdsToStart.length });
        }
      }
    } else if (!isActive && wasActiveRef.current) {
      // Timer just paused - stop time tracking on all selected tasks
      if (selectedTaskIds.length > 0 && phase === 'pomodoro') {
        const tasksToStop = selectedTasks
          .filter(task => task.trackingStartedAt != null)
          .map(task => ({
            taskId: task.id,
            elapsedSeconds: getElapsedTime(task) - (task.manualTimeSpent ?? 0)
          }));

        if (tasksToStop.length > 0) {
          stopAllTimeTracking(tasksToStop);
          event('time_tracking_stopped_with_pomodoro', { task_count: tasksToStop.length });
        }
      }
    }
    wasActiveRef.current = isActive;
  }, [isActive, selectedTaskIds, selectedTasks, phase, tasks, startAllTimeTracking, stopAllTimeTracking, getElapsedTime, event]);

  useEffect(() => {
    event('pomodoro_timer_view', { user_authenticated: !!user });
  }, [event, user]);

  const countTodaysSessions = useCallback(() => {
    const today = new Date().toDateString();
    return completedSessions.filter(session =>
      new Date(session.date).toDateString() === today
    ).length;
  }, [completedSessions]);

  const handleDoneNext = useCallback(() => {
    handlePomodoroComplete();
    resetTimer();
    switchPhase(phase === 'pomodoro' ? 'shortBreak' : 'pomodoro');
    event('pomodoro_phase_switched', { new_phase: phase === 'pomodoro' ? 'shortBreak' : 'pomodoro' });
  }, [handlePomodoroComplete, resetTimer, switchPhase, phase, event]);

  const handleSelectionChange = useCallback((taskIds: string[]) => {
    setSelectedTaskIds(taskIds);
    event('tasks_selected_for_pomodoro', { task_count: taskIds.length });
  }, [event]);

  const handleToggleTimer = useCallback(() => {
    toggleTimer();
    event('pomodoro_timer_toggled', {
      action: isActive ? 'pause' : 'start',
      phase: phase,
      selected_tasks: selectedTaskIds.length
    });
  }, [toggleTimer, isActive, phase, selectedTaskIds.length, event]);

  if (loading) return <div>Loading...</div>;

  return (
    <Card className="w-full mx-auto">
      <CardHeader>
        <CardTitle>Pomodoro Timer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-lg">
          <span className="font-semibold">Today&apos;s Sessions: </span>
          <span>{countTodaysSessions()}</span>
        </div>

        <div className="mb-4 flex justify-center space-x-2">
          {['pomodoro', 'shortBreak', 'longBreak'].map((timerPhase) => (
            <Button
              key={timerPhase}
              onClick={() => {
                switchPhase(timerPhase as 'pomodoro' | 'shortBreak' | 'longBreak');
                event('pomodoro_phase_switched', { new_phase: timerPhase });
              }}
              variant={phase === timerPhase ? 'default' : 'outline'}
            >
              {timerPhase === 'pomodoro' ? 'Pomodoro' : timerPhase === 'shortBreak' ? 'Short Break' : 'Long Break'}
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
          >
            {isActive ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
            {isActive ? 'Pause' : 'Start'}
          </Button>
          <Button
            onClick={() => {
              resetTimer();
              event('pomodoro_timer_reset', { phase: phase });
            }}
            variant="outline"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          {isActive && (
            <Button
              onClick={handleDoneNext}
              variant="default"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Done/Next
            </Button>
          )}
        </div>

        {/* Task Picker - only show for authenticated users */}
        {user && (
          <TaskPicker
            tasks={tasks}
            projects={projects}
            selectedTaskIds={selectedTaskIds}
            onSelectionChange={handleSelectionChange}
            disabled={isActive}
          />
        )}
      </CardContent>
    </Card>
  );
});

PomodoroTimer.displayName = 'PomodoroTimer';

export default PomodoroTimer;
