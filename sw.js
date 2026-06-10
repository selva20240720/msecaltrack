// CalTrack Service Worker v3.1
// Network-first strategy — always tries to get fresh content from server
// Falls back to cache only when offline

const CACHE = 'ct2-v3.1';
const OFFLINE_URLS = ['./'];

// Install — cache the app shell
self.addEventListener('install', e => {
  console.log('[SW] Install v3.1');
  // Skip waiting immediately so new SW activates right away
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(OFFLINE_URLS))
  );
});

// Activate — delete ALL old caches immediately
self.addEventListener('activate', e => {
  console.log('[SW] Activate v3.1 — clearing old caches');
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => {
          console.log('[SW] Deleting old cache:', k);
          return caches.delete(k);
        })
      )
    ).then(() => self.clients.claim()) // take control of all pages immediately
  );
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', e => {
  // Only handle GET requests for same-origin
  if(e.request.method !== 'GET') return;
  if(!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    fetch(e.request, { cache: 'no-cache' })
      .then(response => {
        // If good response, cache it and return it
        if(response && response.status === 200 && response.type === 'basic'){
          const clone = response.clone();
          caches.open(CACHE).then(cache => cache.put(e.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(e.request).then(cached => {
          if(cached) return cached;
          // Nothing in cache either — return offline page
          return new Response('<h1>CalTrack is offline</h1><p>Please check your internet connection.</p>', {
            headers: { 'Content-Type': 'text/html' }
          });
        });
      })
  );
});

// Handle SKIP_WAITING message from app
self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SKIP_WAITING'){
    console.log('[SW] SKIP_WAITING received — activating now');
    self.skipWaiting();
  }
});
