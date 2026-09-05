const CACHE_NAME = 'hoitopolku-v29';

/* Älä precache hoitopolku-demo.html — muuten vanha sovellus jää PWA-välimuistiin
   ja uudet mittarit (paino, verensokeri) eivät näy. */
const urlsToCache = [
  'icon.svg',
  'icon-192.png',
  'icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        urlsToCache.map(url => cache.add(url).catch(() => null))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('fetch', event => {
  if (new URL(event.request.url).hostname.endsWith('.supabase.co')) return;

  const url = new URL(event.request.url);
  const isHtml = event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('/hoitopolku-ai/') ||
    url.pathname.endsWith('/hoitopolku-ai');

  /* HTML aina verkosta ensin, jotta mittari- ja näkymäpäivitykset näkyvät. */
  if (isHtml) {
    event.respondWith(
      fetch(event.request)
        .then(response => response)
        .catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => Promise.all(
      cacheNames.map(cacheName => {
        if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
      })
    )).then(() => self.clients.claim())
  );
});
