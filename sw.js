// 헬스 트래커 Service Worker
var CACHE_NAME = 'health-tracker-v5';
var ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Noto+Sans+KR:wght@300;400;500;700&display=swap'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS.map(function(url) {
        return new Request(url, { mode: 'no-cors' });
      }));
    }).catch(function(err) { console.log('Cache install error:', err); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(key) { return key !== CACHE_NAME; })
            .map(function(key) { return caches.delete(key); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  if (event.request.url.includes('cloudflare') || event.request.url.includes('fonts.')) {
    event.respondWith(
      fetch(event.request).catch(function() { return caches.match(event.request); })
    );
    return;
  }
  // 항상 네트워크 우선 (최신 버전 유지)
  event.respondWith(
    fetch(event.request).then(function(response) {
      if (!response || response.status !== 200) return response;
      // GET 요청만 캐시 (PUT/POST/DELETE 등은 Cache API 미지원)
      if (event.request.method === 'GET') {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(event.request, clone); });
      }
      return response;
    }).catch(function() {
      return caches.match(event.request);
    })
  );
});
