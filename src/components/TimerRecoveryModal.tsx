import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, RefreshCw } from 'lucide-react';
import {
  PersistedTimerSession,
  TimerPersistence,
  RecoveryFailureReason,
} from '@/lib/timerPersistence';

interface TimerRecoveryModalProps {
  isOpen: boolean;
  session: PersistedTimerSession;
  failures: RecoveryFailureReason[];
  onRestore: (session: PersistedTimerSession) => void;
  onStartFresh: () => void;
}

export function TimerRecoveryModal({
  isOpen,
  session,
  failures,
  onRestore,
  onStartFresh,
}: TimerRecoveryModalProps) {
  const [isRestoring, setIsRestoring] = useState(false);

  const handleRestore = async () => {
    setIsRestoring(true);
    try {
      onRestore(session);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleStartFresh = () => {
    TimerPersistence.clearSession();
    onStartFresh();
  };

  const remainingTime = TimerPersistence.calculateRemainingTime(session);
  const remainingMinutes = Math.floor(remainingTime / 60);
  const remainingSeconds = remainingTime % 60;

  const sessionAge = Date.now() - session.sessionCreatedAt;
  const ageMinutes = Math.floor(sessionAge / (1000 * 60));

  const phaseDisplayName = {
    pomodoro: 'Pomodoro',
    shortBreak: 'Short Break',
    longBreak: 'Long Break',
  }[session.phase];

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <DialogTitle>Resume Previous Session?</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-4">
            <h3 className="mb-2 font-medium text-blue-900">
              Previous Session Found
            </h3>
            <div className="space-y-1 text-sm text-blue-700">
              <div>
                • <strong>Phase:</strong> {phaseDisplayName}
              </div>
              <div>
                • <strong>Time remaining:</strong> {remainingMinutes}:
                {remainingSeconds.toString().padStart(2, '0')}
              </div>
              <div>
                • <strong>Status:</strong>{' '}
                {session.isActive ? 'Running' : 'Paused'}
              </div>
              <div>
                • <strong>Sessions completed:</strong>{' '}
                {session.sessionsCompleted}
              </div>
              <div className="mt-2 text-xs opacity-75">
                Session from {ageMinutes} minute{ageMinutes !== 1 ? 's' : ''}{' '}
                ago
              </div>
            </div>
          </div>

          {remainingTime === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm text-amber-800">
                ⚠️ This session appears to have expired. You may want to start
                fresh.
              </p>
            </div>
          )}

          {failures.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <h4 className="font-medium text-red-900 mb-2">
                Recovery Issues Detected
              </h4>
              <ul className="space-y-1 text-sm text-red-700">
                {failures.map((failure, index) => (
                  <li key={index} className="flex items-start gap-1">
                    <span className="text-red-500 mt-0.5">•</span>
                    <span>{TimerPersistence.getFailureReasonMessage(failure)}</span>
                  </li>
                ))}
              </ul>
              {failures.some(f => [
                RecoveryFailureReason.CLOCK_DRIFT_DETECTED,
                RecoveryFailureReason.TIMEZONE_CHANGE,
                RecoveryFailureReason.MULTIPLE_TABS_DETECTED
              ].includes(f)) && (
                <p className="text-xs text-red-600 mt-2 font-medium">
                  Starting fresh is recommended due to timing inconsistencies.
                </p>
              )}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              onClick={handleRestore}
              disabled={isRestoring}
              className="flex-1"
            >
              {isRestoring ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Restoring...
                </>
              ) : (
                <>
                  <Clock className="mr-2 h-4 w-4" />
                  Resume Session
                </>
              )}
            </Button>

            <Button
              variant="outline"
              onClick={handleStartFresh}
              disabled={isRestoring}
              className="flex-1"
            >
              Start Fresh
            </Button>
          </div>

          <p className="text-xs text-gray-500">
            We automatically save your timer progress to help you continue where
            you left off.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
