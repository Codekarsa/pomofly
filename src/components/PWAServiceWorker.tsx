'use client';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Download } from 'lucide-react';

interface PWAServiceWorkerProps {
  onUpdate?: () => void;
  onInstall?: () => void;
}

const PWAServiceWorker: React.FC<PWAServiceWorkerProps> = ({
  onUpdate,
  onInstall,
}) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    if (
      window.matchMedia &&
      window.matchMedia('(display-mode: standalone)').matches
    ) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
    };
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');

      console.log('[PWA] Service Worker registered:', registration);

      // Listen for updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;

        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              console.log('[PWA] Update available');
              setUpdateAvailable(true);
              onUpdate?.();
            }
          });
        }
      });

      // Check for updates
      registration.update();
    } catch (error) {
      console.error('[PWA] Service Worker registration failed:', error);
    }
  };

  const handleUpdate = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration?.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      });
    }
  };

  const handleInstall = async () => {
    if (installPrompt) {
      try {
        const result = await installPrompt.prompt();
        console.log('[PWA] Install prompt result:', result);

        if (result.outcome === 'accepted') {
          setIsInstallable(false);
          setIsInstalled(true);
          onInstall?.();
        }

        setInstallPrompt(null);
      } catch (error) {
        console.error('[PWA] Install prompt failed:', error);
      }
    }
  };

  if (isInstalled || (!updateAvailable && !isInstallable)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm">
      {updateAvailable && (
        <Alert className="mb-4 border-blue-200 bg-blue-50">
          <RefreshCw className="h-4 w-4" />
          <AlertDescription className="text-blue-800">
            A new version of Pomofly is available.
            <Button
              variant="link"
              className="ml-2 h-auto p-0 text-blue-600"
              onClick={handleUpdate}
            >
              Update now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {isInstallable && (
        <Alert className="border-green-200 bg-green-50">
          <Download className="h-4 w-4" />
          <AlertDescription className="text-green-800">
            Install Pomofly for a better experience.
            <Button
              variant="link"
              className="ml-2 h-auto p-0 text-green-600"
              onClick={handleInstall}
            >
              Install app
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default PWAServiceWorker;

// Hook for PWA utilities
export const usePWA = () => {
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    // Check if installed
    const checkInstalled = () => {
      return (
        window.matchMedia &&
        window.matchMedia('(display-mode: standalone)').matches
      );
    };

    setIsInstalled(checkInstalled());

    // Listen for online/offline status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getInstallationStatus = () => {
    if (isInstalled) return 'installed';
    if (isInstallable) return 'installable';
    return 'not-installable';
  };

  return {
    isInstalled,
    isInstallable,
    isOnline,
    installationStatus: getInstallationStatus(),
  };
};
