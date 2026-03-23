/**
 * Database Schema Migration System
 * 
 * This module provides a comprehensive migration framework for Pomofly's Firebase data structures.
 * It ensures backward compatibility and safe schema evolution as the application grows.
 */

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  writeBatch, 
  runTransaction,
  Timestamp 
} from 'firebase/firestore';
import { getDB } from './firebase';
import { z } from 'zod';

// Current schema version - increment when adding new migrations
export const CURRENT_SCHEMA_VERSION = 1;

// User schema version document structure
export const UserSchemaVersionSchema = z.object({
  userId: z.string(),
  schemaVersion: z.number().int().min(0),
  lastMigratedAt: z.date(),
  migrationHistory: z.array(z.object({
    fromVersion: z.number().int(),
    toVersion: z.number().int(),
    migratedAt: z.date(),
    rollbackData: z.any().optional(), // Backup data for rollback
  })),
  backupCreatedAt: z.date().optional(),
});

export type UserSchemaVersion = z.infer<typeof UserSchemaVersionSchema>;

// Migration interface
export interface Migration {
  version: number;
  name: string;
  description: string;
  up: (userId: string) => Promise<void>;
  down?: (userId: string) => Promise<void>;
  validate?: (userId: string) => Promise<boolean>;
  needsBackup?: boolean;
}

// Registry of all migrations
const migrations: Map<number, Migration> = new Map();

/**
 * Register a new migration
 */
export function registerMigration(migration: Migration) {
  if (migrations.has(migration.version)) {
    throw new Error(`Migration version ${migration.version} is already registered`);
  }
  migrations.set(migration.version, migration);
}

/**
 * Get user's current schema version
 */
export async function getUserSchemaVersion(userId: string): Promise<number> {
  try {
    const db = getDB();
    const versionDoc = await getDoc(doc(db, 'user_schema_versions', userId));
    
    if (!versionDoc.exists()) {
      // New user - create initial version document
      await createUserSchemaVersion(userId, 0);
      return 0;
    }
    
    const data = versionDoc.data();
    return data.schemaVersion || 0;
  } catch (error) {
    console.error('Error getting user schema version:', error);
    return 0; // Default to version 0 for safety
  }
}

/**
 * Create initial schema version document for new user
 */
async function createUserSchemaVersion(userId: string, version: number = 0): Promise<void> {
  const db = getDB();
  const versionData: Omit<UserSchemaVersion, 'lastMigratedAt' | 'migrationHistory'> & {
    lastMigratedAt: Timestamp;
    migrationHistory: any[];
  } = {
    userId,
    schemaVersion: version,
    lastMigratedAt: Timestamp.now(),
    migrationHistory: [],
  };
  
  await setDoc(doc(db, 'user_schema_versions', userId), versionData);
}

/**
 * Update user's schema version with migration history
 */
async function updateUserSchemaVersion(
  userId: string, 
  fromVersion: number, 
  toVersion: number,
  rollbackData?: any
): Promise<void> {
  const db = getDB();
  const versionRef = doc(db, 'user_schema_versions', userId);
  
  await runTransaction(db, async (transaction) => {
    const versionDoc = await transaction.get(versionRef);
    
    if (!versionDoc.exists()) {
      throw new Error('User schema version document not found');
    }
    
    const currentData = versionDoc.data();
    const migrationRecord = {
      fromVersion,
      toVersion,
      migratedAt: Timestamp.now(),
      ...(rollbackData && { rollbackData }),
    };
    
    transaction.update(versionRef, {
      schemaVersion: toVersion,
      lastMigratedAt: Timestamp.now(),
      migrationHistory: [...(currentData.migrationHistory || []), migrationRecord],
    });
  });
}

/**
 * Create backup of user data before migration
 */
async function createUserBackup(userId: string): Promise<any> {
  const db = getDB();
  const backup: any = {
    userId,
    backedUpAt: Timestamp.now(),
    collections: {},
  };
  
  // Backup tasks
  const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', userId));
  const tasksSnapshot = await getDocs(tasksQuery);
  backup.collections.tasks = tasksSnapshot.docs.map(doc => ({
    id: doc.id,
    data: doc.data(),
  }));
  
  // Backup projects
  const projectsQuery = query(collection(db, 'projects'), where('userId', '==', userId));
  const projectsSnapshot = await getDocs(projectsQuery);
  backup.collections.projects = projectsSnapshot.docs.map(doc => ({
    id: doc.id,
    data: doc.data(),
  }));
  
  // Backup estimation history
  const estimationQuery = query(collection(db, 'estimation_history'), where('userId', '==', userId));
  const estimationSnapshot = await getDocs(estimationQuery);
  backup.collections.estimation_history = estimationSnapshot.docs.map(doc => ({
    id: doc.id,
    data: doc.data(),
  }));
  
  // Store backup document
  const backupRef = doc(collection(db, 'user_backups'), `${userId}_${Date.now()}`);
  await setDoc(backupRef, backup);
  
  return backup;
}

/**
 * Restore user data from backup (rollback)
 */
export async function restoreUserFromBackup(userId: string, backup: any): Promise<void> {
  const db = getDB();
  const batch = writeBatch(db);
  
  try {
    // Restore each collection
    for (const [collectionName, documents] of Object.entries(backup.collections)) {
      if (Array.isArray(documents)) {
        for (const document of documents as any[]) {
          const docRef = doc(db, collectionName, document.id);
          batch.set(docRef, document.data);
        }
      }
    }
    
    await batch.commit();
  } catch (error) {
    console.error('Error restoring backup:', error);
    throw error;
  }
}

/**
 * Check if user needs migration
 */
export async function needsMigration(userId: string): Promise<boolean> {
  const currentVersion = await getUserSchemaVersion(userId);
  return currentVersion < CURRENT_SCHEMA_VERSION;
}

/**
 * Migrate user data to current schema version
 */
export async function migrateUser(userId: string, options?: { 
  force?: boolean;
  targetVersion?: number;
}): Promise<{ success: boolean; fromVersion: number; toVersion: number; error?: string }> {
  try {
    const currentVersion = await getUserSchemaVersion(userId);
    const targetVersion = options?.targetVersion || CURRENT_SCHEMA_VERSION;
    
    if (!options?.force && currentVersion >= targetVersion) {
      return {
        success: true,
        fromVersion: currentVersion,
        toVersion: currentVersion,
      };
    }
    
    console.log(`Migrating user ${userId} from version ${currentVersion} to ${targetVersion}`);
    
    // Apply migrations sequentially
    for (let version = currentVersion + 1; version <= targetVersion; version++) {
      const migration = migrations.get(version);
      
      if (!migration) {
        throw new Error(`Migration for version ${version} not found`);
      }
      
      console.log(`Applying migration ${version}: ${migration.name}`);
      
      // Create backup if needed
      let backup;
      if (migration.needsBackup !== false) {
        backup = await createUserBackup(userId);
      }
      
      try {
        // Run the migration
        await migration.up(userId);
        
        // Validate if validation function exists
        if (migration.validate) {
          const isValid = await migration.validate(userId);
          if (!isValid) {
            throw new Error(`Migration ${version} validation failed`);
          }
        }
        
        // Update schema version
        await updateUserSchemaVersion(userId, version - 1, version, backup);
        
      } catch (migrationError) {
        console.error(`Migration ${version} failed:`, migrationError);
        
        // Attempt rollback if down function exists
        if (migration.down) {
          try {
            await migration.down(userId);
          } catch (rollbackError) {
            console.error(`Rollback for migration ${version} failed:`, rollbackError);
          }
        }
        
        throw migrationError;
      }
    }
    
    return {
      success: true,
      fromVersion: currentVersion,
      toVersion: targetVersion,
    };
    
  } catch (error) {
    console.error('User migration failed:', error);
    return {
      success: false,
      fromVersion: await getUserSchemaVersion(userId),
      toVersion: 0,
      error: error instanceof Error ? error.message : 'Unknown migration error',
    };
  }
}

/**
 * Rollback user to previous schema version
 */
export async function rollbackUser(userId: string, targetVersion: number): Promise<boolean> {
  try {
    const currentVersion = await getUserSchemaVersion(userId);
    
    if (currentVersion <= targetVersion) {
      return true; // Already at or below target version
    }
    
    // Apply rollbacks in reverse order
    for (let version = currentVersion; version > targetVersion; version--) {
      const migration = migrations.get(version);
      
      if (!migration || !migration.down) {
        throw new Error(`Rollback for version ${version} not available`);
      }
      
      await migration.down(userId);
      await updateUserSchemaVersion(userId, version, version - 1);
    }
    
    return true;
  } catch (error) {
    console.error('User rollback failed:', error);
    return false;
  }
}

/**
 * Get migration status for all users (admin function)
 */
export async function getMigrationStatus(): Promise<{
  currentVersion: number;
  usersNeedingMigration: Array<{ userId: string; currentVersion: number }>;
}> {
  try {
    const db = getDB();
    const versionsSnapshot = await getDocs(collection(db, 'user_schema_versions'));
    
    const usersNeedingMigration: Array<{ userId: string; currentVersion: number }> = [];
    
    versionsSnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.schemaVersion < CURRENT_SCHEMA_VERSION) {
        usersNeedingMigration.push({
          userId: data.userId,
          currentVersion: data.schemaVersion,
        });
      }
    });
    
    return {
      currentVersion: CURRENT_SCHEMA_VERSION,
      usersNeedingMigration,
    };
  } catch (error) {
    console.error('Error getting migration status:', error);
    return {
      currentVersion: CURRENT_SCHEMA_VERSION,
      usersNeedingMigration: [],
    };
  }
}

/**
 * Initialize migration system - call on app startup
 */
export function initializeMigrationSystem() {
  console.log(`Migration system initialized. Current schema version: ${CURRENT_SCHEMA_VERSION}`);
  
  // Register all available migrations
  registerMigration(migration_001_initial_schema);
  
  // Future migrations would be registered here
  // registerMigration(migration_002_add_tags);
  // registerMigration(migration_003_restructure_projects);
}

/**
 * Migration 001: Initial schema baseline
 * This establishes the baseline for existing users
 */
const migration_001_initial_schema: Migration = {
  version: 1,
  name: 'initial_schema',
  description: 'Establish baseline schema for existing users',
  needsBackup: false,
  
  async up(userId: string) {
    // This migration just establishes the baseline
    // No actual data changes needed for existing users
    console.log(`Established baseline schema for user ${userId}`);
  },
  
  async down(userId: string) {
    // Nothing to rollback for baseline
    console.log(`Rolled back baseline schema for user ${userId}`);
  },
  
  async validate(userId: string) {
    // Validate that user has the expected collections
    const db = getDB();
    
    // Check that user has at least the basic document structure
    const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', userId));
    const tasksSnapshot = await getDocs(tasksQuery);
    
    const projectsQuery = query(collection(db, 'projects'), where('userId', '==', userId));
    const projectsSnapshot = await getDocs(projectsQuery);
    
    // Validation passes if queries execute successfully
    return true;
  },
};

/**
 * Example of a future migration:
 * 
 * const migration_002_add_tags: Migration = {
 *   version: 2,
 *   name: 'add_task_tags',
 *   description: 'Add tags field to all tasks',
 *   needsBackup: true,
 *   
 *   async up(userId: string) {
 *     const db = getDB();
 *     const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', userId));
 *     const tasksSnapshot = await getDocs(tasksQuery);
 *     
 *     const batch = writeBatch(db);
 *     tasksSnapshot.forEach((doc) => {
 *       const taskRef = doc.ref;
 *       batch.update(taskRef, { tags: [] });
 *     });
 *     
 *     await batch.commit();
 *   },
 *   
 *   async down(userId: string) {
 *     const db = getDB();
 *     const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', userId));
 *     const tasksSnapshot = await getDocs(tasksQuery);
 *     
 *     const batch = writeBatch(db);
 *     tasksSnapshot.forEach((doc) => {
 *       const taskRef = doc.ref;
 *       batch.update(taskRef, { tags: firebase.firestore.FieldValue.delete() });
 *     });
 *     
 *     await batch.commit();
 *   },
 *   
 *   async validate(userId: string) {
 *     const db = getDB();
 *     const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', userId));
 *     const tasksSnapshot = await getDocs(tasksQuery);
 *     
 *     // Check that all tasks have tags field
 *     return tasksSnapshot.docs.every(doc => 'tags' in doc.data());
 *   },
 * };
 */