import { NextRequest, NextResponse } from 'next/server';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc, 
  Timestamp 
} from 'firebase/firestore';
import { getDB, isFirebaseInitialized } from '@/lib/firebase';

// Verify request is from authorized source (e.g., cron job)
function verifyAuthorization(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.CLEANUP_API_TOKEN;
  
  if (!expectedToken) {
    console.error('CLEANUP_API_TOKEN not configured');
    return false;
  }
  
  return authHeader === `Bearer ${expectedToken}`;
}

// Calculate cutoff dates for different data types
function getCutoffDates() {
  const now = new Date();
  
  return {
    guestSessions: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days
    systemLogs: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days
    errorReports: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), // 90 days
    analyticsData: new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000), // 6 months
    estimationHistory: new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000), // 1 year
    inactiveUsers: new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000), // 2 years
  };
}

// Cleanup guest session data
async function cleanupGuestSessions(cutoffDate: Date): Promise<number> {
  const db = getDB();
  const q = query(
    collection(db, 'guest_sessions'),
    where('createdAt', '<', Timestamp.fromDate(cutoffDate))
  );
  
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(document => deleteDoc(document.ref));
  await Promise.all(deletePromises);
  
  return snapshot.size;
}

// Cleanup system logs
async function cleanupSystemLogs(cutoffDate: Date): Promise<number> {
  const db = getDB();
  const q = query(
    collection(db, 'system_logs'),
    where('timestamp', '<', Timestamp.fromDate(cutoffDate))
  );
  
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(document => deleteDoc(document.ref));
  await Promise.all(deletePromises);
  
  return snapshot.size;
}

// Cleanup error reports
async function cleanupErrorReports(cutoffDate: Date): Promise<number> {
  const db = getDB();
  const q = query(
    collection(db, 'error_reports'),
    where('reportedAt', '<', Timestamp.fromDate(cutoffDate))
  );
  
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(document => deleteDoc(document.ref));
  await Promise.all(deletePromises);
  
  return snapshot.size;
}

// Cleanup analytics data
async function cleanupAnalyticsData(cutoffDate: Date): Promise<number> {
  const db = getDB();
  const q = query(
    collection(db, 'analytics_events'),
    where('eventTime', '<', Timestamp.fromDate(cutoffDate))
  );
  
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(document => deleteDoc(document.ref));
  await Promise.all(deletePromises);
  
  return snapshot.size;
}

// Cleanup estimation history
async function cleanupEstimationHistory(cutoffDate: Date): Promise<number> {
  const db = getDB();
  const q = query(
    collection(db, 'estimation_history'),
    where('completedAt', '<', Timestamp.fromDate(cutoffDate))
  );
  
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(document => deleteDoc(document.ref));
  await Promise.all(deletePromises);
  
  return snapshot.size;
}

// Cleanup inactive user data
async function cleanupInactiveUsers(cutoffDate: Date): Promise<number> {
  const db = getDB();
  
  // Find users who haven't been active since cutoff date
  const q = query(
    collection(db, 'users'),
    where('lastActiveAt', '<', Timestamp.fromDate(cutoffDate))
  );
  
  const snapshot = await getDocs(q);
  let deletedCount = 0;
  
  // Delete user data for each inactive user
  for (const userDoc of snapshot.docs) {
    const userId = userDoc.id;
    
    // Delete user's estimation history
    const estimationQ = query(
      collection(db, 'estimation_history'),
      where('userId', '==', userId)
    );
    const estimationSnapshot = await getDocs(estimationQ);
    await Promise.all(estimationSnapshot.docs.map(doc => deleteDoc(doc.ref)));
    
    // Delete user's projects and tasks
    const projectsQ = query(
      collection(db, 'projects'),
      where('userId', '==', userId)
    );
    const projectsSnapshot = await getDocs(projectsQ);
    await Promise.all(projectsSnapshot.docs.map(doc => deleteDoc(doc.ref)));
    
    // Delete user's tasks
    const tasksQ = query(
      collection(db, 'tasks'),
      where('userId', '==', userId)
    );
    const tasksSnapshot = await getDocs(tasksQ);
    await Promise.all(tasksSnapshot.docs.map(doc => deleteDoc(doc.ref)));
    
    // Finally delete the user record
    await deleteDoc(userDoc.ref);
    deletedCount++;
  }
  
  return deletedCount;
}

export async function POST(request: NextRequest) {
  try {
    // Verify authorization
    if (!verifyAuthorization(request)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check Firebase initialization
    if (!isFirebaseInitialized()) {
      return NextResponse.json(
        { error: 'Firebase not initialized' },
        { status: 500 }
      );
    }

    // Parse cleanup type from request
    const body = await request.json();
    const { cleanupType = 'all' } = body;
    
    const cutoffDates = getCutoffDates();
    const results: Record<string, number> = {};
    
    // Execute cleanup based on type
    switch (cleanupType) {
      case 'guest-sessions':
        results.guestSessions = await cleanupGuestSessions(cutoffDates.guestSessions);
        break;
        
      case 'system-logs':
        results.systemLogs = await cleanupSystemLogs(cutoffDates.systemLogs);
        break;
        
      case 'error-reports':
        results.errorReports = await cleanupErrorReports(cutoffDates.errorReports);
        break;
        
      case 'analytics':
        results.analyticsData = await cleanupAnalyticsData(cutoffDates.analyticsData);
        break;
        
      case 'estimation-history':
        results.estimationHistory = await cleanupEstimationHistory(cutoffDates.estimationHistory);
        break;
        
      case 'inactive-users':
        results.inactiveUsers = await cleanupInactiveUsers(cutoffDates.inactiveUsers);
        break;
        
      case 'daily':
        results.guestSessions = await cleanupGuestSessions(cutoffDates.guestSessions);
        results.systemLogs = await cleanupSystemLogs(cutoffDates.systemLogs);
        break;
        
      case 'weekly':
        results.errorReports = await cleanupErrorReports(cutoffDates.errorReports);
        results.analyticsData = await cleanupAnalyticsData(cutoffDates.analyticsData);
        break;
        
      case 'monthly':
        results.estimationHistory = await cleanupEstimationHistory(cutoffDates.estimationHistory);
        results.inactiveUsers = await cleanupInactiveUsers(cutoffDates.inactiveUsers);
        break;
        
      case 'all':
        results.guestSessions = await cleanupGuestSessions(cutoffDates.guestSessions);
        results.systemLogs = await cleanupSystemLogs(cutoffDates.systemLogs);
        results.errorReports = await cleanupErrorReports(cutoffDates.errorReports);
        results.analyticsData = await cleanupAnalyticsData(cutoffDates.analyticsData);
        results.estimationHistory = await cleanupEstimationHistory(cutoffDates.estimationHistory);
        results.inactiveUsers = await cleanupInactiveUsers(cutoffDates.inactiveUsers);
        break;
        
      default:
        return NextResponse.json(
          { error: 'Invalid cleanup type' },
          { status: 400 }
        );
    }

    // Log cleanup results
    console.log(`Data cleanup completed:`, results);
    
    return NextResponse.json({
      success: true,
      cleanupType,
      results,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Data cleanup error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for status/health check
export async function GET() {
  return NextResponse.json({
    status: 'Data Cleanup API is operational',
    timestamp: new Date().toISOString(),
    firebaseInitialized: isFirebaseInitialized(),
    availableCleanupTypes: [
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
    ]
  });
}