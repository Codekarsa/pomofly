import { useState, useEffect, useCallback, useRef } from 'react';

export type NotificationType = 'work-complete' | 'break-complete';

export interface AudioSettings {
  enabled: boolean;
  volume: number; // 0-1
  workCompleteSound: string;
  breakCompleteSound: string;
}

const defaultAudioSettings: AudioSettings = {
  enabled: true,
  volume: 0.7,
  workCompleteSound: 'chime',
  breakCompleteSound: 'bell',
};

// Available sound types
export const soundOptions = [
  { value: 'chime', label: 'Chime' },
  { value: 'bell', label: 'Bell' },
  { value: 'beep', label: 'Beep' },
  { value: 'ding', label: 'Ding' },
];

export function useAudioNotifications() {
  const [settings, setSettings] = useState<AudioSettings>(defaultAudioSettings);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('audioNotificationSettings');
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved);
        setSettings({ ...defaultAudioSettings, ...parsedSettings });
      } catch (error) {
        console.warn('Failed to parse audio settings from localStorage:', error);
      }
    }
  }, []);

  // Save settings to localStorage when they change
  useEffect(() => {
    localStorage.setItem('audioNotificationSettings', JSON.stringify(settings));
  }, [settings]);

  // Initialize audio context (requires user interaction)
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      try {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (error) {
        console.warn('Web Audio API not supported:', error);
        return false;
      }
    }

    // Resume audio context if suspended
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume();
    }

    return true;
  }, []);

  // Generate a tone using Web Audio API
  const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
    if (!initAudioContext() || !audioContextRef.current || !settings.enabled || settings.volume === 0) {
      return;
    }

    const context = audioContextRef.current;
    const oscillator = context.createOscillator();
    const gainNode = context.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.type = type;

    // Set volume with fade in/out to prevent clicks
    gainNode.gain.setValueAtTime(0, context.currentTime);
    gainNode.gain.linearRampToValueAtTime(settings.volume, context.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, context.currentTime + duration);

    oscillator.start(context.currentTime);
    oscillator.stop(context.currentTime + duration);
  }, [initAudioContext, settings.enabled, settings.volume]);

  // Play sound sequences for different notification types
  const playSoundSequence = useCallback((soundType: string) => {
    switch (soundType) {
      case 'chime':
        // Pleasant ascending chime
        setTimeout(() => playTone(523.25, 0.3), 0);    // C5
        setTimeout(() => playTone(659.25, 0.3), 100);  // E5
        setTimeout(() => playTone(783.99, 0.5), 200);  // G5
        break;
      case 'bell':
        // Classic bell sound
        playTone(800, 0.5, 'triangle');
        setTimeout(() => playTone(800, 0.3, 'triangle'), 600);
        break;
      case 'beep':
        // Simple beep
        playTone(880, 0.2);
        setTimeout(() => playTone(880, 0.2), 300);
        break;
      case 'ding':
        // High-pitched ding
        playTone(1000, 0.4, 'triangle');
        break;
      default:
        playTone(800, 0.5);
        break;
    }
  }, [playTone]);

  // Main notification function
  const playNotification = useCallback((type: NotificationType) => {
    if (!settings.enabled) {
      return;
    }

    try {
      const soundType = type === 'work-complete' 
        ? settings.workCompleteSound 
        : settings.breakCompleteSound;
      
      playSoundSequence(soundType);
    } catch (error) {
      console.warn('Failed to play audio notification:', error);
    }
  }, [settings, playSoundSequence]);

  // Test/preview a sound
  const previewSound = useCallback((soundType: string) => {
    playSoundSequence(soundType);
  }, [playSoundSequence]);

  // Update specific setting
  const updateSetting = useCallback(<K extends keyof AudioSettings>(
    key: K,
    value: AudioSettings[K]
  ) => {
    setSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setSettings(defaultAudioSettings);
  }, []);

  return {
    settings,
    playNotification,
    previewSound,
    updateSetting,
    resetToDefaults,
    soundOptions,
  };
}