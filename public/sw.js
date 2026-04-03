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
const CACHEABLE_ROUTES = [
  '/',
  '/dashboard',
  '/tasks',
];

// Assets that should not be cached
const EXCLUDED_PATHS = [
  '/api/',
  '/monitoring',
  '/_next/webpack-hmr',
  '/firebase-messaging-sw.js',
];

// Error logging utility with fallback
function logError(context, error, details = {}) {
  try {
    console.error(`[SW] ${context}:`, error, details);
  } catch (logErr) {
    // Fallback if console.error fails
    try {
      console.log(`[SW] ${context}: Error occurred`, details);
    } catch (e) {
      // Silent fallback - logging completely failed
    }
  }
}

// Safe cache operation wrapper
async function safeCacheOperation(operation, context, fallback = null) {
  try {
    return await operation();
  } catch (error) {
    logError(`Cache operation failed in ${context}`, error);
    return fallback;
  }
}

// Safe cache open with error handling
async function safeOpenCache(cacheName = CACHE_NAME) {
  try {
    return await caches.open(cacheName);
  } catch (error) {
    logError('Failed to open cache', error, { cacheName });
    return null;
  }
}

// Safe cache match with error handling
async function safeCacheMatch(request, cacheName = CACHE_NAME) {
  try {
    return await caches.match(request, { cacheName });
  } catch (error) {
    logError('Failed to match cache', error, { url: request.url });
    return null;
  }
}

// Safe cache put with error handling
async function safeCachePut(cache, request, response) {
  if (!cache || !response) return false;
  
  try {
    // Validate response before caching
    if (!response.ok && response.status !== 206) {
      return false;
    }
    
    await cache.put(request, response.clone());
    return true;
  } catch (error) {
    logError('Failed to put in cache', error, { url: request.url, status: response.status });
    return false;
  }
}

// Install event - cache core assets with error boundaries
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');
  
  event.waitUntil(
    safeCacheOperation(async () => {
      const cache = await safeOpenCache(CACHE_NAME);
      if (!cache) {
        throw new Error('Failed to open cache during install');
      }
      
      console.log('[SW] Caching core assets');
      
      // Cache assets individually to prevent complete failure on single asset error
      const cachePromises = CORE_ASSETS.map(async (url) => {
        try {
          const request = new Request(url, { cache: 'reload' });
          const response = await fetch(request);
          
          if (response.ok) {
            await safeCachePut(cache, request, response);
            console.log(`[SW] Cached: ${url}`);
          } else {
            console.warn(`[SW] Failed to fetch for cache: ${url} (${response.status})`);
          }
        } catch (error) {
          logError('Failed to cache core asset', error, { url });
        }
      });
      
      await Promise.allSettled(cachePromises);
      console.log('[SW] Core assets caching completed');
    }, 'install event', Promise.resolve())
  );
  
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches with error boundaries
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');
  
  event.waitUntil(
    safeCacheOperation(async () => {
      try {
        const cacheNames = await caches.keys();
        
        const deletePromises = cacheNames.map(async (cacheName) => {
          if (cacheName !== CACHE_NAME) {
            try {
              console.log('[SW] Deleting old cache:', cacheName);
              await caches.delete(cacheName);
              console.log('[SW] Successfully deleted cache:', cacheName);
            } catch (error) {
              logError('Failed to delete cache', error, { cacheName });
            }
          }
        });
        
        await Promise.allSettled(deletePromises);
        console.log('[SW] Cache cleanup completed');
      } catch (error) {
        logError('Failed to get cache names', error);
      }
    }, 'activate event', Promise.resolve())
  );
  
  // Claim clients immediately with error handling
  event.waitUntil(
    safeCacheOperation(async () => {
      return self.clients.claim();
    }, 'client claim', Promise.resolve())
  );
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
  return EXCLUDED_PATHS.some(path => pathname.startsWith(path));
}

// Helper function to check if request is for a static asset
function isStaticAsset(pathname) {
  return pathname.includes('/_next/') || 
         pathname.includes('/icons/') ||
         pathname.endsWith('.js') ||
         pathname.endsWith('.css') ||
         pathname.endsWith('.png') ||
         pathname.endsWith('.jpg') ||
         pathname.endsWith('.svg');
}

// Handle navigation requests (pages) - cache-first for core routes with error boundaries
async function handleNavigationRequest(request) {
  const url = new URL(request.url);
  
  try {
    // Try cache first for known routes with error handling
    if (CACHEABLE_ROUTES.includes(url.pathname)) {
      const cached = await safeCacheMatch(request);
      if (cached) {
        // Fetch in background to update cache (non-blocking)
        safeFetchAndCache(request);
        return cached;
      }
    }
    
    // Network-first for navigation with timeout
    const networkResponse = await fetchWithTimeout(request, 10000);
    
    if (networkResponse && networkResponse.ok) {
      // Cache successful navigation responses with error handling
      const cache = await safeOpenCache(CACHE_NAME);
      if (cache) {
        await safeCachePut(cache, request, networkResponse);
      }
    }
    
    return networkResponse || createOfflineResponse();
  } catch (error) {
    logError('Navigation request failed', error, { url: url.pathname });
    
    // Try cache on network failure with error handling
    const cached = await safeCacheMatch(request);
    if (cached) {
      return cached;
    }
    
    // Return offline page if available, otherwise fall back to root
    const offlinePage = await safeCacheMatch('/');
    return offlinePage || createOfflineResponse('Navigation unavailable offline');
  }
}

// Safe fetch with timeout and error handling
async function fetchWithTimeout(request, timeout = 5000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(request, { signal: controller.signal });
    clearTimeout(timeoutId);
    
    return response;
  } catch (error) {
    if (error.name === 'AbortError') {
      logError('Request timeout', error, { url: request.url, timeout });
    } else {
      logError('Fetch failed', error, { url: request.url });
    }
    return null;
  }
}

// Create consistent offline response
function createOfflineResponse(message = 'Offline - Please check your connection') {
  return new Response(message, {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'text/plain' }
  });
}

// Handle static assets - cache-first with network fallback and error boundaries
async function handleStaticAsset(request) {
  try {
    // Try cache first with error handling
    const cached = await safeCacheMatch(request);
    if (cached) {
      return cached;
    }
    
    // Network fallback with timeout
    const networkResponse = await fetchWithTimeout(request, 8000);
    
    if (networkResponse && networkResponse.ok) {
      // Cache successful responses with error handling
      const cache = await safeOpenCache(CACHE_NAME);
      if (cache) {
        await safeCachePut(cache, request, networkResponse);
      }
    }
    
    return networkResponse || createOfflineResponse('Asset unavailable offline');
  } catch (error) {
    logError('Static asset request failed', error, { url: request.url });
    return createOfflineResponse('Asset unavailable offline');
  }
}

// Handle API requests - network-first with limited caching and error boundaries
async function handleApiRequest(request) {
  try {
    // Network first with shorter timeout for API requests
    const networkResponse = await fetchWithTimeout(request, 5000);
    
    if (networkResponse && networkResponse.ok) {
      // Only cache GET requests with successful responses
      if (request.method === 'GET') {
        const cache = await safeOpenCache(CACHE_NAME);
        if (cache) {
          await safeCachePut(cache, request, networkResponse);
        }
      }
      return networkResponse;
    }
    
    // If network failed or returned error, try cache for GET requests
    if (request.method === 'GET') {
      const cached = await safeCacheMatch(request);
      if (cached) {
        return cached;
      }
    }
    
    // Return appropriate error response
    return networkResponse || createApiErrorResponse('Network unavailable');
  } catch (error) {
    logError('API request failed', error, { url: request.url, method: request.method });
    
    // Try cache for GET requests only
    if (request.method === 'GET') {
      const cached = await safeCacheMatch(request);
      if (cached) {
        return cached;
      }
    }
    
    return createApiErrorResponse('Network unavailable');
  }
}

// Create consistent API error response
function createApiErrorResponse(message) {
  return new Response(JSON.stringify({ error: message }), {
    status: 503,
    statusText: 'Service Unavailable',
    headers: { 'Content-Type': 'application/json' }
  });
}

// Handle default requests - network-first with error boundaries
async function handleDefaultRequest(request) {
  try {
    // Network first with timeout
    const networkResponse = await fetchWithTimeout(request, 8000);
    
    if (networkResponse && networkResponse.ok) {
      // Cache successful responses with error handling
      const cache = await safeOpenCache(CACHE_NAME);
      if (cache) {
        await safeCachePut(cache, request, networkResponse);
      }
    }
    
    return networkResponse || await getCacheOrOffline(request);
  } catch (error) {
    logError('Default request failed', error, { url: request.url });
    return await getCacheOrOffline(request);
  }
}

// Get from cache or return offline response
async function getCacheOrOffline(request, message = 'Content unavailable offline') {
  const cached = await safeCacheMatch(request);
  return cached || createOfflineResponse(message);
}

// Safe background fetch and cache update with comprehensive error handling
async function safeFetchAndCache(request) {
  try {
    const response = await fetchWithTimeout(request, 8000);
    
    if (response && response.ok) {
      const cache = await safeOpenCache(CACHE_NAME);
      if (cache) {
        await safeCachePut(cache, request, response);
      }
    }
  } catch (error) {
    // Silent failure for background operations, but log for debugging
    logError('Background fetch and cache failed', error, { url: request.url });
  }
}

// Handle messages from the main thread with error boundaries
self.addEventListener('message', (event) => {
  try {
    if (event.data && event.data.type) {
      switch (event.data.type) {
        case 'SKIP_WAITING':
          try {
            self.skipWaiting();
          } catch (error) {
            logError('Failed to skip waiting', error);
          }
          break;
          
        case 'GET_VERSION':
          try {
            event.ports[0].postMessage({ version: CACHE_VERSION });
          } catch (error) {
            logError('Failed to send version', error);
          }
          break;
          
        case 'CLEAR_CACHE':
          safeCacheOperation(async () => {
            const success = await caches.delete(CACHE_NAME);
            try {
              event.ports[0].postMessage({ success });
            } catch (error) {
              logError('Failed to send clear cache response', error);
            }
          }, 'clear cache', Promise.resolve()).catch((error) => {
            try {
              event.ports[0].postMessage({ success: false, error: error.message });
            } catch (msgError) {
              logError('Failed to send error message', msgError);
            }
          });
          break;
          
        default:
          console.log('[SW] Unknown message type:', event.data.type);
      }
    }
  } catch (error) {
    logError('Message handling failed', error, { messageType: event.data?.type });
  }
});

// Background sync for offline actions (if supported) with error boundaries
if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    try {
      console.log('[SW] Background sync:', event.tag);
      
      if (event.tag === 'background-sync') {
        event.waitUntil(
          safeCacheOperation(
            () => handleBackgroundSync(),
            'background sync',
            Promise.resolve()
          )
        );
      }
    } catch (error) {
      logError('Background sync event failed', error, { tag: event.tag });
    }
  });
}

async function handleBackgroundSync() {
  try {
    // Handle any background sync tasks here
    // e.g., sync offline task data when connection is restored
    console.log('[SW] Performing background sync');
    
    // Add any specific background sync logic here
    // For now, just ensure we're connected and caches are healthy
    await verifyConnection();
    
  } catch (error) {
    logError('Background sync operation failed', error);
    throw error; // Re-throw so sync can be retried
  }
}

// Periodic background sync (if supported) with error boundaries
if ('periodicSync' in self.registration) {
  self.addEventListener('periodicsync', (event) => {
    try {
      if (event.tag === 'content-sync') {
        event.waitUntil(
          safeCacheOperation(
            () => handlePeriodicSync(),
            'periodic sync',
            Promise.resolve()
          )
        );
      }
    } catch (error) {
      logError('Periodic sync event failed', error, { tag: event.tag });
    }
  });
}

async function handlePeriodicSync() {
  try {
    // Handle periodic sync tasks
    console.log('[SW] Performing periodic sync');
    
    // Verify cache health and clean up if needed
    await verifyCacheHealth();
    
  } catch (error) {
    logError('Periodic sync operation failed', error);
  }
}

// Verify network connection
async function verifyConnection() {
  try {
    const response = await fetchWithTimeout(new Request('/'), 3000);
    return response && response.ok;
  } catch (error) {
    logError('Connection verification failed', error);
    return false;
  }
}

// Verify cache health
async function verifyCacheHealth() {
  try {
    const cache = await safeOpenCache(CACHE_NAME);
    if (!cache) {
      console.warn('[SW] Cache not accessible during health check');
      return false;
    }
    
    // Test cache with a simple operation
    const keys = await cache.keys();
    console.log(`[SW] Cache health check: ${keys.length} items cached`);
    
    return true;
  } catch (error) {
    logError('Cache health check failed', error);
    return false;
  }
}