/*
 * Service Worker — Offline-Fähigkeit der Web-Version (Spec §9, §35).
 *
 * Dependency-frei. App-Shell und Icons werden vorab gecacht; sonstige
 * gleiche-Origin-Assets per stale-while-revalidate. Externe Abfragen
 * (z. B. Open-Meteo) laufen nicht über den Cache — dafür sorgt das
 * Wetter-Modul mit eigenem Zeitstempel-Cache.
 */

const CACHE = 'sunclock-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(CORE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Tippt jemand eine Erinnerung an, die App in den Vordergrund holen (§reminders).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) return client.focus();
      }
      return self.clients.openWindow ? self.clients.openWindow('./') : undefined;
    }),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return; // externe Dienste durchreichen

  // Navigation: erst Netz, offline die gecachte App-Shell.
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match('./index.html')));
    return;
  }

  // Assets: stale-while-revalidate.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
