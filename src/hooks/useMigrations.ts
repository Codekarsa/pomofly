/**
 * React Hook for handling database schema migrations
 */

import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { 
  needsMigration, 
  migrateUser, 
  getUserSchemaVersion,
  initializeMigrationSystem,
  CURRENT_SCHEMA_VERSION 
} from '../lib/migrations';

export interface MigrationState {
  isChecking: boolean;
  needsMigration: boolean;
  isRunning: boolean;
  completed: boolean;
  error: string | null;
  currentVersion: number;
  targetVersion: number;
  progress?: {
    fromVersion: number;
    toVersion: number;
  };
}

export interface MigrationActions {
  checkMigration: () => Promise<void>;
  runMigration: () => Promise<boolean>;
  dismissError: () => void;
}

export function useMigrations(user: User | null): [MigrationState, MigrationActions] {
  const [state, setState] = useState<MigrationState>({
    isChecking: false,
    needsMigration: false,
    isRunning: false,
    completed: false,
    error: null,
    currentVersion: 0,
    targetVersion: CURRENT_SCHEMA_VERSION,
  });

  // Initialize migration system on mount
  useEffect(() => {
    initializeMigrationSystem();
  }, []);

  // Check if user needs migration when they sign in
  useEffect(() => {
    if (user) {
      checkMigration();
    } else {
      // Reset state when user signs out
      setState(prev => ({
        ...prev,
        needsMigration: false,
        completed: false,
        currentVersion: 0,
        error: null,
      }));
    }
  }, [user?.uid]);

  const checkMigration = useCallback(async () => {
    if (!user) return;

    setState(prev => ({ ...prev, isChecking: true, error: null }));

    try {
      const currentVersion = await getUserSchemaVersion(user.uid);
      const needsUpdate = await needsMigration(user.uid);

      setState(prev => ({
        ...prev,
        isChecking: false,
        needsMigration: needsUpdate,
        currentVersion,
        completed: !needsUpdate,
      }));
    } catch (error) {
      console.error('Error checking migration status:', error);
      setState(prev => ({
        ...prev,
        isChecking: false,
        error: error instanceof Error ? error.message : 'Failed to check migration status',
      }));
    }
  }, [user]);

  const runMigration = useCallback(async (): Promise<boolean> => {
    if (!user) return false;

    setState(prev => ({ ...prev, isRunning: true, error: null }));

    try {
      const result = await migrateUser(user.uid);

      if (result.success) {
        setState(prev => ({
          ...prev,
          isRunning: false,
          completed: true,
          needsMigration: false,
          currentVersion: result.toVersion,
          progress: {
            fromVersion: result.fromVersion,
            toVersion: result.toVersion,
          },
        }));
        return true;
      } else {
        setState(prev => ({
          ...prev,
          isRunning: false,
          error: result.error || 'Migration failed',
        }));
        return false;
      }
    } catch (error) {
      console.error('Migration error:', error);
      setState(prev => ({
        ...prev,
        isRunning: false,
        error: error instanceof Error ? error.message : 'Migration failed',
      }));
      return false;
    }
  }, [user]);

  const dismissError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return [
    state,
    {
      checkMigration,
      runMigration,
      dismissError,
    },
  ];
}

/**
 * Hook for admin migration monitoring (optional)
 */
export function useAdminMigrations() {
  const [migrationStatus, setMigrationStatus] = useState<{
    currentVersion: number;
    usersNeedingMigration: Array<{ userId: string; currentVersion: number }>;
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMigrationStatus = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { getMigrationStatus } = await import('../lib/migrations');
      const status = await getMigrationStatus();
      setMigrationStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load migration status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMigrationStatus();
  }, [loadMigrationStatus]);

  return {
    migrationStatus,
    loading,
    error,
    reload: loadMigrationStatus,
  };
}