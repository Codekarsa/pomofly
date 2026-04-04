"use client"

import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Toast as ToastType, ToastAction } from "@/types/toast"

const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  {
    variants: {
      variant: {
        success: "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-900 dark:text-green-100",
        error: "border-red-200 bg-red-50 text-red-900 dark:border-red-800 dark:bg-red-900 dark:text-red-100",
        warning: "border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-900 dark:text-yellow-100",
        info: "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-900 dark:text-blue-100",
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
)

const getIcon = (type: ToastType) => {
  const iconClass = "h-5 w-5 flex-shrink-0"
  switch (type) {
    case 'success':
      return <CheckCircle className={cn(iconClass, "text-green-600")} />
    case 'error':
      return <AlertCircle className={cn(iconClass, "text-red-600")} />
    case 'warning':
      return <AlertTriangle className={cn(iconClass, "text-yellow-600")} />
    case 'info':
      return <Info className={cn(iconClass, "text-blue-600")} />
    default:
      return <Info className={cn(iconClass, "text-blue-600")} />
  }
}

interface ToastProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof toastVariants> {
  toast: ToastType & { id: string }
  onDismiss: (id: string) => void
}

const Toast = React.forwardRef<HTMLDivElement, ToastProps>(
  ({ className, variant, toast, onDismiss, ...props }, ref) => {
    const Icon = getIcon(toast.type)

    React.useEffect(() => {
      if (!toast.persistent && toast.duration !== 0) {
        const duration = toast.duration || 5000
        const timer = setTimeout(() => {
          onDismiss(toast.id)
        }, duration)

        return () => clearTimeout(timer)
      }
    }, [toast.id, toast.duration, toast.persistent, onDismiss])

    return (
      <div
        ref={ref}
        className={cn(toastVariants({ variant: toast.type }), className)}
        role="alert"
        aria-live="polite"
        aria-atomic="true"
        {...props}
      >
        <div className="flex items-start space-x-3">
          {Icon}
          <div className="flex-1 space-y-1">
            {toast.title && (
              <div className="text-sm font-medium">
                {toast.title}
              </div>
            )}
            <div className="text-sm opacity-90">
              {toast.message}
            </div>
            {toast.actions && toast.actions.length > 0 && (
              <div className="flex space-x-2 mt-2">
                {toast.actions.map((action, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={action.onClick}
                    className="h-8 text-xs"
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-2 top-2 h-6 w-6 p-0 hover:bg-black/10"
          onClick={() => onDismiss(toast.id)}
          aria-label="Close notification"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    )
  }
)
Toast.displayName = "Toast"

export { Toast, toastVariants }