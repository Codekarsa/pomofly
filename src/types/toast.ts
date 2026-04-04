export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface Toast {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number
  persistent?: boolean
  actions?: ToastAction[]
  onDismiss?: () => void
}

export interface ToastContextType {
  toasts: Toast[]
  showToast: (toast: Omit<Toast, 'id'>) => string
  dismissToast: (id: string) => void
  dismissAll: () => void
}