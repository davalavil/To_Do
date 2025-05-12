// Define un nombre y versión para tu caché. Cámbialo si actualizas los archivos cacheados.
const CACHE_NAME = 'todo-app-cache-v1';

// Lista de los archivos que quieres cachear (rutas relativas al service worker).
const urlsToCache = [
  // Archivos principales de la app
  'To_Do.html',
  'style.css',
  'script.js',
  'manifest.json',
  // Asegúrate de que estas rutas a los iconos coincidan con los que tienes y los del manifest
  'icon-192x192.png',
  'icon-512x512.png',
  'icon-maskable-192x192.png', // Si los tienes
  'icon-maskable-512x512.png', // Si los tienes
  // Cachear Chart.js desde la CDN
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js'
];

// Evento 'install': Se dispara cuando el Service Worker se instala por primera vez.
self.addEventListener('install', event => {
  console.log('[Service Worker] Evento: install');
  // Precarga los recursos de la App Shell
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[Service Worker] Cache abierta. Cacheando archivos de la App Shell.');
        // Es importante que addAll reciba rutas válidas.
        // Si alguna falla, toda la operación falla.
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('[Service Worker] Fallo al cachear la App Shell durante la instalación:', err);
      })
  );
});

// Evento 'activate': Se dispara después de la instalación. Limpia caches antiguas.
self.addEventListener('activate', event => {
  console.log('[Service Worker] Evento: activate');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Si el nombre de la caché no es el actual y pertenece a esta app, la borramos.
          if (cacheName !== CACHE_NAME && cacheName.startsWith('todo-app-cache-')) {
            console.log('[Service Worker] Borrando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Toma control de los clientes (pestañas abiertas) inmediatamente tras la activación.
      console.log('[Service Worker] Reclamando clientes.');
      return self.clients.claim();
    })
  );
});

// Evento 'fetch': Intercepta peticiones de red. Estrategia: Cache First (para la App Shell).
self.addEventListener('fetch', event => {
  // Solo interceptamos peticiones GET. Otras (POST, etc.) van directo a la red.
  if (event.request.method !== 'GET') {
    // console.log('[Service Worker] Petición no GET omitida:', event.request.method, event.request.url);
    return;
  }

  // Para peticiones de navegación (HTML), intenta siempre ir a la red primero
  // y si falla, usa la caché. Esto asegura que el usuario vea la última versión si está online.
  // Para otros recursos (CSS, JS, imágenes), usa Cache First.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // Si la red falla, intenta obtener el HTML principal desde la caché
          console.log('[Service Worker] Red falló para navegación, intentando caché para:', event.request.url);
          return caches.match('To_Do.html', { cacheName: CACHE_NAME });
        })
    );
    return;
  }

  // Estrategia Cache First para otros recursos (CSS, JS, Imágenes, etc.)
  event.respondWith(
    caches.match(event.request, { cacheName: CACHE_NAME }) // Intenta encontrar el recurso en NUESTRA caché específica.
      .then(cachedResponse => {
        if (cachedResponse) {
          // Si está en caché, devuélvelo.
          // console.log('[Service Worker] Recurso encontrado en caché:', event.request.url);
          return cachedResponse;
        }

        // Si no está en caché, ve a la red.
        // console.log('[Service Worker] Recurso NO encontrado en caché, buscando en red:', event.request.url);
        return fetch(event.request).then(networkResponse => {
              // Opcional: Podrías añadir la respuesta de red a la caché aquí si quisieras
              // cachear recursos dinámicamente, pero para la App Shell no es necesario
              // ya que se cacheó en la instalación.
              return networkResponse;
            }).catch(error => {
                console.error('[Service Worker] Error en fetch de red para recurso:', error, event.request.url);
                // Podrías devolver una respuesta 'fallback' aquí si es apropiado (ej: imagen placeholder)
              });
      })
  );
});
