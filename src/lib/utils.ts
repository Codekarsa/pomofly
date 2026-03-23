import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parse a Firebase timestamp (Date, Firestore Timestamp, or string) to milliseconds
 * @param timestamp - Firebase timestamp in various formats
 * @returns Timestamp in milliseconds
 */
export function parseFirebaseTimestamp(timestamp: unknown): number {
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  
  // Handle Firestore Timestamp object with toDate() method
  if (timestamp && typeof timestamp === 'object' && 'toDate' in timestamp) {
    const tsObject = timestamp as { toDate: () => Date };
    if (typeof tsObject.toDate === 'function') {
      return tsObject.toDate().getTime();
    }
  }
  
  // Handle string timestamps
  return new Date(timestamp as string).getTime();
}
