/**
 * Data Retention Management Utilities
 * Handles data lifecycle, retention policies, and compliance monitoring
 */

import { 
  getFirestore, 
  collection, 
  addDoc,
  Timestamp 
} from 'firebase/firestore';
import { getDB } from './firebase';

export interface RetentionPolicy {
  name: string;
  collection: string;
  retentionDays: number;
  dateField: string;
  description: string;
}

export interface CleanupResult {
  collection: string;
  deletedCount: number;
  executedAt: Date;
  status: 'success' | 'error';
  error?: string;
}

export interface CleanupJobLog {
  jobType: 'daily' | 'weekly' | 'monthly' | 'manual';
  executedAt: Date;
  results: CleanupResult[];
  totalDeleted: number;
  duration: number;
  status: 'success' | 'partial' | 'failed';
  triggeredBy: 'cron' | 'admin' | 'api';
}

// Data retention policies configuration
export const DATA_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    name: 'Guest Sessions',
    collection: 'guest_sessions',
    retentionDays: 7,
    dateField: 'createdAt',
    description: 'Anonymous timer sessions from unregistered users'
  },
  {
    name: 'System Logs',
    collection: 'system_logs',
    retentionDays: 30,
    dateField: 'timestamp',
    description: 'Application and security logs for debugging'
  },
  {
    name: 'Error Reports',
    collection: 'error_reports',
    retentionDays: 90,
    dateField: 'reportedAt',
    description: 'Crash reports and error tracking data'
  },
  {
    name: 'Analytics Data',
    collection: 'analytics_events',
    retentionDays: 180, // 6 months
    dateField: 'eventTime',
    description: 'User behavior analytics and feature usage metrics'
  },
  {
    name: 'Estimation History',
    collection: 'estimation_history',
    retentionDays: 365, // 1 year
    dateField: 'completedAt',
    description: 'Task estimation and accuracy tracking records'
  },
  {
    name: 'Inactive Users',
    collection: 'users',
    retentionDays: 730, // 2 years
    dateField: 'lastActiveAt',
    description: 'User accounts with no recent activity'
  }
];

/**
 * Calculate cutoff date for a retention policy
 */
export function calculateCutoffDate(retentionDays: number): Date {
  const now = new Date();
  return new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);
}

/**
 * Get retention policy by collection name
 */
export function getRetentionPolicy(collectionName: string): RetentionPolicy | undefined {
  return DATA_RETENTION_POLICIES.find(policy => policy.collection === collectionName);
}

/**
 * Log cleanup job execution for audit purposes
 */
export async function logCleanupJob(jobLog: CleanupJobLog): Promise<void> {
  try {
    const db = getDB();
    await addDoc(collection(db, 'cleanup_job_logs'), {
      ...jobLog,
      executedAt: Timestamp.fromDate(jobLog.executedAt),
      createdAt: Timestamp.fromDate(new Date())
    });
  } catch (error) {
    console.error('Failed to log cleanup job:', error);
    // Don't throw - logging failure shouldn't stop cleanup
  }
}

/**
 * Validate cleanup API request
 */
export function validateCleanupRequest(cleanupType: string): boolean {
  const validTypes = [
    'guest-sessions',
    'system-logs',
    'error-reports',
    'analytics',
    'estimation-history',
    'inactive-users',
    'daily',
    'weekly',
    'monthly',
    'all'
  ];
  
  return validTypes.includes(cleanupType);
}

/**
 * Get next scheduled cleanup times
 */
export function getNextCleanupSchedule(): Record<string, string> {
  const now = new Date();
  
  // Calculate next 3 AM UTC for daily cleanup
  const nextDaily = new Date(now);
  nextDaily.setUTCHours(3, 0, 0, 0);
  if (nextDaily <= now) {
    nextDaily.setUTCDate(nextDaily.getUTCDate() + 1);
  }
  
  // Calculate next Sunday 2 AM UTC for weekly cleanup
  const nextWeekly = new Date(now);
  nextWeekly.setUTCHours(2, 0, 0, 0);
  const daysUntilSunday = (7 - nextWeekly.getUTCDay()) % 7 || 7;
  nextWeekly.setUTCDate(nextWeekly.getUTCDate() + daysUntilSunday);
  
  // Calculate next 1st of month 1 AM UTC for monthly cleanup
  const nextMonthly = new Date(now);
  nextMonthly.setUTCMonth(nextMonthly.getUTCMonth() + 1, 1);
  nextMonthly.setUTCHours(1, 0, 0, 0);
  
  return {
    daily: nextDaily.toISOString(),
    weekly: nextWeekly.toISOString(),
    monthly: nextMonthly.toISOString()
  };
}

/**
 * Calculate compliance score for a collection
 */
export function calculateComplianceScore(total: number, expired: number): number {
  if (total === 0) return 100;
  return Math.round(((total - expired) / total) * 100);
}

/**
 * Format retention duration for display
 */
export function formatRetentionDuration(days: number): string {
  if (days < 30) {
    return `${days} day${days !== 1 ? 's' : ''}`;
  } else if (days < 365) {
    const months = Math.round(days / 30);
    return `${months} month${months !== 1 ? 's' : ''}`;
  } else {
    const years = Math.round(days / 365);
    return `${years} year${years !== 1 ? 's' : ''}`;
  }
}

/**
 * Generate compliance report summary
 */
export function generateComplianceReport(stats: any): {
  status: 'excellent' | 'good' | 'warning' | 'critical';
  message: string;
  recommendations: string[];
} {
  const overallCompliance = stats.summary.overallCompliance;
  
  if (overallCompliance >= 98) {
    return {
      status: 'excellent',
      message: 'Data retention compliance is excellent. All policies are being followed correctly.',
      recommendations: [
        'Continue regular monitoring',
        'Review policies annually for optimization'
      ]
    };
  } else if (overallCompliance >= 95) {
    return {
      status: 'good',
      message: 'Data retention compliance is good with minor issues.',
      recommendations: [
        'Monitor collections with lower compliance scores',
        'Consider optimizing cleanup schedules'
      ]
    };
  } else if (overallCompliance >= 85) {
    return {
      status: 'warning',
      message: 'Data retention compliance needs attention. Some collections have expired data.',
      recommendations: [
        'Run immediate cleanup for expired data',
        'Review and optimize cleanup job schedules',
        'Investigate potential cleanup job failures'
      ]
    };
  } else {
    return {
      status: 'critical',
      message: 'Critical compliance issues detected. Immediate action required.',
      recommendations: [
        'Execute immediate comprehensive cleanup',
        'Investigate cleanup job failures',
        'Review retention policies and technical implementation',
        'Consider manual intervention for large data volumes'
      ]
    };
  }
}