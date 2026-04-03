import { getDB, isFirebaseInitialized } from './firebase';
import { collection, addDoc, query, where, getDocs, orderBy, limit, Timestamp } from 'firebase/firestore';

/**
 * Security Audit Logging System
 * Tracks security-relevant events for monitoring and compliance
 */

export enum AuditEventType {
  // Authentication events
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILED = 'login_failed',
  LOGOUT = 'logout',
  
  // Data access events
  DATA_ACCESS = 'data_access',
  DATA_EXPORT = 'data_export',
  BULK_OPERATION = 'bulk_operation',
  
  // Security events
  PERMISSION_DENIED = 'permission_denied',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  
  // Admin events
  USER_DELETED = 'user_deleted',
  DATA_PURGED = 'data_purged'
}

export interface AuditEvent {
  id?: string;
  userId: string;
  userEmail?: string;
  eventType: AuditEventType;
  resourceType: string; // 'task', 'project', 'estimation_record'
  resourceId?: string;
  action: string; // 'create', 'read', 'update', 'delete'
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

/**
 * Log a security audit event
 */
export async function logAuditEvent(event: Omit<AuditEvent, 'timestamp'>): Promise<void> {
  if (!isFirebaseInitialized()) {
    console.warn('Firebase not initialized, skipping audit log');
    return;
  }

  try {
    const db = getDB();
    const auditRecord = {
      ...event,
      timestamp: Timestamp.now(),
    };

    await addDoc(collection(db, 'audit_log'), auditRecord);
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging shouldn't break app functionality
  }
}

/**
 * Log successful data access
 */
export async function logDataAccess(
  userId: string,
  resourceType: string,
  resourceId: string,
  action: string,
  metadata: Record<string, any> = {}
): Promise<void> {
  await logAuditEvent({
    userId,
    eventType: AuditEventType.DATA_ACCESS,
    resourceType,
    resourceId,
    action,
    metadata,
    success: true,
  });
}

/**
 * Log permission denied events
 */
export async function logPermissionDenied(
  userId: string,
  resourceType: string,
  resourceId: string,
  action: string,
  reason: string
): Promise<void> {
  await logAuditEvent({
    userId,
    eventType: AuditEventType.PERMISSION_DENIED,
    resourceType,
    resourceId,
    action,
    metadata: { reason },
    success: false,
    errorMessage: reason,
  });
}

/**
 * Log suspicious activity
 */
export async function logSuspiciousActivity(
  userId: string,
  activityType: string,
  details: Record<string, any>
): Promise<void> {
  await logAuditEvent({
    userId,
    eventType: AuditEventType.SUSPICIOUS_ACTIVITY,
    resourceType: 'security',
    action: activityType,
    metadata: details,
    success: false,
  });
}

/**
 * Log bulk operations (potentially suspicious)
 */
export async function logBulkOperation(
  userId: string,
  resourceType: string,
  action: string,
  count: number,
  details: Record<string, any> = {}
): Promise<void> {
  await logAuditEvent({
    userId,
    eventType: AuditEventType.BULK_OPERATION,
    resourceType,
    action,
    metadata: { count, ...details },
    success: true,
  });
}

/**
 * Get audit logs for a specific user (admin function)
 */
export async function getUserAuditLogs(
  userId: string,
  limitCount: number = 50
): Promise<AuditEvent[]> {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  const db = getDB();
  const q = query(
    collection(db, 'audit_log'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  const auditLogs: AuditEvent[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    auditLogs.push({
      id: doc.id,
      ...data,
      timestamp: data.timestamp.toDate(),
    } as AuditEvent);
  });

  return auditLogs;
}

/**
 * Get recent security events (admin function)
 */
export async function getSecurityEvents(limitCount: number = 100): Promise<AuditEvent[]> {
  if (!isFirebaseInitialized()) {
    throw new Error('Firebase not initialized');
  }

  const db = getDB();
  const q = query(
    collection(db, 'audit_log'),
    where('eventType', 'in', [
      AuditEventType.PERMISSION_DENIED,
      AuditEventType.SUSPICIOUS_ACTIVITY,
      AuditEventType.RATE_LIMIT_EXCEEDED,
      AuditEventType.LOGIN_FAILED
    ]),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  const querySnapshot = await getDocs(q);
  const securityEvents: AuditEvent[] = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    securityEvents.push({
      id: doc.id,
      ...data,
      timestamp: data.timestamp.toDate(),
    } as AuditEvent);
  });

  return securityEvents;
}

/**
 * Detect potential security threats based on audit logs
 */
export interface SecurityThreat {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  userId: string;
  eventCount: number;
  timeWindow: string;
}

export async function detectSecurityThreats(): Promise<SecurityThreat[]> {
  if (!isFirebaseInitialized()) {
    return [];
  }

  const threats: SecurityThreat[] = [];
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  try {
    // Get recent events for analysis
    const db = getDB();
    const q = query(
      collection(db, 'audit_log'),
      where('timestamp', '>=', Timestamp.fromDate(oneHourAgo)),
      orderBy('timestamp', 'desc'),
      limit(500)
    );

    const querySnapshot = await getDocs(q);
    const events: AuditEvent[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      events.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp.toDate(),
      } as AuditEvent);
    });

    // Group events by user
    const userEvents = events.reduce((acc, event) => {
      if (!acc[event.userId]) {
        acc[event.userId] = [];
      }
      acc[event.userId].push(event);
      return acc;
    }, {} as Record<string, AuditEvent[]>);

    // Analyze each user's activity
    for (const [userId, userEventList] of Object.entries(userEvents)) {
      const failedLogins = userEventList.filter(e => e.eventType === AuditEventType.LOGIN_FAILED);
      const permissionDenied = userEventList.filter(e => e.eventType === AuditEventType.PERMISSION_DENIED);
      const bulkOps = userEventList.filter(e => e.eventType === AuditEventType.BULK_OPERATION);

      // Multiple failed logins
      if (failedLogins.length >= 5) {
        threats.push({
          type: 'multiple_failed_logins',
          severity: 'high',
          description: `User has ${failedLogins.length} failed login attempts in the last hour`,
          userId,
          eventCount: failedLogins.length,
          timeWindow: '1 hour',
        });
      }

      // Excessive permission denied events
      if (permissionDenied.length >= 10) {
        threats.push({
          type: 'permission_brute_force',
          severity: 'medium',
          description: `User has ${permissionDenied.length} permission denied events, possible enumeration attack`,
          userId,
          eventCount: permissionDenied.length,
          timeWindow: '1 hour',
        });
      }

      // Suspicious bulk operations
      if (bulkOps.length >= 3) {
        threats.push({
          type: 'suspicious_bulk_operations',
          severity: 'medium',
          description: `User performed ${bulkOps.length} bulk operations, potential data exfiltration`,
          userId,
          eventCount: bulkOps.length,
          timeWindow: '1 hour',
        });
      }

      // High activity volume
      if (userEventList.length >= 100) {
        threats.push({
          type: 'high_activity_volume',
          severity: 'low',
          description: `User has ${userEventList.length} events in one hour, unusually high activity`,
          userId,
          eventCount: userEventList.length,
          timeWindow: '1 hour',
        });
      }
    }
  } catch (error) {
    console.error('Failed to detect security threats:', error);
  }

  return threats;
}