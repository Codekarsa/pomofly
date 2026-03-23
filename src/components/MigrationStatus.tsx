'use client';

import React from 'react';
import { User } from 'firebase/auth';
import { useMigrations } from '../hooks/useMigrations';
import { Button } from './ui/button';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { 
  AlertTriangle, 
  CheckCircle, 
  Database, 
  RefreshCw, 
  Loader2,
  ArrowRight,
  Shield 
} from 'lucide-react';

interface MigrationStatusProps {
  user: User | null;
  className?: string;
}

export function MigrationStatus({ user, className }: MigrationStatusProps) {
  const [migrationState, { checkMigration, runMigration, dismissError }] = useMigrations(user);

  if (!user) {
    return null; // Don't show migration status for guests
  }

  // If migration is completed and no errors, don't show anything
  if (migrationState.completed && !migrationState.error && !migrationState.needsMigration) {
    return null;
  }

  // Show error state
  if (migrationState.error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Migration Error</AlertTitle>
        <AlertDescription className="mt-2">
          {migrationState.error}
          <div className="mt-3 flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={dismissError}
            >
              Dismiss
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={checkMigration}
              disabled={migrationState.isChecking}
            >
              {migrationState.isChecking ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Retry
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // Show checking state
  if (migrationState.isChecking) {
    return (
      <Alert className={className}>
        <Loader2 className="h-4 w-4 animate-spin" />
        <AlertTitle>Checking Schema Version</AlertTitle>
        <AlertDescription>
          Verifying your data structure compatibility...
        </AlertDescription>
      </Alert>
    );
  }

  // Show migration needed state
  if (migrationState.needsMigration) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Data Migration Required
          </CardTitle>
          <CardDescription>
            Your account data needs to be updated to the latest format to ensure compatibility and unlock new features.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Current Version:</span>
            <Badge variant="outline">{migrationState.currentVersion}</Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Target Version:</span>
            <Badge variant="default">{migrationState.targetVersion}</Badge>
          </div>

          {migrationState.isRunning && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Running migration...</span>
              </div>
              <Progress value={50} className="w-full" />
              {migrationState.progress && (
                <div className="flex items-center justify-center text-xs text-muted-foreground">
                  Version {migrationState.progress.fromVersion}
                  <ArrowRight className="h-3 w-3 mx-2" />
                  Version {migrationState.progress.toVersion}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Button 
              onClick={runMigration}
              disabled={migrationState.isRunning}
              className="w-full"
            >
              {migrationState.isRunning ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Migrating Data...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Update Data Structure
                </>
              )}
            </Button>
            
            <Alert>
              <Shield className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Safe Migration:</strong> Your data will be backed up before any changes are made. 
                The migration is fully reversible and tested.
              </AlertDescription>
            </Alert>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show migration completed state (temporary success message)
  if (migrationState.completed && migrationState.progress) {
    return (
      <Alert className={`${className} border-green-200 bg-green-50`}>
        <CheckCircle className="h-4 w-4 text-green-600" />
        <AlertTitle className="text-green-800">Migration Completed Successfully</AlertTitle>
        <AlertDescription className="text-green-700">
          Your data has been updated from version {migrationState.progress.fromVersion} to {migrationState.progress.toVersion}. 
          All new features are now available!
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

/**
 * Compact migration status indicator for the app header/navbar
 */
export function MigrationStatusBadge({ user }: { user: User | null }) {
  const [migrationState] = useMigrations(user);

  if (!user || !migrationState.needsMigration) {
    return null;
  }

  return (
    <Badge 
      variant="outline" 
      className="border-amber-300 text-amber-800 bg-amber-50"
    >
      <Database className="h-3 w-3 mr-1" />
      Migration Required
    </Badge>
  );
}

/**
 * Admin component for monitoring migration status across all users
 * This would typically be used in an admin dashboard
 */
export function AdminMigrationStatus() {
  const { migrationStatus, loading, error, reload } = useAdminMigrations();

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading Migration Status
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Migration Status</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Migration Status
          </span>
          <Button variant="outline" size="sm" onClick={reload}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
        <CardDescription>
          Current schema version: {migrationStatus?.currentVersion}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {migrationStatus?.usersNeedingMigration.length === 0 ? (
          <div className="flex items-center gap-2 text-green-600">
            <CheckCircle className="h-4 w-4" />
            All users are up to date
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              {migrationStatus?.usersNeedingMigration.length} users need migration:
            </p>
            <div className="max-h-32 overflow-y-auto space-y-1">
              {migrationStatus?.usersNeedingMigration.map((user) => (
                <div key={user.userId} className="text-xs bg-muted p-2 rounded">
                  <code>{user.userId}</code> (v{user.currentVersion})
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Re-export the hook for admin usage
import { useAdminMigrations } from '../hooks/useMigrations';