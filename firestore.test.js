/**
 * Firestore Security Rules Test Suite
 * 
 * Tests the security rules for projects and tasks collections
 * Run with: npm test -- firestore.test.js
 * 
 * @author Claude
 * @date 2026-03-11
 */

const { initializeTestEnvironment, assertFails, assertSucceeds } = require('@firebase/rules-unit-testing');
const { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } = require('firebase/firestore');

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'test-project',
    firestore: {
      rules: require('fs').readFileSync('firestore.rules', 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

describe('Firestore Security Rules', () => {
  const userId1 = 'user1';
  const userId2 = 'user2';
  
  const validProject = {
    name: 'Test Project',
    userId: userId1,
    createdAt: new Date()
  };
  
  const validTask = {
    title: 'Test Task',
    projectId: 'project1',
    userId: userId1,
    completed: false,
    totalPomodoroSessions: 0,
    totalTimeSpent: 0,
    createdAt: new Date(),
    estimatedPomodoros: 5,
    archived: false,
    focus: false,
    deadline: null,
    manualTimeSpent: 0,
    trackingStartedAt: null
  };

  describe('Projects Collection', () => {
    test('authenticated user can create their own project', async () => {
      const db = testEnv.authenticatedContext(userId1).firestore();
      const projectRef = doc(db, 'projects', 'project1');
      
      await assertSucceeds(setDoc(projectRef, validProject));
    });

    test('unauthenticated user cannot create project', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      const projectRef = doc(db, 'projects', 'project1');
      
      await assertFails(setDoc(projectRef, validProject));
    });

    test('user cannot create project for another user', async () => {
      const db = testEnv.authenticatedContext(userId1).firestore();
      const projectRef = doc(db, 'projects', 'project1');
      
      await assertFails(setDoc(projectRef, { ...validProject, userId: userId2 }));
    });

    test('authenticated user can read their own project', async () => {
      const adminDb = testEnv.authenticatedContext(userId1).firestore();
      const projectRef = doc(adminDb, 'projects', 'project1');
      await setDoc(projectRef, validProject);
      
      const userDb = testEnv.authenticatedContext(userId1).firestore();
      const userProjectRef = doc(userDb, 'projects', 'project1');
      
      await assertSucceeds(getDoc(userProjectRef));
    });

    test('user cannot read another user\'s project', async () => {
      const adminDb = testEnv.authenticatedContext(userId1).firestore();
      const projectRef = doc(adminDb, 'projects', 'project1');
      await setDoc(projectRef, validProject);
      
      const userDb = testEnv.authenticatedContext(userId2).firestore();
      const userProjectRef = doc(userDb, 'projects', 'project1');
      
      await assertFails(getDoc(userProjectRef));
    });

    test('project name validation works', async () => {
      const db = testEnv.authenticatedContext(userId1).firestore();
      const projectRef = doc(db, 'projects', 'project1');
      
      // Too short name
      await assertFails(setDoc(projectRef, { ...validProject, name: '' }));
      
      // Too long name
      await assertFails(setDoc(projectRef, { 
        ...validProject, 
        name: 'x'.repeat(101) 
      }));
      
      // Invalid name type
      await assertFails(setDoc(projectRef, { ...validProject, name: 123 }));
    });

    test('user can update their own project name', async () => {
      const db = testEnv.authenticatedContext(userId1).firestore();
      const projectRef = doc(db, 'projects', 'project1');
      await setDoc(projectRef, validProject);
      
      await assertSucceeds(updateDoc(projectRef, { name: 'Updated Project Name' }));
    });

    test('user can delete their own project', async () => {
      const db = testEnv.authenticatedContext(userId1).firestore();
      const projectRef = doc(db, 'projects', 'project1');
      await setDoc(projectRef, validProject);
      
      await assertSucceeds(deleteDoc(projectRef));
    });
  });

  describe('Tasks Collection', () => {
    test('authenticated user can create their own task', async () => {
      const db = testEnv.authenticatedContext(userId1).firestore();
      const taskRef = doc(db, 'tasks', 'task1');
      
      await assertSucceeds(setDoc(taskRef, validTask));
    });

    test('unauthenticated user cannot create task', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      const taskRef = doc(db, 'tasks', 'task1');
      
      await assertFails(setDoc(taskRef, validTask));
    });

    test('user cannot create task for another user', async () => {
      const db = testEnv.authenticatedContext(userId1).firestore();
      const taskRef = doc(db, 'tasks', 'task1');
      
      await assertFails(setDoc(taskRef, { ...validTask, userId: userId2 }));
    });

    test('task field validation works', async () => {
      const db = testEnv.authenticatedContext(userId1).firestore();
      const taskRef = doc(db, 'tasks', 'task1');
      
      // Invalid title
      await assertFails(setDoc(taskRef, { ...validTask, title: '' }));
      await assertFails(setDoc(taskRef, { ...validTask, title: 'x'.repeat(501) }));
      
      // Invalid numeric fields
      await assertFails(setDoc(taskRef, { ...validTask, totalPomodoroSessions: -1 }));
      await assertFails(setDoc(taskRef, { ...validTask, totalTimeSpent: -1 }));
      await assertFails(setDoc(taskRef, { ...validTask, manualTimeSpent: -1 }));
      
      // Invalid boolean fields
      await assertFails(setDoc(taskRef, { ...validTask, completed: 'false' }));
      await assertFails(setDoc(taskRef, { ...validTask, focus: 'true' }));
    });

    test('user can update their own task', async () => {
      const db = testEnv.authenticatedContext(userId1).firestore();
      const taskRef = doc(db, 'tasks', 'task1');
      await setDoc(taskRef, validTask);
      
      await assertSucceeds(updateDoc(taskRef, { 
        title: 'Updated Task',
        completed: true,
        totalPomodoroSessions: 2
      }));
    });

    test('task counters can only increase', async () => {
      const db = testEnv.authenticatedContext(userId1).firestore();
      const taskRef = doc(db, 'tasks', 'task1');
      await setDoc(taskRef, { ...validTask, totalPomodoroSessions: 5 });
      
      // Should fail when trying to decrease counter
      await assertFails(updateDoc(taskRef, { totalPomodoroSessions: 3 }));
      
      // Should succeed when increasing or keeping same
      await assertSucceeds(updateDoc(taskRef, { totalPomodoroSessions: 7 }));
    });

    test('user can delete their own task', async () => {
      const db = testEnv.authenticatedContext(userId1).firestore();
      const taskRef = doc(db, 'tasks', 'task1');
      await setDoc(taskRef, validTask);
      
      await assertSucceeds(deleteDoc(taskRef));
    });
  });

  describe('Access Control', () => {
    test('users cannot access other collections', async () => {
      const db = testEnv.authenticatedContext(userId1).firestore();
      const adminRef = doc(db, 'admin', 'settings');
      
      await assertFails(setDoc(adminRef, { config: 'test' }));
      await assertFails(getDoc(adminRef));
    });

    test('unauthenticated users have no access', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      
      await assertFails(getDoc(doc(db, 'projects', 'any')));
      await assertFails(getDoc(doc(db, 'tasks', 'any')));
    });
  });
});