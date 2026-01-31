'use client'
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Upload, Trash2, Loader2 } from 'lucide-react';
import { getGuestTasks, getGuestProjects, clearGuestData } from '@/lib/guestStorage';
import { collection, addDoc } from "firebase/firestore";
import { db, auth } from '@/lib/firebase';

interface DataMigrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskCount: number;
  projectCount: number;
}

const DataMigrationModal: React.FC<DataMigrationModalProps> = ({
  isOpen,
  onClose,
  taskCount,
  projectCount
}) => {
  const [isImporting, setIsImporting] = useState(false);

  const handleImport = async () => {
    const user = auth.currentUser;
    if (!user) return;

    setIsImporting(true);
    try {
      const guestTasks = getGuestTasks();
      const guestProjects = getGuestProjects();

      // Create a mapping from old guest project IDs to new Firebase IDs
      const projectIdMap: Record<string, string> = {};

      // Import projects first
      for (const project of guestProjects) {
        const newProject = {
          name: project.name,
          userId: user.uid,
          createdAt: project.createdAt,
        };
        const docRef = await addDoc(collection(db, "projects"), newProject);
        projectIdMap[project.id] = docRef.id;
      }

      // Import tasks with updated project IDs
      for (const task of guestTasks) {
        const newTask = {
          title: task.title,
          projectId: projectIdMap[task.projectId] || task.projectId,
          userId: user.uid,
          completed: task.completed,
          totalPomodoroSessions: task.totalPomodoroSessions,
          totalTimeSpent: task.totalTimeSpent,
          createdAt: task.createdAt,
          estimatedPomodoros: task.estimatedPomodoros,
          focus: task.focus,
          deadline: task.deadline,
          manualTimeSpent: task.manualTimeSpent,
          trackingStartedAt: null, // Reset tracking on import
        };
        await addDoc(collection(db, "tasks"), newTask);
      }

      // Clear guest data after successful import
      clearGuestData();
      onClose();
    } catch (error) {
      console.error("Error importing data:", error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleSkip = () => {
    clearGuestData();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Import your local data?</DialogTitle>
          <DialogDescription>
            We found data from your guest session. Would you like to import it to your account?
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tasks</span>
              <span className="font-medium">{taskCount}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Projects</span>
              <span className="font-medium">{projectCount}</span>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isImporting}
            className="flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Start fresh
          </Button>
          <Button
            onClick={handleImport}
            disabled={isImporting}
            className="flex items-center gap-2"
          >
            {isImporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Import data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default DataMigrationModal;
