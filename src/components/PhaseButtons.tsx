import React, { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';

type PomodoroPhase = 'pomodoro' | 'shortBreak' | 'longBreak';

interface PhaseButtonsProps {
  currentPhase: PomodoroPhase;
  onSwitchPhase: (phase: PomodoroPhase) => void;
  onEvent: (eventName: string, parameters: any) => void;
}

/**
 * Optimized phase switching buttons component
 * Memoized to prevent unnecessary re-renders
 */
const PhaseButtons: React.FC<PhaseButtonsProps> = memo(({
  currentPhase,
  onSwitchPhase,
  onEvent
}) => {
  const phases = [
    { key: 'pomodoro' as const, label: 'Pomodoro' },
    { key: 'shortBreak' as const, label: 'Short Break' },
    { key: 'longBreak' as const, label: 'Long Break' },
  ];

  const handlePhaseClick = useCallback((phase: PomodoroPhase) => {
    onSwitchPhase(phase);
    onEvent('pomodoro_phase_switched', { new_phase: phase });
  }, [onSwitchPhase, onEvent]);

  return (
    <div className="mb-4 flex justify-center space-x-2">
      {phases.map(({ key, label }) => (
        <Button
          key={key}
          onClick={() => handlePhaseClick(key)}
          variant={currentPhase === key ? 'default' : 'outline'}
        >
          {label}
        </Button>
      ))}
    </div>
  );
});

PhaseButtons.displayName = 'PhaseButtons';

export default PhaseButtons;