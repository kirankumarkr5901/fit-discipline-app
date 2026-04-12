/* ===============================================
   SERVICE WORKER – Fit‑Discipline PWA
   Cache-first for static assets, network-first for API
   =============================================== */

const CACHE_NAME = 'fit-disciple-v1';
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/base.css',
  './css/layout.css',
  './css/components.css',
  './css/auth.css',
  './css/home.css',
  './css/planner.css',
  './css/workout-tracker.css',
  './css/run-tracker.css',
  './css/habits.css',
  './css/rewards.css',
  './js/firebase-config.js',
  './js/data.js',
  './js/home.js',
  './js/planner.js',
  './js/workout-tracker.js',
  './js/run-tracker.js',
  './js/habits.js',
  './js/rewards.js',
  './js/app.js',
  './js/auth.js',
  './assets/icon-192.svg'
];

// Install – cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate – clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch – network-first for Firebase/API, cache-first for static
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

  // Network-first for Firebase, Google APIs, and CDN scripts
  if (
    url.hostname.includes('firebase') ||
    url.hostname.includes('googleapis') ||
    url.hostname.includes('gstatic') ||
    url.hostname.includes('cdn.jsdelivr.net')
  ) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for local static assets
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      });
    })
  );
});
