const CACHE_NAME = 'dfo-logbook-v12-offline-fix';

// 1. INSTALL: Force immediate activation
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. ACTIVATE: Cleanup old caches to ensure we don't serve stale files
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// 3. FETCH: The critical part for Vite apps
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip cross-origin requests (unless strictly necessary)
  if (!url.origin.startsWith(self.location.origin)) {
    return;
  }

  // HTML Navigation - Network First, fallback to Cache
  // This ensures we always try to get the latest version if online.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          });
        })
        .catch(() => {
          // If offline, return the cached index.html
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // Assets (JS, CSS, Images) - Cache First, fallback to Network (and update cache)
  // This is vital for hashed filenames. If it's in the cache, serve it instantly.
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });
    })
  );
});