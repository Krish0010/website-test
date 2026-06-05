const CACHE_NAME = 'impact-pos-cache-v5';

self.addEventListener('install', event => { self.skipWaiting(); });

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
                })
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.url.includes('script.google.com')) return;
    if (event.request.method !== 'GET') return;

    const reqUrl = event.request.url.toLowerCase();
    
    // 🟢 ENTERPRISE SHIELD: Only intercept Waiter and KDS files. 
    // Completely ignore Customer Dashboard, Partner Portal, etc.
    const isProtectedApp = reqUrl.includes('waiter') || reqUrl.includes('kds');
    
    if (!isProtectedApp) {
        return; // The Service Worker steps aside and does nothing.
    }

    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => { cache.put(event.request, responseToCache); });
                }
                return response;
            })
            .catch(async () => {
                const cachedResponse = await caches.match(event.request);
                if (cachedResponse) return cachedResponse;

                const cache = await caches.open(CACHE_NAME);
                const keys = await cache.keys();
                
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
