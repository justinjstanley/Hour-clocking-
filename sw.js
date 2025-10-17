// sw.js — Simple Hours PWA service worker
// Bump this string whenever you ship changes to force an update:
const CACHE = 'simple-hours-v9';

// List of files to precache. We resolve these against the SW scope so it works on GitHub Pages
// even when your site is served from /<username>.github.io/<repo>/
const ASSETS = [
  'index.html',
  'manifest.webmanifest',
  'sw.js',
  'icons/icon-192.png',
  'icons/icon-512.png'
].map(path => new URL(path, self.registration.scope).toString());

// Install: cache core assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting(); // activate this worker immediately
});

// Activate: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: Cache-first for precached assets; network fallback for others
self.addEventListener('fetch', event => {
  const { request } = event;

  // Only handle GET
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      // Otherwise, go to network and (best-effort) cache same-origin requests
      return fetch(request).then(response => {
        try {
          const isSameOrigin = new URL(request.url).origin === location.origin;
          if (isSameOrigin && response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE).then(cache => cache.put(request, clone));
          }
        } catch(_) { /* ignore */ }
        return response;
      }).catch(() => {
        // Optional: offline fallback to index.html for navigation requests
        if (request.mode === 'navigate') {
          return caches.match(new URL('index.html', self.registration.scope).toString());
        }
        // Otherwise, just fail silently
        return new Response('', { status: 503, statusText: 'Offline' });
      });
    })
  );
});
