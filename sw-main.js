const CACHE_NAME = 'hoitopolku-main-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/aloita.html',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

/* Sivupyynnöt verkosta ensin, jotta päivitykset näkyvät heti.
   Välimuistia käytetään vain kun verkko ei vastaa. Muut resurssit
   (fontit) välimuistista ensin, koska ne eivät muutu. */
self.addEventListener('fetch', event => {
  const isPage = event.request.mode === 'navigate' ||
                 event.request.destination === 'document';

  if (isPage) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
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
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});
