import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, Trash2, Star, X, FolderOpen } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Project {
  id: string;
  name: string;
}

interface BulkActionToolbarProps {
  selectedCount: number;
  onMarkDone: () => void;
  onDelete: () => void;
  onChangeProject: (projectId: string) => void;
  onSetFocus: (focus: boolean) => void;
  onClearSelection: () => void;
  onSchedule?: (field: 'plannedFor' | 'deadline') => void;
  projects: Project[];
}

const BulkActionToolbar: React.FC<BulkActionToolbarProps> = ({
  selectedCount,
  onMarkDone,
  onDelete,
  onChangeProject,
  onSetFocus,
  onClearSelection,
  onSchedule,
  projects,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    onDelete();
    setShowDeleteConfirm(false);
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 mt-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-blue-800">
            {selectedCount} task{selectedCount !== 1 ? 's' : ''} selected
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {onSchedule && <>
            <Button variant="outline" size="sm" onClick={() => onSchedule('plannedFor')}>Plan work</Button>
            <Button variant="outline" size="sm" onClick={() => onSchedule('deadline')}>Set deadline</Button>
          </>}
          <Button
            variant="outline"
            size="sm"
            onClick={onMarkDone}
            className="text-green-600 hover:text-green-700 hover:bg-green-50"
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Mark Done
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <FolderOpen className="w-4 h-4 mr-1" />
                Move to Project
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onChangeProject('')}>Inbox (no project)</DropdownMenuItem>
              {projects.map((project) => (
                <DropdownMenuItem
                  key={project.id}
                  onClick={() => onChangeProject(project.id)}
                >
                  {project.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Star className="w-4 h-4 mr-1" />
                Stars
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onSetFocus(true)}>
                <Star className="w-4 h-4 mr-2 text-yellow-500" fill="currentColor" />
                Star tasks
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onSetFocus(false)}>
                <Star className="w-4 h-4 mr-2 text-gray-400" />
                Unstar tasks
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="outline"
            size="sm"
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSelection}
            aria-label="Clear selection"
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} task{selectedCount !== 1 ? 's' : ''}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The selected tasks will be permanently deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default BulkActionToolbar;
