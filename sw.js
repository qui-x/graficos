'use strict';

const CACHE_PREFIX = 'orbisv-shell-';
const CACHE_NAME = `${CACHE_PREFIX}v6.3-20260912`;
const BUILD = '6.3.0';
const APP_SHELL = [
  './',
  './index.html',
  `./manifest.webmanifest?v=${BUILD}`,
  `./css/style.css?v=${BUILD}`,
  `./js/mathEngine.js?v=${BUILD}`,
  `./js/models.js?v=${BUILD}`,
  `./js/graphObjects.js?v=${BUILD}`,
  `./js/graphEngine.js?v=${BUILD}`,
  `./js/ui.js?v=${BUILD}`,
  `./js/main.js?v=${BUILD}`,
  './assets/orbisv-v-32.png',
  './assets/orbisv-v-64.png',
  './assets/orbisv-v-180.png',
  './assets/orbisv-v-192.png',
  './assets/orbisv-v-512.png',
  './assets/orbisv-v-maskable-192.png',
  './assets/orbisv-v-maskable-512.png',
  './assets/orbisv-v-symbol.png',
  './assets/orbisv-v-symbol-light.png',
  './assets/orbisv-wordmark-official.png',
  './assets/orbisv-wordmark-transparent.png',
  './assets/orbisv-logo-official.png',
  './assets/orbisv-logo-transparent.png',
  './assets/orbisv-logo-horizontal.png',
  './assets/orbisv-logo-symbol.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    return (await caches.match(request)) || (await caches.match('./index.html')) || Response.error();
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const network = fetch(request).then(async (response) => {
    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  }).catch(() => null);
  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const isCode = /\.(?:js|css)$/.test(url.pathname) || url.pathname.endsWith('/manifest.webmanifest');
  if (request.mode === 'navigate' || isCode) {
    event.respondWith(networkFirst(request));
    return;
  }
  event.respondWith(staleWhileRevalidate(request));
});
