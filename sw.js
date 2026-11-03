// Service Worker para Hitster YouTube Edition (PWA)
const CACHE_NAME = 'hitster-v1';

const ARCHIVOS_CACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './canciones.js',
  './canciones.json',
  './manifest.json',
  './icono.svg'
];

// Instalación del Service Worker y precarga de archivos esenciales
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA] Archivos precargados en caché con éxito.');
      return cache.addAll(ARCHIVOS_CACHE);
    })
  );
  self.skipWaiting();
});

// Activación y limpieza de versiones antiguas
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((claves) => {
      return Promise.all(
        claves.map((clave) => {
          if (clave !== CACHE_NAME) {
            console.log('[PWA] Eliminando caché antigua:', clave);
            return caches.delete(clave);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia de respuesta: Servir desde caché o consultar la red
self.addEventListener('fetch', (evento) => {
  // Ignorar peticiones externas como YouTube o CDNs
  if (!evento.request.url.startsWith(self.location.origin)) {
    return;
  }

  evento.respondWith(
    caches.match(evento.request).then((respuesta) => {
      return respuesta || fetch(evento.request);
    })
  );
});
