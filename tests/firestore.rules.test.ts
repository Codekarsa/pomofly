import {
  initializeTestEnvironment,
  RulesTestEnvironment,
  assertSucceeds,
  assertFails
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, addDoc } from 'firebase/firestore';

describe('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment;
  
  const USER_ID = 'test-user-123';
  const OTHER_USER_ID = 'other-user-456';
  const PROJECT_ID = 'test-project-123';
  const TASK_ID = 'test-task-123';
  
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'pomofly-test',
      firestore: {
        rules: require('fs').readFileSync('./firestore.rules', 'utf8'),
        host: 'localhost',
        port: 8080,
      },
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  describe('Authentication Required', () => {
    test('should deny unauthenticated access to tasks', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauthedDb, 'tasks', TASK_ID)));
    });

    test('should deny unauthenticated access to projects', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauthedDb, 'projects', PROJECT_ID)));
    });

    test('should deny unauthenticated access to estimation_history', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauthedDb, 'estimation_history', 'record-123')));
    });
  });

  describe('Tasks Collection', () => {
    test('should allow user to create valid task', async () => {
      const userDb = testEnv.authenticatedContext(USER_ID).firestore();
      const validTask = {
        title: 'Test Task',
        projectId: PROJECT_ID,
        userId: USER_ID,
        completed: false,
        totalPomodoroSessions: 0,
        totalTimeSpent: 0,
        manualTimeSpent: 0,
        focus: true,
        createdAt: new Date(),
        deadline: null,
        trackingStartedAt: null,
        estimatedPomodoros: 3
      };
      
      await assertSucceeds(setDoc(doc(userDb, 'tasks', TASK_ID), validTask));
    });

    test('should deny task creation with invalid data', async () => {
      const userDb = testEnv.authenticatedContext(USER_ID).firestore();
      const invalidTask = {
        title: '', // Too short
        projectId: PROJECT_ID,
        userId: USER_ID,
        completed: false,
        totalPomodoroSessions: -1, // Negative value
        totalTimeSpent: 0,
        manualTimeSpent: 0,
        focus: true,
        createdAt: new Date()
      };
      
      await assertFails(setDoc(doc(userDb, 'tasks', TASK_ID), invalidTask));
    });

    test('should deny user access to other users tasks', async () => {
      const userDb = testEnv.authenticatedContext(USER_ID).firestore();
      const otherUserDb = testEnv.authenticatedContext(OTHER_USER_ID).firestore();
      
      // Create task as user 1
      const task = {
        title: 'Test Task',
        projectId: PROJECT_ID,
        userId: USER_ID,
        completed: false,
        totalPomodoroSessions: 0,
        totalTimeSpent: 0,
        manualTimeSpent: 0,
        focus: true,
        createdAt: new Date()
      };
      
      await assertSucceeds(setDoc(doc(userDb, 'tasks', TASK_ID), task));
      
      // Try to access as user 2
      await assertFails(getDoc(doc(otherUserDb, 'tasks', TASK_ID)));
    });

    test('should allow user to update their own task', async () => {
      const userDb = testEnv.authenticatedContext(USER_ID).firestore();
      
      // First create the task
      const task = {
        title: 'Test Task',
        projectId: PROJECT_ID,
        userId: USER_ID,
        completed: false,
        totalPomodoroSessions: 0,
        totalTimeSpent: 0,
        manualTimeSpent: 0,
        focus: true,
        createdAt: new Date()
      };
      
      await assertSucceeds(setDoc(doc(userDb, 'tasks', TASK_ID), task));
      
      // Now update it
      await assertSucceeds(updateDoc(doc(userDb, 'tasks', TASK_ID), {
        completed: true,
        totalPomodoroSessions: 2
      }));
    });

    test('should deny changing task ownership', async () => {
      const userDb = testEnv.authenticatedContext(USER_ID).firestore();
      
      // First create the task
      const task = {
        title: 'Test Task',
        projectId: PROJECT_ID,
        userId: USER_ID,
        completed: false,
        totalPomodoroSessions: 0,
        totalTimeSpent: 0,
        manualTimeSpent: 0,
        focus: true,
        createdAt: new Date()
      };
      
      await assertSucceeds(setDoc(doc(userDb, 'tasks', TASK_ID), task));
      
      // Try to change ownership
      await assertFails(updateDoc(doc(userDb, 'tasks', TASK_ID), {
        userId: OTHER_USER_ID
      }));
    });
  });

  describe('Projects Collection', () => {
    test('should allow user to create valid project', async () => {
      const userDb = testEnv.authenticatedContext(USER_ID).firestore();
      const validProject = {
        name: 'Test Project',
        userId: USER_ID,
        createdAt: new Date()
      };
      
      await assertSucceeds(setDoc(doc(userDb, 'projects', PROJECT_ID), validProject));
    });

    test('should deny project creation with invalid name', async () => {
      const userDb = testEnv.authenticatedContext(USER_ID).firestore();
      const invalidProject = {
        name: '', // Too short
        userId: USER_ID,
        createdAt: new Date()
      };
      
      await assertFails(setDoc(doc(userDb, 'projects', PROJECT_ID), invalidProject));
    });

    test('should deny user access to other users projects', async () => {
      const userDb = testEnv.authenticatedContext(USER_ID).firestore();
      const otherUserDb = testEnv.authenticatedContext(OTHER_USER_ID).firestore();
      
      // Create project as user 1
      const project = {
        name: 'Test Project',
        userId: USER_ID,
        createdAt: new Date()
      };
      
      await assertSucceeds(setDoc(doc(userDb, 'projects', PROJECT_ID), project));
      
      // Try to access as user 2
      await assertFails(getDoc(doc(otherUserDb, 'projects', PROJECT_ID)));
    });
  });

  describe('Estimation History Collection', () => {
    test('should allow user to create valid estimation record', async () => {
      const userDb = testEnv.authenticatedContext(USER_ID).firestore();
      const validRecord = {
        userId: USER_ID,
        taskId: TASK_ID,
        taskTitle: 'Test Task',
        projectId: PROJECT_ID,
        estimatedPomodoros: 3,
        actualPomodoros: 2,
        accuracy: 0.67,
        completedAt: new Date(),
        keywords: ['test', 'task']
      };
      
      await assertSucceeds(addDoc(collection(userDb, 'estimation_history'), validRecord));
    });

    test('should deny estimation record creation with invalid data', async () => {
      const userDb = testEnv.authenticatedContext(USER_ID).firestore();
      const invalidRecord = {
        userId: USER_ID,
        taskId: TASK_ID,
        taskTitle: '',  // Too short
        estimatedPomodoros: 0,  // Must be >= 1
        actualPomodoros: -1,  // Cannot be negative
        accuracy: 0.67,
        completedAt: new Date(),
        keywords: ['test']
      };
      
      await assertFails(addDoc(collection(userDb, 'estimation_history'), invalidRecord));
    });

    test('should deny updates to estimation records', async () => {
      const userDb = testEnv.authenticatedContext(USER_ID).firestore();
      const validRecord = {
        userId: USER_ID,
        taskId: TASK_ID,
        taskTitle: 'Test Task',
        projectId: PROJECT_ID,
        estimatedPomodoros: 3,
        actualPomodoros: 2,
        accuracy: 0.67,
        completedAt: new Date(),
        keywords: ['test', 'task']
      };
      
      const docRef = doc(userDb, 'estimation_history', 'record-123');
      await assertSucceeds(setDoc(docRef, validRecord));
      
      // Try to update - should fail
      await assertFails(updateDoc(docRef, { accuracy: 0.8 }));
    });

    test('should deny deletes of estimation records', async () => {
      const userDb = testEnv.authenticatedContext(USER_ID).firestore();
      const validRecord = {
        userId: USER_ID,
        taskId: TASK_ID,
        taskTitle: 'Test Task',
        projectId: PROJECT_ID,
        estimatedPomodoros: 3,
        actualPomodoros: 2,
        accuracy: 0.67,
        completedAt: new Date(),
        keywords: ['test', 'task']
      };
      
      const docRef = doc(userDb, 'estimation_history', 'record-123');
      await assertSucceeds(setDoc(docRef, validRecord));
      
      // Try to delete - should fail
      await assertFails(deleteDoc(docRef));
    });
  });

  describe('Access to Other Collections', () => {
    test('should deny access to unknown collections', async () => {
      const userDb = testEnv.authenticatedContext(USER_ID).firestore();
      await assertFails(getDoc(doc(userDb, 'unknown_collection', 'doc-123')));
    });
  });
});