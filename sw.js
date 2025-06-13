// Конфигурация
const CACHE_VERSION = 'v4';
const STATIC_CACHE = `static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `dynamic-${CACHE_VERSION}`;

// Критически важные ресурсы (замените на свои URL)
const CORE_ASSETS = [
  '/',
  '/page123456', // Главная страница Tilda
  'https://rollpeace.ru/css/main.css',
  'https://cdn.tildacdn.com/js/tilda-scripts.min.js',
  '/offline.html' // Fallback страница
];

// Установка
self.addEventListener('install', event => {
  console.log('[SW] Установка');
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(CORE_ASSETS))
});

// Активация
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(keys
        .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
        .map(key => caches.delete(key))
    })
  );
});

// Стратегия кэширования для Tilda
self.addEventListener('fetch', event => {
  // Исключения для Tilda
  if (event.request.url.includes('tilda.ws') || 
      event.request.url.includes('/form/') ||
      event.request.method !== 'GET') {
    return fetch(event.request);
  }

  // Для HTML-страниц: Network First
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          cacheDynamic(DYNAMIC_CACHE, event.request, networkResponse.clone());
          return networkResponse;
        })
        .catch(() => caches.match(event.request)
          .then(cached => cached || caches.match('/offline.html')))
    );
    return;
  }

  // Для статики: Cache First
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request)
        .then(networkResponse => {
          if (isCacheable(event.request)) {
            cacheDynamic(DYNAMIC_CACHE, event.request, networkResponse.clone());
          }
          return networkResponse;
        }))
  );
});

// Вспомогательные функции
function cacheDynamic(cacheName, request, response) {
  if (response.ok) {
    caches.open(cacheName).then(cache => cache.put(request, response));
  }
}

function isCacheable(request) {
  return request.url.includes('tildacdn.com') || 
         request.url.startsWith('https://rollpeace.ru/static/');
}