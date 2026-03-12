import { useState, useEffect, useCallback, useRef } from 'react';

export type NotificationSound = 'bell' | 'chime' | 'ding' | 'pop' | 'soft';
export type SoundPhase = 'work' | 'break';

export interface AudioSettings {
  enabled: boolean;
  volume: number; // 0-1
  workSound: NotificationSound;
  breakSound: NotificationSound;
}

export const defaultAudioSettings: AudioSettings = {
  enabled: true,
  volume: 0.7,
  workSound: 'bell',
  breakSound: 'chime',
};

// Sound configurations for Web Audio API generation
const soundConfigs: Record<NotificationSound, { frequency: number; duration: number; type: OscillatorType }> = {
  bell: { frequency: 800, duration: 0.8, type: 'sine' },
  chime: { frequency: 600, duration: 1.2, type: 'triangle' },
  ding: { frequency: 1000, duration: 0.4, type: 'sine' },
  pop: { frequency: 400, duration: 0.2, type: 'square' },
  soft: { frequency: 300, duration: 1.0, type: 'sine' },
};

export function useAudioNotifications() {
  const [settings, setSettings] = useState<AudioSettings>(defaultAudioSettings);
  const [isSupported, setIsSupported] = useState(true);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Load settings from localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('audioNotificationSettings');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        setSettings(prev => ({ ...prev, ...parsedSettings }));
      }
    } catch (error) {
      console.error('Error loading audio notification settings:', error);
    }
  }, []);

  // Initialize Audio Context
  useEffect(() => {
    try {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      setIsSupported(true);
    } catch (error) {
      console.error('Audio not supported:', error);
      setIsSupported(false);
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Save settings to localStorage
  const updateSettings = useCallback((newSettings: Partial<AudioSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    try {
      localStorage.setItem('audioNotificationSettings', JSON.stringify(updatedSettings));
    } catch (error) {
      console.error('Error saving audio notification settings:', error);
    }
  }, [settings]);

  // Generate and play notification sound
  const playNotification = useCallback(async (phase: SoundPhase) => {
    if (!settings.enabled || !isSupported || !audioContextRef.current) return;

    try {
      const audioContext = audioContextRef.current;
      
      // Resume context if suspended (required by some browsers)
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const soundKey = phase === 'work' ? settings.workSound : settings.breakSound;
      const config = soundConfigs[soundKey];

      // Create oscillator and gain nodes
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      // Configure sound
      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);

      // Configure volume with fade out
      const volume = settings.volume * 0.3; // Scale down to prevent loud sounds
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + config.duration);

      // Play sound
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + config.duration);

    } catch (error) {
      console.warn('Audio play failed:', error);
      
      // Fallback: show browser notification if audio fails
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Timer Complete - ${phase === 'work' ? 'Break Time!' : 'Work Time!'}`, {
          icon: '/icons/icon-192x192.png',
          tag: 'pomodoro-timer',
        });
      }
    }
  }, [settings, isSupported]);

  // Preview sound (for settings)
  const previewSound = useCallback(async (soundKey: NotificationSound) => {
    if (!isSupported || !audioContextRef.current) return;

    try {
      const audioContext = audioContextRef.current;
      
      if (audioContext.state === 'suspended') {
        await audioContext.resume();
      }

      const config = soundConfigs[soundKey];

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.type = config.type;
      oscillator.frequency.setValueAtTime(config.frequency, audioContext.currentTime);

      const volume = settings.volume * 0.3;
      gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + config.duration);

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + config.duration);

    } catch (error) {
      console.error('Error previewing sound:', error);
    }
  }, [isSupported, settings.volume]);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (error) {
        console.error('Error requesting notification permission:', error);
        return false;
      }
    }
    return Notification.permission === 'granted';
  }, []);

  return {
    settings,
    updateSettings,
    playNotification,
    previewSound,
    isSupported,
    requestNotificationPermission,
    soundNames: Object.keys(soundConfigs) as NotificationSound[],
  };
}