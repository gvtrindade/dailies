const CACHE_NAME = 'daily-activities-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/history.html',
  '/styles.css',
  '/history.css',
  '/script.js',
  '/history.js',
  '/manifest.json',
  '/assets/icon_144.png',
  '/assets/icon_192.png',
  '/assets/icon_256.png',
  '/assets/icon_512.png'
];

// Install event - cache resources
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', function(event) {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return response
        if (response) {
          console.log('Serving from cache:', event.request.url);
          return response;
        }

        // Clone the request
        var fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(
          function(response) {
            // Check if valid response
            if(!response || response.status !== 200 || response.type !== 'basic') {
              console.log('Not caching response:', response ? response.status : 'no response');
              return response;
            }

            // Clone the response
            var responseToCache = response.clone();

            caches.open(CACHE_NAME)
              .then(function(cache) {
                console.log('Caching:', event.request.url);
                cache.put(event.request, responseToCache);
              });

            return response;
          }
        ).catch(function(error) {
          console.log('Fetch failed, trying cache:', error, event.request.url);
          // If fetch fails (offline), try to serve from cache
          return caches.match(event.request);
        });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.map(function(cacheName) {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});