// Service Worker para TubesTer (PWA)
const CACHE_NAME = 'tubester-v23';

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

// Instalación: precarga inmediata de los archivos básicos
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[PWA] Precargando archivos en caché.');
      return cache.addAll(ARCHIVOS_CACHE);
    })
  );
  self.skipWaiting();
});

// Activación: elimina cachés antiguas automáticamente
self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys().then((claves) => {
      return Promise.all(
        claves.map((clave) => {
          if (clave !== CACHE_NAME) {
            console.log('[PWA] Eliminando caché obsoleta:', clave);
            return caches.delete(clave);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia de respuesta:
// - Para canciones.json y canciones.js: Network First (prioriza internet para traer canciones nuevas de inmediato)
// - Para los demás archivos: Stale While Revalidate (carga ultra rápido desde caché y actualiza en segundo plano)
self.addEventListener('fetch', (evento) => {
  const url = evento.request.url;

  // Ignorar peticiones externas como YouTube o CDNs
  if (!url.startsWith(self.location.origin)) {
    return;
  }

  // Si se solicitan las canciones, intentamos traer la versión más nueva de GitHub primero
  if (url.includes('canciones.json') || url.includes('canciones.js')) {
    evento.respondWith(
      fetch(evento.request)
        .then((respuestaRed) => {
          if (respuestaRed && respuestaRed.status === 200) {
            const clon = respuestaRed.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(evento.request, clon));
          }
          return respuestaRed;
        })
        .catch(() => caches.match(evento.request))
    );
    return;
  }

  // Para el resto de archivos (HTML, CSS, JS): Servir desde caché y refrescar en segundo plano
  evento.respondWith(
    caches.match(evento.request).then((respuestaCache) => {
      const peticionRed = fetch(evento.request).then((respuestaRed) => {
        if (respuestaRed && respuestaRed.status === 200) {
          const clon = respuestaRed.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(evento.request, clon));
        }
        return respuestaRed;
      }).catch(() => {});

      return respuestaCache || peticionRed;
    })
  );
});
