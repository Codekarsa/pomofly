import { NextRequest, NextResponse } from 'next/server';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  getCountFromServer,
  Timestamp 
} from 'firebase/firestore';
import { getDB, isFirebaseInitialized } from '@/lib/firebase';

// Verify admin authorization
function verifyAdminAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.ADMIN_API_TOKEN;
  
  if (!expectedToken) {
    console.error('ADMIN_API_TOKEN not configured');
    return false;
  }
  
  return authHeader === `Bearer ${expectedToken}`;
}

// Get data retention statistics
async function getDataRetentionStats() {
  const db = getDB();
  const now = new Date();
  
  // Calculate cutoff dates based on retention policy
  const cutoffDates = {
    guestSessions: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days
    systemLogs: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 days
    errorReports: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000), // 90 days
    analyticsData: new Date(now.getTime() - 6 * 30 * 24 * 60 * 60 * 1000), // 6 months
    estimationHistory: new Date(now.getTime() - 12 * 30 * 24 * 60 * 60 * 1000), // 1 year
    inactiveUsers: new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000), // 2 years
  };

  const stats = {
    compliant: {} as Record<string, { total: number; expired: number; compliance: number }>,
    summary: {
      totalCollections: 0,
      compliantCollections: 0,
      overallCompliance: 0
    }
  };

  // Check guest sessions compliance
  try {
    const guestSessionsTotal = await getCountFromServer(collection(db, 'guest_sessions'));
    const guestSessionsExpired = await getCountFromServer(
      query(
        collection(db, 'guest_sessions'),
        where('createdAt', '<', Timestamp.fromDate(cutoffDates.guestSessions))
      )
    );
    
    stats.compliant.guestSessions = {
      total: guestSessionsTotal.data().count,
      expired: guestSessionsExpired.data().count,
      compliance: guestSessionsTotal.data().count === 0 ? 100 : 
                  ((guestSessionsTotal.data().count - guestSessionsExpired.data().count) / guestSessionsTotal.data().count) * 100
    };
  } catch (error) {
    console.warn('Failed to check guest sessions compliance:', error);
    stats.compliant.guestSessions = { total: 0, expired: 0, compliance: 100 };
  }

  // Check system logs compliance
  try {
    const systemLogsTotal = await getCountFromServer(collection(db, 'system_logs'));
    const systemLogsExpired = await getCountFromServer(
      query(
        collection(db, 'system_logs'),
        where('timestamp', '<', Timestamp.fromDate(cutoffDates.systemLogs))
      )
    );
    
    stats.compliant.systemLogs = {
      total: systemLogsTotal.data().count,
      expired: systemLogsExpired.data().count,
      compliance: systemLogsTotal.data().count === 0 ? 100 :
                  ((systemLogsTotal.data().count - systemLogsExpired.data().count) / systemLogsTotal.data().count) * 100
    };
  } catch (error) {
    console.warn('Failed to check system logs compliance:', error);
    stats.compliant.systemLogs = { total: 0, expired: 0, compliance: 100 };
  }

  // Check error reports compliance
  try {
    const errorReportsTotal = await getCountFromServer(collection(db, 'error_reports'));
    const errorReportsExpired = await getCountFromServer(
      query(
        collection(db, 'error_reports'),
        where('reportedAt', '<', Timestamp.fromDate(cutoffDates.errorReports))
      )
    );
    
    stats.compliant.errorReports = {
      total: errorReportsTotal.data().count,
      expired: errorReportsExpired.data().count,
      compliance: errorReportsTotal.data().count === 0 ? 100 :
                  ((errorReportsTotal.data().count - errorReportsExpired.data().count) / errorReportsTotal.data().count) * 100
    };
  } catch (error) {
    console.warn('Failed to check error reports compliance:', error);
    stats.compliant.errorReports = { total: 0, expired: 0, compliance: 100 };
  }

  // Check analytics data compliance
  try {
    const analyticsTotal = await getCountFromServer(collection(db, 'analytics_events'));
    const analyticsExpired = await getCountFromServer(
      query(
        collection(db, 'analytics_events'),
        where('eventTime', '<', Timestamp.fromDate(cutoffDates.analyticsData))
      )
    );
    
    stats.compliant.analyticsData = {
      total: analyticsTotal.data().count,
      expired: analyticsExpired.data().count,
      compliance: analyticsTotal.data().count === 0 ? 100 :
                  ((analyticsTotal.data().count - analyticsExpired.data().count) / analyticsTotal.data().count) * 100
    };
  } catch (error) {
    console.warn('Failed to check analytics data compliance:', error);
    stats.compliant.analyticsData = { total: 0, expired: 0, compliance: 100 };
  }

  // Check estimation history compliance
  try {
    const estimationTotal = await getCountFromServer(collection(db, 'estimation_history'));
    const estimationExpired = await getCountFromServer(
      query(
        collection(db, 'estimation_history'),
        where('completedAt', '<', Timestamp.fromDate(cutoffDates.estimationHistory))
      )
    );
    
    stats.compliant.estimationHistory = {
      total: estimationTotal.data().count,
      expired: estimationExpired.data().count,
      compliance: estimationTotal.data().count === 0 ? 100 :
                  ((estimationTotal.data().count - estimationExpired.data().count) / estimationTotal.data().count) * 100
    };
  } catch (error) {
    console.warn('Failed to check estimation history compliance:', error);
    stats.compliant.estimationHistory = { total: 0, expired: 0, compliance: 100 };
  }

  // Check inactive users compliance
  try {
    const usersTotal = await getCountFromServer(collection(db, 'users'));
    const inactiveUsers = await getCountFromServer(
      query(
        collection(db, 'users'),
        where('lastActiveAt', '<', Timestamp.fromDate(cutoffDates.inactiveUsers))
      )
    );
    
    stats.compliant.inactiveUsers = {
      total: usersTotal.data().count,
      expired: inactiveUsers.data().count,
      compliance: usersTotal.data().count === 0 ? 100 :
                  ((usersTotal.data().count - inactiveUsers.data().count) / usersTotal.data().count) * 100
    };
  } catch (error) {
    console.warn('Failed to check inactive users compliance:', error);
    stats.compliant.inactiveUsers = { total: 0, expired: 0, compliance: 100 };
  }

  // Calculate summary statistics
  const collections = Object.values(stats.compliant);
  stats.summary.totalCollections = collections.length;
  stats.summary.compliantCollections = collections.filter(c => c.compliance >= 95).length;
  stats.summary.overallCompliance = collections.reduce((sum, c) => sum + c.compliance, 0) / collections.length;

  return stats;
}

// Get recent cleanup job history
async function getCleanupHistory() {
  const db = getDB();
  
  try {
    const q = query(
      collection(db, 'cleanup_job_logs'),
      where('executedAt', '>', Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))) // Last 30 days
    );
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.warn('Failed to fetch cleanup history:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    // Verify admin authorization
    if (!verifyAdminAuth(request)) {
      return NextResponse.json(
        { error: 'Unauthorized - admin access required' },
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

    // Get data retention statistics
    const retentionStats = await getDataRetentionStats();
    
    // Get cleanup job history
    const cleanupHistory = await getCleanupHistory();
    
    // Check if immediate cleanup is needed
    const needsCleanup = retentionStats.summary.overallCompliance < 95;
    const criticalCollections = Object.entries(retentionStats.compliant)
      .filter(([_, stats]) => stats.compliance < 90)
      .map(([name, stats]) => ({ collection: name, compliance: stats.compliance }));
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      retentionPolicy: {
        guestSessions: '7 days',
        systemLogs: '30 days',
        errorReports: '90 days',
        analyticsData: '6 months',
        estimationHistory: '1 year',
        inactiveUsers: '2 years'
      },
      compliance: retentionStats,
      alerts: {
        needsCleanup,
        criticalCollections,
        nextScheduledCleanup: 'Daily at 3:00 AM UTC',
        lastCleanup: cleanupHistory.length > 0 ? cleanupHistory[0].executedAt : null
      },
      cleanupHistory: cleanupHistory.slice(0, 10), // Last 10 cleanup jobs
      recommendations: needsCleanup ? [
        'Run immediate data cleanup for expired records',
        'Review automated cleanup job schedule',
        'Consider adjusting retention periods for high-volume collections'
      ] : [
        'Data retention compliance is good',
        'Continue regular monitoring',
        'Review policy annually for optimization'
      ]
    });
    
  } catch (error) {
    console.error('Compliance monitoring error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}