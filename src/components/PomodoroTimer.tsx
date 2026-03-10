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
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('selectedTaskIds');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  
  // Accessibility state for screen reader announcements
  const [announcement, setAnnouncement] = useState<string>('');
  const lastMinuteRef = useRef<number>(-1);
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

  // Persist selectedTaskIds to localStorage
  useEffect(() => {
    localStorage.setItem('selectedTaskIds', JSON.stringify(selectedTaskIds));
  }, [selectedTaskIds]);

  // Filter out invalid/stale task IDs (deleted or completed tasks)
  useEffect(() => {
    if (!loading && tasks.length > 0 && selectedTaskIds.length > 0) {
      const validTaskIds = selectedTaskIds.filter(id => {
        const task = tasks.find(t => t.id === id);
        return task && !task.completed;
      });
      if (validTaskIds.length !== selectedTaskIds.length) {
        setSelectedTaskIds(validTaskIds);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, tasks]);

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

  // Accessibility: Announce timer progress to screen readers
  useEffect(() => {
    if (isActive && minutes !== lastMinuteRef.current) {
      const phaseText = phase === 'pomodoro' ? 'work session' : 
                       phase === 'shortBreak' ? 'short break' : 'long break';
      const timeText = minutes === 1 ? '1 minute' : `${minutes} minutes`;
      setAnnouncement(`${timeText} remaining in ${phaseText}`);
      lastMinuteRef.current = minutes;
    } else if (!isActive && lastMinuteRef.current !== -1) {
      const phaseText = phase === 'pomodoro' ? 'work session' : 
                       phase === 'shortBreak' ? 'short break' : 'long break';
      setAnnouncement(`${phaseText} paused`);
      lastMinuteRef.current = -1;
    }
  }, [isActive, minutes, phase]);

  // Clear announcement after a brief delay to avoid repetitive reading
  useEffect(() => {
    if (announcement) {
      const timer = setTimeout(() => setAnnouncement(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [announcement]);

  // Keyboard shortcuts for accessibility
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (event.key) {
        case ' ':
          event.preventDefault();
          handleToggleTimer();
          break;
        case 'r':
        case 'R':
          event.preventDefault();
          resetTimer();
          event('pomodoro_timer_reset', { phase: phase, via: 'keyboard' });
          setAnnouncement(`${phase === 'pomodoro' ? 'Work session' : phase === 'shortBreak' ? 'Short break' : 'Long break'} timer reset`);
          break;
        case 'Enter':
          if (isActive) {
            event.preventDefault();
            handleDoneNext();
          }
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleToggleTimer, resetTimer, handleDoneNext, isActive, phase, event]);

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

  if (loading) {
    return (
      <Card className="w-full mx-auto" role="main" aria-label="Pomodoro Timer Application">
        <CardHeader>
          <CardTitle>Pomodoro Timer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            {/* Timer circle skeleton with pulse animation */}
            <div className="relative w-48 h-48 mb-6" role="progressbar" aria-label="Loading timer">
              <div className="absolute inset-0 rounded-full border-8 border-gray-200"></div>
              <div className="absolute inset-0 rounded-full border-8 border-t-red-500 border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-4xl font-mono text-gray-300 animate-pulse" aria-hidden="true">--:--</div>
              </div>
            </div>
            <p className="text-muted-foreground animate-pulse" role="status" aria-live="polite">Loading timer...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full mx-auto" role="main" aria-label="Pomodoro Timer Application">
      <CardHeader>
        <CardTitle id="timer-title">Pomodoro Timer</CardTitle>
        <p className="text-sm text-muted-foreground" aria-label="Keyboard shortcuts available">
          Keyboard shortcuts: Space to start/pause, R to reset, Enter to complete
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-lg">
          <span className="font-semibold">Today&apos;s Sessions: </span>
          <span>{countTodaysSessions()}</span>
        </div>

        <div className="mb-4 flex justify-center space-x-2" role="tablist" aria-label="Timer phase selection">
          {['pomodoro', 'shortBreak', 'longBreak'].map((timerPhase) => {
            const phaseLabel = timerPhase === 'pomodoro' ? 'Pomodoro' : timerPhase === 'shortBreak' ? 'Short Break' : 'Long Break';
            const duration = timerPhase === 'pomodoro' ? settings.pomodoro : timerPhase === 'shortBreak' ? settings.shortBreak : settings.longBreak;
            return (
              <Button
                key={timerPhase}
                onClick={() => {
                  switchPhase(timerPhase as 'pomodoro' | 'shortBreak' | 'longBreak');
                  event('pomodoro_phase_switched', { new_phase: timerPhase });
                  setAnnouncement(`Switched to ${phaseLabel.toLowerCase()}, ${duration} minutes`);
                }}
                variant={phase === timerPhase ? 'default' : 'outline'}
                role="tab"
                aria-selected={phase === timerPhase}
                aria-label={`${phaseLabel}, ${duration} minutes${phase === timerPhase ? ' (currently selected)' : ''}`}
                tabIndex={phase === timerPhase ? 0 : -1}
              >
                {phaseLabel}
              </Button>
            );
          })}
        </div>

        {/* Timer Display with Accessibility */}
        <div 
          className="text-8xl font-bold mb-4 text-center py-6"
          role="timer"
          aria-live="polite"
          aria-label={`${phase === 'pomodoro' ? 'Work session' : phase === 'shortBreak' ? 'Short break' : 'Long break'} timer. ${minutes} minutes and ${seconds} seconds remaining`}
          aria-atomic="true"
        >
          <time tabIndex={0}>
            {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
          </time>
        </div>

        {/* Screen reader announcements */}
        <div 
          role="status" 
          aria-live="polite" 
          aria-atomic="true"
          className="sr-only"
        >
          {announcement}
        </div>

        <div className="flex justify-center space-x-2 mb-6" role="group" aria-label="Timer controls">
          <Button
            onClick={handleToggleTimer}
            variant={isActive ? 'secondary' : 'default'}
            aria-label={isActive ? `Pause ${phase === 'pomodoro' ? 'work session' : phase === 'shortBreak' ? 'short break' : 'long break'} timer. Shortcut: Space` : `Start ${phase === 'pomodoro' ? 'work session' : phase === 'shortBreak' ? 'short break' : 'long break'} timer. Shortcut: Space`}
            title={isActive ? 'Pause (Space)' : 'Start (Space)'}
          >
            {isActive ? <Pause className="mr-2 h-4 w-4" aria-hidden="true" /> : <Play className="mr-2 h-4 w-4" aria-hidden="true" />}
            {isActive ? 'Pause' : 'Start'}
          </Button>
          <Button
            onClick={() => {
              resetTimer();
              event('pomodoro_timer_reset', { phase: phase });
              setAnnouncement(`${phase === 'pomodoro' ? 'Work session' : phase === 'shortBreak' ? 'Short break' : 'Long break'} timer reset`);
            }}
            variant="outline"
            aria-label="Reset timer. Shortcut: R"
            title="Reset (R)"
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Reset
          </Button>
          {isActive && (
            <Button
              onClick={handleDoneNext}
              variant="default"
              aria-label="Mark session as complete and switch to next phase. Shortcut: Enter"
              title="Done/Next (Enter)"
            >
              <CheckCircle className="mr-2 h-4 w-4" aria-hidden="true" />
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
