"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { Toast } from "@/components/ui/toast"
import { Toast as ToastType } from "@/types/toast"
import { cn } from "@/lib/utils"

interface ToastContainerProps {
  toasts: (ToastType & { id: string })[]
  onDismiss: (id: string) => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
  className?: string
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onDismiss,
  position = 'top-right',
  className
}) => {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || toasts.length === 0) {
    return null
  }

  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  }

  const containerContent = (
    <div
      className={cn(
        "fixed z-50 flex flex-col space-y-2 w-full max-w-sm",
        positionClasses[position],
        className
      )}
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          className="transform transition-all duration-300 ease-in-out"
        />
      ))}
    </div>
  )

  return createPortal(containerContent, document.body)
}