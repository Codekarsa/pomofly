/**
 * PomodoroTimer Component - Performance Optimized
 * 
 * Optimizations applied:
 * 1. Memoized expensive calculations (validSelectedTasks, todaysSessionCount)
 * 2. Debounced localStorage writes to reduce I/O operations
 * 3. Separated TimerDisplay component to isolate re-renders
 * 4. Separated PhaseButtons component for better memoization
 * 5. Functional state updates to reduce callback dependencies
 * 6. Custom React.memo with deep comparison for props
 * 7. Reduced timer update frequency from 100ms to 250ms
 * 8. Proper cleanup of debounced functions and intervals
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
import { TimerRecoveryModal } from './TimerRecoveryModal';
import { TimerPersistence } from '@/lib/timerPersistence';
import TimerDisplay from './TimerDisplay';
import PhaseButtons from './PhaseButtons';
import { useLocalStorageDebounced } from '@/hooks/useLocalStorageDebounced';
import { debounce } from 'lodash';

interface PomodoroSettings {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
}

interface PomodoroTimerProps {
  settings: PomodoroSettings;
}

const PomodoroTimer: React.FC<PomodoroTimerProps> = ({ settings }) => {
  const { user } = useAuth();
  const { event } = useGoogleAnalytics();
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedTaskIds');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
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

  // Memoize expensive calculations
  const validSelectedTasks = useMemo(() => {
    if (loading || !tasks.length) return [];
    return tasks.filter(task => selectedTaskIds.includes(task.id) && !task.completed);
  }, [tasks, selectedTaskIds, loading]);

  const todaysSessionCount = useMemo(() => {
    const today = new Date().toDateString();
    return completedSessions.filter(session =>
      new Date(session.date).toDateString() === today
    ).length;
  }, [completedSessions]);

  // Use optimized debounced localStorage hook
  useLocalStorageDebounced('selectedTaskIds', selectedTaskIds);

  // Update timer session with selected tasks (debounced separately)
  const debouncedSessionUpdate = useMemo(
    () => debounce((taskIds: string[]) => {
      TimerPersistence.updateSessionTaskIds(taskIds);
    }, 500),
    []
  );

  useEffect(() => {
    debouncedSessionUpdate(selectedTaskIds);
    return () => {
      debouncedSessionUpdate.cancel();
    };
  }, [selectedTaskIds, debouncedSessionUpdate]);

  // Filter out invalid/stale task IDs (deleted or completed tasks)
  // Use memoized valid tasks and compare by length to avoid unnecessary updates
  useEffect(() => {
    if (!loading && tasks.length > 0 && selectedTaskIds.length > 0) {
      const validTaskIds = validSelectedTasks.map(task => task.id);
      if (validTaskIds.length !== selectedTaskIds.length) {
        setSelectedTaskIds(validTaskIds);
      }
    }
  }, [loading, tasks, selectedTaskIds, validSelectedTasks]);

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
    showRecoveryModal,
    persistedSession,
    restoreSession,
    startFresh
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

  // Remove this callback since we're using memoized value instead

  const handleDoneNext = useCallback(() => {
    handlePomodoroComplete();
    resetTimer();
    switchPhase(phase === 'pomodoro' ? 'shortBreak' : 'pomodoro');
    event('pomodoro_phase_switched', { new_phase: phase === 'pomodoro' ? 'shortBreak' : 'pomodoro' });
  }, [handlePomodoroComplete, resetTimer, switchPhase, phase, event]);

  // Optimize handleAddTask with useCallback and stable dependencies
  const handleAddTask = useCallback((taskId: string) => {
    setSelectedTaskIds(currentIds => {
      if (currentIds.includes(taskId)) return currentIds;
      
      const newIds = [...currentIds, taskId];
      event('task_added_to_pomodoro', { task_id: taskId });

      // If timer is active and in pomodoro phase, start tracking the new task
      if (isActive && phase === 'pomodoro') {
        startAllTimeTracking([taskId]);
      }
      
      return newIds;
    });
  }, [event, isActive, phase, startAllTimeTracking]);

  // Optimize handleRemoveTask to use functional state updates
  const handleRemoveTask = useCallback((taskId: string) => {
    setSelectedTaskIds(currentIds => {
      if (!currentIds.includes(taskId)) return currentIds;
      
      const newIds = currentIds.filter(id => id !== taskId);
      event('task_removed_from_pomodoro', { task_id: taskId });

      // If timer is active, stop tracking the removed task
      if (isActive && phase === 'pomodoro') {
        const task = tasksRef.current.find(t => t.id === taskId);
        if (task && task.trackingStartedAt != null) {
          const elapsed = getElapsedTime(task) - (task.manualTimeSpent ?? 0);
          stopAllTimeTracking([{ taskId, elapsedSeconds: elapsed }]);
        }
      }
      
      return newIds;
    });
  }, [event, isActive, phase, getElapsedTime, stopAllTimeTracking]);

  const handleToggleTimer = useCallback(() => {
    toggleTimer();
    event('pomodoro_timer_toggled', {
      action: isActive ? 'pause' : 'start',
      phase: phase,
      selected_tasks: selectedTaskIds.length
    });
  }, [toggleTimer, isActive, phase, selectedTaskIds.length, event]);

  const handleRestoreSession = useCallback((session: any) => {
    // Restore selected task IDs if available
    if (session.selectedTaskIds && Array.isArray(session.selectedTaskIds)) {
      setSelectedTaskIds(session.selectedTaskIds);
    }
    restoreSession(session);
    event('timer_session_restored', {
      phase: session.phase,
      was_active: session.isActive,
      tasks_count: session.selectedTaskIds?.length || 0
    });
  }, [restoreSession, event]);

  const handleStartFresh = useCallback(() => {
    startFresh();
    event('timer_session_start_fresh');
  }, [startFresh, event]);

  if (loading) {
    return (
      <Card className="w-full mx-auto">
        <CardHeader>
          <CardTitle>Pomodoro Timer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            {/* Timer circle skeleton with pulse animation */}
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
        <CardTitle>Pomodoro Timer</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-lg">
          <span className="font-semibold">Today&apos;s Sessions: </span>
          <span>{todaysSessionCount}</span>
        </div>

        <PhaseButtons
          currentPhase={phase}
          onSwitchPhase={switchPhase}
          onEvent={event}
        />

        <TimerDisplay minutes={minutes} seconds={seconds} />

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
    </>
  );
});

PomodoroTimer.displayName = 'PomodoroTimer';

// Memoize the component with custom comparison to prevent unnecessary re-renders
export default React.memo(PomodoroTimer, (prevProps, nextProps) => {
  // Only re-render if settings actually changed
  return (
    prevProps.settings.pomodoro === nextProps.settings.pomodoro &&
    prevProps.settings.shortBreak === nextProps.settings.shortBreak &&
    prevProps.settings.longBreak === nextProps.settings.longBreak &&
    prevProps.settings.longBreakInterval === nextProps.settings.longBreakInterval
  );
});
