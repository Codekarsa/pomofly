// Service Worker registration and management

// Extend ServiceWorkerRegistration to include Background Sync API
interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
  sync: {
    register: (tag: string) => Promise<void>;
  };
}

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log(
        'Service Worker registered successfully:',
        registration.scope
      );

      // Handle service worker updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              // New service worker is available
              console.log('New version available! Please refresh.');
              showUpdateAvailableNotification();
            }
          });
        }
      });

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'OFFLINE_READY') {
          console.log('App is ready to work offline');
        }
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  });
}

export function unregisterServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker.ready.then((registration) => {
    registration.unregister();
  });
}

function showUpdateAvailableNotification() {
  // Could integrate with a toast notification system
  if (confirm('A new version is available. Refresh to update?')) {
    window.location.reload();
  }
}

// Background sync registration
export function registerBackgroundSync(tag: string) {
  if (
    'serviceWorker' in navigator &&
    'sync' in window.ServiceWorkerRegistration.prototype
  ) {
    navigator.serviceWorker.ready.then((registration) => {
      return (registration as ServiceWorkerRegistrationWithSync).sync.register(tag);
    });
  }
}

// Check if app is running in standalone mode (installed PWA)
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  );
}

// Request persistent storage
export async function requestPersistentStorage(): Promise<boolean> {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    try {
      const isPersistent = await navigator.storage.persist();
      console.log(`Persistent storage: ${isPersistent}`);
      return isPersistent;
    } catch (error) {
      console.error('Error requesting persistent storage:', error);
      return false;
    }
  }
  return false;
}
