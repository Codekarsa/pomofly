const { assertFails, assertSucceeds, initializeTestEnvironment } = require('@firebase/rules-unit-testing');

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "pomofly-test",
    firestore: {
      rules: require('fs').readFileSync('firestore.rules', 'utf8'),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

afterEach(async () => {
  await testEnv.clearFirestore();
});

// Helper to get authenticated context
const authedApp = (uid) => testEnv.authenticatedContext(uid);

// Helper to get unauthenticated context
const unauthedApp = () => testEnv.unauthenticatedContext();

describe('Firestore Security Rules', () => {
  
  describe('Tasks Collection', () => {
    test('should allow authenticated user to create their own task', async () => {
      const db = authedApp('user1').firestore();
      const taskData = {
        title: 'Test Task',
        completed: false,
        userId: 'user1',
        projectId: 'project1',
        createdAt: new Date(),
      };
      
      await assertSucceeds(db.collection('tasks').add(taskData));
    });

    test('should deny unauthenticated user from creating tasks', async () => {
      const db = unauthedApp().firestore();
      const taskData = {
        title: 'Test Task',
        completed: false,
        userId: 'user1',
        projectId: 'project1',
        createdAt: new Date(),
      };
      
      await assertFails(db.collection('tasks').add(taskData));
    });

    test('should deny user from creating task for another user', async () => {
      const db = authedApp('user1').firestore();
      const taskData = {
        title: 'Test Task',
        completed: false,
        userId: 'user2', // Different user
        projectId: 'project1',
        createdAt: new Date(),
      };
      
      await assertFails(db.collection('tasks').add(taskData));
    });

    test('should allow user to read their own tasks', async () => {
      const db = authedApp('user1').firestore();
      
      // First create a task
      const taskData = {
        title: 'Test Task',
        completed: false,
        userId: 'user1',
        projectId: 'project1',
        createdAt: new Date(),
      };
      
      const taskRef = await db.collection('tasks').add(taskData);
      
      // Then try to read it
      await assertSucceeds(taskRef.get());
    });

    test('should deny user from reading others tasks', async () => {
      const dbUser1 = authedApp('user1').firestore();
      const dbUser2 = authedApp('user2').firestore();
      
      // User1 creates a task
      const taskData = {
        title: 'User1 Task',
        completed: false,
        userId: 'user1',
        projectId: 'project1',
        createdAt: new Date(),
      };
      
      const taskRef = await dbUser1.collection('tasks').add(taskData);
      
      // User2 tries to read user1's task
      await assertFails(dbUser2.doc(taskRef.path).get());
    });

    test('should validate task data on creation', async () => {
      const db = authedApp('user1').firestore();
      
      // Missing required fields
      const invalidTaskData = {
        completed: false,
        userId: 'user1',
      };
      
      await assertFails(db.collection('tasks').add(invalidTaskData));
    });
  });

  describe('Projects Collection', () => {
    test('should allow authenticated user to create their own project', async () => {
      const db = authedApp('user1').firestore();
      const projectData = {
        name: 'Test Project',
        userId: 'user1',
        createdAt: new Date(),
      };
      
      await assertSucceeds(db.collection('projects').add(projectData));
    });

    test('should deny user from creating project for another user', async () => {
      const db = authedApp('user1').firestore();
      const projectData = {
        name: 'Test Project',
        userId: 'user2', // Different user
        createdAt: new Date(),
      };
      
      await assertFails(db.collection('projects').add(projectData));
    });

    test('should allow user to update their own project', async () => {
      const db = authedApp('user1').firestore();
      
      // Create project first
      const projectData = {
        name: 'Test Project',
        userId: 'user1',
        createdAt: new Date(),
      };
      
      const projectRef = await db.collection('projects').add(projectData);
      
      // Update project
      await assertSucceeds(projectRef.update({ name: 'Updated Project' }));
    });
  });

  describe('Labels Collection', () => {
    test('should allow authenticated user to create their own label', async () => {
      const db = authedApp('user1').firestore();
      const labelData = {
        name: 'Important',
        color: '#ff0000',
        userId: 'user1',
        createdAt: new Date(),
      };
      
      await assertSucceeds(db.collection('labels').add(labelData));
    });

    test('should deny user from accessing others labels', async () => {
      const dbUser1 = authedApp('user1').firestore();
      const dbUser2 = authedApp('user2').firestore();
      
      // User1 creates a label
      const labelData = {
        name: 'Important',
        color: '#ff0000',
        userId: 'user1',
        createdAt: new Date(),
      };
      
      const labelRef = await dbUser1.collection('labels').add(labelData);
      
      // User2 tries to read user1's label
      await assertFails(dbUser2.doc(labelRef.path).get());
    });
  });

  describe('Estimation History Collection', () => {
    test('should allow authenticated user to create their own estimation record', async () => {
      const db = authedApp('user1').firestore();
      const estimationData = {
        userId: 'user1',
        taskId: 'task123',
        taskTitle: 'Test Task',
        estimatedPomodoros: 3,
        actualPomodoros: 2,
        accuracy: 0.67,
        completedAt: new Date(),
      };
      
      await assertSucceeds(db.collection('estimation_history').add(estimationData));
    });

    test('should deny updates to estimation records for data integrity', async () => {
      const db = authedApp('user1').firestore();
      
      // Create record first
      const estimationData = {
        userId: 'user1',
        taskId: 'task123',
        taskTitle: 'Test Task',
        estimatedPomodoros: 3,
        actualPomodoros: 2,
        accuracy: 0.67,
        completedAt: new Date(),
      };
      
      const recordRef = await db.collection('estimation_history').add(estimationData);
      
      // Try to update it (should fail)
      await assertFails(recordRef.update({ actualPomodoros: 3 }));
    });

    test('should deny deletes to estimation records for data integrity', async () => {
      const db = authedApp('user1').firestore();
      
      // Create record first
      const estimationData = {
        userId: 'user1',
        taskId: 'task123',
        taskTitle: 'Test Task',
        estimatedPomodoros: 3,
        actualPomodoros: 2,
        accuracy: 0.67,
        completedAt: new Date(),
      };
      
      const recordRef = await db.collection('estimation_history').add(estimationData);
      
      // Try to delete it (should fail)
      await assertFails(recordRef.delete());
    });
  });

  describe('Users Collection', () => {
    test('should allow user to create their own profile', async () => {
      const db = authedApp('user1').firestore();
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
      };
      
      await assertSucceeds(db.collection('users').doc('user1').set(userData));
    });

    test('should deny user from creating profile for another user', async () => {
      const db = authedApp('user1').firestore();
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
      };
      
      await assertFails(db.collection('users').doc('user2').set(userData));
    });

    test('should allow user to read their own profile', async () => {
      const db = authedApp('user1').firestore();
      
      // Create profile first
      const userData = {
        name: 'Test User',
        email: 'test@example.com',
        createdAt: new Date(),
      };
      
      await db.collection('users').doc('user1').set(userData);
      
      // Read it
      await assertSucceeds(db.collection('users').doc('user1').get());
    });

    test('should deny user from reading other users profiles', async () => {
      const dbUser1 = authedApp('user1').firestore();
      const dbUser2 = authedApp('user2').firestore();
      
      // User1 creates profile
      const userData = {
        name: 'User1',
        email: 'user1@example.com',
        createdAt: new Date(),
      };
      
      await dbUser1.collection('users').doc('user1').set(userData);
      
      // User2 tries to read user1's profile
      await assertFails(dbUser2.collection('users').doc('user1').get());
    });
  });

  describe('Default Deny Rule', () => {
    test('should deny access to unknown collections', async () => {
      const db = authedApp('user1').firestore();
      
      await assertFails(db.collection('unknown_collection').add({ data: 'test' }));
    });
  });
});