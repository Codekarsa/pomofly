/**
 * Timer State Machine for robust timer state management
 * Prevents race conditions and ensures consistent state transitions
 */

export type TimerPhase = 'pomodoro' | 'shortBreak' | 'longBreak';
export type TimerState = 'idle' | 'running' | 'paused' | 'completing' | 'error';

export interface TimerContext {
  phase: TimerPhase;
  state: TimerState;
  startTime: number | null;
  pausedTime: number | null;
  duration: number; // in seconds
  selectedTaskIds: string[];
  sessionsCompleted: number;
  lastUpdate: number;
}

export type TimerEvent = 
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'RESET' }
  | { type: 'COMPLETE' }
  | { type: 'SWITCH_PHASE'; phase: TimerPhase }
  | { type: 'UPDATE_TASKS'; taskIds: string[] }
  | { type: 'ERROR'; error: string }
  | { type: 'RECOVER' };

export interface TimerConfig {
  pomodoro: number;
  shortBreak: number;
  longBreak: number;
  longBreakInterval: number;
}

export class TimerStateMachine {
  private context: TimerContext;
  private config: TimerConfig;
  private listeners: Set<(context: TimerContext) => void> = new Set();
  private operationMutex = new Set<string>();

  constructor(config: TimerConfig, initialContext?: Partial<TimerContext>) {
    this.config = config;
    this.context = {
      phase: 'pomodoro',
      state: 'idle',
      startTime: null,
      pausedTime: null,
      duration: config.pomodoro * 60,
      selectedTaskIds: [],
      sessionsCompleted: 0,
      lastUpdate: Date.now(),
      ...initialContext
    };
  }

  private async withMutex<T>(operationId: string, operation: () => Promise<T>): Promise<T> {
    if (this.operationMutex.has(operationId)) {
      throw new Error(`Operation ${operationId} already in progress`);
    }

    this.operationMutex.add(operationId);
    try {
      return await operation();
    } finally {
      this.operationMutex.delete(operationId);
    }
  }

  private validateTransition(event: TimerEvent): boolean {
    const { state } = this.context;
    
    switch (event.type) {
      case 'START':
        return state === 'idle' || state === 'error';
      case 'PAUSE':
        return state === 'running';
      case 'RESUME':
        return state === 'paused';
      case 'RESET':
        return true; // Always allowed
      case 'COMPLETE':
        return state === 'running' || state === 'completing';
      case 'SWITCH_PHASE':
        return state === 'idle' || state === 'paused' || state === 'error';
      case 'UPDATE_TASKS':
        return true; // Always allowed
      case 'ERROR':
        return true; // Always allowed
      case 'RECOVER':
        return state === 'error';
      default:
        return false;
    }
  }

  private updateContext(updates: Partial<TimerContext>): void {
    this.context = {
      ...this.context,
      ...updates,
      lastUpdate: Date.now()
    };
    this.notifyListeners();
  }

  public async dispatch(event: TimerEvent): Promise<void> {
    return this.withMutex('state-transition', async () => {
      if (!this.validateTransition(event)) {
        console.warn(`Invalid transition: ${event.type} from state ${this.context.state}`);
        return;
      }

      try {
        await this.handleEvent(event);
      } catch (error) {
        console.error('Timer state machine error:', error);
        this.updateContext({
          state: 'error'
        });
      }
    });
  }

  private async handleEvent(event: TimerEvent): Promise<void> {
    const now = Date.now();

    switch (event.type) {
      case 'START':
        this.updateContext({
          state: 'running',
          startTime: now,
          pausedTime: null
        });
        break;

      case 'PAUSE':
        const elapsed = this.getElapsedTime();
        const remaining = Math.max(0, this.context.duration - elapsed);
        this.updateContext({
          state: 'paused',
          startTime: null,
          pausedTime: remaining
        });
        break;

      case 'RESUME':
        const elapsedBeforePause = this.context.duration - (this.context.pausedTime || 0);
        this.updateContext({
          state: 'running',
          startTime: now - (elapsedBeforePause * 1000),
          pausedTime: null
        });
        break;

      case 'RESET':
        this.updateContext({
          state: 'idle',
          startTime: null,
          pausedTime: null,
          duration: this.config[this.context.phase] * 60
        });
        break;

      case 'COMPLETE':
        this.updateContext({
          state: 'completing',
        });
        
        // Handle phase completion
        await this.handlePhaseCompletion();
        break;

      case 'SWITCH_PHASE':
        this.updateContext({
          phase: event.phase,
          state: 'idle',
          startTime: null,
          pausedTime: null,
          duration: this.config[event.phase] * 60
        });
        break;

      case 'UPDATE_TASKS':
        this.updateContext({
          selectedTaskIds: [...event.taskIds] // Create new array to prevent mutations
        });
        break;

      case 'ERROR':
        this.updateContext({
          state: 'error'
        });
        break;

      case 'RECOVER':
        this.updateContext({
          state: 'idle'
        });
        break;
    }
  }

  private async handlePhaseCompletion(): Promise<void> {
    const { phase, sessionsCompleted } = this.context;
    
    if (phase === 'pomodoro') {
      const newSessionsCompleted = sessionsCompleted + 1;
      const nextPhase = newSessionsCompleted >= this.config.longBreakInterval ? 'longBreak' : 'shortBreak';
      
      this.updateContext({
        sessionsCompleted: newSessionsCompleted,
        phase: nextPhase,
        state: 'idle',
        startTime: null,
        pausedTime: null,
        duration: this.config[nextPhase] * 60
      });
    } else {
      // Break completed, switch to pomodoro
      this.updateContext({
        phase: 'pomodoro',
        state: 'idle',
        startTime: null,
        pausedTime: null,
        duration: this.config.pomodoro * 60
      });
    }
  }

  public getElapsedTime(): number {
    if (this.context.pausedTime !== null) {
      return this.context.duration - this.context.pausedTime;
    }
    
    if (!this.context.startTime) {
      return 0;
    }

    return Math.floor((Date.now() - this.context.startTime) / 1000);
  }

  public getRemainingTime(): number {
    if (this.context.pausedTime !== null) {
      return this.context.pausedTime;
    }

    if (!this.context.startTime) {
      return this.context.duration;
    }

    const elapsed = this.getElapsedTime();
    return Math.max(0, this.context.duration - elapsed);
  }

  public getContext(): Readonly<TimerContext> {
    return { ...this.context };
  }

  public subscribe(listener: (context: TimerContext) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.context);
      } catch (error) {
        console.error('Timer listener error:', error);
      }
    });
  }

  public updateConfig(newConfig: TimerConfig): void {
    this.config = newConfig;
    if (this.context.state === 'idle') {
      this.updateContext({
        duration: newConfig[this.context.phase] * 60
      });
    }
  }

  public isOperationInProgress(): boolean {
    return this.operationMutex.size > 0;
  }
}