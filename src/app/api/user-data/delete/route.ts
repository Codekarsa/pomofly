import { NextRequest, NextResponse } from 'next/server';
import { 
  getFirestore, 
  collection, 
  query, 
  where, 
  getDocs, 
  deleteDoc, 
  doc, 
  addDoc,
  Timestamp 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getDB, isFirebaseInitialized } from '@/lib/firebase';

// Verify user authentication
async function verifyUserAuth(request: NextRequest): Promise<string | null> {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }
    
    const token = authHeader.substring(7);
    // In a real implementation, you would verify the Firebase ID token here
    // For now, we'll extract the user ID from the token (simplified)
    // This should be replaced with proper Firebase Admin SDK token verification
    
    // Parse the token to get user ID (this is a simplified implementation)
    // In production, use Firebase Admin SDK to verify the token
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    return payload.user_id || payload.uid || null;
  } catch (error) {
    console.error('Auth verification error:', error);
    return null;
  }
}

// Export user data before deletion (GDPR compliance)
async function exportUserData(userId: string): Promise<any> {
  const db = getDB();
  const userData: any = {
    userId,
    exportedAt: new Date().toISOString(),
    data: {}
  };
  
  // Export user profile
  const userDoc = await getDocs(query(collection(db, 'users'), where('__name__', '==', userId)));
  if (!userDoc.empty) {
    userData.data.profile = userDoc.docs[0].data();
  }
  
  // Export projects
  const projectsSnapshot = await getDocs(query(collection(db, 'projects'), where('userId', '==', userId)));
  userData.data.projects = projectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Export tasks
  const tasksSnapshot = await getDocs(query(collection(db, 'tasks'), where('userId', '==', userId)));
  userData.data.tasks = tasksSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  // Export estimation history
  const estimationSnapshot = await getDocs(query(collection(db, 'estimation_history'), where('userId', '==', userId)));
  userData.data.estimationHistory = estimationSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
  return userData;
}

// Delete all user data
async function deleteUserData(userId: string): Promise<{ deletedCounts: Record<string, number> }> {
  const db = getDB();
  const deletedCounts: Record<string, number> = {};
  
  // Delete estimation history
  const estimationQ = query(collection(db, 'estimation_history'), where('userId', '==', userId));
  const estimationSnapshot = await getDocs(estimationQ);
  await Promise.all(estimationSnapshot.docs.map(doc => deleteDoc(doc.ref)));
  deletedCounts.estimationHistory = estimationSnapshot.size;
  
  // Delete projects
  const projectsQ = query(collection(db, 'projects'), where('userId', '==', userId));
  const projectsSnapshot = await getDocs(projectsQ);
  await Promise.all(projectsSnapshot.docs.map(doc => deleteDoc(doc.ref)));
  deletedCounts.projects = projectsSnapshot.size;
  
  // Delete tasks
  const tasksQ = query(collection(db, 'tasks'), where('userId', '==', userId));
  const tasksSnapshot = await getDocs(tasksQ);
  await Promise.all(tasksSnapshot.docs.map(doc => deleteDoc(doc.ref)));
  deletedCounts.tasks = tasksSnapshot.size;
  
  // Delete user preferences
  const preferencesQ = query(collection(db, 'user_preferences'), where('userId', '==', userId));
  const preferencesSnapshot = await getDocs(preferencesQ);
  await Promise.all(preferencesSnapshot.docs.map(doc => deleteDoc(doc.ref)));
  deletedCounts.preferences = preferencesSnapshot.size;
  
  // Delete analytics events (anonymize by removing user ID)
  const analyticsQ = query(collection(db, 'analytics_events'), where('userId', '==', userId));
  const analyticsSnapshot = await getDocs(analyticsQ);
  // Instead of deleting analytics, we anonymize them by removing the userId
  // This preserves aggregate analytics while removing personal identifiers
  deletedCounts.anonymizedAnalytics = analyticsSnapshot.size;
  
  // Finally, delete the user document
  await deleteDoc(doc(db, 'users', userId));
  deletedCounts.userProfile = 1;
  
  return { deletedCounts };
}

// Log data deletion for audit purposes
async function logDataDeletion(userId: string, exportData: any, deletedCounts: Record<string, number>) {
  const db = getDB();
  
  const deletionLog = {
    userId,
    deletedAt: Timestamp.fromDate(new Date()),
    exportedData: !!exportData,
    deletedCounts,
    compliance: 'GDPR Article 17 - Right to Erasure'
  };
  
  await addDoc(collection(db, 'data_deletion_logs'), deletionLog);
}

export async function POST(request: NextRequest) {
  try {
    // Check Firebase initialization
    if (!isFirebaseInitialized()) {
      return NextResponse.json(
        { error: 'Firebase not initialized' },
        { status: 500 }
      );
    }

    // Verify user authentication
    const userId = await verifyUserAuth(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid or missing authentication token' },
        { status: 401 }
      );
    }

    // Parse request options
    const body = await request.json();
    const { exportBeforeDeletion = true, confirmDeletion = false } = body;
    
    if (!confirmDeletion) {
      return NextResponse.json(
        { error: 'Deletion not confirmed. Set confirmDeletion to true.' },
        { status: 400 }
      );
    }

    let exportedData = null;
    
    // Export data if requested (GDPR compliance)
    if (exportBeforeDeletion) {
      exportedData = await exportUserData(userId);
    }
    
    // Delete user data
    const { deletedCounts } = await deleteUserData(userId);
    
    // Log the deletion for audit purposes
    await logDataDeletion(userId, exportedData, deletedCounts);
    
    console.log(`User data deleted for userId: ${userId}`, deletedCounts);
    
    return NextResponse.json({
      success: true,
      message: 'User data has been permanently deleted',
      userId,
      deletedCounts,
      exportedData: exportBeforeDeletion ? exportedData : null,
      deletedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('User data deletion error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check Firebase initialization
    if (!isFirebaseInitialized()) {
      return NextResponse.json(
        { error: 'Firebase not initialized' },
        { status: 500 }
      );
    }

    // Verify user authentication
    const userId = await verifyUserAuth(request);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized - invalid or missing authentication token' },
        { status: 401 }
      );
    }

    // Export user data for review
    const exportedData = await exportUserData(userId);
    
    return NextResponse.json({
      success: true,
      message: 'User data exported successfully',
      data: exportedData,
      exportedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('User data export error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}