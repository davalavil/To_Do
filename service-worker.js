// Define un nombre y versión para tu caché. Cámbialo si actualizas los archivos cacheados.
const CACHE_NAME = 'todo-app-cache-v1';

// Lista de los archivos que quieres cachear. Esta es la "App Shell".
const urlsToCache = [
  '/', // Representa la raíz. Si tu app no está en la raíz, ajusta.
  '/To_Do.html',
  '/style.css',
  '/script.js',
  '/manifest.json', // Es bueno cachear el manifest también
  // Asegúrate de que estas rutas a los iconos coincidan con los que tienes y los del manifest
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/icon-maskable-192x192.png', // Si los tienes
  '/icon-maskable-512x512.png', // Si los tienes
  // Cachear Chart.js desde la CDN
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js'
];

// Evento 'install': Se dispara cuando el Service Worker se instala por primera vez.
// Aquí es donde cacheamos nuestros archivos principales.
self.addEventListener('install', event => {
  console.log('[Service Worker] Evento: install');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cache abierta. Cacheando archivos de la App Shell.');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('[Service Worker] Fallo al cachear la App Shell:', err);
      })
  );
});

// Evento 'activate': Se dispara después de la instalación.
// Aquí es donde limpiamos cachés antiguas si hemos actualizado CACHE_NAME.
self.addEventListener('activate', event => {
  console.log('[Service Worker] Evento: activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Si el nombre de la caché no es el actual, la borramos.
          if (cacheName !== CACHE_NAME && cacheName.startsWith('todo-app-cache-')) {
            console.log('[Service Worker] Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  // Toma control de los clientes (pestañas abiertas) inmediatamente.
  return self.clients.claim();
});

// Evento 'fetch': Se dispara cada vez que la aplicación (HTML, JS, CSS, imágenes, etc.)
// intenta obtener un recurso (incluso peticiones a APIs).
self.addEventListener('fetch', event => {
  // Solo nos interesa interceptar peticiones GET por ahora para el cacheo básico
  if (event.request.method !== 'GET') {
    return;
  }

  console.log('[Service Worker] Evento: fetch', event.request.url);
  event.respondWith(
    caches.match(event.request) // Intenta encontrar el recurso en la caché.
      .then(cachedResponse => {
        if (cachedResponse) {
          // Si el recurso está en la caché, devuélvelo.
          console.log('[Service Worker] Recurso encontrado en caché:', event.request.url);
          return cachedResponse;
        }

        // Si no está en la caché, ve a la red.
        console.log('[Service Worker] Recurso NO encontrado en caché, buscando en red:', event.request.url);
        return fetch(event.request).then(networkResponse => {
          // Opcional: Puedes cachear la respuesta de la red aquí para futuras peticiones,
          // pero para la App Shell ya lo hicimos en 'install'.
          // Esto sería más útil para una estrategia "network falling back to cache" o "cache then network".
          // Por ahora, lo mantenemos simple.
          return networkResponse;
        }).catch(error => {
          console.error('[Service Worker] Error en fetch de red:', error, event.request.url);
          // Podrías devolver una página offline genérica aquí si lo deseas.
          // Por ejemplo: return caches.match('/offline.html');
          // Pero esto requiere que tengas un 'offline.html' cacheado.
        });
      })
  );
});