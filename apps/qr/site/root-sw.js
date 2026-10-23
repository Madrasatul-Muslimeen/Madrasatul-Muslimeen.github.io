// QR-only: the worker for QR's own ADDRESS (https://quranrevival.github.io/ and /index.html), so the front page opens offline.
// QR's real worker is /app/sw.js, scope /app/, and GitHub Pages cannot send the header that would let it reach "/"; so without
// this, a student opening QR's address offline got the browser's own "no internet" page (measured: ~113 characters of text).
// It is tiny on purpose and keeps NO cache of its own:
//   - the browser always picks the registration with the LONGEST matching scope, so every /app/ page stays with /app/sw.js;
//     this one only ever controls "/", "/index.html" and other pages outside /app/;
//   - everything goes to the network first, so online nothing changes; only when the network fails does it answer from the
//     caches /app/sw.js keeps (caches are shared by the whole site). The address's page is the same file, byte for byte, as
//     /app/index.html (its <base href="/app/"> makes every link the same), which /app/sw.js saves at install.
// Registered by app/js/qr-front.js, only on the address itself. Checked by tools/apps/qr-verify/qr-root-offline-browser.mjs.

self.addEventListener("install", () => self.skipWaiting());

const FRONT = new Set(["/", "/index.html"]);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;
  event.respondWith(fetch(request).catch(async () => {
    const saved = (request.mode === "navigate" && FRONT.has(url.pathname))
      ? await caches.match("/app/index.html", { ignoreSearch: true })
      : await caches.match(request, { ignoreSearch: true });
    return saved || Response.error();
  }));
});
