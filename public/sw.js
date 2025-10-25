self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

const CACHE_NAME = 'pdi-cache-v1';
const CACHE_ALLOWLIST = [CACHE_NAME];

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Do not handle cross-origin requests to avoid CSP-related fetch errors from SW context
  if (url.origin !== self.location.origin) return;
  // Only GET
  if (req.method !== 'GET') return;

  // Do not cache API routes
  if (url.pathname.startsWith('/api/')) return;

  // Network-first for HTML
  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first for static assets (same-origin only)
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
          return res;
        })
        .catch(() => cached);
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'clear_caches') {
    event.waitUntil(
      caches.keys().then((keys) =>
        Promise.all(
          keys.map((k) => {
            if (!CACHE_ALLOWLIST.includes(k)) return caches.delete(k);
          })
        )
      )
    );
  }
});
