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
import SelectedTasksList from './SelectedTasksList';

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
  const { getElapsedTime, formatTime } = useTimeTracking(tasks);

  const [completedSessions, setCompletedSessions] = useState<{ date: string }[]>([]);
  const wasActiveRef = useRef(false);

  // Use refs to avoid callback dependency issues that cause timer to reset
  const selectedTaskIdsRef = useRef<string[]>([]);
  const tasksRef = useRef(tasks);

  // Keep refs in sync with state
  useEffect(() => {
    selectedTaskIdsRef.current = selectedTaskIds;
  }, [selectedTaskIds]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Stable callback that uses refs - won't cause usePomodoro to reset
  const handlePomodoroComplete = useCallback(() => {
    const taskIds = selectedTaskIdsRef.current;
    const currentTasks = tasksRef.current;

    if (user && taskIds.length > 0) {
      // Stop time tracking for all selected tasks
      const selectedTasks = currentTasks.filter(t => taskIds.includes(t.id));
      const tasksToStop = selectedTasks
        .filter(task => task.trackingStartedAt != null)
        .map(task => {
          let elapsed = 0;
          if (task.trackingStartedAt) {
            let startTime: number;
            if (task.trackingStartedAt instanceof Date) {
              startTime = task.trackingStartedAt.getTime();
            } else if (typeof (task.trackingStartedAt as { toDate?: () => Date }).toDate === 'function') {
              startTime = (task.trackingStartedAt as { toDate: () => Date }).toDate().getTime();
            } else {
              startTime = new Date(task.trackingStartedAt as unknown as string).getTime();
            }
            elapsed = Math.floor((Date.now() - startTime) / 1000);
          }
          return {
            taskId: task.id,
            elapsedSeconds: Math.max(0, elapsed)
          };
        });

      if (tasksToStop.length > 0) {
        stopAllTimeTracking(tasksToStop);
      }

      // Increment pomodoro session for all selected tasks
      taskIds.forEach(taskId => {
        incrementPomodoroSession(taskId, settings.pomodoro);
      });

      setCompletedSessions(prev => [...prev, { date: new Date().toISOString() }]);
      event('pomodoro_session_completed', {
        duration: settings.pomodoro,
        task_ids: taskIds,
        task_count: taskIds.length,
        phase: 'pomodoro'
      });
    } else {
      event('pomodoro_session_completed', {
        duration: settings.pomodoro,
        phase: 'pomodoro'
      });
    }
  }, [user, settings.pomodoro, incrementPomodoroSession, stopAllTimeTracking, event]);

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
    const taskIds = selectedTaskIdsRef.current;
    const currentTasks = tasksRef.current;

    if (isActive && !wasActiveRef.current) {
      // Timer just started - start time tracking on all selected tasks
      if (taskIds.length > 0 && phase === 'pomodoro') {
        const taskIdsToStart = taskIds.filter(id => {
          const task = currentTasks.find(t => t.id === id);
          return task && task.trackingStartedAt == null;
        });
        if (taskIdsToStart.length > 0) {
          startAllTimeTracking(taskIdsToStart);
          event('time_tracking_started_with_pomodoro', { task_count: taskIdsToStart.length });
        }
      }
    } else if (!isActive && wasActiveRef.current) {
      // Timer just paused - stop time tracking on all selected tasks
      if (taskIds.length > 0 && phase === 'pomodoro') {
        const selectedTasks = currentTasks.filter(t => taskIds.includes(t.id));
        const tasksToStop = selectedTasks
          .filter(task => task.trackingStartedAt != null)
          .map(task => {
            let elapsed = 0;
            if (task.trackingStartedAt) {
              let startTime: number;
              if (task.trackingStartedAt instanceof Date) {
                startTime = task.trackingStartedAt.getTime();
              } else if (typeof (task.trackingStartedAt as { toDate?: () => Date }).toDate === 'function') {
                startTime = (task.trackingStartedAt as { toDate: () => Date }).toDate().getTime();
              } else {
                startTime = new Date(task.trackingStartedAt as unknown as string).getTime();
              }
              elapsed = Math.floor((Date.now() - startTime) / 1000);
            }
            return {
              taskId: task.id,
              elapsedSeconds: Math.max(0, elapsed)
            };
          });

        if (tasksToStop.length > 0) {
          stopAllTimeTracking(tasksToStop);
          event('time_tracking_stopped_with_pomodoro', { task_count: tasksToStop.length });
        }
      }
    }
    wasActiveRef.current = isActive;
  }, [isActive, phase, startAllTimeTracking, stopAllTimeTracking, event]);

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

  const handleAddTask = useCallback((taskId: string) => {
    if (!selectedTaskIds.includes(taskId)) {
      const newIds = [...selectedTaskIds, taskId];
      setSelectedTaskIds(newIds);
      event('task_added_to_pomodoro', { task_id: taskId });

      // If timer is active and in pomodoro phase, start tracking the new task
      if (isActive && phase === 'pomodoro') {
        startAllTimeTracking([taskId]);
      }
    }
  }, [selectedTaskIds, event, isActive, phase, startAllTimeTracking]);

  const handleRemoveTask = useCallback((taskId: string) => {
    const newIds = selectedTaskIds.filter(id => id !== taskId);
    setSelectedTaskIds(newIds);
    event('task_removed_from_pomodoro', { task_id: taskId });

    // If timer is active, stop tracking the removed task
    if (isActive && phase === 'pomodoro') {
      const task = tasks.find(t => t.id === taskId);
      if (task && task.trackingStartedAt != null) {
        const elapsed = getElapsedTime(task) - (task.manualTimeSpent ?? 0);
        stopAllTimeTracking([{ taskId, elapsedSeconds: elapsed }]);
      }
    }
  }, [selectedTaskIds, event, isActive, phase, tasks, getElapsedTime, stopAllTimeTracking]);

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

        {/* Task Selection - available for authenticated users, always enabled */}
        {user && (
          <SelectedTasksList
            tasks={tasks}
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
  );
});

PomodoroTimer.displayName = 'PomodoroTimer';

export default PomodoroTimer;
