/**
 * Utility functions for handling retries with exponential backoff
 * and Firebase operation error recovery
 */

export interface RetryOptions {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error) => boolean;
}

export class RetryError extends Error {
  constructor(
    message: string,
    public attempts: number,
    public lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

/**
 * Default error checker for Firebase operations
 */
export const shouldRetryFirebaseError = (error: Error): boolean => {
  const message = error.message.toLowerCase();
  
  // Retry on network errors, quota errors, and temporary failures
  return (
    message.includes('network error') ||
    message.includes('quota exceeded') ||
    message.includes('timeout') ||
    message.includes('unavailable') ||
    message.includes('deadline exceeded') ||
    message.includes('aborted') ||
    message.includes('cancelled') ||
    error.name === 'NetworkError'
  );
};

/**
 * Retry a function with exponential backoff
 */
export const withRetry = async <T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 8000,
    backoffMultiplier = 2,
    shouldRetry = shouldRetryFirebaseError,
  } = options;

  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Don't retry on last attempt or if error is not retryable
      if (attempt === maxAttempts || !shouldRetry(lastError)) {
        if (attempt === maxAttempts) {
          throw new RetryError(
            `Operation failed after ${maxAttempts} attempts`,
            attempt,
            lastError
          );
        }
        throw lastError;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempt - 1),
        maxDelay
      );
      
      console.warn(`Operation failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms:`, lastError.message);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // This should never be reached, but TypeScript requires it
  throw lastError!;
};

/**
 * Wrapper for Firebase operations with automatic retry logic
 */
export const withFirebaseRetry = <T>(operation: () => Promise<T>): Promise<T> => {
  return withRetry(operation, {
    maxAttempts: 3,
    initialDelay: 1000,
    maxDelay: 5000,
    shouldRetry: shouldRetryFirebaseError,
  });
};

/**
 * Queue for offline operations
 */
interface QueuedOperation {
  id: string;
  operation: () => Promise<any>;
  description: string;
  timestamp: number;
  retries: number;
}

class OfflineQueue {
  private queue: QueuedOperation[] = [];
  private isProcessing = false;
  private maxRetries = 3;

  constructor() {
    // Load persisted queue from localStorage
    this.loadQueue();
    
    // Listen for online status changes
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('Network connection restored, processing offline queue');
        this.processQueue();
      });
    }
  }

  private loadQueue(): void {
    if (typeof window === 'undefined') return;
    
    try {
      const stored = localStorage.getItem('pomofly_offline_queue');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Only load operations that aren't too old (max 24 hours)
        const maxAge = 24 * 60 * 60 * 1000;
        this.queue = parsed.filter((op: QueuedOperation) => 
          Date.now() - op.timestamp < maxAge
        );
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
      this.queue = [];
    }
  }

  private saveQueue(): void {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem('pomofly_offline_queue', JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }

  public add(operation: () => Promise<any>, description: string): string {
    const id = `${Date.now()}-${Math.random()}`;
    this.queue.push({
      id,
      operation,
      description,
      timestamp: Date.now(),
      retries: 0,
    });
    
    this.saveQueue();
    
    // Try to process immediately if online
    if (navigator.onLine) {
      this.processQueue();
    }
    
    return id;
  }

  public async processQueue(): Promise<void> {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    
    try {
      const successes: string[] = [];
      
      for (const item of this.queue) {
        try {
          await item.operation();
          successes.push(item.id);
          console.log(`Successfully processed offline operation: ${item.description}`);
        } catch (error) {
          item.retries++;
          
          if (item.retries >= this.maxRetries) {
            console.error(`Failed to process offline operation after ${this.maxRetries} retries: ${item.description}`, error);
            successes.push(item.id); // Remove from queue even if failed
          } else {
            console.warn(`Offline operation failed (retry ${item.retries}/${this.maxRetries}): ${item.description}`, error);
          }
        }
      }
      
      // Remove successful operations from queue
      this.queue = this.queue.filter(item => !successes.includes(item.id));
      this.saveQueue();
      
    } finally {
      this.isProcessing = false;
    }
  }

  public getQueueLength(): number {
    return this.queue.length;
  }

  public clear(): void {
    this.queue = [];
    this.saveQueue();
  }
}

export const offlineQueue = new OfflineQueue();