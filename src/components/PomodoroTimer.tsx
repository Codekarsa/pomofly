import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { usePomodoro } from '@/hooks/usePomodoro';
import { useTasks } from '@/hooks/useTasks';
import { useGoogleAnalytics } from '@/hooks/useGoogleAnalytics';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Pause, RotateCcw, CheckCircle } from 'lucide-react';

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
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const { tasks, loading, incrementPomodoroSession } = useTasks();
  
  const [completedSessions, setCompletedSessions] = useState<{ date: string }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const handlePomodoroComplete = useCallback(() => {
    if (user && selectedTaskId) {
      incrementPomodoroSession(selectedTaskId, settings.pomodoro);
      setCompletedSessions(prev => [...prev, { date: new Date().toISOString() }]);
      event('pomodoro_session_completed', { 
        duration: settings.pomodoro,
        task_id: selectedTaskId,
        phase: 'pomodoro'
      });
    } else {
      event('pomodoro_session_completed', { 
        duration: settings.pomodoro,
        phase: 'pomodoro'
      });
    }
  }, [user, selectedTaskId, settings.pomodoro, incrementPomodoroSession, event]);

  const { 
    phase,
    minutes, 
    seconds, 
    isActive, 
    toggleTimer, 
    resetTimer,
    switchPhase
  } = usePomodoro(settings, handlePomodoroComplete);

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

  const filteredTasks = useMemo(() => {
    return tasks.filter(task => 
      !task.completed && 
      (searchTerm === '' || task.title.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [tasks, searchTerm]);

  const handleTaskSelect = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    const selectedTask = tasks.find(task => task.id === taskId);
    if (selectedTask) {
      setSearchTerm(selectedTask.title);
    }
    event('task_selected_for_pomodoro', { task_id: taskId });
  }, [tasks, event, setSearchTerm]);

  const taskSelector = useMemo(() => (
    <Select onValueChange={handleTaskSelect} value={selectedTaskId}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder="Select a task" />
      </SelectTrigger>
      <SelectContent>
        {filteredTasks.map((task) => (
          <SelectItem key={task.id} value={task.id}>{task.title}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  ), [handleTaskSelect, selectedTaskId, filteredTasks]);

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
        {user && (
          <div className="mb-4">
            {taskSelector}
          </div>
        )}
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
        <div className="flex justify-center space-x-2 mb-4">
          <Button
            onClick={() => {
              toggleTimer();
              event('pomodoro_timer_toggled', { 
                action: isActive ? 'pause' : 'start',
                phase: phase
              });
            }}
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
      </CardContent>
    </Card>
  );
});

PomodoroTimer.displayName = 'PomodoroTimer';

export default React.memo(PomodoroTimer, (prevProps, nextProps) => {
  return (
    prevProps.settings.pomodoro === nextProps.settings.pomodoro &&
    prevProps.settings.shortBreak === nextProps.settings.shortBreak &&
    prevProps.settings.longBreak === nextProps.settings.longBreak &&
    prevProps.settings.longBreakInterval === nextProps.settings.longBreakInterval
  );
});