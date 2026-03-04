// Mock toast implementation until sonner is properly installed

interface ToastAction {
  label: string;
  onClick: () => void;
}

interface ToastOptions {
  description?: string;
  duration?: number;
  action?: ToastAction;
}

// Simple console-based toast fallback
const showToast = (type: 'error' | 'warning' | 'info' | 'success', title: string, options?: ToastOptions) => {
  console.log(`[${type.toUpperCase()}] ${title}${options?.description ? ': ' + options.description : ''}`);
  
  // For development, we can also show browser alerts for critical errors
  if (type === 'error' && typeof window !== 'undefined') {
    // Only show alert for quota exceeded errors to avoid spam
    if (title.includes('Storage Full')) {
      setTimeout(() => {
        if (confirm(`${title}: ${options?.description || ''}\n\nWould you like to sign in?`)) {
          options?.action?.onClick?.();
        }
      }, 100);
    }
  }
};

export const toast = {
  error: (title: string, options?: ToastOptions) => showToast('error', title, options),
  warning: (title: string, options?: ToastOptions) => showToast('warning', title, options),
  info: (title: string, options?: ToastOptions) => showToast('info', title, options),
  success: (title: string, options?: ToastOptions) => showToast('success', title, options),
};