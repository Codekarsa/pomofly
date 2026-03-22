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
import { TimerRecoveryModal } from './TimerRecoveryModal';
import { TimerPersistence } from '@/lib/timerPersistence';

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

  // Accessibility state
  const [liveRegionText, setLiveRegionText] = useState('');
  const [announcementText, setAnnouncementText] = useState('');
  const timerRef = useRef<HTMLDivElement>(null);

  // Use refs to avoid callback dependency issues that cause timer to reset
  const selectedTaskIdsRef = useRef<string[]>([]);
  const tasksRef = useRef(tasks);

  // Keyboard navigation handler
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Only handle when not typing in an input field
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (event.key.toLowerCase()) {
      case ' ':
      case 'spacebar':
        event.preventDefault();
        toggleTimer();
        setAnnouncementText(
          isActive ? 'Timer paused' : `Timer started for ${phase} session`
        );
        break;
      case 'r':
        event.preventDefault();
        resetTimer();
        setAnnouncementText(`Timer reset for ${phase} session`);
        break;
      case 'escape':
        // Focus management - return focus to timer if in modal
        if (timerRef.current && document.activeElement?.closest('[role="dialog"]')) {
          timerRef.current.focus();
        }
        break;
    }
  }, [toggleTimer, resetTimer, isActive, phase]);

  // Keep refs in sync with state
  useEffect(() => {
    selectedTaskIdsRef.current = selectedTaskIds;
  }, [selectedTaskIds]);

  useEffect(() => {
    tasksRef.current = tasks;
  }, [tasks]);

  // Persist selectedTaskIds to localStorage and session
  useEffect(() => {
    localStorage.setItem('selectedTaskIds', JSON.stringify(selectedTaskIds));
    TimerPersistence.updateSessionTaskIds(selectedTaskIds);
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

  // Add keyboard event listener for accessibility
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Update live region for timer state changes
  useEffect(() => {
    const timeDisplay = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const phaseDisplay = phase === 'pomodoro' ? 'Pomodoro' : 
                        phase === 'shortBreak' ? 'Short Break' : 'Long Break';
    const statusDisplay = isActive ? 'running' : 'paused';
    
    setLiveRegionText(`${phaseDisplay} timer: ${timeDisplay}, ${statusDisplay}`);
  }, [minutes, seconds, isActive, phase]);

  // Announce phase completions and important state changes
  useEffect(() => {
    if (minutes === 0 && seconds === 0 && wasActiveRef.current) {
      const phaseDisplay = phase === 'pomodoro' ? 'Pomodoro' : 
                          phase === 'shortBreak' ? 'Short Break' : 'Long Break';
      setAnnouncementText(`${phaseDisplay} session completed! Time for a break.`);
      
      // Play audio notification if available
      try {
        const audio = new Audio('/notification.mp3'); // Optional audio file
        audio.volume = 0.3;
        audio.play().catch(() => {
          // Ignore audio errors - not all browsers/devices support auto-play
        });
      } catch {
        // Fallback: no audio notification
      }
    }
  }, [minutes, seconds, phase]);

  // Clear announcements after they've been read
  useEffect(() => {
    if (announcementText) {
      const timer = setTimeout(() => {
        setAnnouncementText('');
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [announcementText]);

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
      {/* Accessibility: Live regions for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {liveRegionText}
      </div>
      <div aria-live="assertive" aria-atomic="true" className="sr-only">
        {announcementText}
      </div>

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
        <p className="text-sm text-muted-foreground mt-2">
          Keyboard shortcuts: Spacebar to start/pause, R to reset, Escape to return focus
        </p>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-lg">
          <span className="font-semibold">Today&apos;s Sessions: </span>
          <span>{countTodaysSessions()}</span>
        </div>

        <div className="mb-4 flex justify-center space-x-2" role="group" aria-label="Timer phase selection">
          {['pomodoro', 'shortBreak', 'longBreak'].map((timerPhase) => (
            <Button
              key={timerPhase}
              onClick={() => {
                switchPhase(timerPhase as 'pomodoro' | 'shortBreak' | 'longBreak');
                event('pomodoro_phase_switched', { new_phase: timerPhase });
                const phaseName = timerPhase === 'pomodoro' ? 'Pomodoro' : 
                                 timerPhase === 'shortBreak' ? 'Short Break' : 'Long Break';
                setAnnouncementText(`Switched to ${phaseName} phase`);
              }}
              variant={phase === timerPhase ? 'default' : 'outline'}
              aria-pressed={phase === timerPhase}
              aria-label={`Switch to ${timerPhase === 'pomodoro' ? 'Pomodoro work session' : timerPhase === 'shortBreak' ? 'Short break session' : 'Long break session'}${phase === timerPhase ? ' (currently selected)' : ''}`}
            >
              {timerPhase === 'pomodoro' ? 'Pomodoro' : timerPhase === 'shortBreak' ? 'Short Break' : 'Long Break'}
            </Button>
          ))}
        </div>

        <div 
          ref={timerRef}
          className="text-8xl font-bold mb-4 text-center py-6"
          tabIndex={0}
          role="timer"
          aria-label={`${phase === 'pomodoro' ? 'Pomodoro' : phase === 'shortBreak' ? 'Short Break' : 'Long Break'} timer: ${minutes.toString().padStart(2, '0')} minutes and ${seconds.toString().padStart(2, '0')} seconds remaining, currently ${isActive ? 'running' : 'paused'}`}
          aria-describedby="timer-instructions"
        >
          {minutes.toString().padStart(2, '0')}:{seconds.toString().padStart(2, '0')}
        </div>
        
        <div id="timer-instructions" className="sr-only">
          Press spacebar to {isActive ? 'pause' : 'start'} the timer, or R to reset
        </div>

        <div className="flex justify-center space-x-2 mb-6" role="group" aria-label="Timer controls">
          <Button
            onClick={handleToggleTimer}
            variant={isActive ? 'secondary' : 'default'}
            aria-label={`${isActive ? 'Pause' : 'Start'} the ${phase === 'pomodoro' ? 'Pomodoro' : phase === 'shortBreak' ? 'Short Break' : 'Long Break'} timer (Spacebar)`}
            aria-describedby="start-pause-help"
          >
            {isActive ? <Pause className="mr-2 h-4 w-4" aria-hidden="true" /> : <Play className="mr-2 h-4 w-4" aria-hidden="true" />}
            {isActive ? 'Pause' : 'Start'}
          </Button>
          <Button
            onClick={() => {
              resetTimer();
              event('pomodoro_timer_reset', { phase: phase });
              setAnnouncementText(`Timer reset for ${phase} session`);
            }}
            variant="outline"
            aria-label={`Reset the ${phase === 'pomodoro' ? 'Pomodoro' : phase === 'shortBreak' ? 'Short Break' : 'Long Break'} timer (Press R)`}
            aria-describedby="reset-help"
          >
            <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
            Reset
          </Button>
          {isActive && (
            <Button
              onClick={handleDoneNext}
              variant="default"
              aria-label={`Mark ${phase === 'pomodoro' ? 'Pomodoro' : phase === 'shortBreak' ? 'Short Break' : 'Long Break'} session as complete and move to next phase`}
            >
              <CheckCircle className="mr-2 h-4 w-4" aria-hidden="true" />
              Done/Next
            </Button>
          )}
        </div>
        
        <div id="start-pause-help" className="sr-only">
          Keyboard shortcut: Press spacebar to {isActive ? 'pause' : 'start'} the timer
        </div>
        <div id="reset-help" className="sr-only">
          Keyboard shortcut: Press R to reset the timer
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

export default PomodoroTimer;
