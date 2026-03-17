import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Keyboard } from 'lucide-react';

interface ShortcutGroup {
  title: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
  }>;
}

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
}) => {
  const shortcutGroups: ShortcutGroup[] = [
    {
      title: 'Timer Controls',
      shortcuts: [
        { keys: ['Space'], description: 'Play/Pause timer' },
        { keys: ['R'], description: 'Reset timer' },
        { keys: ['D'], description: 'Done/Next phase' },
        { keys: ['Esc'], description: 'Stop timer and reset' },
      ],
    },
    {
      title: 'Timer Phases',
      shortcuts: [
        { keys: ['P'], description: 'Switch to Pomodoro' },
        { keys: ['S'], description: 'Switch to Short Break' },
        { keys: ['L'], description: 'Switch to Long Break' },
      ],
    },
    {
      title: 'Quick Duration',
      shortcuts: [
        { keys: ['1'], description: '5 minutes' },
        { keys: ['2'], description: '10 minutes' },
        { keys: ['3'], description: '15 minutes' },
        { keys: ['4'], description: '20 minutes' },
        { keys: ['5'], description: '25 minutes (default)' },
        { keys: ['6'], description: '30 minutes' },
        { keys: ['7'], description: '35 minutes' },
        { keys: ['8'], description: '40 minutes' },
        { keys: ['9'], description: '45 minutes' },
      ],
    },
    {
      title: 'Task Navigation',
      shortcuts: [
        { keys: ['↑'], description: 'Navigate up in task list' },
        { keys: ['↓'], description: 'Navigate down in task list' },
        { keys: ['Enter'], description: 'Select/deselect highlighted task' },
      ],
    },
    {
      title: 'General',
      shortcuts: [
        { keys: ['?'], description: 'Show this help dialog' },
      ],
    },
  ];

  const renderKey = (key: string) => (
    <Badge key={key} variant="outline" className="font-mono text-xs px-2 py-1 mx-1">
      {key}
    </Badge>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {shortcutGroups.map((group) => (
            <div key={group.title}>
              <h3 className="font-semibold text-lg mb-3 text-foreground">
                {group.title}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-sm text-foreground">
                      {shortcut.description}
                    </span>
                    <div className="flex items-center">
                      {shortcut.keys.map(renderKey)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Tip:</strong> Keyboard shortcuts are disabled when typing in input fields. 
            Press <Badge variant="outline" className="font-mono text-xs mx-1">?</Badge> 
            anytime to show this help dialog.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default KeyboardShortcutsHelp;