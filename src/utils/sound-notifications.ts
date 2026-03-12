/**
 * Sound Notifications System
 * 
 * Handles audio notifications for timer completion events
 * with customization, fallback mechanisms, and accessibility support.
 */

export type SessionType = 'pomodoro' | 'shortBreak' | 'longBreak';

export interface SoundSettings {
  enabled: boolean;
  volume: number; // 0.0 to 1.0
  workSessionSound: string;
  breakSessionSound: string;
  customSounds: { [key: string]: string };
}

export interface NotificationSound {
  name: string;
  file: string;
  description: string;
  duration?: number; // in seconds
}

// Built-in notification sounds
export const NOTIFICATION_SOUNDS: NotificationSound[] = [
  {
    name: 'bell',
    file: '/sounds/bell.mp3',
    description: 'Classic Bell',
    duration: 2
  },
  {
    name: 'chime',
    file: '/sounds/chime.mp3',
    description: 'Gentle Chime',
    duration: 3
  },
  {
    name: 'ding',
    file: '/sounds/ding.mp3',
    description: 'Simple Ding',
    duration: 1
  },
  {
    name: 'notification',
    file: '/sounds/notification.mp3',
    description: 'Modern Notification',
    duration: 2
  },
  {
    name: 'success',
    file: '/sounds/success.mp3',
    description: 'Success Tone',
    duration: 2
  },
  {
    name: 'peaceful',
    file: '/sounds/peaceful.mp3',
    description: 'Peaceful Tone',
    duration: 4
  }
];

// Default sound settings
export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.7,
  workSessionSound: 'success',
  breakSessionSound: 'peaceful',
  customSounds: {}
};

/**
 * Audio manager for notification sounds
 */
class AudioNotificationManager {
  private audioContext: AudioContext | null = null;
  private audioCache: Map<string, AudioBuffer> = new Map();
  private settings: SoundSettings;

  constructor() {
    this.settings = this.loadSettings();
    this.initializeAudioContext();
  }

  /**
   * Initialize Web Audio API context
   */
  private async initializeAudioContext(): Promise<void> {
    try {
      if (typeof window !== 'undefined' && 'AudioContext' in window) {
        this.audioContext = new AudioContext();
        
        // Handle browser autoplay policy
        if (this.audioContext.state === 'suspended') {
          // We'll resume it when user interacts with the page
          document.addEventListener('click', this.resumeAudioContext.bind(this), { once: true });
          document.addEventListener('keydown', this.resumeAudioContext.bind(this), { once: true });
        }
      }
    } catch (error) {
      console.warn('Web Audio API not available:', error);
    }
  }

  /**
   * Resume audio context (required for browser autoplay policy)
   */
  private async resumeAudioContext(): Promise<void> {
    if (this.audioContext && this.audioContext.state === 'suspended') {
      try {
        await this.audioContext.resume();
        console.log('AudioContext resumed');
      } catch (error) {
        console.warn('Failed to resume AudioContext:', error);
      }
    }
  }

  /**
   * Load sound settings from localStorage
   */
  private loadSettings(): SoundSettings {
    try {
      const stored = localStorage.getItem('soundNotificationSettings');
      return stored ? { ...DEFAULT_SOUND_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SOUND_SETTINGS;
    } catch (error) {
      console.warn('Failed to load sound settings:', error);
      return DEFAULT_SOUND_SETTINGS;
    }
  }

  /**
   * Save sound settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem('soundNotificationSettings', JSON.stringify(this.settings));
    } catch (error) {
      console.warn('Failed to save sound settings:', error);
    }
  }

  /**
   * Load and cache audio file
   */
  private async loadAudio(soundFile: string): Promise<AudioBuffer | null> {
    if (this.audioCache.has(soundFile)) {
      return this.audioCache.get(soundFile)!;
    }

    if (!this.audioContext) {
      return null;
    }

    try {
      const response = await fetch(soundFile);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      
      this.audioCache.set(soundFile, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.warn(`Failed to load sound: ${soundFile}`, error);
      return null;
    }
  }

  /**
   * Play notification sound using Web Audio API
   */
  private async playAudioBuffer(audioBuffer: AudioBuffer, volume: number): Promise<void> {
    if (!this.audioContext) return;

    try {
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      
      source.buffer = audioBuffer;
      gainNode.gain.value = volume;
      
      source.connect(gainNode);
      gainNode.connect(this.audioContext.destination);
      
      source.start(0);
    } catch (error) {
      console.warn('Failed to play audio buffer:', error);
    }
  }

  /**
   * Fallback: Play sound using HTML5 Audio element
   */
  private async playFallbackAudio(soundFile: string, volume: number): Promise<void> {
    try {
      const audio = new Audio(soundFile);
      audio.volume = volume;
      
      // Handle autoplay restrictions
      const playPromise = audio.play();
      if (playPromise) {
        await playPromise;
      }
    } catch (error) {
      console.warn('Fallback audio playback failed:', error);
      // Last resort: show browser notification
      this.showBrowserNotification('Timer completed!');
    }
  }

  /**
   * Show browser notification as final fallback
   */
  private showBrowserNotification(message: string): void {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Pomofly Timer', {
        body: message,
        icon: '/icons/favicon-32x32.png',
        silent: false
      });
    }
  }

  /**
   * Get sound file path for session type
   */
  private getSoundForSessionType(sessionType: SessionType): string {
    const soundName = sessionType === 'pomodoro' 
      ? this.settings.workSessionSound 
      : this.settings.breakSessionSound;
    
    // Check custom sounds first
    if (this.settings.customSounds[soundName]) {
      return this.settings.customSounds[soundName];
    }
    
    // Find built-in sound
    const builtInSound = NOTIFICATION_SOUNDS.find(s => s.name === soundName);
    return builtInSound ? builtInSound.file : NOTIFICATION_SOUNDS[0].file;
  }

  /**
   * Play notification sound for completed session
   */
  async playNotification(sessionType: SessionType): Promise<void> {
    if (!this.settings.enabled) {
      return;
    }

    const soundFile = this.getSoundForSessionType(sessionType);
    const volume = this.settings.volume;

    // Try Web Audio API first
    if (this.audioContext) {
      const audioBuffer = await this.loadAudio(soundFile);
      if (audioBuffer) {
        await this.playAudioBuffer(audioBuffer, volume);
        return;
      }
    }

    // Fallback to HTML5 Audio
    await this.playFallbackAudio(soundFile, volume);
  }

  /**
   * Preview a sound (for settings UI)
   */
  async previewSound(soundName: string): Promise<void> {
    const sound = NOTIFICATION_SOUNDS.find(s => s.name === soundName);
    if (!sound) return;

    if (this.audioContext) {
      const audioBuffer = await this.loadAudio(sound.file);
      if (audioBuffer) {
        await this.playAudioBuffer(audioBuffer, this.settings.volume);
        return;
      }
    }

    await this.playFallbackAudio(sound.file, this.settings.volume);
  }

  /**
   * Update sound settings
   */
  updateSettings(newSettings: Partial<SoundSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
  }

  /**
   * Get current settings
   */
  getSettings(): SoundSettings {
    return { ...this.settings };
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission === 'denied') {
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  /**
   * Test audio functionality
   */
  async testAudio(): Promise<boolean> {
    try {
      await this.playNotification('pomodoro');
      return true;
    } catch (error) {
      console.warn('Audio test failed:', error);
      return false;
    }
  }
}

// Singleton instance
let audioManager: AudioNotificationManager | null = null;

/**
 * Get the audio notification manager instance
 */
export function getAudioManager(): AudioNotificationManager {
  if (!audioManager) {
    audioManager = new AudioNotificationManager();
  }
  return audioManager;
}

/**
 * Play notification sound for session completion
 */
export async function playSessionNotification(sessionType: SessionType): Promise<void> {
  const manager = getAudioManager();
  await manager.playNotification(sessionType);
}

/**
 * Update sound notification settings
 */
export function updateSoundSettings(settings: Partial<SoundSettings>): void {
  const manager = getAudioManager();
  manager.updateSettings(settings);
}

/**
 * Get current sound settings
 */
export function getSoundSettings(): SoundSettings {
  const manager = getAudioManager();
  return manager.getSettings();
}

/**
 * Preview a notification sound
 */
export async function previewNotificationSound(soundName: string): Promise<void> {
  const manager = getAudioManager();
  await manager.previewSound(soundName);
}

/**
 * Request browser notification permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  const manager = getAudioManager();
  return await manager.requestNotificationPermission();
}