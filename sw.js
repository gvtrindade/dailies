// Check if running in production environment
const isProduction = location.hostname.includes("dailies.trindade.dev");

// Dynamic cache version with timestamp
const CACHE_VERSION = 1769003677;
const CACHE_NAME = `daily-activities-${CACHE_VERSION}`;
const urlsToCache = [
  '/',
  '/index.html',
  '/history.html',
  '/styles.css',
  '/history.css',
  '/script.js',
  '/history.js',
  '/manifest.json',
  '/assets/favicon.ico',
  '/assets/icons/android/android-launchericon-512-512.png',
  '/assets/icons/android/android-launchericon-192-192.png',
  '/assets/icons/android/android-launchericon-144-144.png',
  '/assets/icons/android/android-launchericon-96-96.png',
  '/assets/icons/android/android-launchericon-72-72.png',
  '/assets/icons/android/android-launchericon-48-48.png',
  '/assets/icons/ios/16.png',
  '/assets/icons/ios/20.png',
  '/assets/icons/ios/29.png',
  '/assets/icons/ios/32.png',
  '/assets/icons/ios/40.png',
  '/assets/icons/ios/50.png',
  '/assets/icons/ios/57.png',
  '/assets/icons/ios/58.png',
  '/assets/icons/ios/60.png',
  '/assets/icons/ios/64.png',
  '/assets/icons/ios/72.png',
  '/assets/icons/ios/76.png',
  '/assets/icons/ios/80.png',
  '/assets/icons/ios/87.png',
  '/assets/icons/ios/100.png',
  '/assets/icons/ios/114.png',
  '/assets/icons/ios/120.png',
  '/assets/icons/ios/128.png',
  '/assets/icons/ios/144.png',
  '/assets/icons/ios/152.png',
  '/assets/icons/ios/167.png',
  '/assets/icons/ios/180.png',
  '/assets/icons/ios/192.png',
  '/assets/icons/ios/256.png',
  '/assets/icons/ios/512.png',
  '/assets/icons/ios/1024.png'
];

// Install event - cache resources (only in production)
self.addEventListener('install', function(event) {
  if (!isProduction) {
    console.log('Service Worker installed in development mode - caching disabled');
    return self.skipWaiting();
  }

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('Opened cache in production mode');
        return cache.addAll(urlsToCache);
      })
      .then(function() {
        console.log('Service Worker installed successfully');
        // Force the new service worker to become active immediately
        return self.skipWaiting();
      })
  );
});

// Fetch event - serve from cache when offline (only in production)
self.addEventListener('fetch', function(event) {
  // Skip caching in development
  if (!isProduction) {
    // Let the browser handle requests normally in development
    return;
  }

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

// Activate event - clean up old caches (only in production)
self.addEventListener('activate', function(event) {
  if (!isProduction) {
    console.log('Service Worker activated in development mode - cache cleanup skipped');
    return self.clients.claim();
  }

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
    }).then(function() {
      console.log('Service Worker activated successfully');
      // Take control of all open pages immediately
      return self.clients.claim();
    })
  );
});

// Handle messages from the main thread
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});