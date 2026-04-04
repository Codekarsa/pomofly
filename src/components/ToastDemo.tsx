"use client"

import React from 'react'
import { Button } from '@/components/ui/button'
import { useToast, useToastActions } from '@/app/contexts/ToastContext'

export const ToastDemo: React.FC = () => {
  const { showToast, dismissAll } = useToast()
  const { showSuccess, showError, showWarning, showInfo } = useToastActions()

  const handleComplexToast = () => {
    showToast({
      type: 'warning',
      title: 'Unsaved Changes',
      message: 'You have unsaved changes. What would you like to do?',
      persistent: true,
      actions: [
        {
          label: 'Save',
          onClick: () => {
            showSuccess('Changes saved successfully!')
          }
        },
        {
          label: 'Discard',
          onClick: () => {
            showInfo('Changes discarded')
          }
        }
      ]
    })
  }

  const handleProgressToast = () => {
    showInfo('Starting backup process...', { duration: 2000 })
    
    setTimeout(() => {
      showInfo('Backup 50% complete...', { duration: 2000 })
    }, 2000)
    
    setTimeout(() => {
      showSuccess('Backup completed successfully!', {
        actions: [
          {
            label: 'View Details',
            onClick: () => showInfo('Backup saved to cloud storage')
          }
        ]
      })
    }, 4000)
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-lg border">
      <h3 className="text-lg font-semibold mb-4">Toast Notification Demo</h3>
      
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button onClick={() => showSuccess('Task completed successfully!')}>
          Success Toast
        </Button>
        
        <Button onClick={() => showError('Failed to save task. Please try again.')}>
          Error Toast
        </Button>
        
        <Button onClick={() => showWarning('This action cannot be undone.')}>
          Warning Toast
        </Button>
        
        <Button onClick={() => showInfo('Timer session completed. Time for a break!')}>
          Info Toast
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4">
        <Button onClick={handleComplexToast} variant="outline">
          Complex Toast with Actions
        </Button>
        
        <Button onClick={handleProgressToast} variant="outline">
          Progress Simulation
        </Button>
        
        <Button 
          onClick={() => showError('This is a persistent error message', { persistent: true })}
          variant="outline"
        >
          Persistent Toast
        </Button>
      </div>

      <Button onClick={dismissAll} variant="destructive" className="w-full">
        Dismiss All Toasts
      </Button>
    </div>
  )
}