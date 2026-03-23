import React, { useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { LogOut, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/app/contexts/AuthContext';

interface SignOutConfirmationProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const SignOutConfirmation: React.FC<SignOutConfirmationProps> = ({
  children,
  className,
  variant = 'ghost',
  size = 'default',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnsavedWork, setHasUnsavedWork] = useState(false);
  const { signOut, isSigningOut } = useAuth();

  const checkUnsavedWork = () => {
    // Check for offline queue
    const hasQueue = localStorage.getItem('pomofly_offline_queue');
    
    // Check for any pending timers or work
    const activeTimers = localStorage.getItem('pomofly_active_timers');
    
    setHasUnsavedWork(!!(hasQueue || activeTimers));
    setIsOpen(true);
  };

  const handleSignOut = async () => {
    try {
      await signOut(false); // Skip built-in confirmation since we're handling it here
      setIsOpen(false);
    } catch (error) {
      console.error('Sign out failed:', error);
      // Keep dialog open so user can try again
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={checkUnsavedWork}
        disabled={isSigningOut}
      >
        {children || (
          <>
            <LogOut className="w-4 h-4 mr-2" />
            {isSigningOut ? 'Signing out...' : 'Sign Out'}
          </>
        )}
      </Button>

      <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {hasUnsavedWork && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
              Confirm Sign Out
            </AlertDialogTitle>
            <AlertDialogDescription>
              {hasUnsavedWork ? (
                <>
                  <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-yellow-800 font-medium mb-1">
                      ⚠️ You have unsaved changes
                    </p>
                    <p className="text-yellow-700 text-sm">
                      You have pending operations or active work that will be lost if you sign out.
                    </p>
                  </div>
                  <p>Are you sure you want to sign out? Any unsaved work will be lost.</p>
                </>
              ) : (
                'Are you sure you want to sign out?'
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              className={hasUnsavedWork ? 'bg-red-600 hover:bg-red-700' : ''}
              disabled={isSigningOut}
            >
              {isSigningOut ? 'Signing out...' : 'Sign Out'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SignOutConfirmation;