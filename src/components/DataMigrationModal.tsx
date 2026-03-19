'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Upload,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Info,
  ArrowRight,
  X,
  RefreshCw,
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  getGuestTasks,
  getGuestProjects,
  clearGuestData,
} from '@/lib/guestStorage';
import { collection, addDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';

interface DataMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskCount: number;
  projectCount: number;
}

type MigrationStep =
  | 'preview'
  | 'importing'
  | 'success'
  | 'error'
  | 'confirm-skip';

interface MigrationProgress {
  step: string;
  completed: number;
  total: number;
}

interface MigrationError {
  type: 'import' | 'network' | 'auth' | 'unknown';
  message: string;
  details?: string;
}

const DataMigrationModal: React.FC<DataMigrationModalProps> = ({
  isOpen,
  onClose,
  taskCount,
  projectCount,
}) => {
  const [currentStep, setCurrentStep] = useState<MigrationStep>('preview');
  const [progress, setProgress] = useState<MigrationProgress>({
    step: '',
    completed: 0,
    total: 0,
  });
  const [error, setError] = useState<MigrationError | null>(null);
  const [guestDataPreview, setGuestDataPreview] = useState<{
    tasks: any[];
    projects: any[];
  }>({ tasks: [], projects: [] });

  // Load guest data preview when modal opens
  useEffect(() => {
    if (isOpen) {
      const tasks = getGuestTasks();
      const projects = getGuestProjects();
      setGuestDataPreview({ tasks, projects });
      setCurrentStep('preview');
      setError(null);
    }
  }, [isOpen]);

  const resetModal = () => {
    setCurrentStep('preview');
    setProgress({ step: '', completed: 0, total: 0 });
    setError(null);
  };

  const handleImport = async () => {
    const user = auth.currentUser;
    if (!user) {
      setError({
        type: 'auth',
        message: 'Authentication Error',
        details:
          'You must be signed in to import data. Please refresh the page and try again.',
      });
      return;
    }

    setCurrentStep('importing');
    setError(null);

    try {
      const guestTasks = getGuestTasks();
      const guestProjects = getGuestProjects();
      const totalSteps = guestProjects.length + guestTasks.length + 1; // +1 for cleanup

      // Create a mapping from old guest project IDs to new Firebase IDs
      const projectIdMap: Record<string, string> = {};

      // Step 1: Import projects
      setProgress({
        step: 'Importing projects...',
        completed: 0,
        total: totalSteps,
      });

      for (let i = 0; i < guestProjects.length; i++) {
        const project = guestProjects[i];
        try {
          const newProject = {
            name: project.name,
            userId: user.uid,
            createdAt: project.createdAt,
          };
          const docRef = await addDoc(collection(db, 'projects'), newProject);
          projectIdMap[project.id] = docRef.id;

          setProgress({
            step: `Imported project: ${project.name}`,
            completed: i + 1,
            total: totalSteps,
          });
        } catch (err) {
          throw new Error(
            `Failed to import project "${project.name}": ${(err as Error).message}`
          );
        }
      }

      // Step 2: Import tasks
      setProgress({
        step: 'Importing tasks...',
        completed: guestProjects.length,
        total: totalSteps,
      });

      for (let i = 0; i < guestTasks.length; i++) {
        const task = guestTasks[i];
        try {
          const newTask = {
            title: task.title,
            projectId: projectIdMap[task.projectId] || task.projectId,
            userId: user.uid,
            completed: task.completed,
            totalPomodoroSessions: task.totalPomodoroSessions || 0,
            totalTimeSpent: task.totalTimeSpent || 0,
            createdAt: task.createdAt,
            estimatedPomodoros: task.estimatedPomodoros || 1,
            focus: task.focus || false,
            deadline: task.deadline || null,
            manualTimeSpent: task.manualTimeSpent || 0,
            trackingStartedAt: null, // Reset tracking on import
          };
          await addDoc(collection(db, 'tasks'), newTask);

          setProgress({
            step: `Imported task: ${task.title}`,
            completed: guestProjects.length + i + 1,
            total: totalSteps,
          });
        } catch (err) {
          throw new Error(
            `Failed to import task "${task.title}": ${(err as Error).message}`
          );
        }
      }

      // Step 3: Clean up guest data
      setProgress({
        step: 'Cleaning up local data...',
        completed: totalSteps - 1,
        total: totalSteps,
      });

      clearGuestData();

      setProgress({
        step: 'Import completed successfully!',
        completed: totalSteps,
        total: totalSteps,
      });

      setCurrentStep('success');
    } catch (err) {
      console.error('Error importing data:', err);

      let errorType: MigrationError['type'] = 'unknown';
      let errorMessage = 'An unexpected error occurred during import.';
      let errorDetails = (err as Error).message;

      if (errorDetails.includes('network') || errorDetails.includes('fetch')) {
        errorType = 'network';
        errorMessage = 'Network connection error occurred during import.';
      } else if (
        errorDetails.includes('auth') ||
        errorDetails.includes('permission')
      ) {
        errorType = 'auth';
        errorMessage = 'Authentication error occurred during import.';
      } else if (errorDetails.includes('Failed to import')) {
        errorType = 'import';
        errorMessage = 'Some data could not be imported.';
      }

      setError({
        type: errorType,
        message: errorMessage,
        details: errorDetails,
      });
      setCurrentStep('error');
    }
  };

  const handleSkip = () => {
    setCurrentStep('confirm-skip');
  };

  const handleConfirmSkip = () => {
    clearGuestData();
    onClose();
  };

  const handleRetry = () => {
    resetModal();
    handleImport();
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const renderContent = () => {
    switch (currentStep) {
      case 'preview':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-blue-500" />
                Import your local data?
              </DialogTitle>
              <DialogDescription>
                We found data from your guest session. Review what will be
                imported to your account.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Data Summary */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <h4 className="mb-3 font-medium text-blue-900">Data Summary</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {taskCount}
                    </div>
                    <div className="text-sm text-blue-700">Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {projectCount}
                    </div>
                    <div className="text-sm text-blue-700">Projects</div>
                  </div>
                </div>
              </div>

              {/* Data Preview */}
              {guestDataPreview.projects.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Projects to import:
                  </h4>
                  <div className="flex flex-wrap gap-1">
                    {guestDataPreview.projects.slice(0, 3).map((project, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {project.name}
                      </Badge>
                    ))}
                    {guestDataPreview.projects.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{guestDataPreview.projects.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {guestDataPreview.tasks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">
                    Recent tasks:
                  </h4>
                  <div className="space-y-1">
                    {guestDataPreview.tasks.slice(0, 3).map((task, i) => (
                      <div key={i} className="truncate text-xs text-gray-600">
                        • {task.title}
                      </div>
                    ))}
                    {guestDataPreview.tasks.length > 3 && (
                      <div className="text-xs text-gray-500">
                        +{guestDataPreview.tasks.length - 3} more tasks
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>What happens during import:</strong>
                  <ul className="mt-2 space-y-1 text-xs">
                    <li>
                      • Your tasks and projects will be saved to your account
                    </li>
                    <li>• Time tracking data will be preserved</li>
                    <li>
                      • Local data will be automatically removed after import
                    </li>
                    <li>• You can continue where you left off</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={handleSkip}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Start fresh instead
              </Button>
              <Button
                onClick={handleImport}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Import data
                <ArrowRight className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </>
        );

      case 'importing':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                Importing your data...
              </DialogTitle>
              <DialogDescription>
                Please wait while we import your tasks and projects. This may
                take a moment.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{progress.step}</span>
                  <span className="text-gray-500">
                    {progress.completed}/{progress.total}
                  </span>
                </div>
                <Progress
                  value={(progress.completed / progress.total) * 100}
                  className="h-2"
                />
              </div>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Please keep this window open while the import is in progress.
                </AlertDescription>
              </Alert>
            </div>
          </>
        );

      case 'success':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Import completed successfully!
              </DialogTitle>
              <DialogDescription>
                Your tasks and projects have been imported to your account.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  <strong>Success!</strong> Imported {taskCount} tasks and{' '}
                  {projectCount} projects. Your local data has been cleared.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button onClick={handleClose} className="w-full">
                Get started
              </Button>
            </DialogFooter>
          </>
        );

      case 'error':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-5 w-5" />
                Import failed
              </DialogTitle>
              <DialogDescription>
                We encountered an error while importing your data.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Alert className="border-red-200 bg-red-50">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>{error?.message}</strong>
                  {error?.details && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs">
                        Technical details
                      </summary>
                      <p className="mt-1 text-xs text-red-700">
                        {error.details}
                      </p>
                    </details>
                  )}
                </AlertDescription>
              </Alert>

              <div className="mt-4 space-y-2 rounded border bg-gray-50 p-3 text-sm">
                <p className="font-medium">What you can do:</p>
                <ul className="space-y-1 text-xs text-gray-600">
                  <li>
                    • Try the import again (your data is still safe locally)
                  </li>
                  <li>• Check your internet connection</li>
                  <li>• Start fresh and manually re-create important items</li>
                  <li>• Contact support if the problem persists</li>
                </ul>
              </div>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={handleSkip}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Start fresh
              </Button>
              <Button onClick={handleRetry} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Try again
              </Button>
            </DialogFooter>
          </>
        );

      case 'confirm-skip':
        return (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-orange-600">
                <AlertCircle className="h-5 w-5" />
                Start fresh?
              </DialogTitle>
              <DialogDescription>
                This will permanently delete your local tasks and projects. This
                action cannot be undone.
              </DialogDescription>
            </DialogHeader>

            <div className="py-4">
              <Alert className="border-orange-200 bg-orange-50">
                <AlertCircle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  <strong>Warning:</strong> You will lose {taskCount} tasks and{' '}
                  {projectCount} projects. Consider importing your data instead.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('preview')}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Cancel
              </Button>
              <Button
                onClick={handleConfirmSkip}
                variant="destructive"
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete data and start fresh
              </Button>
            </DialogFooter>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={currentStep === 'importing' ? undefined : handleClose}
    >
      <DialogContent className="sm:max-w-md">{renderContent()}</DialogContent>
    </Dialog>
  );
};

export default DataMigrationModal;
