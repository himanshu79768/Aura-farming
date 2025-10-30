const CACHE_NAME = 'aura-cache-v3'; // Bumped version
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/192x192/icon-192x192.png',
  '/icons/512x512/icon-512x512.png'
];
const API_HOSTS = [
    'generativelanguage.googleapis.com',
    'firebasestorage.googleapis.com',
    'aura-1cc21-default-rtdb.firebaseio.com',
    'firebase.googleapis.com',
    'securetoken.googleapis.com',
    'firestore.googleapis.com',
];

self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  // Clean up old caches
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Don't intercept requests for extensions
    if (url.protocol === 'chrome-extension:') {
        return;
    }

    // API calls: Network only
    if (API_HOSTS.includes(url.hostname)) {
        event.respondWith(fetch(request));
        return;
    }

    // Navigation requests: Network falling back to cache
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Cache the new page
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(request, responseToCache);
                        });
                    return response;
                })
                .catch(() => {
                    // If network fails, try the cache
                    return caches.match(request)
                        .then(response => response || caches.match('/index.html')); // Fallback to home page
                })
        );
        return;
    }
    
    // Static assets: Cache first, falling back to network
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                
                return fetch(request).then(
                    networkResponse => {
                        // Check if we received a valid response
                        if(!networkResponse || networkResponse.status !== 200) {
                           return networkResponse;
                        }

                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                // Only cache GET requests
                                if (request.method === 'GET') {
                                    cache.put(request, responseToCache);
                                }
                            });

                        return networkResponse;
                    }
                );
            })
    );
});