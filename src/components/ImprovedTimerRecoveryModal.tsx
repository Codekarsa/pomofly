import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, AlertCircle } from 'lucide-react';

interface TimerSession {
  id: string;
  tabId: string;
  lastHeartbeat: number;
  timerState: {
    phase: 'pomodoro' | 'shortBreak' | 'longBreak';
    status: 'idle' | 'running' | 'paused' | 'completed';
    remainingMs: number;
    sessionsCompleted: number;
  };
  selectedTaskIds: string[];
}

interface RecoveryOptions {
  continueSession: boolean;
  restoreState: boolean;
  clearSession: boolean;
}

interface ImprovedTimerRecoveryModalProps {
  isOpen: boolean;
  session: TimerSession | null;
  remainingTimeMs: number;
  onRecover: (options: RecoveryOptions) => void;
  taskTitles: Record<string, string>; // Map of task ID to title
}

export function ImprovedTimerRecoveryModal({
  isOpen,
  session,
  remainingTimeMs,
  onRecover,
  taskTitles,
}: ImprovedTimerRecoveryModalProps) {
  if (!session) return null;

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatLastSeen = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds} seconds ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
    return `${Math.floor(seconds / 3600)} hours ago`;
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'pomodoro': return 'bg-red-100 text-red-800';
      case 'shortBreak': return 'bg-green-100 text-green-800';
      case 'longBreak': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return '▶️';
      case 'paused': return '⏸️';
      case 'completed': return '✅';
      default: return '⏹️';
    }
  };

  const getSelectedTasksDisplay = () => {
    if (session.selectedTaskIds.length === 0) {
      return 'No tasks selected';
    }
    
    const taskNames = session.selectedTaskIds
      .map(id => taskTitles[id] || 'Unknown task')
      .filter(Boolean);
    
    if (taskNames.length === 0) {
      return `${session.selectedTaskIds.length} task(s) (deleted)`;
    }
    
    if (taskNames.length <= 2) {
      return taskNames.join(', ');
    }
    
    return `${taskNames[0]} and ${taskNames.length - 1} other(s)`;
  };

  const handleContinueSession = () => {
    onRecover({
      continueSession: true,
      restoreState: true,
      clearSession: false,
    });
  };

  const handleStartFresh = () => {
    onRecover({
      continueSession: false,
      restoreState: false,
      clearSession: true,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            Timer Session Detected
          </DialogTitle>
          <DialogDescription>
            We found an active timer session from another tab. Would you like to continue it here?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Session Status */}
          <div className="rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getStatusIcon(session.timerState.status)}</span>
                <Badge className={getPhaseColor(session.timerState.phase)}>
                  {session.timerState.phase === 'shortBreak' ? 'Short Break' :
                   session.timerState.phase === 'longBreak' ? 'Long Break' :
                   'Pomodoro'}
                </Badge>
              </div>
              
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Clock className="h-4 w-4" />
                {formatLastSeen(session.lastHeartbeat)}
              </div>
            </div>

            {/* Remaining Time */}
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-gray-900">
                {formatTime(remainingTimeMs)}
              </div>
              <div className="text-sm text-gray-500">
                {session.timerState.status === 'running' ? 'Time remaining' : 
                 session.timerState.status === 'paused' ? 'Paused at' : 
                 'Session completed'}
              </div>
            </div>

            {/* Session Progress */}
            <div className="text-sm text-gray-600">
              <div className="flex items-center justify-between">
                <span>Sessions completed:</span>
                <span className="font-medium">{session.timerState.sessionsCompleted}</span>
              </div>
            </div>

            {/* Selected Tasks */}
            {session.selectedTaskIds.length > 0 && (
              <div>
                <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                  <Users className="h-4 w-4" />
                  Selected tasks:
                </div>
                <div className="text-sm text-gray-700 pl-5">
                  {getSelectedTasksDisplay()}
                </div>
              </div>
            )}
          </div>

          {/* Warning about data loss */}
          {session.timerState.status === 'running' && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <strong>Important:</strong> Starting fresh will lose the current session progress. 
                  The timer has been running for{' '}
                  {formatTime(session.timerState.remainingMs > 0 ? 
                    (session.timerState.totalDurationMs || 25 * 60 * 1000) - remainingTimeMs : 
                    0
                  )}.
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleStartFresh}>
            Start Fresh
          </Button>
          <Button onClick={handleContinueSession} className="bg-blue-600 hover:bg-blue-700">
            Continue Session
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}