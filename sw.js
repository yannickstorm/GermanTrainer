/* Sprechstunde service worker: network first (always the latest version when online), cache as offline fallback.
 * Bump VERSION when the list of files changes. */
'use strict';
const VERSION = 'sprechstunde-v3';
const SHELL = ['./', 'index.html', 'styles.css', 'content.js', 'content.fr.js', 'core.js', 'i18n.fr.js', 'lib.js', 'drills.js',
  'talks.js', 'correct.js', 'vendor/anthropic-sdk.js', 'pages.js', 'manifest.webmanifest', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-180.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) {
    // Google Fonts: cache first, they never change
    if (/^fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {
      e.respondWith(caches.open(VERSION).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { c.put(req, r.clone()); return r; })));
    }
    return;
  }
  e.respondWith(fetch(req)
    .then((r) => { if (r.ok) { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); } return r; })
    .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('index.html'))));
});
