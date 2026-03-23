/**
 * Tests for the database schema migration system
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  getUserSchemaVersion,
  needsMigration,
  migrateUser,
  rollbackUser,
  registerMigration,
  CURRENT_SCHEMA_VERSION,
  type Migration,
} from '../migrations';

// Mock Firebase
jest.mock('../firebase', () => ({
  getDB: jest.fn(),
}));

// Mock Firestore functions
const mockFirestore = {
  doc: jest.fn(),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: jest.fn(),
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  getDocs: jest.fn(),
  writeBatch: jest.fn(),
  runTransaction: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
  },
};

jest.mock('firebase/firestore', () => mockFirestore);

describe('Migration System', () => {
  const testUserId = 'test-user-123';
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset mocks
    mockFirestore.getDoc.mockClear();
    mockFirestore.setDoc.mockClear();
    mockFirestore.updateDoc.mockClear();
    mockFirestore.runTransaction.mockClear();
  });

  describe('getUserSchemaVersion', () => {
    it('should return 0 for new users without version document', async () => {
      // Mock document not existing
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => false,
      });
      
      mockFirestore.doc.mockReturnValue('mock-doc-ref');

      const version = await getUserSchemaVersion(testUserId);
      
      expect(version).toBe(0);
      expect(mockFirestore.setDoc).toHaveBeenCalledWith(
        'mock-doc-ref',
        expect.objectContaining({
          userId: testUserId,
          schemaVersion: 0,
          migrationHistory: [],
        })
      );
    });

    it('should return stored version for existing users', async () => {
      // Mock document existing with version 2
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ schemaVersion: 2 }),
      });
      
      mockFirestore.doc.mockReturnValue('mock-doc-ref');

      const version = await getUserSchemaVersion(testUserId);
      
      expect(version).toBe(2);
      expect(mockFirestore.setDoc).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully and return 0', async () => {
      // Mock database error
      mockFirestore.getDoc.mockRejectedValue(new Error('Database error'));
      
      const version = await getUserSchemaVersion(testUserId);
      
      expect(version).toBe(0);
    });
  });

  describe('needsMigration', () => {
    it('should return true when user version is below current', async () => {
      // Mock user at version 0, current is 1
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ schemaVersion: 0 }),
      });

      const needs = await needsMigration(testUserId);
      
      expect(needs).toBe(true);
    });

    it('should return false when user is at current version', async () => {
      // Mock user at current version
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ schemaVersion: CURRENT_SCHEMA_VERSION }),
      });

      const needs = await needsMigration(testUserId);
      
      expect(needs).toBe(false);
    });
  });

  describe('Migration Registration and Execution', () => {
    const testMigration: Migration = {
      version: 2,
      name: 'test_migration',
      description: 'Test migration for unit tests',
      up: jest.fn().mockResolvedValue(undefined),
      down: jest.fn().mockResolvedValue(undefined),
      validate: jest.fn().mockResolvedValue(true),
      needsBackup: false,
    };

    beforeEach(() => {
      // Clear migration registry
      (registerMigration as any).__registry?.clear?.();
    });

    it('should register migrations correctly', () => {
      expect(() => {
        registerMigration(testMigration);
      }).not.toThrow();
    });

    it('should prevent duplicate migration registration', () => {
      registerMigration(testMigration);
      
      expect(() => {
        registerMigration(testMigration);
      }).toThrow('Migration version 2 is already registered');
    });

    it('should run migration successfully', async () => {
      registerMigration(testMigration);
      
      // Mock user at version 1, target version 2
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ schemaVersion: 1, migrationHistory: [] }),
      });
      
      // Mock transaction
      mockFirestore.runTransaction.mockImplementation(async (db, callback) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ migrationHistory: [] }),
          }),
          update: jest.fn(),
        };
        await callback(transaction);
      });

      const result = await migrateUser(testUserId, { targetVersion: 2 });
      
      expect(result.success).toBe(true);
      expect(result.fromVersion).toBe(1);
      expect(result.toVersion).toBe(2);
      expect(testMigration.up).toHaveBeenCalledWith(testUserId);
      expect(testMigration.validate).toHaveBeenCalledWith(testUserId);
    });

    it('should handle migration failures with rollback', async () => {
      const failingMigration: Migration = {
        version: 3,
        name: 'failing_migration',
        description: 'Migration that fails',
        up: jest.fn().mockRejectedValue(new Error('Migration failed')),
        down: jest.fn().mockResolvedValue(undefined),
        needsBackup: false,
      };
      
      registerMigration(failingMigration);
      
      // Mock user at version 2
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ schemaVersion: 2 }),
      });

      const result = await migrateUser(testUserId, { targetVersion: 3 });
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Migration failed');
      expect(failingMigration.down).toHaveBeenCalledWith(testUserId);
    });

    it('should validate after migration', async () => {
      const validatingMigration: Migration = {
        version: 4,
        name: 'validating_migration',
        description: 'Migration with validation',
        up: jest.fn().mockResolvedValue(undefined),
        validate: jest.fn().mockResolvedValue(false), // Validation fails
        needsBackup: false,
      };
      
      registerMigration(validatingMigration);
      
      // Mock user at version 3
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ schemaVersion: 3 }),
      });

      const result = await migrateUser(testUserId, { targetVersion: 4 });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('validation failed');
    });
  });

  describe('Backup and Rollback', () => {
    it('should create backup before migration when needed', async () => {
      const backupMigration: Migration = {
        version: 5,
        name: 'backup_migration',
        description: 'Migration requiring backup',
        up: jest.fn().mockResolvedValue(undefined),
        needsBackup: true,
      };
      
      registerMigration(backupMigration);
      
      // Mock collections for backup
      mockFirestore.getDocs.mockResolvedValue({
        docs: [
          { id: 'task1', data: () => ({ title: 'Test Task' }) },
          { id: 'project1', data: () => ({ name: 'Test Project' }) },
        ],
      });
      
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ schemaVersion: 4, migrationHistory: [] }),
      });
      
      mockFirestore.runTransaction.mockImplementation(async (db, callback) => {
        const transaction = {
          get: jest.fn().mockResolvedValue({
            exists: () => true,
            data: () => ({ migrationHistory: [] }),
          }),
          update: jest.fn(),
        };
        await callback(transaction);
      });

      await migrateUser(testUserId, { targetVersion: 5 });
      
      // Verify backup was created
      expect(mockFirestore.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: testUserId,
          collections: expect.objectContaining({
            tasks: expect.any(Array),
            projects: expect.any(Array),
          }),
        })
      );
    });
  });

  describe('Edge Cases', () => {
    it('should handle user already at target version', async () => {
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ schemaVersion: CURRENT_SCHEMA_VERSION }),
      });

      const result = await migrateUser(testUserId);
      
      expect(result.success).toBe(true);
      expect(result.fromVersion).toBe(CURRENT_SCHEMA_VERSION);
      expect(result.toVersion).toBe(CURRENT_SCHEMA_VERSION);
    });

    it('should handle missing migration', async () => {
      mockFirestore.getDoc.mockResolvedValue({
        exists: () => true,
        data: () => ({ schemaVersion: 0 }),
      });

      // Try to migrate to version 999 which doesn't exist
      const result = await migrateUser(testUserId, { targetVersion: 999 });
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Migration for version');
    });
  });
});

describe('Migration Hook Integration', () => {
  // These tests would require React Testing Library for hook testing
  // For now, we'll test the integration points
  
  it('should initialize migration system correctly', () => {
    const { initializeMigrationSystem } = require('../migrations');
    
    expect(() => {
      initializeMigrationSystem();
    }).not.toThrow();
  });
});