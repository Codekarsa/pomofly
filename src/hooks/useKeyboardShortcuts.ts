import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcuts {
  onPlayPause?: () => void;
  onReset?: () => void;
  onStop?: () => void;
  onToggleHelp?: () => void;
  onSwitchToPomodoro?: () => void;
  onSwitchToShortBreak?: () => void;
  onSwitchToLongBreak?: () => void;
  onQuickDuration?: (minutes: number) => void;
  onDoneNext?: () => void;
  onTaskNavigation?: (direction: 'up' | 'down') => void;
  onTaskSelect?: () => void;
}

interface KeyboardShortcutsConfig {
  enabled?: boolean;
  shortcuts: KeyboardShortcuts;
}

const useKeyboardShortcuts = ({ enabled = true, shortcuts }: KeyboardShortcutsConfig) => {
  const shortcutsRef = useRef(shortcuts);

  // Keep the ref updated with latest shortcuts
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't handle shortcuts when typing in input fields
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    const { key, ctrlKey, metaKey, altKey, shiftKey } = event;
    const currentShortcuts = shortcutsRef.current;

    // Prevent handling if modifier keys are pressed (except for specific combinations)
    if (ctrlKey || metaKey || altKey) {
      return;
    }

    switch (key) {
      case ' ':
      case 'Space':
        event.preventDefault();
        currentShortcuts.onPlayPause?.();
        break;

      case 'r':
      case 'R':
        event.preventDefault();
        currentShortcuts.onReset?.();
        break;

      case 'Escape':
        event.preventDefault();
        currentShortcuts.onStop?.();
        break;

      case '?':
        if (shiftKey) {
          event.preventDefault();
          currentShortcuts.onToggleHelp?.();
        }
        break;

      case 'p':
      case 'P':
        event.preventDefault();
        currentShortcuts.onSwitchToPomodoro?.();
        break;

      case 's':
      case 'S':
        event.preventDefault();
        currentShortcuts.onSwitchToShortBreak?.();
        break;

      case 'l':
      case 'L':
        event.preventDefault();
        currentShortcuts.onSwitchToLongBreak?.();
        break;

      case 'd':
      case 'D':
        event.preventDefault();
        currentShortcuts.onDoneNext?.();
        break;

      case 'ArrowUp':
        event.preventDefault();
        currentShortcuts.onTaskNavigation?.('up');
        break;

      case 'ArrowDown':
        event.preventDefault();
        currentShortcuts.onTaskNavigation?.('down');
        break;

      case 'Enter':
        if (!shiftKey && !ctrlKey && !metaKey && !altKey) {
          event.preventDefault();
          currentShortcuts.onTaskSelect?.();
        }
        break;

      // Quick duration settings (1-9 for minutes)
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        // Only handle number keys if not in input fields and not with modifiers
        if (!shiftKey) {
          event.preventDefault();
          const minutes = parseInt(key) * 5; // 1 = 5 min, 2 = 10 min, etc.
          currentShortcuts.onQuickDuration?.(minutes);
        }
        break;

      default:
        // Don't prevent default for unhandled keys
        break;
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [enabled, handleKeyDown]);

  return {
    // Return any utility functions if needed in the future
  };
};

export default useKeyboardShortcuts;