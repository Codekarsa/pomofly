import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useTasks } from '@/hooks/useTasks';
import { useProjects } from '@/hooks/useProjects';
import { useTimeTracking } from '@/hooks/useTimeTracking';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { useMemoryMonitor } from '@/hooks/useMemoryMonitor';
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
  
  // Memory monitoring in development mode
  useMemoryMonitor('PomodoroTimer');
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('selectedTaskIds');
        return saved ? JSON.parse(saved) : [];
      } catch (error) {
        console.warn('Failed to load selected task IDs:', error);
        return [];
      }
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
  
  // Memory management refs
  const isMountedRef = useRef(true);
  const wasActiveRef = useRef(false);
  const selectedTaskIdsRef = useRef<string[]>([]);
  const tasksRef = useRef(tasks);
  const storageTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Clear any pending storage operations
      if (storageTimeoutRef.current) {
        clearTimeout(storageTimeoutRef.current);
        storageTimeoutRef.current = null;
      }
      
      // Clear refs to prevent memory leaks
      selectedTaskIdsRef.current = [];
      tasksRef.current = [];
      wasActiveRef.current = false;
    };
  }, []);

  // Keep refs in sync with state efficiently
  useEffect(() => {
    if (isMountedRef.current) {
      selectedTaskIdsRef.current = selectedTaskIds;
    }
  }, [selectedTaskIds]);

  useEffect(() => {
    if (isMountedRef.current) {
      tasksRef.current = tasks;
    }
  }, [tasks]);

  // Debounced localStorage operations to prevent excessive writes
  const saveSelectedTaskIds = useCallback((taskIds: string[]) => {
    if (!isMountedRef.current) return;
    
    // Clear any pending save operation
    if (storageTimeoutRef.current) {
      clearTimeout(storageTimeoutRef.current);
    }

    storageTimeoutRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      
      try {
        localStorage.setItem('selectedTaskIds', JSON.stringify(taskIds));
        TimerPersistence.updateSessionTaskIds(taskIds);
      } catch (error) {
        console.warn('Failed to save selected task IDs:', error);
      }
    }, 100); // Debounce by 100ms
  }, []);

  // Persist selectedTaskIds with debouncing
  useEffect(() => {
    saveSelectedTaskIds(selectedTaskIds);
    
    // Cleanup timeout on dependency change
    return () => {
      if (storageTimeoutRef.current) {
        clearTimeout(storageTimeoutRef.current);
        storageTimeoutRef.current = null;
      }
    };
  }, [selectedTaskIds, saveSelectedTaskIds]);

  // Optimized task validation with memoization
  const validTaskIds = useMemo(() => {
    if (loading || tasks.length === 0 || selectedTaskIds.length === 0) {
      return selectedTaskIds;
    }
    
    return selectedTaskIds.filter(id => {
      const task = tasks.find(t => t.id === id);
      return task && !task.completed;
    });
  }, [loading, tasks, selectedTaskIds]);

  // Update selectedTaskIds only when validation result changes
  useEffect(() => {
    if (validTaskIds.length !== selectedTaskIds.length && isMountedRef.current) {
      setSelectedTaskIds(validTaskIds);
    }
  }, [validTaskIds, selectedTaskIds]);

  // Optimized pomodoro completion handler with stable dependencies
  const handlePomodoroComplete = useCallback(() => {
    if (!isMountedRef.current) return;
    
    const taskIds = selectedTaskIdsRef.current;
    const currentTasks = tasksRef.current;

    try {
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
        
        // Analytics with error handling
        try {
          event('pomodoro_session_completed', {
            duration: settings.pomodoro,
            task_ids: taskIds,
            task_count: taskIds.length,
            phase: 'pomodoro'
          });
        } catch (error) {
          console.warn('Analytics event failed:', error);
        }
      } else {
        try {
          event('pomodoro_session_completed', {
            duration: settings.pomodoro,
            phase: 'pomodoro'
          });
        } catch (error) {
          console.warn('Analytics event failed:', error);
        }
      }
    } catch (error) {
      console.error('Error in pomodoro completion handler:', error);
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

  // Optimized timer state management with proper cleanup
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    const taskIds = selectedTaskIdsRef.current;
    const currentTasks = tasksRef.current;

    try {
      if (isActive && !wasActiveRef.current) {
        // Timer just started - start time tracking on all selected tasks
        if (taskIds.length > 0 && phase === 'pomodoro') {
          const taskIdsToStart = taskIds.filter(id => {
            const task = currentTasks.find(t => t.id === id);
            return task && task.trackingStartedAt == null;
          });
          
          if (taskIdsToStart.length > 0) {
            startAllTimeTracking(taskIdsToStart);
            try {
              event('time_tracking_started_with_pomodoro', { task_count: taskIdsToStart.length });
            } catch (error) {
              console.warn('Analytics event failed:', error);
            }
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
            try {
              event('time_tracking_stopped_with_pomodoro', { task_count: tasksToStop.length });
            } catch (error) {
              console.warn('Analytics event failed:', error);
            }
          }
        }
      }
      
      wasActiveRef.current = isActive;
    } catch (error) {
      console.error('Error in timer state management:', error);
    }
  }, [isActive, phase, startAllTimeTracking, stopAllTimeTracking, event]);

  // Initial analytics event with proper error handling
  useEffect(() => {
    if (isMountedRef.current) {
      try {
        event('pomodoro_timer_view', { user_authenticated: !!user });
      } catch (error) {
        console.warn('Analytics event failed:', error);
      }
    }
  }, [event, user]);

  // Memoized session counter to prevent unnecessary calculations
  const countTodaysSessions = useMemo(() => {
    const today = new Date().toDateString();
    return completedSessions.filter(session =>
      new Date(session.date).toDateString() === today
    ).length;
  }, [completedSessions]);

  const handleDoneNext = useCallback(() => {
    if (!isMountedRef.current) return;
    
    try {
      handlePomodoroComplete();
      resetTimer();
      const newPhase = phase === 'pomodoro' ? 'shortBreak' : 'pomodoro';
      switchPhase(newPhase);
      
      try {
        event('pomodoro_phase_switched', { new_phase: newPhase });
      } catch (error) {
        console.warn('Analytics event failed:', error);
      }
    } catch (error) {
      console.error('Error in done/next handler:', error);
    }
  }, [handlePomodoroComplete, resetTimer, switchPhase, phase, event]);

  const handleAddTask = useCallback((taskId: string) => {
    if (!isMountedRef.current || selectedTaskIds.includes(taskId)) return;
    
    try {
      const newIds = [...selectedTaskIds, taskId];
      setSelectedTaskIds(newIds);
      
      try {
        event('task_added_to_pomodoro', { task_id: taskId });
      } catch (error) {
        console.warn('Analytics event failed:', error);
      }

      // If timer is active and in pomodoro phase, start tracking the new task
      if (isActive && phase === 'pomodoro') {
        startAllTimeTracking([taskId]);
      }
    } catch (error) {
      console.error('Error adding task:', error);
    }
  }, [selectedTaskIds, event, isActive, phase, startAllTimeTracking]);

  const handleRemoveTask = useCallback((taskId: string) => {
    if (!isMountedRef.current) return;
    
    try {
      const newIds = selectedTaskIds.filter(id => id !== taskId);
      setSelectedTaskIds(newIds);
      
      try {
        event('task_removed_from_pomodoro', { task_id: taskId });
      } catch (error) {
        console.warn('Analytics event failed:', error);
      }

      // If timer is active, stop tracking the removed task
      if (isActive && phase === 'pomodoro') {
        const task = tasks.find(t => t.id === taskId);
        if (task && task.trackingStartedAt != null) {
          const elapsed = getElapsedTime(task) - (task.manualTimeSpent ?? 0);
          stopAllTimeTracking([{ taskId, elapsedSeconds: elapsed }]);
        }
      }
    } catch (error) {
      console.error('Error removing task:', error);
    }
  }, [selectedTaskIds, event, isActive, phase, tasks, getElapsedTime, stopAllTimeTracking]);

  const handleToggleTimer = useCallback(() => {
    if (!isMountedRef.current) return;
    
    try {
      toggleTimer();
      
      try {
        event('pomodoro_timer_toggled', {
          action: isActive ? 'pause' : 'start',
          phase: phase,
          selected_tasks: selectedTaskIds.length
        });
      } catch (error) {
        console.warn('Analytics event failed:', error);
      }
    } catch (error) {
      console.error('Error toggling timer:', error);
    }
  }, [toggleTimer, isActive, phase, selectedTaskIds.length, event]);

  const handleRestoreSession = useCallback((session: any) => {
    if (!isMountedRef.current) return;
    
    try {
      // Restore selected task IDs if available
      if (session.selectedTaskIds && Array.isArray(session.selectedTaskIds)) {
        setSelectedTaskIds(session.selectedTaskIds);
      }
      
      restoreSession(session);
      
      try {
        event('timer_session_restored', {
          phase: session.phase,
          was_active: session.isActive,
          tasks_count: session.selectedTaskIds?.length || 0
        });
      } catch (error) {
        console.warn('Analytics event failed:', error);
      }
    } catch (error) {
      console.error('Error restoring session:', error);
    }
  }, [restoreSession, event]);

  const handleStartFresh = useCallback(() => {
    if (!isMountedRef.current) return;
    
    try {
      startFresh();
      
      try {
        event('timer_session_start_fresh');
      } catch (error) {
        console.warn('Analytics event failed:', error);
      }
    } catch (error) {
      console.error('Error starting fresh:', error);
    }
  }, [startFresh, event]);

  // Loading state with memory-safe render
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
          <span>{countTodaysSessions}</span>
        </div>

        <div className="mb-4 flex justify-center space-x-2">
          {['pomodoro', 'shortBreak', 'longBreak'].map((timerPhase) => (
            <Button
              key={timerPhase}
              onClick={() => {
                if (!isMountedRef.current) return;
                
                try {
                  switchPhase(timerPhase as 'pomodoro' | 'shortBreak' | 'longBreak');
                  
                  try {
                    event('pomodoro_phase_switched', { new_phase: timerPhase });
                  } catch (error) {
                    console.warn('Analytics event failed:', error);
                  }
                } catch (error) {
                  console.error('Error switching phase:', error);
                }
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
              if (!isMountedRef.current) return;
              
              try {
                resetTimer();
                
                try {
                  event('pomodoro_timer_reset', { phase: phase });
                } catch (error) {
                  console.warn('Analytics event failed:', error);
                }
              } catch (error) {
                console.error('Error resetting timer:', error);
              }
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

export default PomodoroTimer;