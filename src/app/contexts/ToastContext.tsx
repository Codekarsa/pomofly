"use client"

import React, { createContext, useContext, useState, useCallback } from 'react'
import { Toast, ToastContextType } from '@/types/toast'
import { ToastContainer } from '@/components/ToastContainer'

const ToastContext = createContext<ToastContextType | undefined>(undefined)

let toastCounter = 0

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<(Toast & { id: string })[]>([])

  const showToast = useCallback((toastData: Omit<Toast, 'id'>): string => {
    const id = `toast-${++toastCounter}`
    const newToast = { ...toastData, id }
    
    setToasts(currentToasts => {
      // Limit to maximum 5 toasts to prevent screen overflow
      const updatedToasts = [newToast, ...currentToasts].slice(0, 5)
      return updatedToasts
    })

    return id
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts(currentToasts => {
      const toast = currentToasts.find(t => t.id === id)
      if (toast?.onDismiss) {
        toast.onDismiss()
      }
      return currentToasts.filter(t => t.id !== id)
    })
  }, [])

  const dismissAll = useCallback(() => {
    setToasts(currentToasts => {
      currentToasts.forEach(toast => {
        if (toast.onDismiss) {
          toast.onDismiss()
        }
      })
      return []
    })
  }, [])

  const contextValue: ToastContextType = {
    toasts,
    showToast,
    dismissToast,
    dismissAll,
  }

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Convenience functions for common toast types
export const useToastActions = () => {
  const { showToast } = useToast()

  const showSuccess = useCallback((message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    return showToast({ type: 'success', message, ...options })
  }, [showToast])

  const showError = useCallback((message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    return showToast({ type: 'error', message, ...options })
  }, [showToast])

  const showWarning = useCallback((message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    return showToast({ type: 'warning', message, ...options })
  }, [showToast])

  const showInfo = useCallback((message: string, options?: Partial<Omit<Toast, 'id' | 'type' | 'message'>>) => {
    return showToast({ type: 'info', message, ...options })
  }, [showToast])

  return { showSuccess, showError, showWarning, showInfo }
}