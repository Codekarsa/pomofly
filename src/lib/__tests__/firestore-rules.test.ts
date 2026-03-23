/**
 * @jest-environment node
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
  TokenOptions,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

let testEnv: RulesTestEnvironment;

// Test data
const mockUser1 = { uid: 'user1', email: 'user1@test.com', email_verified: true };
const mockUser2 = { uid: 'user2', email: 'user2@test.com', email_verified: true };

const validTask = {
  title: 'Test Task',
  userId: 'user1',
  completed: false,
  estimatedPomodoros: 3,
  focus: true,
  projectId: 'project1',
  totalPomodoroSessions: 0,
  totalTimeSpent: 0,
  manualTimeSpent: 0,
};

const validProject = {
  name: 'Test Project',
  userId: 'user1',
  createdAt: new Date(),
};

const validLabel = {
  name: 'Test Label',
  userId: 'user1',
  color: '#ff0000',
  createdAt: new Date(),
};

const validEstimation = {
  userId: 'user1',
  taskId: 'task1',
  taskTitle: 'Test Task',
  projectId: 'project1',
  estimatedPomodoros: 3,
  actualPomodoros: 2,
  accuracy: 0.67,
  completedAt: new Date(),
  keywords: ['test', 'task'],
};

beforeAll(async () => {
  // Load the Firestore rules
  const rulesPath = path.resolve(__dirname, '../../../firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf8');

  testEnv = await initializeTestEnvironment({
    projectId: 'pomofly-test',
    firestore: {
      rules,
      host: 'localhost',
      port: 8080,
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
  describe('Authentication Requirements', () => {
    test('should deny unauthenticated read access to tasks', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      const taskRef = doc(unauthedDb, 'tasks', 'task1');
      
      await assertFails(getDoc(taskRef));
    });

    test('should deny unauthenticated write access to tasks', async () => {
      const unauthedDb = testEnv.unauthenticatedContext().firestore();
      const taskRef = doc(unauthedDb, 'tasks', 'task1');
      
      await assertFails(setDoc(taskRef, validTask));
    });
  });

  describe('Tasks Collection', () => {
    test('should allow user to read their own tasks', async () => {
      const adminDb = testEnv.authenticatedContext('admin').firestore();
      const userDb = testEnv.authenticatedContext('user1', mockUser1).firestore();
      
      // Admin sets up the task
      await adminDb.doc('tasks/task1').set(validTask);
      
      // User should be able to read their task
      const taskRef = doc(userDb, 'tasks', 'task1');
      await assertSucceeds(getDoc(taskRef));
    });

    test('should deny user reading another user\'s tasks', async () => {
      const adminDb = testEnv.authenticatedContext('admin').firestore();
      const user2Db = testEnv.authenticatedContext('user2', mockUser2).firestore();
      
      // Admin sets up task for user1
      await adminDb.doc('tasks/task1').set(validTask);
      
      // User2 should not be able to read user1's task
      const taskRef = doc(user2Db, 'tasks', 'task1');
      await assertFails(getDoc(taskRef));
    });

    test('should allow user to create valid tasks', async () => {
      const userDb = testEnv.authenticatedContext('user1', mockUser1).firestore();
      const taskRef = doc(userDb, 'tasks', 'newtask');
      
      await assertSucceeds(setDoc(taskRef, validTask));
    });

    test('should deny creation of tasks with invalid data', async () => {
      const userDb = testEnv.authenticatedContext('user1', mockUser1).firestore();
      const taskRef = doc(userDb, 'tasks', 'invalidtask');
      
      // Missing required fields
      const invalidTask = {
        title: 'Test',
        // missing userId and completed
      };
      
      await assertFails(setDoc(taskRef, invalidTask));
    });

    test('should deny creation of tasks with wrong userId', async () => {
      const userDb = testEnv.authenticatedContext('user1', mockUser1).firestore();
      const taskRef = doc(userDb, 'tasks', 'wronguser');
      
      const taskForWrongUser = {
        ...validTask,
        userId: 'user2', // Wrong user ID
      };
      
      await assertFails(setDoc(taskRef, taskForWrongUser));
    });

    test('should allow user to update their own tasks', async () => {
      const adminDb = testEnv.authenticatedContext('admin').firestore();
      const userDb = testEnv.authenticatedContext('user1', mockUser1).firestore();
      
      // Admin sets up the task
      await adminDb.doc('tasks/task1').set(validTask);
      
      // User should be able to update their task
      const taskRef = doc(userDb, 'tasks', 'task1');
      await assertSucceeds(updateDoc(taskRef, { completed: true }));
    });

    test('should validate task data constraints', async () => {
      const userDb = testEnv.authenticatedContext('user1', mockUser1).firestore();
      const taskRef = doc(userDb, 'tasks', 'constrained');
      
      // Test title length constraint
      const taskWithLongTitle = {
        ...validTask,
        title: 'x'.repeat(1001), // Too long
      };
      
      await assertFails(setDoc(taskRef, taskWithLongTitle));
      
      // Test estimatedPomodoros constraint
      const taskWithTooManyPomodoros = {
        ...validTask,
        estimatedPomodoros: 51, // Too many
      };
      
      await assertFails(setDoc(taskRef, taskWithTooManyPomodoros));
    });
  });

  describe('Projects Collection', () => {
    test('should allow user to create valid projects', async () => {
      const userDb = testEnv.authenticatedContext('user1', mockUser1).firestore();
      const projectRef = doc(userDb, 'projects', 'newproject');
      
      await assertSucceeds(setDoc(projectRef, validProject));
    });

    test('should deny user reading another user\'s projects', async () => {
      const adminDb = testEnv.authenticatedContext('admin').firestore();
      const user2Db = testEnv.authenticatedContext('user2', mockUser2).firestore();
      
      // Admin sets up project for user1
      await adminDb.doc('projects/project1').set(validProject);
      
      // User2 should not be able to read user1's project
      const projectRef = doc(user2Db, 'projects', 'project1');
      await assertFails(getDoc(projectRef));
    });

    test('should validate project name length', async () => {
      const userDb = testEnv.authenticatedContext('user1', mockUser1).firestore();
      const projectRef = doc(userDb, 'projects', 'longname');
      
      const projectWithLongName = {
        ...validProject,
        name: 'x'.repeat(201), // Too long
      };
      
      await assertFails(setDoc(projectRef, projectWithLongName));
    });
  });

  describe('Labels Collection', () => {
    test('should allow user to create valid labels', async () => {
      const userDb = testEnv.authenticatedContext('user1', mockUser1).firestore();
      const labelRef = doc(userDb, 'labels', 'newlabel');
      
      await assertSucceeds(setDoc(labelRef, validLabel));
    });

    test('should validate color format', async () => {
      const userDb = testEnv.authenticatedContext('user1', mockUser1).firestore();
      const labelRef = doc(userDb, 'labels', 'invalidcolor');
      
      const labelWithInvalidColor = {
        ...validLabel,
        color: 'red', // Invalid hex format
      };
      
      await assertFails(setDoc(labelRef, labelWithInvalidColor));
      
      // Test other invalid formats
      const labelWithBadHex = {
        ...validLabel,
        color: '#gggggg', // Invalid hex characters
      };
      
      await assertFails(setDoc(labelRef, labelWithBadHex));
    });
  });

  describe('Estimation History Collection', () => {
    test('should allow user to create valid estimation records', async () => {
      const userDb = testEnv.authenticatedContext('user1', mockUser1).firestore();
      const estimationRef = doc(userDb, 'estimation_history', 'newestimation');
      
      await assertSucceeds(setDoc(estimationRef, validEstimation));
    });

    test('should validate estimation data constraints', async () => {
      const userDb = testEnv.authenticatedContext('user1', mockUser1).firestore();
      const estimationRef = doc(userDb, 'estimation_history', 'invalid');
      
      // Test invalid estimated pomodoros
      const invalidEstimation = {
        ...validEstimation,
        estimatedPomodoros: 0, // Must be positive
      };
      
      await assertFails(setDoc(estimationRef, invalidEstimation));
    });

    test('should deny cross-user access to estimation history', async () => {
      const adminDb = testEnv.authenticatedContext('admin').firestore();
      const user2Db = testEnv.authenticatedContext('user2', mockUser2).firestore();
      
      // Admin sets up estimation for user1
      await adminDb.doc('estimation_history/est1').set(validEstimation);
      
      // User2 should not be able to read user1's estimation
      const estimationRef = doc(user2Db, 'estimation_history', 'est1');
      await assertFails(getDoc(estimationRef));
    });
  });

  describe('Default Deny Rules', () => {
    test('should deny access to unknown collections', async () => {
      const userDb = testEnv.authenticatedContext('user1', mockUser1).firestore();
      const unknownRef = doc(userDb, 'unknown_collection', 'doc1');
      
      await assertFails(getDoc(unknownRef));
      await assertFails(setDoc(unknownRef, { data: 'test' }));
    });
  });

  describe('Query Security', () => {
    test('should allow user to query their own tasks', async () => {
      const adminDb = testEnv.authenticatedContext('admin').firestore();
      const userDb = testEnv.authenticatedContext('user1', mockUser1).firestore();
      
      // Setup multiple tasks
      await adminDb.doc('tasks/task1').set({ ...validTask, title: 'Task 1' });
      await adminDb.doc('tasks/task2').set({ ...validTask, title: 'Task 2' });
      await adminDb.doc('tasks/task3').set({ ...validTask, userId: 'user2', title: 'Task 3' });
      
      // Query should only return user1's tasks
      const tasksQuery = query(
        collection(userDb, 'tasks'),
        where('userId', '==', 'user1')
      );
      
      await assertSucceeds(getDocs(tasksQuery));
    });

    test('should deny queries without user filtering', async () => {
      const userDb = testEnv.authenticatedContext('user1', mockUser1).firestore();
      
      // Query without userId filter should fail
      const unfiltered = query(collection(userDb, 'tasks'));
      await assertFails(getDocs(unfiltered));
    });
  });
});