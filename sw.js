const CACHE_NAME = 'dfo-logbook-v3'; // Increment this version when you deploy updates

// Install Event: Cache core static files immediately
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Force this SW to become active immediately
});

// Activate Event: Cleanup old caches
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
  self.clients.claim(); // Take control of all open clients immediately
});

// Fetch Event: "Stale-While-Revalidate" strategy
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests (like Google Maps/Analytics if added later)
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // For navigation requests (HTML), always try network first, fallback to cache
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
          return caches.match(event.request);
        })
    );
    return;
  }

  // For other resources (JS, CSS, Images), try cache first, then network
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, networkResponse.clone());
          return networkResponse;
        });
      });

      return cachedResponse || fetchPromise;
    })
  );
});