const CACHE_NAME = 'impact-pos-cache-v2';

// 🟢 Cache both the Waiter and KDS files exactly as they are named in your GitHub folder
const URLS_TO_CACHE = [
    './Impact%20Waiter%20Panel-%20Demo%20Resto.html',
    './KDSpaneldemoresto3452.html'
];

// 1. INSTALL: Download the critical POS files to the tablet's hard drive
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache, saving POS structure');
                return cache.addAll(URLS_TO_CACHE);
            })
    );
    self.skipWaiting(); 
});

// 2. ACTIVATE: Clean up old caches if we update the version
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

// 3. FETCH: The Intelligent Offline Router
self.addEventListener('fetch', event => {
    // DO NOT intercept Google Apps Script backend calls
    if (event.request.url.includes('script.google.com')) return;

    event.respondWith(
        // Network-First Strategy
        fetch(event.request)
            .then(response => {
                // If online, constantly update the cache with the newest version of the site
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, responseToCache);
                    });
                }
                return response;
            })
            .catch(() => {
                // 🟢 THE MAGIC: The internet is down! 
                return caches.match(event.request).then(cachedResponse => {
                    // 1. First, try to return the exact page they were already on
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    
                    // 2. INTELLIGENT ROUTING: If exact match fails, check the URL text and force-load the correct app!
                    const reqUrl = event.request.url.toLowerCase();
                    
                    if (reqUrl.includes('waiter')) {
                        return caches.match('./Impact%20Waiter%20Panel-%20Demo%20Resto.html');
                    } 
                    else if (reqUrl.includes('kds')) {
                        return caches.match('./KDSpaneldemoresto3452.html');
                    }
                    
                    // If it is the Customer Dashboard or Partner Portal, do nothing and let it show the Dino Page (No offline mode for them)
                    return null; 
                });
            })
    );
});
