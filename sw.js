const CACHE_NAME = 'dfo-logbook-v5'; // Increment this version to force update

// 1. INSTALL: Force the waiting service worker to become the active service worker.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// 2. ACTIVATE: Clean up old caches to save space.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Tell the active service worker to take control of the page immediately.
  self.clients.claim();
});

// 3. FETCH: The Core Logic
// Strategy: Stale-While-Revalidate
// - If content is in cache, serve it immediately (fast).
// - Simultaneously, fetch the latest version from network and update cache.
// - If offline, just serve cache.
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests (like Google Maps if added later)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Handle Navigation Requests (HTML) separately
  // We want to ensure the "Shell" of the app always loads
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
          return caches.match(event.request);
        })
    );
    return;
  }

  // Handle Assets (JS, CSS, Images)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // Return cached response immediately if available
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        // Update the cache with the new version from network
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });

      // If we have a cached response, return it.
      // If not, return the result of the network fetch.
      return cachedResponse || fetchPromise;
    })
  );
});