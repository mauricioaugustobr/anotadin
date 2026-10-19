/* ---------------------------------------------------------------------------
   ANOTADIN — service worker (cache offline, atualização automática)
--------------------------------------------------------------------------- */

const CACHE = 'anotadin-v5';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

async function cachePut(request, response) {
  if (response && response.ok) {
    const copy = response.clone();
    try {
      const cache = await caches.open(CACHE);
      await cache.put(request, copy);
    } catch {
      /* cache cheio ou resposta não armazenável — ignora */
    }
  }
}

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;

  // Navegação: rede primeiro, com fallback para o cache (funciona offline).
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(event.request);
          await cachePut(event.request, res);
          return res;
        } catch {
          const cached = await caches.match(event.request);
          return cached || (await caches.match('./index.html')) || Response.error();
        }
      })()
    );
    return;
  }

  // Assets: cache primeiro, revalidando em segundo plano.
  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request);
      const network = fetch(event.request)
        .then((res) => {
          cachePut(event.request, res);
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })()
  );
});
