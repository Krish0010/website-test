const CACHE_NAME = 'impact-pos-cache-v3';

// 1. INSTALL: Activate instantly without relying on hardcoded file names
self.addEventListener('install', event => {
    self.skipWaiting(); 
});

// 2. ACTIVATE: Clean up the old, broken caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// 3. FETCH: Dynamic Caching & Intelligent Offline Routing
self.addEventListener('fetch', event => {
    // DO NOT intercept Google Apps Script backend calls
    if (event.request.url.includes('script.google.com')) return;

    // Only cache GET requests
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // 🟢 DYNAMIC CACHE: Save a copy of the site as they use it online!
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(async () => {
                // 🟢 THE MAGIC: The internet is down! Serve from cache.
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) {
                    return cachedResponse;
                }

                // If exact match fails, try to aggressively find the Waiter or KDS files in the cache memory
                const cache = await caches.open(CACHE_NAME);
                const keys = await cache.keys();
                
                const reqUrl = event.request.url.toLowerCase();
                
                if (reqUrl.includes('waiter')) {
                    const waiterMatch = keys.find(req => req.url.toLowerCase().includes('waiter'));
                    if (waiterMatch) return cache.match(waiterMatch);
                } 
                else if (reqUrl.includes('kds')) {
                    const kdsMatch = keys.find(req => req.url.toLowerCase().includes('kds'));
                    if (kdsMatch) return cache.match(kdsMatch);
                }

                return null; 
            })
    );
});
