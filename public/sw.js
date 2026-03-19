// Pomofly Service Worker
const CACHE_NAME = 'pomofly-v1';
const CACHE_VERSION = 1;

// Assets to cache for offline functionality
const CORE_ASSETS = [
  '/',
  '/dashboard',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Dynamic assets that are good to cache
const CACHEABLE_ROUTES = ['/', '/dashboard', '/tasks'];

// Assets that should not be cached
const EXCLUDED_PATHS = [
  '/api/',
  '/monitoring',
  '/_next/webpack-hmr',
  '/firebase-messaging-sw.js',
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');

  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching core assets');
      return cache.addAll(
        CORE_ASSETS.map((url) => new Request(url, { cache: 'reload' }))
      );
    })
  );

  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );

  // Claim clients immediately
  return self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests and excluded paths
  if (request.method !== 'GET' || isExcludedPath(url.pathname)) {
    return;
  }

  // Handle navigation requests (pages)
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle static assets
  if (isStaticAsset(url.pathname)) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Handle API requests with network-first strategy
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Default: network-first with cache fallback
  event.respondWith(handleDefaultRequest(request));
});

// Helper function to check if path should be excluded from caching
function isExcludedPath(pathname) {
  return EXCLUDED_PATHS.some((path) => pathname.startsWith(path));
}

// Helper function to check if request is for a static asset
function isStaticAsset(pathname) {
  return (
    pathname.includes('/_next/') ||
    pathname.includes('/icons/') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg')
  );
}

// Handle navigation requests (pages) - cache-first for core routes
async function handleNavigationRequest(request) {
  const url = new URL(request.url);

  try {
    // Try cache first for known routes
    if (CACHEABLE_ROUTES.includes(url.pathname)) {
      const cached = await caches.match(request);
      if (cached) {
        // Fetch in background to update cache
        fetchAndCache(request);
        return cached;
      }
    }

    // Network-first for navigation
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful navigation responses
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Navigation network failed, trying cache:', error);

    // Try cache on network failure
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Return offline page if available, otherwise fall back to root
    const offlinePage = await caches.match('/');
    return (
      offlinePage ||
      new Response('Offline - Please check your connection', {
        status: 503,
        statusText: 'Service Unavailable',
      })
    );
  }
}

// Handle static assets - cache-first with network fallback
async function handleStaticAsset(request) {
  try {
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Static asset failed:', error);
    return new Response('Asset unavailable offline', {
      status: 503,
      statusText: 'Service Unavailable',
    });
  }
}

// Handle API requests - network-first with limited caching
async function handleApiRequest(request) {
  try {
    const networkResponse = await fetch(request);

    // Only cache GET requests with successful responses
    if (request.method === 'GET' && networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      // Cache with short TTL by cloning the response
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] API request failed, trying cache:', error);

    // Try cache for GET requests only
    if (request.method === 'GET') {
      const cached = await caches.match(request);
      if (cached) {
        return cached;
      }
    }

    // Return error for failed API requests
    return new Response(JSON.stringify({ error: 'Network unavailable' }), {
      status: 503,
      statusText: 'Service Unavailable',
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// Handle default requests - network-first
async function handleDefaultRequest(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cached = await caches.match(request);
    return (
      cached ||
      new Response('Content unavailable offline', {
        status: 503,
        statusText: 'Service Unavailable',
      })
    );
  }
}

// Background fetch and cache update
function fetchAndCache(request) {
  fetch(request)
    .then((response) => {
      if (response.ok) {
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, response);
        });
      }
    })
    .catch(() => {
      // Ignore background fetch errors
    });
}

// Handle messages from the main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        self.skipWaiting();
        break;
      case 'GET_VERSION':
        event.ports[0].postMessage({ version: CACHE_VERSION });
        break;
      case 'CLEAR_CACHE':
        caches.delete(CACHE_NAME).then(() => {
          event.ports[0].postMessage({ success: true });
        });
        break;
      default:
        console.log('[SW] Unknown message type:', event.data.type);
    }
  }
});

// Background sync for offline actions (if supported)
if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'background-sync') {
      event.waitUntil(handleBackgroundSync());
    }
  });
}

async function handleBackgroundSync() {
  try {
    // Handle any background sync tasks here
    // e.g., sync offline task data when connection is restored
    console.log('[SW] Performing background sync');
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Periodic background sync (if supported)
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'content-sync') {
      event.waitUntil(handlePeriodicSync());
    }
  });
}

async function handlePeriodicSync() {
  try {
    // Handle periodic sync tasks
    console.log('[SW] Performing periodic sync');
  } catch (error) {
    console.error('[SW] Periodic sync failed:', error);
  }
}
