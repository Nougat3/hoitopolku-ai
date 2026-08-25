const CACHE_NAME = 'hoitopolku-main-v3';

/* Polut ovat suhteellisia tähän tiedostoon, jotta ne toimivat myös
   kun sivusto on julkaistu alihakemistoon. Juuresta lähtevä '/index.html'
   osoitti GitHub Pagesissa väärään paikkaan. */
const urlsToCache = [
  './',
  'index.html',
  'aloita.html',
  'icon.svg',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap'
];

/* Jokainen osoite lisätään erikseen. cache.addAll hylkää koko
   asennuksen jos yksikin pyyntö epäonnistuu, jolloin service worker
   jäisi kokonaan asentumatta esimerkiksi fonttipalvelun häiriössä. */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => Promise.all(
        urlsToCache.map(url => cache.add(url).catch(() => null))
      ))
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
